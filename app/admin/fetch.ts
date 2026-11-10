'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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

// ─── Athlete rankings (GSS) — admin view ────────────────────────────────
// Read-only, live calculation that mirrors the public "GlobalAthleteRanking"
// materialized view (ranking_migration_v3.sql) so points and rank order match,
// EXCEPT it can include athletes whose license isn't activated
// (User.isVerified = false), which the public view filters out.
//
// KEEP IN SYNC with ranking_migration_v3.sql: medal values, tier multipliers,
// the EXP(-0.0578 * months) decay, the "active = >=1 approved event in 12
// months" rule and the ORDER BY (isActive DESC, totalPoints DESC).

export async function fetchAdminRankingScopes() {
    await checkAdmin()

    const rows = await prisma.$queryRaw<{ scope: string; name: string | null; count: bigint }[]>`
        SELECT e."scope", org."name", COUNT(*) AS "count"
        FROM "AthleteEloRating" e
        JOIN "User" u ON u.id = e."userId" AND u.role = 'ATHLETE'
        LEFT JOIN "Organization" org ON org.id = e."scope"
        WHERE e."type" IN ('KYORUGI', 'POOMSAE')
        GROUP BY e."scope", org."name"
        ORDER BY COUNT(*) DESC
    `
    return rows.map(r => ({ scope: r.scope, name: r.name ?? r.scope, count: Number(r.count) }))
}

