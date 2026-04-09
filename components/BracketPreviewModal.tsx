'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
    X, Search, Loader2, Eye, RefreshCw, ChevronDown,
    ArrowRightLeft, Shuffle, Trophy, Shield, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { previewAllBrackets, previewCategoryBracket, movePlayerToCategory, generateAllBracketsFromPreview, updateCategoryDaySettings, simulateMatchSequence } from '@/app/actions'
import dynamic from 'next/dynamic'
import BracketListPDF from '@/components/pdf/BracketListPDF'

const PDFDownloadLink = dynamic(
    () => import('@react-pdf/renderer').then(mod => ({ default: mod.PDFDownloadLink })),
    { ssr: false }
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewPlayer {
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

interface PreviewMatch {
    id: number
    round: number
    player1: { id: string; name: string } | null
    player2: { id: string; name: string } | null
    nextMatchId: number | null
    nextMatchSlot: 'player1' | 'player2' | null
    isFinal: boolean
}

interface PoomsaePreviewSlot {
    round: number
    performanceNumber: number
    playerId: string | null
    playerName: string | null
    displayName: string | null
    memberNames: string | null
    targetRank: number | null
    assignedForms: string | null
}

interface PreviewCategoryData {
    categoryId: string
    categoryName: string
    gender: string | null
    skillLevel: string | null
    type: string
    subtype?: string | null
    playerCount: number
    players: PreviewPlayer[]
    specs: PreviewMatch[]
    poomsaeSpecs?: PoomsaePreviewSlot[]
    scheduleDay?: number | null
    deferFinals?: boolean
    deferFinalsToDay?: number | null
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

function isHeightBased(categoryName: string): boolean {
    const n = categoryName.toLowerCase()
    return n.includes('toddler') || n.includes('grade school') || n.includes('supertoddler')
}

function getRoundLabel(round: number, maxRound: number): string {
    if (maxRound === 1) return 'Final'
    if (round === maxRound) return 'Final'
    if (round === maxRound - 1) return 'Semifinal'
    if (round === maxRound - 2) return 'Quarterfinal'
    return `Round ${round}`
}

function getRoundStyle(round: number, maxRound: number) {
    if (round === maxRound) return { bg: 'bg-gradient-to-r from-amber-500 to-yellow-400', text: 'text-amber-900', border: 'border-amber-300' }
    if (round === maxRound - 1) return { bg: 'bg-gradient-to-r from-orange-500 to-orange-400', text: 'text-white', border: 'border-orange-300' }
    if (round === maxRound - 2) return { bg: 'bg-gradient-to-r from-blue-600 to-blue-500', text: 'text-white', border: 'border-blue-400' }
    return { bg: 'bg-gradient-to-r from-slate-600 to-slate-500', text: 'text-white', border: 'border-slate-400' }
}

function getSkillColor(skillLevel: string | null) {
    const s = (skillLevel || '').toLowerCase()
    if (s === 'advance' || s === 'advanced') return { border: 'border-l-red-500', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' }
    if (s === 'intermediate') return { border: 'border-l-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
    return { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
}

function getBeltColor(belt: string | null): string {
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

function getPoomsaeRoundLabel(round: number): string {
    if (round === 1) return 'Preliminary'
    if (round === 2) return 'Semi-Final'
    return 'Final'
}

// Returns the number of competing units (teams or individuals)
// PAIR = 2 players per team, TEAM = 3 players per team
function getCompetitorCount(playerCount: number, subtype?: string | null): number {
    if (!subtype || subtype === 'INDIVIDUAL') return playerCount
    if (subtype === 'PAIR') return Math.floor(playerCount / 2)
    if (subtype === 'TEAM') return Math.floor(playerCount / 3)
    return playerCount
}

// Each team member gets a medal: PAIR = 2 medals per placement, TEAM = 3
function getMedalMultiplier(subtype?: string | null): number {
    if (subtype === 'PAIR') return 2
    if (subtype === 'TEAM') return 3
    return 1
}

// ─── Extract seed order from R1 specs ─────────────────────────────────────────
// Returns the player IDs in the order they appear in Round 1 matches
function extractSeedOrder(specs: PreviewMatch[]): string[] {
    const r1 = specs.filter(s => s.round === 1).sort((a, b) => a.id - b.id)
    const ids: string[] = []
    for (const m of r1) {
        if (m.player1) ids.push(m.player1.id)
        if (m.player2) ids.push(m.player2.id)
    }
    // Also grab BYE recipients from higher rounds (players placed directly in R2+)
    const r1PlayerIds = new Set(ids)
    const allRounds = specs.filter(s => s.round > 1).sort((a, b) => a.round - b.round || a.id - b.id)
    for (const m of allRounds) {
        if (m.player1 && !r1PlayerIds.has(m.player1.id)) { ids.push(m.player1.id); r1PlayerIds.add(m.player1.id) }
        if (m.player2 && !r1PlayerIds.has(m.player2.id)) { ids.push(m.player2.id); r1PlayerIds.add(m.player2.id) }
    }
    return ids
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
    tournamentId: string
    tournamentName: string
    disciplineType: 'KYORUGI' | 'POOMSAE' | 'KYUKPA'
    open: boolean
    onClose: () => void
}

export default function BracketPreviewModal({ tournamentId, tournamentName, disciplineType, open, onClose }: Props) {
    const [data, setData]               = useState<PreviewCategoryData[]>([])
    const [localSpecs, setLocalSpecs]   = useState<Map<string, PreviewMatch[]>>(new Map())
    const [loading, setLoading]         = useState(false)
    const [generating, setGenerating]   = useState(false)
    const [reshuffling, setReshuffling] = useState<string | null>(null)
    const [selected, setSelected]       = useState<SelectedSlot | null>(null)
    const [movePicker, setMovePicker]   = useState<MovePicker | null>(null)
    const [movingPlayer, setMovingPlayer] = useState(false)
    const [expanded, setExpanded]       = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery]   = useState('')
    const [divisionFilter, setDivisionFilter] = useState<string>('All')
    const [skillFilter, setSkillFilter]       = useState<string>('All')
    const [activeDiscipline, setActiveDiscipline] = useState<'KYORUGI' | 'POOMSAE' | 'KYUKPA'>(disciplineType)
    const [globalMatchIds, setGlobalMatchIds] = useState<Record<string, Record<number, { globalId: number, day: number }>> | null>(null)
    const [simulatingSequence, setSimulatingSequence] = useState(false)

    const loadPreview = useCallback(async () => {
        setLoading(true)
        setSelected(null)
        setMovePicker(null)
        setGlobalMatchIds(null)
        setDivisionFilter('All')
        setSkillFilter('All')
        try {
            const result = await previewAllBrackets(tournamentId, activeDiscipline)
            setData(result)
            const map = new Map<string, PreviewMatch[]>()
            for (const cat of result) map.set(cat.categoryId, cat.specs)
            setLocalSpecs(map)
        } catch {
            toast.error('Failed to load bracket preview')
        } finally {
            setLoading(false)
        }
    }, [tournamentId, activeDiscipline])

    useEffect(() => {
        if (open) loadPreview()
    }, [open, loadPreview])

    function handlePlayerClick(catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) {
        if (selected?.catId === catId && selected.matchId === matchId && selected.slot === slot) {
            setSelected(null); return
        }
        if (!selected) { setSelected({ catId, matchId, slot, player }); return }
        if (selected.catId !== catId) {
            setSelected({ catId, matchId, slot, player })
            toast.info('Use the ⇆ Move button to transfer between categories.')
            return
        }
        // Swap within same category
        setLocalSpecs(prev => {
            const specs = [...(prev.get(catId) || [])].map(s => ({ ...s }))
            const matchA = specs.find(s => s.id === selected!.matchId)
            const matchB = specs.find(s => s.id === matchId)
            if (!matchA || !matchB) return prev
            const pA = selected!.slot === 'player1' ? matchA.player1 : matchA.player2
            const pB = slot === 'player1' ? matchB.player1 : matchB.player2
            if (selected!.slot === 'player1') matchA.player1 = pB
            else matchA.player2 = pB
            if (slot === 'player1') matchB.player1 = pA
            else matchB.player2 = pA
            return new Map(prev).set(catId, specs)
        })
        setSelected(null)
    }

    async function handleReshuffle(categoryId: string) {
        setReshuffling(categoryId)
        try {
            const result = await previewCategoryBracket(categoryId)
            if (result) { setLocalSpecs(prev => new Map(prev).set(categoryId, result.specs)); setSelected(null) }
        } catch { toast.error('Failed to reshuffle') }
        finally { setReshuffling(null) }
    }

    async function handleMove(targetCategoryId: string) {
        if (!movePicker) return
        setMovingPlayer(true)
        try {
            const result = await movePlayerToCategory(movePicker.playerId, targetCategoryId, tournamentId)
            if (result?.error) { toast.error(result.error); return }
            toast.success(`${movePicker.playerName} moved successfully`)
            setMovePicker(null); setSelected(null)
            setGlobalMatchIds(null)
            await loadPreview()
        } catch { toast.error('Move failed') }
        finally { setMovingPlayer(false) }
    }

    async function handleCalculateSequence() {
        setSimulatingSequence(true)
        try {
            const seedOrders: Record<string, string[]> = {}
            if (activeDiscipline !== 'POOMSAE') {
                for (const [catId, specs] of localSpecs.entries()) {
                    const order = extractSeedOrder(specs)
                    if (order.length > 0) seedOrders[catId] = order
                }
            }
            const res = await simulateMatchSequence(tournamentId, activeDiscipline, seedOrders)
            if (res.success && res.mapping) {
                setGlobalMatchIds(res.mapping)
                toast.success('Match numbers simulated')
            } else {
                toast.error(res.message || 'Simulation failed')
            }
        } catch {
            toast.error('Simulation failed')
        } finally {
            setSimulatingSequence(false)
        }
    }

    async function handleGenerateFromPreview() {
        setGenerating(true)
        try {
            // Build seed orders from current preview state (Kyorugi/Kyukpa only)
            const seedOrders: Record<string, string[]> = {}
            if (activeDiscipline !== 'POOMSAE') {
                for (const [catId, specs] of localSpecs.entries()) {
                    const order = extractSeedOrder(specs)
                    if (order.length > 0) seedOrders[catId] = order
                }
            }

            const result = await generateAllBracketsFromPreview(tournamentId, activeDiscipline, seedOrders)
            if (result?.success) {
                toast.success(`Generated ${result.count} ${activeDiscipline.toLowerCase()} brackets from preview!`)
                onClose()
            } else {
                toast.error(result?.message || 'Generation failed')
            }
        } catch {
            toast.error('Generation failed')
        } finally {
            setGenerating(false)
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

    // Extract unique divisions from category names (e.g. "Toddler", "Grade School", "Cadet", "Junior", "Senior (Under 30)")
    const divisions = ['All', ...Array.from(new Set(data.map(c => {
        const parts = c.categoryName.split(' ')
        const genderIdx = parts.findIndex(p => ['Male', 'Female', 'Mixed'].includes(p))
        return genderIdx > 0 ? parts.slice(0, genderIdx).join(' ') : parts[0]
    }))).sort()]

    const skillLevels = ['All', 'Novice', 'Intermediate', 'Advance']

    const filtered = data.filter(c => {
        if (searchQuery.trim() && !c.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) return false
        if (divisionFilter !== 'All') {
            const parts = c.categoryName.split(' ')
            const genderIdx = parts.findIndex(p => ['Male', 'Female', 'Mixed'].includes(p))
            const div = genderIdx > 0 ? parts.slice(0, genderIdx).join(' ') : parts[0]
            if (div !== divisionFilter) return false
        }
        if (skillFilter !== 'All' && activeDiscipline !== 'POOMSAE') {
            const sl = (c.skillLevel || 'Novice').toLowerCase()
            if (sl !== skillFilter.toLowerCase()) return false
        }
        return true
    })

    const disciplineLabels: Record<string, string> = { KYORUGI: 'Sparring', POOMSAE: 'Forms', KYUKPA: 'Board Breaking' }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-7xl mx-0 sm:mx-4 h-[96vh] sm:h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>

                {/* ── DARK HEADER ────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-6 py-5 border-b border-white/10">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <Eye size={18} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-lg font-black text-white tracking-tight">Bracket Preview</h2>
                                    <div className="flex items-center gap-1">
                                        {(['KYORUGI', 'POOMSAE', 'KYUKPA'] as const).map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setActiveDiscipline(d)}
                                                className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all hover:scale-105"
                                                style={activeDiscipline === d
                                                    ? { background: 'rgba(99,102,241,0.30)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }
                                                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }
                                                }
                                            >
                                                {d === 'KYORUGI' ? '⚔️' : d === 'POOMSAE' ? '🥋' : '🪵'} {disciplineLabels[d]}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-[11px] font-bold px-2 py-1 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                                        {filtered.length} categories
                                    </span>
                                    {filtered.length > 0 && (() => {
                                        const cats = filtered.filter(c => {
                                            const cc = getCompetitorCount(c.playerCount, c.subtype)
                                            return (activeDiscipline === 'POOMSAE' || activeDiscipline === 'KYUKPA') ? cc >= 1 : cc >= 2
                                        })
                                        const totalGold = cats.reduce((sum, c) => sum + getMedalMultiplier(c.subtype), 0)
                                        const totalSilver = cats.filter(c => getCompetitorCount(c.playerCount, c.subtype) >= 2)
                                            .reduce((sum, c) => sum + getMedalMultiplier(c.subtype), 0)
                                        const totalBronze = cats.reduce((sum, c) => {
                                            const cc = getCompetitorCount(c.playerCount, c.subtype)
                                            const m = getMedalMultiplier(c.subtype)
                                            return sum + (cc > 3 ? 2 * m : cc === 3 ? 1 * m : 0)
                                        }, 0)
                                        return (
                                            <span className="inline-flex items-center gap-2 text-[11px] font-black px-2.5 py-1 rounded-full"
                                                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                <span style={{ color: '#fbbf24' }}>🥇{totalGold}</span>
                                                <span style={{ color: '#94a3b8' }}>🥈{totalSilver}</span>
                                                <span style={{ color: '#cd7f32' }}>🥉{totalBronze}</span>
                                            </span>
                                        )
                                    })()}
                                </div>
                                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {activeDiscipline === 'POOMSAE'
                                        ? 'Preview performance order · Reshuffle to re-randomize'
                                        : 'Click two players in the same category to swap seeds · ⇆ Move transfers between categories'}
                                </p>
                            </div>
                        </div>

                        {/* Right: Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="relative hidden sm:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                                <input
                                    type="text"
                                    placeholder="Search category…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-2 text-xs font-medium rounded-xl w-44 border-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                                />
                            </div>
                            <button onClick={loadPreview} disabled={loading} title="Reload"
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                                style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <RefreshCw size={13} className={loading ? 'animate-spin text-indigo-400' : 'text-white/50'} />
                            </button>
                            <button onClick={onClose}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <X size={14} className="text-red-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── FILTER CHIPS ────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-5 py-2.5 border-b space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    {/* Division filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide flex-nowrap">
                        <span className="text-[10px] font-black uppercase tracking-wider flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>Division</span>
                        {divisions.map(div => (
                            <button
                                key={div}
                                onClick={() => setDivisionFilter(div)}
                                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                                style={divisionFilter === div
                                    ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }
                                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
                                }
                            >
                                {div}
                            </button>
                        ))}
                    </div>

                    {/* Skill level filter — Kyorugi only */}
                    {activeDiscipline === 'KYORUGI' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide flex-nowrap">
                            <span className="text-[10px] font-black uppercase tracking-wider flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>Skill</span>
                            {skillLevels.map(sk => {
                                const colors: Record<string, { active: string; dot: string }> = {
                                    All:          { active: 'linear-gradient(135deg, #6366f1, #8b5cf6)', dot: '' },
                                    Novice:       { active: 'linear-gradient(135deg, #10b981, #059669)', dot: '#10b981' },
                                    Intermediate: { active: 'linear-gradient(135deg, #3b82f6, #2563eb)', dot: '#3b82f6' },
                                    Advance:      { active: 'linear-gradient(135deg, #ef4444, #dc2626)', dot: '#ef4444' },
                                }
                                const c = colors[sk]
                                return (
                                    <button
                                        key={sk}
                                        onClick={() => setSkillFilter(sk)}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
                                        style={skillFilter === sk
                                            ? { background: c.active, color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
                                            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
                                        }
                                    >
                                        {sk !== 'All' && (
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: skillFilter === sk ? 'rgba(255,255,255,0.7)' : c.dot }} />
                                        )}
                                        {sk}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ── CONTENT ────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3"
                    style={{ background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)' }}>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <Loader2 size={26} className="animate-spin text-indigo-400" />
                            </div>
                            <p className="text-sm font-bold text-white/70">Computing brackets…</p>
                            <p className="text-xs text-white/30 mt-1">Running the draw for all {activeDiscipline} categories</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-sm text-white/40">No matching categories found.</p>
                        </div>
                    ) : filtered.map(cat => (
                        <CategoryCard
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
                            onMoveRequest={(pId, pName) => setMovePicker({ playerId: pId, playerName: pName, sourceCategoryId: cat.categoryId })}
                            onMoveTo={handleMove}
                            onMoveCancel={() => setMovePicker(null)}
                            movingPlayer={movingPlayer}
                            allCategories={data}
                            simulatedMatches={globalMatchIds?.[cat.categoryId]}
                        />
                    ))}
                </div>

                {/* ── FOOTER ─────────────────────────────────────────────── */}
                <div className="flex-shrink-0 px-6 py-3 border-t flex items-center justify-between"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.8)' }}>
                    <div className="flex items-center gap-4 flex-wrap">
                        {activeDiscipline !== 'POOMSAE' && [
                            { color: '#6366f1', label: 'Select + click another to swap' },
                            { color: '#a855f7', label: '⇆ Move saves to DB' },
                            { color: '#f59e0b', label: 'Gold = Final match' },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
                            Close
                        </button>
                        {/* Download PDF */}
                        {data.length > 0 && (
                            <PDFDownloadLink
                                document={
                                    <BracketListPDF
                                        tournamentName={tournamentName}
                                        discipline={activeDiscipline}
                                        categories={filtered}
                                        generatedAt={new Date().toLocaleString()}
                                    />
                                }
                                fileName={`${(tournamentName || 'tournament').replace(/\s+/g, '-')}-${activeDiscipline.toLowerCase()}-bracket-list.pdf`}
                            >
                                {({ loading: pdfLoading }: { loading: boolean }) => (
                                    <button
                                        disabled={pdfLoading}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-40"
                                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', boxShadow: '0 2px 12px rgba(14,165,233,0.3)' }}
                                    >
                                        {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                        {pdfLoading ? 'Preparing…' : 'Download List'}
                                    </button>
                                )}
                            </PDFDownloadLink>
                        )}
                        <button
                            onClick={handleCalculateSequence}
                            disabled={simulatingSequence || loading || data.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                        >
                            {simulatingSequence ? <Loader2 size={12} className="animate-spin" /> : <Shuffle size={12} />}
                            {simulatingSequence ? 'Calculating...' : 'Preview Sequence'}
                        </button>
                        <button
                            onClick={handleGenerateFromPreview}
                            disabled={generating || loading || data.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', boxShadow: '0 2px 12px rgba(22,163,74,0.3)' }}>
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Trophy size={12} />}
                            {generating ? 'Generating…' : 'Confirm & Generate All'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
    cat, localSpecs, isExpanded, onToggle, selected, onPlayerClick,
    isReshuffling, onReshuffle, movePicker, onMoveRequest, onMoveTo,
    onMoveCancel, movingPlayer, allCategories, simulatedMatches
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
    onMoveRequest: (pId: string, pName: string) => void
    onMoveTo: (targetId: string) => void
    onMoveCancel: () => void
    movingPlayer: boolean
    allCategories: PreviewCategoryData[]
    simulatedMatches?: Record<number, { globalId: number, day: number }>
}) {
    const [savingDay, startDayTransition] = useTransition()
    const [localScheduleDay, setLocalScheduleDay] = useState<number|null>(cat.scheduleDay ?? null)
    const [localDeferFinals, setLocalDeferFinals] = useState<boolean>(cat.deferFinals ?? true)
    const [localDeferDay, setLocalDeferDay] = useState<number|null>(cat.deferFinalsToDay ?? null)
    const [localDeferSemisToDay, setLocalDeferSemisToDay] = useState<number|null>((cat as any).deferSemisToDay ?? null)

    const skill = getSkillColor(cat.skillLevel)
    const isKyorugiBracket = cat.type === 'KYORUGI' && cat.playerCount >= 2
    const isPoomsae = cat.type === 'POOMSAE' || cat.type === 'KYUKPA'
    const maxRound = localSpecs.length > 0 ? Math.max(...localSpecs.map(s => s.round)) : 0
    const rounds = Array.from(new Set(localSpecs.map(s => s.round))).sort((a, b) => a - b)
    const hasSelection = selected?.catId === cat.categoryId
    const heightBased = isHeightBased(cat.categoryName)

    const otherCategories = allCategories.filter(c => c.categoryId !== cat.categoryId && c.type === cat.type)

    // Build player lookup for rich info display
    const playerMap = new Map<string, PreviewPlayer>()
    for (const p of cat.players) playerMap.set(p.id, p)

    // Poomsae: group by round
    const poomsaeRounds = isPoomsae && cat.poomsaeSpecs
        ? Array.from(new Set(cat.poomsaeSpecs.map(s => s.round))).sort((a, b) => a - b)
        : []

    // Count specs for display
    const specCount = isPoomsae
        ? (cat.poomsaeSpecs?.length || 0)
        : localSpecs.length

    return (
        <div className="rounded-2xl overflow-hidden transition-all duration-200"
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeftWidth: '4px',
                borderLeftColor: cat.type === 'POOMSAE' ? '#8b5cf6' : cat.type === 'KYUKPA' ? '#f59e0b' : (skill.dot === 'bg-red-500' ? '#ef4444' : skill.dot === 'bg-blue-500' ? '#3b82f6' : '#10b981'),
            }}>

            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
                style={{ background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                onClick={onToggle}>

                {/* Chevron */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isExpanded ? 'rotate-180' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <ChevronDown size={13} className="text-white/50" />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-white/90">{cat.categoryName}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {!isPoomsae && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${skill.badge}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${skill.dot}`} />
                                {cat.skillLevel || 'Novice'}
                            </span>
                        )}
                        {cat.gender && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                                {cat.gender}
                            </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                            {cat.playerCount} athletes
                        </span>
                        {(() => {
                            const cc = getCompetitorCount(cat.playerCount, cat.subtype)
                            const m = getMedalMultiplier(cat.subtype)
                            const showMedals = isPoomsae ? cc >= 1 : cc >= 2
                            if (!showMedals) return null
                            return (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-md"
                                    style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                    <span style={{ color: '#fbbf24' }}>🥇{1 * m}</span>
                                    {cc >= 2 && <span style={{ color: '#94a3b8' }}>🥈{1 * m}</span>}
                                    {cc >= 3 && <span style={{ color: '#cd7f32' }}>🥉{(cc > 3 ? 2 : 1) * m}</span>}
                                </span>
                            )
                        })()}
                        {isPoomsae && cat.subtype && cat.subtype !== 'INDIVIDUAL' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                                {cat.subtype}
                            </span>
                        )}
                        {!isPoomsae && cat.playerCount < 2 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                                ⚠ Needs 2+ players
                            </span>
                        )}
                    </div>
                </div>

                {/* Right stats & controls */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Inline day scheduling controls */}
                    <div className="flex items-center gap-1.5 mr-2">
                        <select
                            value={localScheduleDay ?? ''}
                            onChange={e => {
                                const parsed = e.target.value ? parseInt(e.target.value) : null;
                                setLocalScheduleDay(parsed);
                                startDayTransition(async () => { await updateCategoryDaySettings(cat.categoryId, parsed, localDeferFinals, localDeferDay); })
                            }}
                            disabled={savingDay}
                            className="text-[10px] font-bold bg-[#1e293b] text-indigo-300 border border-indigo-500/30 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-[#334155] focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                            title="Which day does this category play?"
                        >
                            <option value="">— Day</option>
                            <option value="1">Day 1</option>
                            <option value="2">Day 2</option>
                            <option value="3">Day 3</option>
                        </select>
                        {isKyorugiBracket && (
                            <select
                                value={
                                    !localDeferFinals ? 'seq'
                                    : localDeferSemisToDay === 2 ? 'semis-d2'
                                    : localDeferSemisToDay === 3 ? 'semis-d3'
                                    : localDeferDay === 2 ? 'finals-d2'
                                    : localDeferDay === 3 ? 'finals-d3'
                                    : 'end'
                                }
                                onChange={e => {
                                    const val = e.target.value
                                    let newDeferFinals = true
                                    let newDeferDay: number | null = null
                                    let newDeferSemisToDay: number | null = null

                                    if (val === 'seq')       { newDeferFinals = false }
                                    else if (val === 'end')  { newDeferFinals = true }
                                    else if (val === 'finals-d2') { newDeferFinals = true; newDeferDay = 2 }
                                    else if (val === 'finals-d3') { newDeferFinals = true; newDeferDay = 3 }
                                    else if (val === 'semis-d2')  { newDeferFinals = true; newDeferSemisToDay = 2 }
                                    else if (val === 'semis-d3')  { newDeferFinals = true; newDeferSemisToDay = 3 }

                                    setLocalDeferFinals(newDeferFinals)
                                    setLocalDeferDay(newDeferDay)
                                    setLocalDeferSemisToDay(newDeferSemisToDay)
                                    startDayTransition(async () => {
                                        await updateCategoryDaySettings(cat.categoryId, localScheduleDay, newDeferFinals, newDeferDay, newDeferSemisToDay)
                                    })
                                }}
                                disabled={savingDay || !localScheduleDay}
                                className="text-[10px] font-bold bg-[#1e293b] text-amber-300 border border-amber-500/30 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-[#334155] focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                                title="Finals / Semis handling"
                            >
                                <option value="seq">Sequential</option>
                                <option value="end">End of Day</option>
                                <option value="finals-d2">Finals → Day 2</option>
                                <option value="finals-d3">Finals → Day 3</option>
                                <option value="semis-d2">Semis + Finals → Day 2</option>
                                <option value="semis-d3">Semis + Finals → Day 3</option>
                            </select>
                        )}
                        {savingDay && <Loader2 size={12} className="animate-spin text-gray-400" />}
                    </div>

                    {(isKyorugiBracket || isPoomsae) && (
                        <button onClick={onReshuffle} disabled={isReshuffling}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all hover:scale-105 disabled:opacity-40"
                            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                            {isReshuffling ? <Loader2 size={10} className="animate-spin" /> : <Shuffle size={10} />}
                            Reshuffle
                        </button>
                    )}
                    <div className="text-right">
                        <div className="text-2xl font-black text-white/80 leading-none">{specCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {isPoomsae ? 'slots' : 'matches'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* Move Picker (Kyorugi/Kyukpa only) */}
                    {movePicker && !isPoomsae && (
                        <div className="px-4 py-3" style={{ background: 'rgba(168,85,247,0.08)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-xs font-black mb-2 flex items-center gap-2" style={{ color: '#c084fc' }}>
                                        <ArrowRightLeft size={12} />
                                        Move <span className="px-2 py-0.5 rounded-md text-[11px]"
                                            style={{ background: 'rgba(168,85,247,0.2)', color: '#e879f9' }}>
                                            {movePicker.playerName}
                                        </span> to:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                        {otherCategories.length === 0 ? (
                                            <p className="text-xs" style={{ color: 'rgba(168,85,247,0.6)' }}>No other categories available.</p>
                                        ) : otherCategories.map(target => (
                                            <button key={target.categoryId} onClick={() => onMoveTo(target.categoryId)}
                                                disabled={movingPlayer}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 disabled:opacity-40"
                                                style={{ background: 'rgba(168,85,247,0.15)', color: '#d946ef', border: '1px solid rgba(168,85,247,0.25)' }}>
                                                {movingPlayer ? <Loader2 size={9} className="animate-spin" /> : <Shield size={9} />}
                                                {target.categoryName}
                                                <span style={{ color: 'rgba(168,85,247,0.6)' }}>({target.playerCount})</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={onMoveCancel} className="text-purple-400/60 hover:text-purple-300 transition-colors mt-0.5">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── POOMSAE DISPLAY ───────────────────────────────── */}
                    {isPoomsae && cat.poomsaeSpecs && cat.poomsaeSpecs.length > 0 ? (
                        <div className="px-4 py-4 overflow-x-auto">
                            <div className="flex gap-4 min-w-max pb-2">
                                {poomsaeRounds.map(roundNum => {
                                    const roundSlots = cat.poomsaeSpecs!.filter(s => s.round === roundNum)
                                    const isStartRound = roundNum === poomsaeRounds[0]
                                    const isFinal      = roundNum === 3
                                    const roundLabel   = getPoomsaeRoundLabel(roundNum)

                                    return (
                                        <div key={roundNum} className="flex flex-col gap-1.5 flex-shrink-0" style={{ minWidth: 260 }}>
                                            {/* Round header */}
                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                                                style={{
                                                    background: isFinal
                                                        ? 'linear-gradient(135deg, #f59e0b, #eab308)'
                                                        : roundNum === 2
                                                            ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                }}>
                                                <span className={`text-[11px] font-black uppercase tracking-wider ${isFinal ? 'text-amber-900' : 'text-white'}`}>
                                                    {roundLabel}
                                                </span>
                                                <span className={`text-[10px] font-bold opacity-75 ${isFinal ? 'text-amber-900' : 'text-white'}`}>
                                                    {roundSlots.length} slot{roundSlots.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Performance slots */}
                                            {roundSlots.sort((a, b) => a.performanceNumber - b.performanceNumber).map((slot, idx) => {
                                                const pInfo = slot.playerId ? playerMap.get(slot.playerId) : null
                                                const displayLabel = slot.displayName || slot.playerName || (slot.targetRank ? `Rank #${slot.targetRank}` : 'TBD')
                                                const hasPlayer = !!slot.playerId || !!slot.displayName
                                                const simulation = simulatedMatches?.[slot.round]

                                                return (
                                                    <div key={idx} className="rounded-xl px-3 py-2.5 relative"
                                                        style={{
                                                            background: hasPlayer ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                                                            border: `1px solid ${hasPlayer ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                                                        }}>
                                                        
                                                        {simulation && (
                                                            <div className="absolute -top-2 -right-2 flex flex-col items-end pointer-events-none">
                                                                <span className="bg-indigo-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-lg shadow-indigo-500/20">
                                                                    Match #{simulation.globalId}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-indigo-300 bg-indigo-900/80 px-1.5 py-0.5 rounded shadow mt-0.5">
                                                                    Day {simulation.day}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-start gap-3">
                                                            {/* Number badge */}
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-black"
                                                                style={{
                                                                    background: hasPlayer ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                                                                    color: hasPlayer ? '#c4b5fd' : 'rgba(255,255,255,0.25)',
                                                                }}>
                                                                {slot.performanceNumber}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                {/* Name */}
                                                                <div className="text-sm font-bold break-words"
                                                                    style={{ color: hasPlayer ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)', wordBreak: 'break-word' }}>
                                                                    {displayLabel}
                                                                </div>

                                                                {/* Club + member names */}
                                                                {pInfo?.clubName && (
                                                                    <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                                        {pInfo.clubName}
                                                                    </div>
                                                                )}
                                                                {slot.memberNames && (
                                                                    <div className="text-[10px] mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                                        {slot.memberNames}
                                                                    </div>
                                                                )}

                                                                {/* Tags */}
                                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                    {pInfo?.belt && (
                                                                        <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${getBeltColor(pInfo.belt)}`}>
                                                                            {pInfo.belt}
                                                                        </span>
                                                                    )}
                                                                    {pInfo && calcAge(pInfo.birthDate) !== null && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                                                            style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
                                                                            {calcAge(pInfo.birthDate)}y
                                                                        </span>
                                                                    )}
                                                                    {slot.assignedForms && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                                                            style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                                                                            {slot.assignedForms}
                                                                        </span>
                                                                    )}
                                                                    {!isStartRound && slot.targetRank && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                                                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
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
                    ) : isPoomsae ? (
                        <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            No players registered in this category.
                        </div>
                    ) : null}

                    {/* ── KYORUGI / KYUKPA BRACKET ──────────────────────── */}
                    {!isPoomsae && localSpecs.length === 0 ? (
                        <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Not enough players to generate a bracket.
                        </div>
                    ) : !isPoomsae ? (
                        <div className="px-4 py-4 overflow-x-auto">
                            <div className="flex gap-4 min-w-max pb-2">
                                {rounds.map(roundNum => {
                                    const roundMatches = localSpecs.filter(s => s.round === roundNum)
                                    const roundStyle   = getRoundStyle(roundNum, maxRound)
                                    const label        = getRoundLabel(roundNum, maxRound)
                                    const isFirstRound = roundNum === 1
                                    const isFinalRound = roundNum === maxRound

                                    return (
                                        <div key={roundNum} className="flex flex-col gap-3 flex-shrink-0" style={{ minWidth: 260 }}>
                                            {/* Round header */}
                                            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${roundStyle.bg}`}>
                                                <div className="flex items-center gap-2">
                                                    {isFinalRound && <Trophy size={12} className="text-amber-900" />}
                                                    <span className={`text-[11px] font-black uppercase tracking-wider ${roundStyle.text}`}>{label}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold opacity-75 ${roundStyle.text}`}>
                                                    {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
                                                </span>
                                            </div>

                                            {/* Matches in this round */}
                                            {roundMatches.map(match => (
                                                <MatchCard
                                                    key={match.id}
                                                    match={match}
                                                    catId={cat.categoryId}
                                                    isFirstRound={isFirstRound}
                                                    isFinalRound={isFinalRound}
                                                    selected={selected}
                                                    onPlayerClick={onPlayerClick}
                                                    onMoveRequest={onMoveRequest}
                                                    hasMovePickerOpen={!!movePicker}
                                                    playerMap={playerMap}
                                                    heightBased={heightBased}
                                                    simulation={simulatedMatches?.[match.id]}
                                                />
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Hint text */}
                            {isKyorugiBracket && !hasSelection && (
                                <p className="text-[10px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    Click any Round 1 player to select · click another player to swap their seed positions
                                </p>
                            )}
                            {hasSelection && (
                                <p className="text-[11px] text-center mt-2 font-semibold animate-pulse" style={{ color: '#818cf8' }}>
                                    <span className="px-2 py-0.5 rounded-md" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                        {selected!.player.name}
                                    </span>{' '}selected — click another Round 1 player to swap
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}

// ─── Match Card (Kyorugi / Kyukpa) ───────────────────────────────────────────

function MatchCard({
    match, catId, isFirstRound, isFinalRound, selected, onPlayerClick,
    onMoveRequest, hasMovePickerOpen, playerMap, heightBased, simulation
}: {
    match: PreviewMatch
    catId: string
    isFirstRound: boolean
    isFinalRound: boolean
    selected: SelectedSlot | null
    onPlayerClick: (catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    playerMap: Map<string, PreviewPlayer>
    heightBased: boolean
    simulation?: { globalId: number, day: number }
}) {
    const isP1Selected = selected?.catId === catId && selected.matchId === match.id && selected.slot === 'player1'
    const isP2Selected = selected?.catId === catId && selected.matchId === match.id && selected.slot === 'player2'
    const hasCatSelected = !!selected && selected.catId === catId

    return (
        <div className="rounded-xl overflow-visible relative flex flex-col pt-0 pb-0"
            style={{
                background: isFinalRound ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isFinalRound ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isFinalRound ? '0 0 20px rgba(251,191,36,0.06)' : '0 1px 6px rgba(0,0,0,0.3)',
            }}>
            
            {simulation && (
                <div className="absolute -top-2.5 -right-2.5 flex flex-col items-end pointer-events-none z-10">
                    <span className="bg-indigo-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-lg shadow-indigo-500/20">
                        Match #{simulation.globalId}
                    </span>
                    <span className="text-[8px] font-bold text-indigo-300 bg-indigo-900/80 px-1.5 py-0.5 rounded shadow mt-0.5">
                        Day {simulation.day}
                    </span>
                </div>
            )}

            <PlayerSlot
                player={match.player1} slot="player1" matchId={match.id} catId={catId}
                isClickable={isFirstRound && !!match.player1} isSelected={isP1Selected}
                isOtherSelected={hasCatSelected && !isP1Selected} onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest} hasMovePickerOpen={hasMovePickerOpen}
                playerInfo={match.player1 ? playerMap.get(match.player1.id) ?? null : null} heightBased={heightBased}
            />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <PlayerSlot
                player={match.player2} slot="player2" matchId={match.id} catId={catId}
                isClickable={isFirstRound && !!match.player2} isSelected={isP2Selected}
                isOtherSelected={hasCatSelected && !isP2Selected} onPlayerClick={onPlayerClick}
                onMoveRequest={onMoveRequest} hasMovePickerOpen={hasMovePickerOpen}
                playerInfo={match.player2 ? playerMap.get(match.player2.id) ?? null : null} heightBased={heightBased}
            />
        </div>
    )
}

// ─── Player Slot (Kyorugi / Kyukpa) ──────────────────────────────────────────

function PlayerSlot({
    player, slot, matchId, catId, isClickable, isSelected, isOtherSelected,
    onPlayerClick, onMoveRequest, hasMovePickerOpen, playerInfo, heightBased
}: {
    player: { id: string; name: string } | null
    slot: 'player1' | 'player2'
    matchId: number
    catId: string
    isClickable: boolean
    isSelected: boolean
    isOtherSelected: boolean
    onPlayerClick: (catId: string, matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    playerInfo: PreviewPlayer | null
    heightBased: boolean
}) {
    if (!player) {
        return (
            <div className="px-3 py-2.5 text-[11px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>
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
            className={`group flex items-start gap-3 px-3 py-2.5 transition-all ${isClickable ? 'cursor-pointer' : ''}`}
            style={{
                background: isSelected
                    ? 'rgba(99,102,241,0.25)'
                    : isOtherSelected
                        ? 'rgba(99,102,241,0.06)'
                        : 'transparent',
                borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
            }}
            onClick={() => isClickable && onPlayerClick(catId, matchId, slot, player)}
        >
            {/* Club logo / initial */}
            <div className="flex-shrink-0 mt-0.5">
                {playerInfo?.clubLogoUrl ? (
                    <img src={playerInfo.clubLogoUrl} alt={playerInfo.clubName || ''}
                        className="w-8 h-8 rounded-full object-cover border"
                        style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
                        {(playerInfo?.clubName || player.name).charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info column */}
            <div className="flex-1 min-w-0">
                {/* Full name — NO TRUNCATION */}
                <div className="text-sm font-bold leading-snug text-white/90 break-words"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word', color: isSelected ? 'white' : undefined }}>
                    {player.name}
                </div>

                {/* Club name */}
                {playerInfo?.clubName && (
                    <div className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {playerInfo.clubName}
                    </div>
                )}

                {/* Tags: belt, age, metric */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {playerInfo?.belt && (
                        <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide ${beltClass}`}>
                            {playerInfo.belt}
                        </span>
                    )}
                    {age !== null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
                            {age}y
                        </span>
                    )}
                    {metric && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{
                                background: heightBased ? 'rgba(16,185,129,0.15)' : 'rgba(234,88,12,0.15)',
                                color:      heightBased ? '#6ee7b7' : '#fdba74',
                            }}>
                            {metric}
                        </span>
                    )}
                </div>
            </div>

            {/* Move button */}
            {!isSelected && !hasMovePickerOpen && isClickable && (
                <button
                    onClick={e => { e.stopPropagation(); onMoveRequest(player.id, player.name) }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all hover:scale-110 mt-0.5 p-1 rounded-lg"
                    style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}
                    title={`Move ${player.name} to another category`}>
                    <ArrowRightLeft size={11} />
                </button>
            )}
        </div>
    )
}
