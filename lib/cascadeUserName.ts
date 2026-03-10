import { prisma } from '@/lib/prisma'

/**
 * Cascade a user's name change to all related records:
 * - Player records (tournament registrations)
 * - PromotionTestRegistration records
 * - SeminarRegistration records
 *
 * Call this AFTER updating User.name to keep snapshots in sync.
 */
export async function cascadeUserName(userId: string, newName: string) {
    await Promise.all([
        // 1. Update Player records (tournament registrations)
        prisma.player.updateMany({
            where: { userId },
            data: { name: newName }
        }),

        // 2. Update PromotionTestRegistration records
        prisma.promotionTestRegistration.updateMany({
            where: { playerId: userId },
            data: { playerName: newName }
        }),

        // 3. Update SeminarRegistration records
        prisma.seminarRegistration.updateMany({
            where: { playerId: userId },
            data: { playerName: newName }
        }),
    ])
}
