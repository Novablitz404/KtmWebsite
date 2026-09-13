'use server'

import { prisma } from '@/lib/prisma'

export interface RankingEntry {
    userId: string
    name: string
    clubName: string | null
    division: string | null
    weightCategory: string | null
    totalPoints: number
    rank: number
    eloRating?: number
    isActive?: boolean
    profileImage?: string | null
    verified: boolean;
}

/**
 * Resolves the GlobalAthleteRanking scope for a tenant.
 *
 * GSS attribution is host-based (see lib/gss-ranking.ts): a result is scoped
 * to whichever org actually hosted that tournament, written directly as that
 * org's id — there's no parent/child affiliation rollup anymore, and no
 * merged "GLOBAL" pool. Each org's ranking, KTM's included (KTM now has a
 * real Organization row), is simply "tournaments this org itself hosted."
 * So scope is just the tenant's own org id.
 */
function resolveScope(filters: { tenantId?: string; tenantSlug?: string }): string {
    // Fail closed, not open: a missing tenantId must never silently turn into
    // an unfiltered `where` clause (Prisma treats `scope: undefined` as "no
    // filter on this field" — that would mix every org's rankings together,
    // exactly what host-based scoping exists to prevent). Every real caller
    // must resolve a tenant id, KTM's included, before reaching here.
    if (!filters.tenantId) {
        throw new Error(`resolveScope: missing tenantId (tenantSlug=${filters.tenantSlug ?? 'undefined'})`)
    }
    return filters.tenantId
}

/**
 * Finds the Division + Gender combination with the most ranked athletes for
 * a given type/tenant — used to default the rankings page onto a real,
 * populated leaderboard instead of an empty or meaninglessly-mixed one
 * (different divisions/genders are disconnected populations that never
 * compete against each other, so a single flat "all" list isn't meaningful —
 * see the discussion that led to this).
 *
 * Returns null if there's no ranked data at all to default to.
 */
export async function getDefaultSegment(filters: {
    type: string
    tenantId?: string
    tenantSlug?: string
}): Promise<{ division: string; gender: string } | null> {
    try {
        const scope = resolveScope(filters)

        const groups = await prisma.globalAthleteRanking.groupBy({
            by: ['division', 'gender'],
            where: {
                scope,
                type: filters.type,
                division: { not: null },
                gender: { not: null },
            },
            _count: { _all: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 1,
        })

        const top = groups[0]
        if (!top?.division || !top?.gender) return null

        return { division: top.division, gender: top.gender }
    } catch (e) {
        console.error('getDefaultSegment failed:', e)
        return null
    }
}

/**
 * Fetches GSS Rankings from the materialized view, scoped to the tenant's
 * own org id (host-based attribution — see resolveScope above).
 */
export async function fetchRankings(
    filters: {
        type?: string // KYORUGI | POOMSAE
        division?: string // e.g., "Junior"
        gender?: string // "Male" | "Female"
        belt?: string
        skillLevel?: string
        weightCategory?: string
        tenantId?: string // Organization ID for scoping
        tenantSlug?: string // Tenant slug (e.g., "ktm", "wotf-global")
        search?: string // Athlete name search
    } = {}
) {
    let rankings: Array<{
        id: string
        userId: string
        playerName: string
        clubName: string | null
        division: string | null
        weightCategory: string | null
        belt: string | null
        gender: string | null
        type: string
        scope: string
        eloRating: number
        matchCount: number
        activityCount: number
        isActive: boolean
        fieldBonus: number
        totalPoints: number
        globalRank: number
    }> = []

    try {
        const scope = resolveScope(filters)

        // Query the Materialized View
        rankings = await prisma.globalAthleteRanking.findMany({
            where: {
                scope,
                ...(filters.type ? { type: filters.type } : {}),
                ...(filters.division ? { division: filters.division } : {}),
                ...(filters.weightCategory ? { weightCategory: filters.weightCategory } : {}),
                ...(filters.belt ? { belt: filters.belt } : {}),
                ...(filters.gender ? { gender: filters.gender } : {}),
                ...(filters.search ? { playerName: { contains: filters.search, mode: 'insensitive' as const } } : {}),
            },
            orderBy: { globalRank: 'asc' },
            take: 100 // Top 100 limit
        })
    } catch (e) {
        console.error("GlobalAthleteRanking view not found or error querying:", e)
        return [] // Return empty if migration hasn't been run
    }

    // Fetch profile images from DB
    const userIds = rankings.map(r => r.userId)
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, imageUrl: true }
    })

    const imageMap = new Map<string, string | null>()
    users.forEach(u => imageMap.set(u.id, u.imageUrl))

    // Format to match expected RankingEntry interface
    return rankings.map((r) => {
        return {
            userId: r.userId,
            name: r.playerName,
            clubName: r.clubName,
            division: r.division,
            weightCategory: r.weightCategory,
            totalPoints: r.totalPoints,
            rank: r.globalRank,
            eloRating: r.eloRating,
            isActive: r.isActive,
            verified: true,
            profileImage: imageMap.get(r.userId) || undefined
        }
    })
}

/**
 * Returns the real, distinct weight-class values that actually exist for a
 * given type/division/gender/tenant — used to populate the Category filter
 * dropdown instead of a hardcoded guess. Different organizations define their
 * own weight-class names/cutoffs (e.g. "Under 73kg" vs "Under 74kg") via
 * their own guideline templates, so a fixed list can silently mismatch real
 * data and filter nothing. Sorted roughly by weight/rank progression where
 * recognizable, falling back to alphabetical for anything unrecognized.
 */
const WEIGHT_CLASS_ORDER = [
    'Fin', 'Fly', 'Bantam', 'Feather', 'Light', 'Welter', 'Lt Middle', 'Middle', 'Lt Heavy', 'Heavy',
]

function sortWeightClasses(values: string[]): string[] {
    const extractNumber = (v: string) => {
        const match = v.match(/(\d+(\.\d+)?)/)
        return match ? parseFloat(match[1]) : null
    }

    return [...values].sort((a, b) => {
        const aIdx = WEIGHT_CLASS_ORDER.indexOf(a)
        const bIdx = WEIGHT_CLASS_ORDER.indexOf(b)
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
        if (aIdx !== -1) return -1
        if (bIdx !== -1) return 1

        const aNum = extractNumber(a)
        const bNum = extractNumber(b)
        if (aNum !== null && bNum !== null) return aNum - bNum

        return a.localeCompare(b)
    })
}

export async function getAvailableWeightClasses(filters: {
    type: string
    division?: string
    gender?: string
    tenantId?: string
    tenantSlug?: string
}): Promise<string[]> {
    try {
        const scope = resolveScope(filters)

        const rows = await prisma.globalAthleteRanking.findMany({
            where: {
                scope,
                type: filters.type,
                weightCategory: { not: null },
                ...(filters.division ? { division: filters.division } : {}),
                ...(filters.gender ? { gender: filters.gender } : {}),
            },
            select: { weightCategory: true },
            distinct: ['weightCategory'],
        })

        const values = rows.map(r => r.weightCategory).filter((v): v is string => !!v)
        return sortWeightClasses(values)
    } catch (e) {
        console.error('getAvailableWeightClasses failed:', e)
        return []
    }
}
