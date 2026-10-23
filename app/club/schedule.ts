'use server'

// Club Manager: the weekly class schedule. Capacity, belt range and double-booking rules are enforced here, so no screen
// can get around them (the rules themselves are in lib/club-schedule.ts).
import { prisma } from '@/lib/prisma'
import { requireClubManagement, requireManagedMember } from '@/app/club/manager'
import { validateClass, beltProblem, overlaps, timeRange, type ClassInput } from '@/lib/club-schedule'
import { revalidatePath } from 'next/cache'

export type ClassRow = {
    id: string
    name: string
    days: number[]
    startTime: string
    endTime: string
    capacity: number
    beltMin: string
    beltMax: string
    instructor: string | null
    location: string | null
    notes: string | null
    enrolled: number
}

export type RosterMember = { id: string; name: string; belt: string | null }

type ClassRecord = { id: string; name: string; days: number[]; startTime: string; endTime: string; capacity: number; beltMin: string; beltMax: string; instructor: string | null; location: string | null; notes: string | null }
const fail = (error: any, fallback: string) => ({ error: (error?.message as string) || fallback })
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
const toRow = (c: ClassRecord, enrolled: number): ClassRow => ({
    id: c.id, name: c.name, days: c.days, startTime: c.startTime, endTime: c.endTime, capacity: c.capacity, beltMin: c.beltMin, beltMax: c.beltMax,
    instructor: c.instructor, location: c.location, notes: c.notes, enrolled,
})

async function clubClass(clubId: string, classId: string) {
    const cls = await prisma.clubClass.findFirst({ where: { id: classId, clubId }, include: { _count: { select: { members: true } } } })
    if (!cls) throw new Error('Class not found')
    return cls
}

// Why this member cannot join the class, or null when they can. Capacity is checked separately.
// `status` is the member's membership status; `others` are the other classes they are already enrolled in.
function whyNot(cls: ClassRecord, member: { belt: string | null }, status: string | undefined, others: ClassRecord[]): string | null {
    if (status === 'INACTIVE') return 'is not an active member'
    const belt = beltProblem(cls, member.belt)
    if (belt) return belt
    const clash = others.find(o => o.id !== cls.id && overlaps(cls, o))
    if (clash) return `is already in ${clash.name} at ${timeRange(clash)}`
    return null
}

export async function listClasses(): Promise<{ classes?: ClassRow[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const classes = await prisma.clubClass.findMany({ where: { clubId: club.id }, include: { _count: { select: { members: true } } }, orderBy: [{ startTime: 'asc' }, { name: 'asc' }] })
        return { classes: classes.map(c => toRow(c, c._count.members)) }
    } catch (error) {
        return fail(error, 'Failed to load the schedule')
    }
}

export async function saveClass(input: Partial<ClassInput> & { id?: string }) {
    try {
        const { club } = await requireClubManagement(true)
        const checked = validateClass(input)
        if (!checked.value) return { error: checked.error! }
        const c = checked.value

        if (input.id) {
            const existing = await clubClass(club.id, input.id)
            // Edits must not strand the people already enrolled.
            const enrolled = await prisma.clubClassMember.findMany({
                where: { classId: existing.id },
                include: { user: { select: { id: true, name: true, belt: true } } },
            })
            if (c.capacity < enrolled.length) return { error: `${enrolled.length} members are enrolled. Remove ${enrolled.length - c.capacity} before lowering the capacity to ${c.capacity}.` }
            if (enrolled.length) {
                const merged: ClassRecord = { ...existing, ...c }
                const [memberships, theirClasses] = await Promise.all([
                    prisma.clubMembership.findMany({ where: { clubId: club.id, userId: { in: enrolled.map(e => e.userId) } }, select: { userId: true, status: true } }),
                    prisma.clubClassMember.findMany({ where: { userId: { in: enrolled.map(e => e.userId) }, class: { clubId: club.id } }, include: { class: true } }),
                ])
                const status = new Map(memberships.map(m => [m.userId, m.status]))
                for (const e of enrolled) {
                    const others = theirClasses.filter(t => t.userId === e.userId).map(t => t.class)
                    const problem = whyNot(merged, e.user, status.get(e.userId), others)
                    if (problem) return { error: `${e.user.name || 'A member'} ${problem}. Remove them from the class first, or change the settings back.` }
                }
            }
            await prisma.clubClass.update({ where: { id: existing.id }, data: c })
            revalidatePath('/club')
            return { success: true, id: existing.id }
        }

        const created = await prisma.clubClass.create({ data: { clubId: club.id, ...c } })
        revalidatePath('/club')
        return { success: true, id: created.id }
    } catch (error) {
        return fail(error, 'Failed to save the class')
    }
}

