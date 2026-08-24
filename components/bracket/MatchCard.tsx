'use client'

import { Trophy } from 'lucide-react'
import PlayerSlot from './PlayerSlot'
import type { PreviewMatch, PreviewPlayer } from '@/lib/bracket-preview-helpers'

export default function MatchCard({
    match, isFirstRound, isFinalRound, selected, onPlayerClick,
    onMoveRequest, hasMovePickerOpen, playerMap, heightBased, side, simulatedMatchNumber
}: {
    match: PreviewMatch
    isFirstRound: boolean
    isFinalRound: boolean
    selected: { matchId: number; slot: 'player1' | 'player2' } | null
    onPlayerClick: (matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    playerMap: Map<string, PreviewPlayer>
    heightBased: boolean
    side?: 'A' | 'B' | 'final' | null
    // From the toolbar's "Simulate Sequence" — the global match number this card
    // would get if generated right now. Not persisted, purely illustrative.
    simulatedMatchNumber?: number | null
}) {
    const isP1Selected = selected?.matchId === match.id && selected.slot === 'player1'
    const isP2Selected = selected?.matchId === match.id && selected.slot === 'player2'
    const hasSelection = !!selected

    const accent = side === 'A' ? 'border-l-[3px] border-l-blue-400'
        : side === 'B' ? 'border-l-[3px] border-l-red-400'
            : side === 'final' ? 'border-l-[3px] border-l-amber-400' : ''

    return (
        <div className={`rounded-xl overflow-hidden relative flex flex-col border w-[260px] ${accent} ${
            isFinalRound ? 'bg-amber-50/60 border-amber-200 shadow-sm' : 'bg-white border-gray-200 shadow-sm'
        }`}>
            <div className={`px-3 py-1.5 flex justify-between items-center border-b min-h-[26px] ${isFinalRound ? 'bg-amber-50/80 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-1.5">
                    {isFinalRound && <Trophy size={10} className="text-amber-500" />}
                </div>
                {simulatedMatchNumber != null && (
                    <span
                        title="From Simulate Sequence — not committed until you generate"
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-600 text-white"
                    >
                        Sim #{simulatedMatchNumber}
                    </span>
                )}
            </div>
            <PlayerSlot
                player={match.player1} slot="player1" matchId={match.id}
                isClickable={!!match.player1} canMove={!!match.player1} isSelected={isP1Selected}
                isOtherSelected={hasSelection && !isP1Selected} onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest} hasMovePickerOpen={hasMovePickerOpen}
                playerInfo={match.player1 ? playerMap.get(match.player1.id) ?? null : null} heightBased={heightBased}
            />
            <div className="h-px bg-gray-100" />
            <PlayerSlot
                player={match.player2} slot="player2" matchId={match.id}
                isClickable={!!match.player2} canMove={!!match.player2} isSelected={isP2Selected}
                isOtherSelected={hasSelection && !isP2Selected} onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest} hasMovePickerOpen={hasMovePickerOpen}
                playerInfo={match.player2 ? playerMap.get(match.player2.id) ?? null : null} heightBased={heightBased}
            />
        </div>
    )
}
