'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

async function checkAdmin() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
    })

    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')
    return true
}

export async function fetchAdminUsers(page = 1, pageSize = 15, search = '', roleFilter = 'ALL') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    // Search Filter
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ]
    }

    // Role Filter
    if (roleFilter !== 'ALL') {
        where.role = roleFilter
    }

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({ where })
    ])

    return {
        users,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchAdminEvents(page = 1, pageSize = 10, mode: 'tournaments' | 'promotions' = 'tournaments') {
    await checkAdmin()

    const skip = (page - 1) * pageSize

    if (mode === 'tournaments') {
        const [tournaments, totalCount] = await Promise.all([
            prisma.tournament.findMany({
                orderBy: { startDate: 'desc' },
                skip,
                take: pageSize,
                include: {
                    organizer: {
                        select: { name: true, email: true }
                    }
                }
            }),
            prisma.tournament.count()
        ])

        return {
            items: tournaments,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount
        }
    } else {
        const [promotions, totalCount] = await Promise.all([
            prisma.promotionTest.findMany({
                orderBy: { testDate: 'desc' },
                skip,
                take: pageSize,
                include: {
                    organization: {
                        select: { name: true }
                    }
                }
            }),
            prisma.promotionTest.count()
        ])

        return {
            items: promotions,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount
        }
    }
}

export async function fetchAdminApiKeys(page = 1, pageSize = 10, search = '') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    // Search (if applicable later, assume search by description or owner name)
    // Currently API Key view doesn't have search input passed to it in the same way, but let's support basic description search
    if (search) {
        where.OR = [
            { description: { contains: search, mode: 'insensitive' } },
            { owner: { name: { contains: search, mode: 'insensitive' } } }
        ]
    }

    const [keys, totalCount] = await Promise.all([
        prisma.apiKey.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                owner: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.apiKey.count({ where })
    ])

    return {
        keys,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchGuidelineTemplates(page = 1, pageSize = 10, search = '') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    if (search) {
        where.name = { contains: search, mode: 'insensitive' }
    }

    const [templates, totalCount] = await Promise.all([
        prisma.guidelineTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize
        }),
        prisma.guidelineTemplate.count({ where })
    ])

    return {
        templates,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchGuidelineDetails(id: string) {
    await checkAdmin()

    if (!id) return null

    const template = await prisma.guidelineTemplate.findUnique({
        where: { id },
        include: {
            divisions: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            }
        }
    })

    return template
}

export async function fetchAdminUserDetails(id: string) {
    await checkAdmin()

    if (!id) return null

    const [user, clubs] = await Promise.all([
        prisma.user.findUnique({
            where: { id },
            include: {
                players: {
                    include: {
                        category: {
                            include: {
                                tournament: {
                                    select: { id: true, name: true, startDate: true, status: true }
                                }
                            }
                        },
                        poomsaeMatches: {
                            select: { id: true, category: true, round: true, rank: true, totalScore: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                createdTournaments: {
                    select: { id: true, name: true, startDate: true, status: true },
                    orderBy: { startDate: 'desc' }
                }
            }
        }),
        prisma.club.findMany({
            select: { name: true },
            orderBy: { name: 'asc' }
        })
    ])

    return { user, clubs: clubs.map((c: any) => c.name) }
}

// ─── Athlete rankings (GSS) ─────────────────────────────────────────────
// Rankings are scoped per host organization (see lib/gss-ranking.ts), so the
// admin picks which org's leaderboard to look at.

export async function fetchAdminRankingScopes() {
    await checkAdmin()

    const groups = await prisma.globalAthleteRanking.groupBy({
        by: ['scope'],
        _count: { _all: true },
    })
    const orgs = await prisma.organization.findMany({
        where: { id: { in: groups.map(g => g.scope) } },
        select: { id: true, name: true },
    })
    const nameMap = new Map(orgs.map(o => [o.id, o.name]))

    return groups
        .map(g => ({ scope: g.scope, name: nameMap.get(g.scope) ?? g.scope, count: g._count._all }))
        .sort((a, b) => b.count - a.count)
}

export async function fetchAdminRankings(params: {
    scope: string
    type: 'KYORUGI' | 'POOMSAE'
    division?: string
    gender?: string
    search?: string
    page?: number
    pageSize?: number
}) {
    await checkAdmin()

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 25
    const where = {
        scope: params.scope,
        type: params.type,
        ...(params.division ? { division: params.division } : {}),
        ...(params.gender ? { gender: params.gender } : {}),
        ...(params.search ? { playerName: { contains: params.search, mode: 'insensitive' as const } } : {}),
    }

    const [rows, total, divisions] = await Promise.all([
        prisma.globalAthleteRanking.findMany({
            where,
            orderBy: [{ globalRank: 'asc' }, { totalPoints: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.globalAthleteRanking.count({ where }),
        prisma.globalAthleteRanking.findMany({
            where: { scope: params.scope, type: params.type, division: { not: null } },
            select: { division: true },
            distinct: ['division'],
        }),
    ])

    const users = await prisma.user.findMany({
        where: { id: { in: rows.map(r => r.userId) } },
        select: { id: true, imageUrl: true, athleteNumber: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    return {
        total,
        divisions: divisions.map(d => d.division as string).sort(),
        rows: rows.map(r => ({
            userId: r.userId,
            rank: r.globalRank,
            name: r.playerName,
            clubName: r.clubName,
            division: r.division,
            weightCategory: r.weightCategory,
            gender: r.gender,
            belt: r.belt,
            eloRating: Math.round(r.eloRating),
            fieldBonus: Math.round(r.fieldBonus * 10) / 10,
            totalPoints: Math.round(r.totalPoints * 10) / 10,
            matchCount: r.matchCount,
            isActive: r.isActive,
            imageUrl: userMap.get(r.userId)?.imageUrl ?? null,
            athleteNumber: userMap.get(r.userId)?.athleteNumber ?? null,
        })),
    }
}