export async function deleteClass(id: string) {
    try {
        const { club } = await requireClubManagement(true)
        const result = await prisma.clubClass.deleteMany({ where: { id, clubId: club.id } })
        if (result.count === 0) return { error: 'Class not found' }
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to delete the class')
    }
}

// The class, who is in it, and who could still be added.
export async function getClassRoster(classId: string): Promise<{ cls?: ClassRow; enrolled?: RosterMember[]; eligible?: RosterMember[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const cls = await clubClass(club.id, classId)
        const [users, memberships, allEnrollments] = await Promise.all([
            prisma.user.findMany({ where: { clubName: club.name, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }, select: { id: true, name: true, belt: true } }),
            prisma.clubMembership.findMany({ where: { clubId: club.id }, select: { userId: true, status: true } }),
            prisma.clubClassMember.findMany({ where: { class: { clubId: club.id } }, include: { class: true } }),
        ])
        const status = new Map(memberships.map(m => [m.userId, m.status]))
        const classesOf = new Map<string, ClassRecord[]>()
        for (const e of allEnrollments) classesOf.set(e.userId, [...(classesOf.get(e.userId) || []), e.class])
        const inClass = new Set(allEnrollments.filter(e => e.classId === cls.id).map(e => e.userId))
        const person = (u: { id: string; name: string | null; belt: string | null }): RosterMember => ({ id: u.id, name: u.name || 'Unnamed', belt: u.belt })
        return {
            cls: toRow(cls, inClass.size),
            enrolled: users.filter(u => inClass.has(u.id)).map(person).sort(byName),
            eligible: users.filter(u => !inClass.has(u.id) && whyNot(cls, u, status.get(u.id), classesOf.get(u.id) || []) === null).map(person).sort(byName),
        }
    } catch (error) {
        return fail(error, 'Failed to load the class')
    }
}

export async function enrollMember(classId: string, memberId: string) {
    try {
        const { club, member } = await requireManagedMember(memberId, true)
        const cls = await clubClass(club.id, classId)
        const name = member.name || 'This member'
        const [user, membership, theirClasses, already] = await Promise.all([
            prisma.user.findUnique({ where: { id: memberId }, select: { belt: true } }),
            prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } }, select: { status: true } }),
            prisma.clubClassMember.findMany({ where: { userId: memberId, class: { clubId: club.id } }, include: { class: true } }),
            prisma.clubClassMember.findUnique({ where: { classId_userId: { classId, userId: memberId } } }),
        ])
        if (already) return { success: true }
        if (cls._count.members >= cls.capacity) return { error: `${cls.name} is full (${cls.capacity} of ${cls.capacity}).` }
        const problem = whyNot(cls, { belt: user?.belt ?? null }, membership?.status, theirClasses.map(t => t.class))
        if (problem) return { error: `${name} ${problem}.` }
        await prisma.clubClassMember.create({ data: { classId, userId: memberId } })
        revalidatePath('/club')
        return { success: true, name }
    } catch (error) {
        return fail(error, 'Failed to add the member')
    }
}

export async function unenrollMember(classId: string, memberId: string) {
    try {
        const { club } = await requireClubManagement(true)
        await clubClass(club.id, classId)
        await prisma.clubClassMember.deleteMany({ where: { classId, userId: memberId } })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to remove the member')
    }
}
