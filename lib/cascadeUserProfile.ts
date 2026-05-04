import { prisma } from '@/lib/prisma'
import { findCategoryForPlayer } from '@/lib/placement'
import { deriveSkillLevel } from '@/lib/skill-logic'

/**
 * Unified cascade for User profile changes.
 *
 * Combines the functionality of cascadeUserName, cascadeUserBelt, and
 * category reassignment into a single function. Call this after ANY
 * update to the User model (name, belt, birthDate, height, weight, gender).
 *
 * What it does:
 * 1. Cascades NAME to active Player, SeminarRegistration, PromotionTestRegistration
 * 2. Cascades BELT to active SeminarRegistration, PromotionTestRegistration
 * 3. Re-runs PLACEMENT for active tournament Players (UPCOMING/OPEN)
 *    unless the Player has manualOverride = true
 *
 * Only touches records tied to UPCOMING/OPEN events — completed/cancelled
 * events keep their historical snapshots intact.
 *
 * manualOverride skips category reassignment but still syncs snapshot fields.
 */
export async function cascadeUserProfile(userId: string) {
    // Fetch the latest user profile (source of truth)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            birthDate: true,
            gender: true,
            weight: true,
            height: true,
            belt: true,
        }
    })

    if (!user) return

    // Active event status filters — only cascade to events that haven't concluded
    const activeTournamentStatuses = ['UPCOMING', 'OPEN']
    const activeEventStatuses = ['UPCOMING', 'OPEN']

    // ── 1. Cascade NAME to active snapshot records ────────────────────────────
    if (user.name) {
        await Promise.all([
            // Player records: only for active tournaments
            prisma.player.updateMany({
                where: {
                    userId,
                    category: {
                        tournament: { status: { in: activeTournamentStatuses } }
                    }
                },
                data: { name: user.name }
            }),
            // Promotion test registrations: only active events
            prisma.promotionTestRegistration.updateMany({
                where: {
                    playerId: userId,
                    promotionTest: { status: { in: activeEventStatuses } }
                },
                data: { playerName: user.name }
            }),
            // Seminar registrations: only active events
            prisma.seminarRegistration.updateMany({
                where: {
                    playerId: userId,
                    seminar: { status: { in: activeEventStatuses } }
                },
                data: { playerName: user.name }
            }),
        ])
    }

    // ── 2. Cascade BELT to active seminar & promotion test records ────────────
    if (user.belt) {
        await Promise.all([
            prisma.seminarRegistration.updateMany({
                where: {
                    playerId: userId,
                    seminar: { status: { in: activeEventStatuses } }
                },
                data: { belt: user.belt }
            }),
            prisma.promotionTestRegistration.updateMany({
                where: {
                    playerId: userId,
                    promotionTest: { status: { in: activeEventStatuses } }
                },
                data: { currentBelt: user.belt }
            }),
        ])
    }

    // ── 3. Re-run PLACEMENT for active tournament registrations ──────────────
    const activePlayers = await prisma.player.findMany({
        where: {
            userId,
            category: {
                tournament: {
                    status: { in: activeTournamentStatuses }
                }
            }
        },
        include: { category: true }
    })

    if (activePlayers.length === 0) return

    const newSkillLevel = user.belt ? deriveSkillLevel(user.belt) : null

    for (const player of activePlayers) {
        if (!player.category) continue

        // Always sync snapshot fields (even for manual overrides)
        const snapshotData: Record<string, any> = {
            gender: user.gender || player.gender,
            weight: user.weight,
            height: user.height,
            belt: user.belt,
            skillLevel: newSkillLevel,
        }

        // Skip category reassignment if manually overridden
        if (player.manualOverride) {
            await prisma.player.update({
                where: { id: player.id },
                data: snapshotData
            })
            continue
        }

        // Skip placement if birthDate is missing — prevents incorrect age-0 assignments
        if (!user.birthDate) {
            await prisma.player.update({
                where: { id: player.id },
                data: snapshotData
            })
            continue
        }

        // Build profile from User data for placement engine
        const tournamentId = player.category.tournamentId
        const type = player.category.type || 'KYORUGI'

        const newCategory = await findCategoryForPlayer(tournamentId, {
            birthDate: user.birthDate,
            gender: user.gender || player.gender || 'Male',
            weight: user.weight ?? 0,
            height: user.height ?? undefined,
            belt: user.belt ?? undefined,
            poomsaeType: player.poomsaeType ?? undefined,
            type,
            skillLevel: newSkillLevel ?? undefined
        })

        await prisma.player.update({
            where: { id: player.id },
            data: {
                ...snapshotData,
                ...(newCategory && { categoryId: newCategory.id })
            }
        })
    }
}