export async function fetchAdminRankings(params: {
    scope: string
    type: 'KYORUGI' | 'POOMSAE'
    includeUnlicensed: boolean
    division?: string
    gender?: string
    weightCategory?: string
    search?: string
    page?: number
    pageSize?: number
}) {
    await checkAdmin()

    const page = Math.max(1, params.page ?? 1)
    const pageSize = params.pageSize ?? 25
    const licenseFilter = params.includeUnlicensed ? Prisma.empty : Prisma.sql`AND u."isVerified" = true`
    const divisionFilter = params.division ? Prisma.sql`AND "division" = ${params.division}` : Prisma.empty
    const genderFilter = params.gender ? Prisma.sql`AND "gender" = ${params.gender}` : Prisma.empty
    const weightFilter = params.weightCategory ? Prisma.sql`AND "weightCategory" = ${params.weightCategory}` : Prisma.empty
    // Search only narrows the displayed rows; it is applied AFTER ranking so
    // searching for someone doesn't turn them into #1.
    const searchFilter = params.search ? Prisma.sql`AND "playerName" ILIKE ${'%' + params.search + '%'}` : Prisma.empty

    // Ranks are sequential (1, 2, 3...) within the selected discipline,
    // division, gender and weight class — i.e. within the filtered group.
    const base = Prisma.sql`
        WITH Ranked AS (
            SELECT
                e."userId",
                u.name AS "playerName",
                c.name AS "clubName",
                mrc."division" AS "division",
                mrc."weightClass" AS "weightCategory",
                u.belt AS "belt",
                u.gender AS "gender",
                u."isVerified" AS "isVerified",
                u."athleteNumber" AS "athleteNumber",
                u."imageUrl" AS "imageUrl",
                e."rating" AS "eloRating",
                e."matchCount",
                COALESCE(a."activityCount", 0) >= 1 AS "isActive",
                COALESCE(fb."fieldBonus", 0)::double precision AS "fieldBonus",
                (e."rating" + COALESCE(fb."fieldBonus", 0))::double precision AS "totalPoints"
            FROM "AthleteEloRating" e
            JOIN "User" u ON u.id = e."userId" AND u.role = 'ATHLETE'
            LEFT JOIN "Club" c ON u."clubName" = c.name
            LEFT JOIN LATERAL (
                SELECT COUNT(DISTINCT cat."tournamentId") AS "activityCount"
                FROM "Player" p
                JOIN "Category" cat ON p."categoryId" = cat.id
                JOIN "Tournament" t ON cat."tournamentId" = t.id
                WHERE p."userId" = e."userId"
                  AND t."startDate" >= NOW() - INTERVAL '12 months'
                  AND p."registrationStatus" = 'APPROVED'
            ) a ON true
            LEFT JOIN LATERAL (
                SELECT SUM(
                    CASE p3.medal
                        WHEN 'Gold' THEN 1.0 WHEN 'Silver' THEN 0.6 WHEN 'Bronze' THEN 0.36
                        WHEN 'QF' THEN 0.22 WHEN 'R16' THEN 0.15 ELSE 0
                    END
                    * CASE t2.tier
                        WHEN 'GSS-1' THEN 2.0 WHEN 'GSS-2' THEN 1.5 WHEN 'GSS-3' THEN 1.0 WHEN 'GSS-4' THEN 0.75
                        WHEN 'J-4' THEN 2.0 WHEN 'J-3' THEN 1.5 WHEN 'J-2' THEN 1.0 WHEN 'J-1' THEN 0.75
                        ELSE 1.0
                    END
                    * EXP(-0.0578 * GREATEST(
                        (EXTRACT(YEAR FROM AGE(NOW(), t2."startDate")) * 12 +
                         EXTRACT(MONTH FROM AGE(NOW(), t2."startDate"))),
                        0
                    ))
                ) AS "fieldBonus"
                FROM "Player" p3
                JOIN "Category" cat3 ON p3."categoryId" = cat3.id
                JOIN "Tournament" t2 ON cat3."tournamentId" = t2.id
                WHERE p3."userId" = e."userId"
                  AND p3.medal IS NOT NULL AND p3.medal != ''
                  AND cat3.type = e."type"
            ) fb ON true
            LEFT JOIN LATERAL (
                SELECT cat."division", cat."weightClass"
                FROM "Player" p2
                JOIN "Category" cat ON cat.id = p2."categoryId"
                WHERE p2."userId" = e."userId"
                ORDER BY p2."createdAt" DESC
                LIMIT 1
            ) mrc ON true
            WHERE e."scope" = ${params.scope} AND e."type" = ${params.type}
              ${licenseFilter}
        ),
        Filtered AS (
            SELECT * FROM Ranked WHERE ("totalPoints" > 0 OR "matchCount" > 0)
        ),
        Scoped AS (
            SELECT * FROM Filtered WHERE true ${divisionFilter} ${genderFilter} ${weightFilter}
        ),
        Numbered AS (
            SELECT *,
                ROW_NUMBER() OVER (ORDER BY "isActive" DESC, "totalPoints" DESC)::integer AS "rank",
                -- Rank among licensed athletes only = the rank shown publicly.
                CASE WHEN "isVerified"
                    THEN ROW_NUMBER() OVER (PARTITION BY "isVerified" ORDER BY "isActive" DESC, "totalPoints" DESC)::integer
                END AS "publicRank"
            FROM Scoped
        )
    `

    const searchWhere = Prisma.sql`WHERE true ${searchFilter}`

    const [rows, countRows, divisionRows, weightRows] = await Promise.all([
        prisma.$queryRaw<any[]>`
            ${base}
            SELECT * FROM Numbered ${searchWhere}
            ORDER BY "rank" ASC
            LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
        `,
        prisma.$queryRaw<{ count: bigint }[]>`${base} SELECT COUNT(*) AS "count" FROM Numbered ${searchWhere}`,
        prisma.$queryRaw<{ division: string }[]>`
            ${base} SELECT DISTINCT "division" FROM Filtered WHERE "division" IS NOT NULL ORDER BY "division"
        `,
        // Weight classes that exist for the chosen division + gender.
        prisma.$queryRaw<{ weightCategory: string }[]>`
            ${base} SELECT DISTINCT "weightCategory" FROM Filtered
            WHERE "weightCategory" IS NOT NULL ${divisionFilter} ${genderFilter}
            ORDER BY "weightCategory"
        `,
    ])

    return {
        total: Number(countRows[0]?.count ?? 0),
        divisions: divisionRows.map(d => d.division),
        weightCategories: weightRows
            .map(w => w.weightCategory)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        rows: rows.map(r => ({
            userId: r.userId as string,
            rank: r.rank as number,
            publicRank: (r.publicRank ?? null) as number | null,
            name: r.playerName as string,
            clubName: (r.clubName ?? null) as string | null,
            division: (r.division ?? null) as string | null,
            weightCategory: (r.weightCategory ?? null) as string | null,
            gender: (r.gender ?? null) as string | null,
            belt: (r.belt ?? null) as string | null,
            isVerified: !!r.isVerified,
            eloRating: Math.round(r.eloRating),
            fieldBonus: Math.round(r.fieldBonus * 10) / 10,
            totalPoints: Math.round(r.totalPoints * 10) / 10,
            matchCount: Number(r.matchCount),
            isActive: !!r.isActive,
            imageUrl: (r.imageUrl ?? null) as string | null,
            athleteNumber: (r.athleteNumber ?? null) as string | null,
        })),
    }
}
