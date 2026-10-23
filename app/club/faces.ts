'use server'

// Club Manager: whether a member has a face enrolled for check-in, and a request to clear it. The face data itself
// lives only on the kiosk PCs; the website knows just who is enrolled where.
import { prisma } from '@/lib/prisma'
import { requireManagedMember } from '@/app/club/manager'

export type FaceStatus = { enrolled: boolean; kiosks: string[]; clearPending: boolean }

export async function getFaceStatus(memberId: string): Promise<{ status?: FaceStatus; error?: string }> {
    try {
        const { club } = await requireManagedMember(memberId, false)
        const rows = await prisma.kioskFaceEnrollment.findMany({
            where: { clubId: club.id, userId: memberId, device: { revokedAt: null } },
            include: { device: { select: { name: true } } },
        })
        const pending = await prisma.kioskFaceClear.count({ where: { clubId: club.id, userId: memberId, createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } })
        return { status: { enrolled: rows.length > 0, kiosks: rows.map(r => r.device.name).sort(), clearPending: pending > 0 } }
    } catch (error: any) {
        return { error: error.message || 'Failed to load face status' }
    }
}

// Asks every kiosk to delete this member's face. The badge goes at once; each kiosk deletes it the next time it syncs.
export async function clearMemberFace(memberId: string) {
    try {
        const { club } = await requireManagedMember(memberId, true)
        await prisma.$transaction([
            prisma.kioskFaceClear.create({ data: { clubId: club.id, userId: memberId } }),
            prisma.kioskFaceEnrollment.deleteMany({ where: { clubId: club.id, userId: memberId } }),
        ])
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Failed to clear the face' }
    }
}
