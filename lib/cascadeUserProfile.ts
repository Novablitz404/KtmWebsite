import { prisma } from '@/lib/prisma'
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
 * 3. Syncs profile snapshot fields (weight/height/belt/skillLevel) onto active
 *    tournament Players. Does NOT reassign their category — once a player is
 *    registered into a category, it stays put unless a human changes it.
 *
 * Only touches records tied to UPCOMING/OPEN events — completed/cancelled
 * events keep their historical snapshots intact.
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

    // ── 3. Sync profile snapshot fields onto active tournament registrations ──
    // Category is never reassigned here — it stays whatever it was set to at
    // registration time until a human (organizer/club master) changes it.
    const newSkillLevel = user.belt ? deriveSkillLevel(user.belt) : null

    await prisma.player.updateMany({
        where: {
            userId,
            category: {
                tournament: {
                    status: { in: activeTournamentStatuses }
                }
            }
        },
        data: {
            gender: user.gender ?? undefined,
            weight: user.weight,
            height: user.height,
            belt: user.belt,
            skillLevel: newSkillLevel,
        }
    })
}
