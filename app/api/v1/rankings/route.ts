import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

const DISCIPLINES = ['KYORUGI', 'POOMSAE'] as const

/**
 * GET /api/v1/rankings?limit=10
 *
 * The top of the Kyorugi and Poomsae leaderboards, for the mobile Rankings screen.
 *
 * Each discipline is its own leaderboard (points are never combined). An athlete can have a row per scope, and the
 * dashboard shows their best-ranked row per discipline, so the list comes from that same scope: "#8" on the dashboard is
 * row 8 here. An athlete with no ranking yet gets the busiest scope for that discipline instead.
 *
 * Only what a public rankings page already shows is returned (rank, name, club, points). Other athletes are never
 * identified by id: the caller's own row is flagged with `isYou`, and `you` carries their rank when it is outside the list.
 */
export async function GET(request: Request) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const requested = Number(new URL(request.url).searchParams.get('limit'))
        const limit = Math.min(Math.max(Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 10, 1), 25)

        const mine = await prisma.globalAthleteRanking.findMany({
            where: { userId: user.id },
            select: { type: true, scope: true, globalRank: true, totalPoints: true },
        })

        const disciplines = []
        for (const type of DISCIPLINES) {
            const best = mine.filter(r => r.type === type).sort((a, b) => a.globalRank - b.globalRank)[0]

            let scope = best?.scope
            if (!scope) {
                const busiest = await prisma.globalAthleteRanking.groupBy({
                    by: ['scope'],
                    where: { type },
                    _count: { _all: true },
                    orderBy: { _count: { scope: 'desc' } },
                    take: 1,
                })
                scope = busiest[0]?.scope
            }
            if (!scope) {
                disciplines.push({ type, scope: null, entries: [], you: null })
                continue
            }

            const [rows, organization] = await Promise.all([
                prisma.globalAthleteRanking.findMany({
                    where: { scope, type, globalRank: { lte: limit } },
                    orderBy: { globalRank: 'asc' },
                    take: limit,
                    select: { userId: true, playerName: true, clubName: true, totalPoints: true, globalRank: true },
                }),
                scope === 'GLOBAL' ? null : prisma.organization.findUnique({ where: { id: scope }, select: { name: true } }),
            ])

            disciplines.push({
                type,
                scope: { id: scope, name: scope === 'GLOBAL' ? 'Global' : organization?.name ?? null },
                entries: rows.map(r => ({
                    rank: r.globalRank,
                    name: r.playerName,
                    clubName: r.clubName,
                    points: r.totalPoints,
                    isYou: r.userId === user.id,
                })),
                // Only when the caller is ranked in this scope but below the list.
                you: best && best.scope === scope && best.globalRank > limit ? { rank: best.globalRank, points: best.totalPoints } : null,
            })
        }

        return apiResponse({ limit, disciplines })
    } catch (error) {
        console.error('Rankings error:', error)
        return apiError('Failed to fetch rankings', 500)
    }
}
