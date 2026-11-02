import { prisma } from '@/lib/prisma'
import { detectSmartAlerts } from '@/lib/smart-tournament-logic'
import { calculateAge } from '@/lib/placement'

export type UncontestedReportPlayer = {
    name: string
    clubName: string
    gender: string | null
    weight: number | null
    height: number | null
    belt: string | null
    birthDate: string | null
    age: number | null
}

export type UncontestedReportCategory = {
    name: string
    type: string
    division: string | null
    weightClass: string | null
    gender: string | null
    belt: string | null
    skillLevel: string | null
    minAge: number | null
    maxAge: number | null
    minWeight: number | null
    maxWeight: number | null
    players: UncontestedReportPlayer[]
}

export type UncontestedReportEntry = {
    kind: 'UNCONTESTED' | 'CROSS_DIVISION'
    // 'WALKOVER' once the organizer already decided it, otherwise null
    resolution: string | null
    athlete: UncontestedReportPlayer & { id: string }
    category: UncontestedReportCategory
    suggestion: UncontestedReportCategory | null
}

export type ClubUncontestedReport = {
    clubName: string
    tournamentName: string
    tournamentDate: string
    venue: string | null
    entries: UncontestedReportEntry[]
}

/**
 * Everything the "uncontested divisions" PDF for one club needs: each of the
 * club's athletes who is alone in a Kyorugi category, that category's details,
 * and the suggested category to move them to (with the athletes already there).
 * Uses the same detection as the Smart Alerts so the PDF always matches them.
 * `clubId` null = athletes with no club ("Unaffiliated"). No permission check
 * here — callers must authorize (see getClubUncontestedReport in app/actions.ts).
 */
export async function buildClubUncontestedReport(
    tournamentId: string,
    clubId: string | null
): Promise<ClubUncontestedReport | { error: string }> {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { name: true, startDate: true, venue: true },
    })
    if (!tournament) return { error: 'Tournament not found' }

    const alerts = (await detectSmartAlerts(tournamentId)).filter(
        a => (a.type === 'UNCONTESTED' || a.type === 'CROSS_DIVISION') && a.details?.clubId === (clubId ?? null)
    )

    // Athletes with no club are reported together under "Unaffiliated"
    const club = clubId ? await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }) : null
    const base = {
        clubName: clubId ? (club?.name ?? 'Unknown Club') : 'Unaffiliated',
        tournamentName: tournament.name,
        tournamentDate: tournament.startDate.toISOString(),
        venue: tournament.venue,
    }
    if (alerts.length === 0) return { ...base, entries: [] }

    const categoryIds = [...new Set(alerts.flatMap(a => [a.categoryId, a.details?.targetCategoryId].filter(Boolean) as string[]))]
    const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        include: {
            players: {
                where: { registrationStatus: { not: 'WITHDRAWN' } },
                include: {
                    club: { select: { name: true } },
                    user: { select: { birthDate: true, gender: true, weight: true, height: true, belt: true } },
                },
                orderBy: { name: 'asc' },
            },
        },
    })

    const toPlayer = (p: (typeof categories)[number]['players'][number]): UncontestedReportPlayer & { id: string } => {
        // The user profile is the source of truth; fall back to the Player row for guests
        const birthDate = p.user?.birthDate ?? null
        return {
            id: p.id,
            name: p.name,
            clubName: p.club?.name ?? 'Unaffiliated',
            gender: p.user?.gender ?? p.gender ?? null,
            weight: p.user?.weight ?? p.weight ?? null,
            height: p.user?.height ?? p.height ?? null,
            belt: p.user?.belt ?? p.belt ?? null,
            birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
            age: birthDate ? calculateAge(birthDate) : null,
        }
    }
    // Older/manually-made categories have no division/weightClass stored — recover them from the display name
    // ("{division} {gender} {skill} Kyorugi - {weightClass}")
    const divisionFromName = (name: string) => name.match(/^(.*?)\s+(?:Male|Female)\b/)?.[1] ?? null
    const weightClassFromName = (name: string) => name.match(/\s-\s(.+)$/)?.[1] ?? name.match(/([-+]\d+(?:\.\d+)?kg)$/)?.[1] ?? null
    const toCategory = (c: (typeof categories)[number]): UncontestedReportCategory => ({
        name: c.name, type: c.type, division: c.division ?? divisionFromName(c.name),
        weightClass: c.weightClass ?? weightClassFromName(c.name), gender: c.gender, belt: c.belt,
        skillLevel: c.skillLevel, minAge: c.minAge, maxAge: c.maxAge, minWeight: c.minWeight, maxWeight: c.maxWeight,
        players: c.players.map(toPlayer),
    })
    const byId = new Map(categories.map(c => [c.id, c]))

    const entries: UncontestedReportEntry[] = []
    for (const a of alerts) {
        const source = byId.get(a.categoryId)
        const athlete = source?.players.find(p => p.id === a.details.playerId)
        if (!source || !athlete) continue
        const target = a.details.targetCategoryId ? byId.get(a.details.targetCategoryId) : undefined
        entries.push({
            kind: a.type as 'UNCONTESTED' | 'CROSS_DIVISION',
            resolution: a.details.resolution ?? null,
            athlete: toPlayer(athlete),
            category: toCategory(source),
            suggestion: target ? toCategory(target) : null,
        })
    }
    entries.sort((x, y) => x.category.name.localeCompare(y.category.name))

    return { ...base, entries }
}
