'use client'

import { calcAge, getBeltColor, getPoomsaeRoundLabel, type PoomsaePreviewSlot, type PreviewPlayer } from '@/lib/bracket-preview-helpers'

export default function PoomsaePreviewGrid({
    poomsaeSpecs, playerMap, isHeadToHead, simulatedMatches
}: {
    poomsaeSpecs: PoomsaePreviewSlot[]
    playerMap: Map<string, PreviewPlayer>
    isHeadToHead: boolean
    // From the toolbar's "Simulate Sequence" — keyed by round, since a SCORED round
    // shares one match record. Not persisted, purely illustrative until generated.
    simulatedMatches?: Record<number, { globalId: number; day: number }> | null
}) {
    if (poomsaeSpecs.length === 0) {
        return <div className="py-8 text-center text-sm text-gray-400">No players registered in this category.</div>
    }

    const rounds = Array.from(new Set(poomsaeSpecs.map(s => s.round))).sort((a, b) => a - b)

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-2">
                {rounds.map(roundNum => {
                    const roundSlots = poomsaeSpecs.filter(s => s.round === roundNum)
                    const isStartRound = roundNum === rounds[0]
                    const isFinal = roundNum === 3
                    const roundLabel = getPoomsaeRoundLabel(roundNum)
                    // SCORED shares one match record per round — every slot in the
                    // round carries the same roundGroupIndex, so any of them works.
                    const roundGroupIndex = roundSlots[0]?.roundGroupIndex

                    return (
                        <div key={roundNum} className="flex flex-col gap-1.5 flex-shrink-0" style={{ minWidth: 260 }}>
                            <div className={`flex items-center justify-between px-3 py-1.5 rounded-full ${
                                isFinal ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md'
                                    : roundNum === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                        : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}>
                                <span className="text-[10px] font-black uppercase tracking-widest">{roundLabel}</span>
                                <span className="text-[10px] font-bold opacity-75">
                                    {roundSlots.length} slot{roundSlots.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {roundGroupIndex != null && simulatedMatches?.[roundGroupIndex] && (
                                <span
                                    title="From Simulate Sequence — not committed until you generate"
                                    className="self-start inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200"
                                >
                                    Simulated · Match #{simulatedMatches[roundGroupIndex].globalId}
                                </span>
                            )}

                            {isHeadToHead ? (
                                Array.from(
                                    roundSlots.reduce((groups, s) => {
                                        const arr = groups.get(s.roundGroupIndex) || []
                                        arr.push(s)
                                        groups.set(s.roundGroupIndex, arr)
                                        return groups
                                    }, new Map<number, PoomsaePreviewSlot[]>()).entries()
                                ).map(([groupIdx, pair]) => {
                                    const sideA = pair.find(s => s.performanceNumber === 1)
                                    const sideB = pair.find(s => s.performanceNumber === 2)
                                    const label = (s?: PoomsaePreviewSlot) => s ? (s.displayName || s.playerName || 'TBD') : 'BYE'
                                    return (
                                        <div key={groupIdx} className="rounded-xl px-3 py-2.5 bg-white border border-gray-200 shadow-sm">
                                            <div className={`text-sm font-bold ${sideA ? 'text-gray-900' : 'text-gray-300'}`}>
                                                {label(sideA)}
                                            </div>
                                            <div className="text-[10px] font-black uppercase my-1 text-gray-400">vs</div>
                                            <div className={`text-sm font-bold ${sideB ? 'text-gray-900' : 'text-gray-300'}`}>
                                                {label(sideB)}
                                            </div>
                                            {(sideA?.assignedForms || sideB?.assignedForms) && (
                                                <div className="mt-1.5">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700">
                                                        {sideA?.assignedForms || sideB?.assignedForms}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            ) : roundSlots.sort((a, b) => a.performanceNumber - b.performanceNumber).map((slot, idx) => {
                                const pInfo = slot.playerId ? playerMap.get(slot.playerId) : null
                                const displayLabel = slot.displayName || slot.playerName || (slot.targetRank ? `Rank #${slot.targetRank}` : 'TBD')
                                const hasPlayer = !!slot.playerId || !!slot.displayName

                                return (
                                    <div key={idx} className={`rounded-xl px-3 py-2.5 border ${hasPlayer ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-black ${
                                                hasPlayer ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-300'
                                            }`}>
                                                {slot.performanceNumber}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-bold break-words ${hasPlayer ? 'text-gray-900' : 'text-gray-300'}`} style={{ wordBreak: 'break-word' }}>
                                                    {displayLabel}
                                                </div>

                                                {pInfo?.clubName && (
                                                    <div className="text-[11px] mt-0.5 text-gray-500">{pInfo.clubName}</div>
                                                )}
                                                {slot.memberNames && (
                                                    <div className="text-[10px] mt-0.5 italic text-gray-400">{slot.memberNames}</div>
                                                )}

                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    {pInfo?.belt && (
                                                        <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${getBeltColor(pInfo.belt)}`}>
                                                            {pInfo.belt}
                                                        </span>
                                                    )}
                                                    {pInfo && calcAge(pInfo.birthDate) !== null && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                                                            {calcAge(pInfo.birthDate)}y
                                                        </span>
                                                    )}
                                                    {slot.assignedForms && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700">
                                                            {slot.assignedForms}
                                                        </span>
                                                    )}
                                                    {!isStartRound && slot.targetRank && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
                                                            Rank #{slot.targetRank}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
