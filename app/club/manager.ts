'use server'

// Club Manager (the gym side of the club master dashboard): membership details, and the pieces added in later phases.
// A member is the existing User (linked to the club by clubName); the club master only ever sees and edits their own club.
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { getSubscription, assertSubscription } from '@/lib/club-subscription'
import { revalidatePath } from 'next/cache'

export type MembershipData = {
    exists: boolean
    status: 'ACTIVE' | 'INACTIVE'
    joinedOn: string        // YYYY-MM-DD
    monthlyFee: number
    billingDay: number | null
}

export type MembershipInput = {
    status?: string
    joinedOn?: string | null
    monthlyFee?: number | null
    billingDay?: number | null
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10)
const todayStr = () => new Date().toLocaleDateString('en-CA')

// The signed-in club master and their club. Throws when the caller is not a club master with a club.
export async function requireClubMaster() {
    const user = await getAuthUser()
    if (!user || user.role !== 'CLUB_MASTER') throw new Error('Only Club Masters can do this')
    const club = await prisma.club.findUnique({ where: { masterId: user.id }, select: { id: true, name: true } })
    if (!club) throw new Error('You do not have a club yet')
    return { user, club }
}

// A member must belong to the caller's club.
export async function requireClubMember(memberId: string) {
    const { club } = await requireClubMaster()
    const member = await prisma.user.findUnique({ where: { id: memberId }, select: { id: true, name: true, clubName: true } })
    if (!member || member.clubName !== club.name) throw new Error('Member not found or not in your club')
    return { club, member }
}

// The club master of a club that may use the paid Club management features. `write` = adds or changes records
// (a lapsed subscription can still view them). Throws the message the screens show.
export async function requireClubManagement(write = false) {
    const { user, club } = await requireClubMaster()
    assertSubscription(await getSubscription(club.id), write)
    return { user, club }
}

export async function requireManagedMember(memberId: string, write = false) {
    const { club, member } = await requireClubMember(memberId)
    assertSubscription(await getSubscription(club.id), write)
    return { club, member }
}

export async function getMembership(memberId: string): Promise<{ membership?: MembershipData; error?: string }> {
    try {
        const { club } = await requireManagedMember(memberId, false)
        const row = await prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId: club.id, userId: memberId } } })
        return {
            membership: row
                ? { exists: true, status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE', joinedOn: dateOnly(row.joinedOn), monthlyFee: row.monthlyFee, billingDay: row.billingDay }
                : { exists: false, status: 'ACTIVE', joinedOn: todayStr(), monthlyFee: 0, billingDay: null },
        }
    } catch (error: any) {
        return { error: error.message || 'Failed to load membership' }
    }
}

export async function saveMembership(memberId: string, input: MembershipInput) {
    try {
        const { club } = await requireManagedMember(memberId, true)

        const status = input.status ?? 'ACTIVE'
        if (!['ACTIVE', 'INACTIVE'].includes(status)) return { error: 'Invalid status' }

        const fee = Number(input.monthlyFee ?? 0)
        if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) return { error: 'Enter a monthly fee between 0 and 1,000,000' }

        let billingDay: number | null = null
        if (input.billingDay !== null && input.billingDay !== undefined && String(input.billingDay) !== '') {
            billingDay = Math.floor(Number(input.billingDay))
            if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31) return { error: 'Billing day must be between 1 and 31' }
        }

        const joined = input.joinedOn || todayStr()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(joined) || Number.isNaN(Date.parse(joined))) return { error: 'Enter a valid joining date' }
        const joinedOn = new Date(joined + 'T00:00:00Z')

        const data = { status, monthlyFee: Math.round(fee * 100) / 100, billingDay, joinedOn }
        await prisma.clubMembership.upsert({
            where: { clubId_userId: { clubId: club.id, userId: memberId } },
            create: { clubId: club.id, userId: memberId, ...data },
            update: data,
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error: any) {
        console.error('Save membership error:', error)
        return { error: error.message || 'Failed to save membership' }
    }
}
