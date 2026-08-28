// Shared types/helpers for the inline bracket-preview UI in BracketList.tsx
// (ported from the old BracketPreviewModal.tsx, restyled for a light theme).

import type { Match } from '@prisma/client'
import type { ExtendedPoomsaeMatch } from '@/components/PoomsaeBracketView'

export interface PreviewPlayer {
    id: string
    name: string
    clubId: string | null
    clubName: string | null
    clubLogoUrl: string | null
    belt: string | null
    height: number | null
    weight: number | null
    division: string | null
    birthDate: string | null
}

export interface PreviewMatch {
    id: number
    round: number
    player1: { id: string; name: string } | null
    player2: { id: string; name: string } | null
    nextMatchId: number | null
    nextMatchSlot: 'player1' | 'player2' | null
    isFinal: boolean
}

export interface PoomsaePreviewSlot {
    roundGroupIndex: number
    round: number
    performanceNumber: number
    playerId: string | null
    playerName: string | null
    displayName: string | null
    memberNames: string | null
    targetRank: number | null
    assignedForms: string | null
    nextRoundGroupIndex?: number | null
    nextMatchSlot?: string | null
}

export function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

export function isHeightBased(categoryName: string): boolean {
    const n = categoryName.toLowerCase()
    return n.includes('toddler') || n.includes('grade school') || n.includes('supertoddler')
}

export function getRoundLabel(round: number, maxRound: number): string {
    if (maxRound === 1) return 'Final'
    if (round === maxRound) return 'Final'
    if (round === maxRound - 1) return 'Semifinal'
    if (round === maxRound - 2) return 'Quarterfinal'
    return `Round ${round}`
}

export function getPoomsaeRoundLabel(round: number): string {
    if (round === 1) return 'Preliminary'
    if (round === 2) return 'Semi-Final'
    return 'Final'
}

export function getBeltColor(belt: string | null): string {
    const b = (belt || '').toLowerCase()
    if (b.includes('black'))  return 'bg-gray-900 text-white'
    if (b.includes('red'))    return 'bg-red-600 text-white'
    if (b.includes('brown'))  return 'bg-amber-800 text-white'
    if (b.includes('maroon')) return 'bg-rose-800 text-white'
    if (b.includes('blue'))   return 'bg-blue-600 text-white'
    if (b.includes('green'))  return 'bg-green-600 text-white'
    if (b.includes('purple')) return 'bg-purple-600 text-white'
    if (b.includes('orange')) return 'bg-orange-500 text-white'
    if (b.includes('yellow')) return 'bg-yellow-400 text-yellow-900'
    if (b.includes('white'))  return 'bg-white text-gray-700 border border-gray-200'
    return 'bg-gray-200 text-gray-700'
}

// Returns the number of competing units (teams or individuals)
// PAIR = 2 players per team, TEAM = 3 players per team
export function getCompetitorCount(playerCount: number, subtype?: string | null): number {
    if (!subtype || subtype === 'INDIVIDUAL') return playerCount
    if (subtype === 'PAIR') return Math.floor(playerCount / 2)
    if (subtype === 'TEAM') return Math.floor(playerCount / 3)
    return playerCount
}

// Each team member gets a medal: PAIR = 2 medals per placement, TEAM = 3
export function getMedalMultiplier(subtype?: string | null): number {
    if (subtype === 'PAIR') return 2
    if (subtype === 'TEAM') return 3
    return 1
}

// Extracts player IDs in the order they appear in Round 1 matches, plus BYE
// recipients placed directly in later rounds — used to persist a locally-edited
// (swapped/reshuffled) seed order back through generateBracketsForCategory.
export function extractSeedOrder(specs: PreviewMatch[]): string[] {
    const r1 = specs.filter(s => s.round === 1).sort((a, b) => a.id - b.id)
    const ids: string[] = []
    for (const m of r1) {
        if (m.player1) ids.push(m.player1.id)
        if (m.player2) ids.push(m.player2.id)
    }
    const r1PlayerIds = new Set(ids)
    const allRounds = specs.filter(s => s.round > 1).sort((a, b) => a.round - b.round || a.id - b.id)
    for (const m of allRounds) {
        if (m.player1 && !r1PlayerIds.has(m.player1.id)) { ids.push(m.player1.id); r1PlayerIds.add(m.player1.id) }
        if (m.player2 && !r1PlayerIds.has(m.player2.id)) { ids.push(m.player2.id); r1PlayerIds.add(m.player2.id) }
    }
    return ids
}

