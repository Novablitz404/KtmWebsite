import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/athlete/tournaments/:id
// What the athlete app's event screen shows for a tournament: the guidelines, who is competing, and the signed-in
// athlete's own matches ("Find my match"). Participants are the approved registrations (names and clubs only, the
// same information the public tournament page shows) plus the athlete's profile photo when they have one.

const MAX_PLAYERS = 1500

type OpponentStatus = 'KNOWN' | 'BYE' | 'TBD' | 'NA'

function roundLabel(round: number, isFinal: boolean) {
    return isFinal ? 'Final' : `Round ${round}`
}

function fill(template: string, tournament: { name: string; startDate: Date; venue: string | null }) {
    return template
        .replace(/{{Tournament Name}}/g, tournament.name)
        .replace(/{{Date}}/g, tournament.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
        .replace(/{{Venue}}/g, tournament.venue || 'TBA')
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)
        const { id } = await context.params

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: {
                id: true, name: true, startDate: true, venue: true, status: true,
                guidelinesText: true, guidelinePdfUrl: true,
                guidelineTemplate: { select: { content: true, pdfUrl: true } },
            },
        })
        if (!tournament) return apiError('Tournament not found', 404)

        const [players, myPlayers] = await Promise.all([
            prisma.player.findMany({
                where: { category: { tournamentId: id }, registrationStatus: 'APPROVED' },
                select: { id: true, name: true, userId: true, categoryId: true, user: { select: { imageUrl: true } }, club: { select: { name: true } }, category: { select: { id: true, name: true, type: true, subtype: true, poomsaeFormat: true } } },
                orderBy: { name: 'asc' },
                take: MAX_PLAYERS,
            }),
            prisma.player.findMany({
                where: { userId: user.id, category: { tournamentId: id }, registrationStatus: { not: 'REJECTED' } },
                select: { id: true, name: true, registrationStatus: true, category: { select: { id: true, name: true, type: true, poomsaeFormat: true } } },
            }),
        ])

        // Participants, grouped by category.
        const byCategory = new Map<string, { id: string; name: string; type: string; subtype: string; players: { name: string; club: string | null; imageUrl: string | null; isYou: boolean }[] }>()
        for (const p of players) {
            if (!p.category) continue
            const entry = byCategory.get(p.category.id) ?? { id: p.category.id, name: p.category.name, type: p.category.type, subtype: p.category.subtype, players: [] }
            entry.players.push({ name: p.name, club: p.club?.name ?? null, imageUrl: p.user?.imageUrl ?? null, isYou: p.userId === user.id })
            byCategory.set(p.category.id, entry)
        }
        const categories = [...byCategory.values()].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ ...c, count: c.players.length }))

        // The athlete's own matches, one entry per category they entered.
        const categoryIds = [...new Set(myPlayers.map(p => p.category?.id).filter((v): v is string => !!v))]
        const [matches, poomsaeMatches] = categoryIds.length ? await Promise.all([
            prisma.match.findMany({ where: { categoryRefId: { in: categoryIds } }, orderBy: [{ round: 'asc' }, { matchId: 'asc' }] }),
            prisma.poomsaeMatch.findMany({ where: { categoryRefId: { in: categoryIds } }, orderBy: [{ round: 'asc' }, { matchId: 'asc' }], include: { player: { select: { name: true } } } }),
        ]) : [[], []]

        const myEntries = myPlayers.filter(p => p.category).map(p => {
            const category = p.category!
            const base = { playerName: p.name, categoryId: category.id, categoryName: category.name, categoryType: category.type, registrationStatus: p.registrationStatus }

            if (category.type === 'KYORUGI') {
                const all = matches.filter(m => m.categoryRefId === category.id)
                const maxRound = all.length ? Math.max(...all.map(m => m.round)) : 0
                const mine = all.filter(m => m.player1 === p.name || m.player2 === p.name).map(m => {
                    const raw = m.player1 === p.name ? m.player2 : m.player1
                    const opponentStatus: OpponentStatus = raw === 'BYE' ? 'BYE' : raw === 'TBD' ? 'TBD' : 'KNOWN'
                    const result = m.winner ? (m.winner === p.name ? 'won' : m.winner === raw ? 'lost' : null) : null
                    return {
                        matchNumber: m.matchId, roundLabel: roundLabel(m.round, m.round === maxRound), court: m.court,
                        day: m.scheduledDay, opponentName: opponentStatus === 'KNOWN' ? raw : null, opponentStatus, result,
                    }
                })
                return { ...base, generated: all.length > 0, matches: mine }
            }

            const rows = poomsaeMatches.filter(m => m.categoryRefId === category.id)
            const maxRound = rows.length ? Math.max(...rows.map(m => m.round)) : 0
            const headToHead = category.poomsaeFormat === 'HEAD_TO_HEAD'
            const mine = rows.filter(r => r.playerId === p.id || (r.memberNames && r.memberNames.split(',').map(n => n.trim()).includes(p.name))).map(r => {
                const sibling = headToHead ? rows.find(o => o.matchId === r.matchId && o.id !== r.id) : undefined
                const opponentName = sibling ? (sibling.player?.name || sibling.displayName || null) : null
                const opponentStatus: OpponentStatus = headToHead ? (opponentName ? 'KNOWN' : 'TBD') : 'NA'
                return {
                    matchNumber: r.matchId, roundLabel: roundLabel(r.round, r.round === maxRound), court: r.court,
                    day: r.scheduledDay ?? null, opponentName, opponentStatus, result: null,
                }
            })
            return { ...base, generated: rows.length > 0, matches: mine }
        })

        const guidelineSource = tournament.guidelinesText || tournament.guidelineTemplate?.content || null
        return apiResponse({
            id: tournament.id,
            guidelines: {
                text: guidelineSource ? fill(guidelineSource, tournament) : null,
                pdfUrl: tournament.guidelinePdfUrl || tournament.guidelineTemplate?.pdfUrl || null,
            },
            participants: { total: players.length, categories },
            myEntries,
        })
    } catch (error) {
        console.error('Athlete tournament detail error:', error)
        return apiError('Failed to fetch tournament', 500)
    }
}
