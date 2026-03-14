import { prisma } from '@/lib/prisma'
import { findCategoryForPlayer } from '@/lib/placement'
import { deriveSkillLevel } from '@/lib/skill-logic'

/**
 * Cascade a user's belt update to all active event registrations:
 * - SeminarRegistration (belt)
 * - PromotionTestRegistration (currentBelt)
 * - Player records for UPCOMING or OPEN tournaments
 * 
 * For tournaments, the athlete is also re-evaluated for a new bracket/category
 * since a belt change usually means a change in fighting division or poomsae level.
 */
export async function cascadeUserBelt(userId: string, newBelt: string) {
    // 1. Update Seminar Registrations
    await prisma.seminarRegistration.updateMany({
        where: { playerId: userId },
        data: { belt: newBelt }
    })

    // 2. Update Promotion Test Registrations
    await prisma.promotionTestRegistration.updateMany({
        where: { playerId: userId },
        data: { currentBelt: newBelt }
    })

    // 3. Update Tournament Player records (Only active tournaments)
    const activePlayers = await prisma.player.findMany({
        where: {
            userId: userId,
            category: {
                tournament: {
                    status: { in: ['UPCOMING', 'OPEN'] }
                }
            }
        },
        include: {
            user: true,
            category: true
        }
    })

    const newSkillLevel = deriveSkillLevel(newBelt)

    for (const player of activePlayers) {
        if (!player.category || !player.user?.birthDate) continue

        const birthDate = player.user.birthDate
        const gender = player.gender || player.user.gender || 'Male'
        const weight = player.weight ?? player.user.weight ?? 0
        const height = player.height ?? player.user.height ?? undefined
        const poomsaeType = player.poomsaeType || undefined
        const type = player.category.type || 'KYORUGI'

        // Re-run the bracket placement engine
        const newCategory = await findCategoryForPlayer(player.category.tournamentId, {
            birthDate,
            gender,
            weight,
            height,
            belt: newBelt,
            poomsaeType,
            type,
            skillLevel: newSkillLevel
        })

        // Update the player with new belt, skill level, and new category (if found)
        await prisma.player.update({
            where: { id: player.id },
            data: {
                belt: newBelt,
                skillLevel: newSkillLevel,
                ...(newCategory && { categoryId: newCategory.id })
            }
        })
    }
}