// ─── Preview → PDF-shaped data ──────────────────────────────────────────────
// Lets the "Download Bracket PDFs" flow reuse the exact same BracketPDF /
// PoomsaeBracketPDF renderers for a category that hasn't been generated yet —
// so organisers can send a draft to clubs for verification before locking
// anything in. Only the fields those renderers actually read are filled in;
// the rest are inert placeholders since no real match rows exist yet.

// Kyorugi/Kyukpa: a preview spec never has both player1 AND player2 null (that
// combination only exists for real BYE-filler matches, which this app's
// generator never produces — see bracket-logic.ts). A null player2 only ever
// means the single-player uncontested-walkover synthetic spec, so it's an
// unambiguous signal to render it as an already-decided walkover, matching
// what createUncontestedWalkoverMatch would persist if this were generated.
export function previewSpecsToPdfMatches(specs: PreviewMatch[], categoryName: string): Match[] {
    return specs.map(s => ({
        id: s.id,
        category: categoryName,
        categoryRefId: null,
        round: s.round,
        player1: s.player1?.name || 'TBD',
        player2: s.player2 ? s.player2.name : (s.player1 ? 'BYE' : 'TBD'),
        winner: (s.player1 && !s.player2) ? s.player1.name : null,
        nextMatchId: s.nextMatchId,
        nextMatchSlot: s.nextMatchSlot,
        matchId: s.id,
        court: '',
        scheduledDay: null,
        r1_blue_score: 0, r1_red_score: 0,
        r2_blue_score: 0, r2_red_score: 0,
        r3_blue_score: 0, r3_red_score: 0,
        total_blue_score: 0, total_red_score: 0,
        blue_gam_jeom: 0, red_gam_jeom: 0,
        blue_rounds_won: 0, red_rounds_won: 0,
    }))
}

// Poomsae/Kyukpa-poomsae: joins each slot's playerId against the preview's own
// top-level `players[]` (which carries clubName) since poomsaeSpecs itself has
// no club info. `roundGroupIndex` stands in for the real `matchId` grouping key
// PoomsaeBracketPDF groups rows by — it plays the identical role pre-generation.
export function poomsaePreviewToPdfMatches(
    poomsaeSpecs: PoomsaePreviewSlot[],
    players: PreviewPlayer[]
): ExtendedPoomsaeMatch[] {
    const clubByPlayerId = new Map(players.map(p => [p.id, p.clubName]))
    // A group of exactly 1 (no sibling sharing the same roundGroupIndex) only
    // happens for an uncontested walkover — mark it 'Completed' so the PDF's
    // winner badge shows it as already decided, matching what generation will
    // actually persist. Mirrors Kyorugi's preview mapper marking a null-player2
    // spec as already having a winner.
    const groupSizes = new Map<number, number>()
    for (const s of poomsaeSpecs) groupSizes.set(s.roundGroupIndex, (groupSizes.get(s.roundGroupIndex) || 0) + 1)

    return poomsaeSpecs.map((s, idx) => ({
        id: idx,
        matchId: s.roundGroupIndex,
        nextMatchId: s.nextRoundGroupIndex ?? null,
        round: s.round,
        performanceNumber: s.performanceNumber,
        playerId: s.playerId,
        displayName: s.displayName,
        memberNames: s.memberNames,
        assignedForms: s.assignedForms,
        targetRank: s.targetRank,
        status: groupSizes.get(s.roundGroupIndex) === 1 ? 'Completed' : 'Pending',
        totalScore: 0,
        player: s.playerId ? { name: s.playerName || 'TBD', club: { name: clubByPlayerId.get(s.playerId) || null } } : null,
    })) as unknown as ExtendedPoomsaeMatch[]
}
