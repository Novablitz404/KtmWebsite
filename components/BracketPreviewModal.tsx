'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    X, Search, Loader2, Eye, RefreshCw, ChevronDown,
    ArrowRightLeft, Users, Shield, Shuffle
} from 'lucide-react'
import { toast } from 'sonner'
import { previewAllBrackets, previewCategoryBracket, movePlayerToCategory } from '@/app/actions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PreviewPlayer {
    id: string
    name: string
    clubId: string | null
    clubName: string | null
    clubLogoUrl: string | null
}

interface PreviewMatch {
    id: number
    round: number
    player1: { id: string; name: string } | null
    player2: { id: string; name: string } | null
    nextMatchId: number | null
    nextMatchSlot: 'player1' | 'player2' | null
    isFinal: boolean
}

interface PreviewCategoryData {
    categoryId: string
    categoryName: string
    gender: string | null
    skillLevel: string | null
    type: string
    playerCount: number
    players: PreviewPlayer[]
    specs: PreviewMatch[]
}

interface SelectedSlot {
    catId: string
    matchId: number
    slot: 'player1' | 'player2'
    player: { id: string; name: string }
}

interface MovePicker {
    playerId: string
    playerName: string
    sourceCategoryId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoundLabel(round: number, maxRound: number): string {
    if (maxRound === 1) return 'Final'
    if (round === maxRound) return 'Final'
    if (round === maxRound - 1) return 'Semifinal'
    if (round === maxRound - 2) return 'Quarterfinal'
    return `Round ${round}`
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
    tournamentId: string
    disciplineType: 'KYORUGI' | 'POOMSAE' | 'KYUKPA'
    open: boolean
    onClose: () => void
}

export default function BracketPreviewModal({ tournamentId, disciplineType, open, onClose }: Props) {
    const [data, setData]             = useState<PreviewCategoryData[]>([])
    const [localSpecs, setLocalSpecs] = useState<Map<string, PreviewMatch[]>>(new Map())
    const [loading, setLoading]       = useState(false)
    const [reshuffling, setReshuffling] = useState<string | null>(null)
    const [selected, setSelected]     = useState<SelectedSlot | null>(null)
    const [movePicker, setMovePicker] = useState<MovePicker | null>(null)
    const [movingPlayer, setMovingPlayer] = useState(false)
    const [expanded, setExpanded]     = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    const loadPreview = useCallback(async () => {
        setLoading(true)
        setSelected(null)
        setMovePicker(null)
        try {
            const result = await previewAllBrackets(tournamentId, disciplineType)
            setData(result)
            const map = new Map<string, PreviewMatch[]>()
            for (const cat of result) map.set(cat.categoryId, cat.specs)
            setLocalSpecs(map)
        } catch {
            toast.error('Failed to load bracket preview')
        } finally {
            setLoading(false)
        }
    }, [tournamentId, disciplineType])

    useEffect(() => {
        if (open) loadPreview()
    }, [open, loadPreview])

    // ── Swap players within the same category ────────────────────────────────
    function handlePlayerClick(catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) {
        // Deselect same slot
        if (selected?.catId === catId && selected.matchId === matchId && selected.slot === slot) {
            setSelected(null)
            return
        }
        // No selection yet → select this player
        if (!selected) {
            setSelected({ catId, matchId, slot, player })
            return
        }
        // Different category → not swappable here
        if (selected.catId !== catId) {
            setSelected({ catId, matchId, slot, player })
            toast.info('To transfer between categories, use the ⇆ Move button instead.')
            return
        }
        // Swap within same category
        setLocalSpecs(prev => {
            const specs = [...(prev.get(catId) || [])].map(s => ({ ...s }))
            const matchA = specs.find(s => s.id === selected!.matchId)
            const matchB = specs.find(s => s.id === matchId)
            if (!matchA || !matchB) return prev

            const playerA = selected!.slot === 'player1' ? matchA.player1 : matchA.player2
            const playerB = slot === 'player1' ? matchB.player1 : matchB.player2

            if (selected!.slot === 'player1') matchA.player1 = playerB
            else matchA.player2 = playerB
            if (slot === 'player1') matchB.player1 = playerA
            else matchB.player2 = playerA

            return new Map(prev).set(catId, specs)
        })
        setSelected(null)
    }

    // ── Reshuffle one category bracket ───────────────────────────────────────
    async function handleReshuffle(categoryId: string) {
        setReshuffling(categoryId)
        try {
            const result = await previewCategoryBracket(categoryId)
            if (result) {
                setLocalSpecs(prev => new Map(prev).set(categoryId, result.specs))
                setSelected(null)
            }
        } catch {
            toast.error('Failed to reshuffle')
        } finally {
            setReshuffling(null)
        }
    }

    // ── Move player to another category (saves to DB) ────────────────────────
    async function handleMove(targetCategoryId: string) {
        if (!movePicker) return
        setMovingPlayer(true)
        try {
            const result = await movePlayerToCategory(movePicker.playerId, targetCategoryId, tournamentId)
            if (result?.error) { toast.error(result.error); return }
            toast.success(`${movePicker.playerName} moved`)
            setMovePicker(null)
            setSelected(null)
            await loadPreview()
        } catch {
            toast.error('Move failed')
        } finally {
            setMovingPlayer(false)
        }
    }

    function toggleExpanded(catId: string) {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(catId)) next.delete(catId)
            else next.add(catId)
            return next
        })
    }

    if (!open) return null

    const filteredData = searchQuery.trim()
        ? data.filter(c => c.categoryName.toLowerCase().includes(searchQuery.toLowerCase()))
        : data

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal box */}
            <div className="relative z-10 w-full max-w-6xl mx-4 h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                            <Eye size={16} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-gray-900">Bracket Preview</h2>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                                    {disciplineType}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {data.length} categories
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Preview only · Swaps within a category are visual · Use ⇆ Move to change a player's category · Click <strong>Generate All</strong> when ready
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input
                                type="text"
                                placeholder="Search category…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-7 pr-3 py-2 text-xs font-medium bg-gray-100 rounded-xl w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border-0"
                            />
                        </div>
                        <button
                            onClick={loadPreview}
                            disabled={loading}
                            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-colors"
                            title="Reload preview"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-500' : 'text-gray-500'} />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* ── Content ─────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                                <Loader2 size={24} className="animate-spin text-indigo-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Computing brackets…</p>
                            <p className="text-xs text-gray-400 mt-1">Running the draw for all {disciplineType} categories</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <p className="text-sm text-gray-400">No categories found.</p>
                            </div>
                        ) : filteredData.map(cat => (
                            <CategoryPreviewCard
                                key={cat.categoryId}
                                cat={cat}
                                localSpecs={localSpecs.get(cat.categoryId) || cat.specs}
                                isExpanded={expanded.has(cat.categoryId)}
                                onToggle={() => toggleExpanded(cat.categoryId)}
                                selected={selected}
                                onPlayerClick={handlePlayerClick}
                                isReshuffling={reshuffling === cat.categoryId}
                                onReshuffle={() => handleReshuffle(cat.categoryId)}
                                movePicker={movePicker?.sourceCategoryId === cat.categoryId ? movePicker : null}
                                onMoveRequest={(playerId, playerName) => setMovePicker({ playerId, playerName, sourceCategoryId: cat.categoryId })}
                                onMoveTo={handleMove}
                                onMoveCancel={() => setMovePicker(null)}
                                movingPlayer={movingPlayer}
                                allCategories={data}
                            />
                        ))}
                    </div>
                )}

                {/* ── Footer ──────────────────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-gray-50/80 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />
                            Click two players in the same category to swap seeds (visual only)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" />
                            ⇆ Move saves to database and reloads preview
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                    >
                        <X size={12} /> Close Preview
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryPreviewCard({
    cat, localSpecs, isExpanded, onToggle, selected, onPlayerClick,
    isReshuffling, onReshuffle, movePicker, onMoveRequest, onMoveTo,
    onMoveCancel, movingPlayer, allCategories
}: {
    cat: PreviewCategoryData
    localSpecs: PreviewMatch[]
    isExpanded: boolean
    onToggle: () => void
    selected: SelectedSlot | null
    onPlayerClick: (catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    isReshuffling: boolean
    onReshuffle: () => void
    movePicker: MovePicker | null
    onMoveRequest: (playerId: string, playerName: string) => void
    onMoveTo: (targetCategoryId: string) => void
    onMoveCancel: () => void
    movingPlayer: boolean
    allCategories: PreviewCategoryData[]
}) {
    const isR1Swappable = cat.type === 'KYORUGI' && cat.playerCount >= 2
    const maxRound = localSpecs.length > 0 ? Math.max(...localSpecs.map(s => s.round)) : 0
    const rounds = Array.from(new Set(localSpecs.map(s => s.round))).sort((a, b) => a - b)

    const hasSelection = selected?.catId === cat.categoryId

    const otherCategories = allCategories.filter(c =>
        c.categoryId !== cat.categoryId && c.type === cat.type
    )

    return (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
            hasSelection ? 'border-indigo-300 shadow-indigo-100' : 'border-gray-200 hover:border-gray-300'
        }`}>
            {/* Card header */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50/60 transition-colors"
                onClick={onToggle}
            >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isExpanded ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-100 border border-gray-200'
                }`}>
                    <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{cat.categoryName}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            <Users size={8} className="inline mr-1" />{cat.playerCount} players
                        </span>
                        {cat.skillLevel && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                {cat.skillLevel}
                            </span>
                        )}
                        {cat.gender && (
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {cat.gender}
                            </span>
                        )}
                        {cat.playerCount < 2 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                ⚠ Needs 2+ players
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {isR1Swappable && (
                        <button
                            onClick={onReshuffle}
                            disabled={isReshuffling}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all disabled:opacity-50"
                            title="Randomise this category's draw again"
                        >
                            {isReshuffling
                                ? <Loader2 size={10} className="animate-spin" />
                                : <Shuffle size={10} />
                            }
                            Reshuffle
                        </button>
                    )}
                    <div className="text-right">
                        <div className="text-lg font-black text-gray-800 leading-none">{localSpecs.length}</div>
                        <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">matches</div>
                    </div>
                </div>
            </div>

            {/* Expanded bracket + move picker */}
            {isExpanded && (
                <div className="border-t border-gray-100 animate-in fade-in duration-150">

                    {/* Move picker panel */}
                    {movePicker && (
                        <div className="px-5 py-3 bg-purple-50 border-b border-purple-100">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-xs font-black text-purple-800 flex items-center gap-1.5 mb-2">
                                        <ArrowRightLeft size={12} />
                                        Move <span className="bg-purple-200 px-1.5 py-0.5 rounded-md">{movePicker.playerName}</span> to:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                        {otherCategories.length === 0 ? (
                                            <p className="text-xs text-purple-500">No other categories available.</p>
                                        ) : otherCategories.map(target => (
                                            <button
                                                key={target.categoryId}
                                                onClick={() => onMoveTo(target.categoryId)}
                                                disabled={movingPlayer}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm disabled:opacity-50"
                                            >
                                                {movingPlayer
                                                    ? <Loader2 size={10} className="animate-spin" />
                                                    : <Shield size={9} />
                                                }
                                                <span className="truncate max-w-[180px]">{target.categoryName}</span>
                                                <span className="text-purple-400 text-[10px]">({target.playerCount})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={onMoveCancel}
                                    className="text-purple-400 hover:text-purple-700 transition-colors mt-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Bracket rounds */}
                    {localSpecs.length === 0 ? (
                        <div className="px-5 py-6 text-center text-xs text-gray-400">
                            Not enough players to generate a bracket.
                        </div>
                    ) : (
                        <div className="px-5 py-4 overflow-x-auto">
                            <div className="flex gap-3 min-w-max pb-2">
                                {rounds.map(roundNum => {
                                    const roundMatches = localSpecs.filter(s => s.round === roundNum)
                                    const isFirstRound = roundNum === 1
                                    return (
                                        <div key={roundNum} className="flex flex-col gap-2 w-52 flex-shrink-0">
                                            {/* Round label */}
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider text-center py-1 bg-gray-50 rounded-lg border border-gray-100">
                                                {getRoundLabel(roundNum, maxRound)}
                                            </div>
                                            {/* Matches */}
                                            {roundMatches.map(match => (
                                                <MatchPreviewCard
                                                    key={match.id}
                                                    match={match}
                                                    catId={cat.categoryId}
                                                    isFirstRound={isFirstRound}
                                                    selected={selected}
                                                    onPlayerClick={onPlayerClick}
                                                    onMoveRequest={onMoveRequest}
                                                    hasMovePickerOpen={!!movePicker}
                                                />
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Swap hint */}
                            {isR1Swappable && !hasSelection && (
                                <p className="text-[10px] text-gray-400 mt-2 text-center">
                                    Click any Round 1 player to select · click another to swap seeds
                                </p>
                            )}
                            {hasSelection && (
                                <p className="text-[10px] text-indigo-600 font-semibold mt-2 text-center animate-pulse">
                                    <span className="bg-indigo-100 px-2 py-0.5 rounded-md">
                                        {selected!.player.name}
                                    </span>{' '}
                                    selected — click another Round 1 player to swap
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Individual Match Card ────────────────────────────────────────────────────

function MatchPreviewCard({
    match, catId, isFirstRound, selected, onPlayerClick, onMoveRequest, hasMovePickerOpen
}: {
    match: PreviewMatch
    catId: string
    isFirstRound: boolean
    selected: SelectedSlot | null
    onPlayerClick: (catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (playerId: string, playerName: string) => void
    hasMovePickerOpen: boolean
}) {
    const isP1Selected = selected?.catId === catId && selected.matchId === match.id && selected.slot === 'player1'
    const isP2Selected = selected?.catId === catId && selected.matchId === match.id && selected.slot === 'player2'
    const hasAnySelected = !!selected && selected.catId === catId

    return (
        <div className={`rounded-xl border overflow-hidden transition-all duration-150 ${
            (isP1Selected || isP2Selected) ? 'border-indigo-300 shadow-md shadow-indigo-100' : 'border-gray-200'
        }`}>
            <PlayerSlot
                player={match.player1}
                slot="player1"
                matchId={match.id}
                catId={catId}
                isClickable={isFirstRound && !!match.player1}
                isSelected={isP1Selected}
                isOtherSelected={hasAnySelected && !isP1Selected}
                onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest}
                hasMovePickerOpen={hasMovePickerOpen}
            />
            <div className="h-px bg-gray-100" />
            <PlayerSlot
                player={match.player2}
                slot="player2"
                matchId={match.id}
                catId={catId}
                isClickable={isFirstRound && !!match.player2}
                isSelected={isP2Selected}
                isOtherSelected={hasAnySelected && !isP2Selected}
                onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest}
                hasMovePickerOpen={hasMovePickerOpen}
            />
        </div>
    )
}

function PlayerSlot({
    player, slot, matchId, catId, isClickable, isSelected, isOtherSelected,
    onPlayerClick, onMoveRequest, hasMovePickerOpen
}: {
    player: { id: string; name: string } | null
    slot: 'player1' | 'player2'
    matchId: number
    catId: string
    isClickable: boolean
    isSelected: boolean
    isOtherSelected: boolean
    onPlayerClick: (catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (playerId: string, playerName: string) => void
    hasMovePickerOpen: boolean
}) {
    if (!player) {
        return (
            <div className="px-3 py-2 text-[11px] text-gray-300 font-medium italic">
                Winner advances
            </div>
        )
    }

    return (
        <div className={`group flex items-center gap-2 px-3 py-2 transition-all ${
            isSelected
                ? 'bg-indigo-600 text-white'
                : isOtherSelected
                    ? 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer'
                    : isClickable
                        ? 'hover:bg-gray-50 cursor-pointer'
                        : ''
        }`}>
            {/* Initial badge */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                isSelected ? 'bg-white/30 text-white' : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
            }`}>
                {player.name.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <span
                className={`text-[11px] font-semibold truncate flex-1 ${
                    isSelected ? 'text-white' : 'text-gray-800'
                }`}
                onClick={() => isClickable && onPlayerClick(catId, matchId, slot, player)}
            >
                {player.name}
            </span>

            {/* Move button */}
            {!isSelected && !hasMovePickerOpen && (
                <button
                    onClick={e => { e.stopPropagation(); onMoveRequest(player.id, player.name) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded-md hover:bg-purple-100 text-purple-500"
                    title={`Move ${player.name} to another category`}
                >
                    <ArrowRightLeft size={10} />
                </button>
            )}
        </div>
    )
}
