'use client'

import { ArrowRightLeft } from 'lucide-react'
import { calcAge, getBeltColor, type PreviewPlayer } from '@/lib/bracket-preview-helpers'

export default function PlayerSlot({
    player, slot, matchId, isClickable, isSelected, isOtherSelected,
    onPlayerClick, onMoveRequest, hasMovePickerOpen, playerInfo, heightBased, canMove
}: {
    player: { id: string; name: string } | null
    slot: 'player1' | 'player2'
    matchId: number
    isClickable: boolean
    isSelected: boolean
    isOtherSelected: boolean
    onPlayerClick: (matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    playerInfo: PreviewPlayer | null
    heightBased: boolean
    // Whether this slot can offer "Move to another category" — true for any slot
    // with a real player in it (Round 1 fighters AND bye recipients seeded directly
    // into later rounds), independent of `isClickable` which only governs swap
    // selection (Round 1 only, since swap semantics rely on seed-position order).
    canMove?: boolean
}) {
    if (!player) {
        return (
            <div className="px-3 py-2.5 text-[11px] italic text-gray-400">
                ↑ Winner advances
            </div>
        )
    }

    const age       = calcAge(playerInfo?.birthDate ?? null)
    const beltClass = getBeltColor(playerInfo?.belt ?? null)
    const metric    = heightBased
        ? (playerInfo?.height ? `${playerInfo.height}cm` : null)
        : (playerInfo?.weight ? `${playerInfo.weight}kg` : null)

    return (
        <div
            className={`group flex items-start gap-3 px-3 py-2.5 transition-all border-l-2 ${isClickable ? 'cursor-pointer' : ''} ${
                isSelected ? 'bg-indigo-100 border-l-indigo-500' : isOtherSelected ? 'bg-indigo-50/60 border-l-transparent' : 'bg-transparent border-l-transparent hover:bg-gray-50'
            }`}
            onClick={() => isClickable && onPlayerClick(matchId, slot, player)}
        >
            {/* Club logo / initial */}
            <div className="flex-shrink-0 mt-0.5">
                {playerInfo?.clubLogoUrl ? (
                    <img src={playerInfo.clubLogoUrl} alt={playerInfo.clubName || ''}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white bg-gradient-to-br from-red-500 to-red-700">
                        {(playerInfo?.clubName || player.name).charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info column */}
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold leading-snug break-words ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {player.name}
                </div>

                {playerInfo?.clubName && (
                    <div className="text-[11px] font-medium mt-0.5 text-gray-500 truncate" title={playerInfo.clubName}>
                        {playerInfo.clubName}
                    </div>
                )}

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {playerInfo?.belt && (
                        <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${beltClass}`}>
                            {playerInfo.belt}
                        </span>
                    )}
                    {age !== null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            {age}y
                        </span>
                    )}
                    {metric && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${heightBased ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                            {metric}
                        </span>
                    )}
                </div>
            </div>

            {/* Move button */}
            {!isSelected && !hasMovePickerOpen && (canMove ?? isClickable) && (
                <button
                    onClick={e => { e.stopPropagation(); onMoveRequest(player.id, player.name) }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all hover:scale-110 mt-0.5 p-1 rounded-lg bg-purple-50 text-purple-600"
                    title={`Move ${player.name} to another category`}>
                    <ArrowRightLeft size={11} />
                </button>
            )}
        </div>
    )
}
