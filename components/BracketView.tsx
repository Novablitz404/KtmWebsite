'use client'

import { Match } from '@prisma/client'
import { pdf } from '@react-pdf/renderer'
import { Download, Trophy, Swords } from 'lucide-react'
import BracketPDF from './pdf/BracketPDF'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'

interface BracketViewProps {
    matches: Match[]
    tournamentName?: string
    categoryName?: string
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchNode {
    match: Match
    children: MatchNode[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COL_WIDTH = 340  // px per round column
const CARD_SLOT = 160  // vertical space per leaf (card ~130px + 30px gap)

// ─── Tree Builder ────────────────────────────────────────────────────────────

function buildTree(matches: Match[]): MatchNode | null {
    if (matches.length === 0) return null
    const nodeMap = new Map<number, MatchNode>()
    matches.forEach(m => nodeMap.set(m.id, { match: m, children: [] }))

    let root: MatchNode | null = null
    matches.forEach(m => {
        if (m.nextMatchId && nodeMap.has(m.nextMatchId)) {
            const parent = nodeMap.get(m.nextMatchId)!
            if (m.nextMatchSlot === 'player1') parent.children.unshift(nodeMap.get(m.id)!)
            else parent.children.push(nodeMap.get(m.id)!)
        } else if (!m.nextMatchId) {
            root = nodeMap.get(m.id)!
        }
    })
    return root
}

// ─── Collect matches in tree-traversal order per round ───────────────────────

function collectOrdered(node: MatchNode, out: Map<number, Match[]>) {
    node.children.forEach(c => collectOrdered(c, out))
    const round = node.match.round
    if (!out.has(round)) out.set(round, [])
    out.get(round)!.push(node.match)
}

function getOrderedRounds(root: MatchNode): Map<number, Match[]> {
    const out = new Map<number, Match[]>()
    collectOrdered(root, out)
    return out
}

// ─── Tree-Based Position Calculation ─────────────────────────────────────────
//
// Assigns Y center positions so each parent is exactly centered between its
// children. Leaf nodes get evenly spaced slots. This guarantees perfectly
// proportional bracket merge connectors regardless of bracket size.
//

function assignTreePositions(node: MatchNode): Map<number, number> {
    const positions = new Map<number, number>()
    let leafIndex = 0

    function traverse(n: MatchNode): number {
        if (n.children.length === 0) {
            // Leaf node → assign sequential slot
            const centerY = leafIndex * CARD_SLOT + CARD_SLOT / 2
            positions.set(n.match.id, centerY)
            leafIndex++
            return centerY
        }

        // Parent → center between children
        const childCenters = n.children.map(child => traverse(child))
        const centerY = childCenters.reduce((a, b) => a + b, 0) / childCenters.length
        positions.set(n.match.id, centerY)
        return centerY
    }

    traverse(node)
    return positions
}

function countLeaves(node: MatchNode): number {
    if (node.children.length === 0) return 1
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

// ─── Round Label ─────────────────────────────────────────────────────────────

function getRoundLabel(round: number, maxRound: number): string {
    if (round === maxRound) return 'FINALS'
    if (round === maxRound - 1) return 'SEMI-FINALS'
    if (round === maxRound - 2) return 'QUARTER-FINALS'
    return `ROUND ${round}`
}

// ─── Match Card ──────────────────────────────────────────────────────────────

function MatchCard({ match, maxRound, side, feederMap }: { match: Match; maxRound: number; side: 'A' | 'B' | 'final' | null; feederMap?: Map<string, number | string> }) {
    const isFiller = match.player1 === 'BYE' && match.player2 === 'BYE'
    const isFinal = match.round === maxRound

    const displayName = (name: string, slot: 'player1' | 'player2') => {
        if (name === 'BYE') return <span className="text-gray-400 italic text-xs font-medium">BYE</span>
        if (name === 'TBD' && feederMap) {
            const feederId = feederMap.get(`${match.id}-${slot}`)
            if (feederId) return <span className="text-gray-400 italic text-xs font-medium">Winner of #{feederId}</span>
        }
        if (name === 'TBD') return <span className="text-gray-400 italic text-xs font-medium">TBD</span>
        return name
    }

    const getStatusColor = () => {
        if (match.winner) return 'bg-gray-800 text-white'
        if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE')
            return 'bg-emerald-500 text-white animate-pulse'
        return 'bg-gray-200 text-gray-500'
    }

    const blueTotal = match.r1_blue_score + match.r2_blue_score + match.r3_blue_score
    const redTotal = match.r1_red_score + match.r2_red_score + match.r3_red_score
    const hasScores = match.winner || blueTotal > 0 || redTotal > 0

    const accent = side === 'A' ? 'border-l-[3px] border-l-blue-400'
        : side === 'B' ? 'border-l-[3px] border-l-red-400'
            : side === 'final' ? 'border-l-[3px] border-l-amber-400' : ''

    return (
        <div className={`transition-all duration-200 ${isFiller ? 'opacity-20 pointer-events-none grayscale' : 'hover:scale-[1.02]'}`}>
            <div className={`
                w-[260px] rounded-lg overflow-hidden border transition-shadow duration-200 ${accent}
                ${isFinal
                    ? 'bg-gradient-to-br from-amber-50 to-white border-amber-300 shadow-lg shadow-amber-100/50 ring-1 ring-amber-200/50'
                    : match.winner ? 'bg-white border-gray-300 shadow-md' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                }
            `}>
                {/* Header */}
                <div className={`px-3 py-1.5 flex justify-between items-center border-b ${isFinal ? 'bg-amber-50/80 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-1.5">
                        {isFinal && <Trophy size={10} className="text-amber-500" />}
                        <span className={`text-[10px] uppercase tracking-widest font-black ${isFinal ? 'text-amber-700' : 'text-gray-500'}`}>
                            {getRoundLabel(match.round, maxRound)}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {match.court && match.court !== 'Unassigned' && (
                            <span className="text-[9px] font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">C{match.court}</span>
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getStatusColor()}`}>#{match.matchId ?? match.id}</span>
                    </div>
                </div>

                {/* Player 1 (Blue / Chong) */}
                <div className={`px-3 py-2 flex justify-between items-center border-b border-gray-100 relative ${match.winner === match.player1 ? 'bg-blue-50/60' : ''}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                    <div className="flex flex-col pl-2 min-w-0 flex-1">
                        <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Chong (Blue)</span>
                        <span className={`text-sm truncate transition-colors ${match.winner ? (match.winner === match.player1 ? 'font-black text-gray-900' : 'font-medium text-gray-400 line-through decoration-2') : 'font-bold text-gray-800'}`}>
                            {displayName(match.player1, 'player1')}
                        </span>
                    </div>
                    {hasScores && <span className={`text-lg font-black font-mono tabular-nums ml-2 ${match.winner === match.player1 ? 'text-blue-600' : 'text-gray-300'}`}>{blueTotal}</span>}
                </div>

                {/* Player 2 (Red / Hong) */}
                <div className={`px-3 py-2 flex justify-between items-center relative ${match.winner === match.player2 ? 'bg-red-50/60' : ''}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r" />
                    <div className="flex flex-col pl-2 min-w-0 flex-1">
                        <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider mb-0.5">Hong (Red)</span>
                        <span className={`text-sm truncate transition-colors ${match.winner ? (match.winner === match.player2 ? 'font-black text-gray-900' : 'font-medium text-gray-400 line-through decoration-2') : 'font-bold text-gray-800'}`}>
                            {displayName(match.player2, 'player2')}
                        </span>
                    </div>
                    {hasScores && <span className={`text-lg font-black font-mono tabular-nums ml-2 ${match.winner === match.player2 ? 'text-red-600' : 'text-gray-300'}`}>{redTotal}</span>}
                </div>
            </div>
        </div>
    )
}

// ─── SVG Connectors (Classic Bracket Merge Pattern) ──────────────────────────
//
//   Child 1 ──────┐
//                  ├──── Parent
//   Child 2 ──────┘
//

interface BracketPath {
    d: string
    side: 'A' | 'B' | 'final' | null
}

const SIDE_COLORS: Record<string, string> = {
    A: '#93bbf0',
    B: '#f5a0a0',
    final: '#f5c542',
}
const DEFAULT_LINE_COLOR = '#d1d5db'

function SvgConnectors({ paths, containerRef }: { paths: BracketPath[]; containerRef: React.RefObject<HTMLDivElement | null> }) {
    if (!paths.length || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return (
        <svg className="absolute inset-0 pointer-events-none" width={rect.width} height={rect.height} style={{ zIndex: 1 }}>
            {paths.map((p, i) => (
                <path key={i} d={p.d} fill="none"
                    stroke={(p.side && SIDE_COLORS[p.side]) || DEFAULT_LINE_COLOR}
                    strokeWidth={1.5}
                    opacity={0.85}
                />
            ))}
        </svg>
    )
}

// ─── Side Bracket (tree-positioned round columns) ────────────────────────────

function SideBracket({ rounds, maxRound, side, setCardRef, positions, leafCount, feederMap }: {
    rounds: Match[][]
    maxRound: number
    side: 'A' | 'B'
    setCardRef: (id: number) => (el: HTMLDivElement | null) => void
    feederMap: Map<string, number | string>
    positions: Map<number, number>
    leafCount: number
}) {
    const totalHeight = leafCount * CARD_SLOT

    return (
        <div className="flex" style={{ height: `${totalHeight}px` }}>
            {Array.from({ length: maxRound }, (_, roundIdx) => {
                const roundNumber = roundIdx + 1
                const roundMatches = roundIdx < rounds.length ? rounds[roundIdx] : []
                const isFinalCol = roundNumber === maxRound

                return (
                    <div key={roundIdx} className="relative" style={{ width: `${COL_WIDTH}px` }}>
                        {!isFinalCol && roundMatches.map(m => {
                            const centerY = positions.get(m.id) ?? 0
                            return (
                                <div key={m.id}
                                    className="absolute left-0 right-0 flex justify-center"
                                    style={{ top: `${centerY}px`, transform: 'translateY(-50%)' }}
                                >
                                    <div ref={setCardRef(m.id)}>
                                        <MatchCard match={m} maxRound={maxRound} side={side} feederMap={feederMap} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            })}
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BracketView({ matches, tournamentName = "Tournament", categoryName = "Category" }: BracketViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const [connectorPaths, setConnectorPaths] = useState<BracketPath[]>([])

    const handleDownloadPDF = async () => {
        const blob = await pdf(<BracketPDF tournamentName={tournamentName} categoryName={categoryName} matches={matches} />).toBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${categoryName}-bracket.pdf`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
    }

    const setCardRef = useCallback((id: number) => (el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el)
        else cardRefs.current.delete(id)
    }, [])

    // Build tree
    const tree = buildTree(matches)
    const maxRound = matches.length ? Math.max(...matches.map(m => m.round)) : 1

    // Split into A-side / B-side
    const aSideIds = new Set<number>()
    const bSideIds = new Set<number>()

    function collectIds(node: MatchNode, target: Set<number>) {
        target.add(node.match.id)
        node.children.forEach(c => collectIds(c, target))
    }

    const hasSplit = tree && tree.children.length >= 2
    if (hasSplit) {
        collectIds(tree!.children[0], aSideIds)
        collectIds(tree!.children[1], bSideIds)
    }

    const aSideIdsRef = useRef(aSideIds)
    const bSideIdsRef = useRef(bSideIds)
    aSideIdsRef.current = aSideIds
    bSideIdsRef.current = bSideIds

    // Build per-side ordered rounds
    let aSideRounds: Match[][] = []
    let bSideRounds: Match[][] = []

    if (hasSplit) {
        const aMap = getOrderedRounds(tree!.children[0])
        const bMap = getOrderedRounds(tree!.children[1])
        for (let r = 1; r < maxRound; r++) {
            aSideRounds.push(aMap.get(r) || [])
            bSideRounds.push(bMap.get(r) || [])
        }
    }

    // ─── Tree-based position maps ────────────────────────────────────────
    const aPositions = useMemo(() => hasSplit ? assignTreePositions(tree!.children[0]) : new Map<number, number>(), [matches])
    const bPositions = useMemo(() => hasSplit ? assignTreePositions(tree!.children[1]) : new Map<number, number>(), [matches])
    const allPositions = useMemo(() => tree && !hasSplit ? assignTreePositions(tree) : new Map<number, number>(), [matches])

    const aLeafCount = hasSplit ? countLeaves(tree!.children[0]) : 0
    const bLeafCount = hasSplit ? countLeaves(tree!.children[1]) : 0
    const totalLeafCount = tree && !hasSplit ? countLeaves(tree) : 0

    // ─── Feeder map: parentMatchId-slot → feeder match's display ID ──────
    const feederMap = useMemo(() => {
        const map = new Map<string, number | string>()
        matches.forEach(m => {
            if (m.nextMatchId && m.nextMatchSlot) {
                map.set(`${m.nextMatchId}-${m.nextMatchSlot}`, m.matchId ?? m.id)
            }
        })
        return map
    }, [matches])

    // ─── Classic bracket merge connector calculation ──────────────────────
    const calculateConnectors = useCallback(() => {
        if (!containerRef.current) return
        const cRect = containerRef.current.getBoundingClientRect()
        const paths: BracketPath[] = []

        // Group children by parent match ID
        const groups = new Map<number, number[]>()
        matches.forEach(m => {
            if (!m.nextMatchId) return
            if (!groups.has(m.nextMatchId)) groups.set(m.nextMatchId, [])
            groups.get(m.nextMatchId)!.push(m.id)
        })

        groups.forEach((childIds, parentId) => {
            const pEl = cardRefs.current.get(parentId)
            if (!pEl) return
            const pr = pEl.getBoundingClientRect()
            const px = pr.left - cRect.left
            const py = pr.top + pr.height / 2 - cRect.top

            const children = childIds
                .map(id => {
                    const el = cardRefs.current.get(id)
                    if (!el) return null
                    const r = el.getBoundingClientRect()
                    return { id, x: r.right - cRect.left, y: r.top + r.height / 2 - cRect.top }
                })
                .filter((c): c is { id: number; x: number; y: number } => c !== null)
                .sort((a, b) => a.y - b.y)

            if (!children.length) return

            let side: BracketPath['side'] = null
            const pm = matches.find(m => m.id === parentId)
            if (pm && !pm.nextMatchId) side = 'final'
            else if (aSideIdsRef.current.has(children[0].id)) side = 'A'
            else if (bSideIdsRef.current.has(children[0].id)) side = 'B'

            const midX = (Math.max(...children.map(c => c.x)) + px) / 2

            if (children.length === 1) {
                paths.push({ d: `M ${children[0].x} ${children[0].y} H ${px}`, side })
            } else {
                const topY = children[0].y
                const botY = children[children.length - 1].y

                // Vertical bar spans children AND parent center Y
                const barTop = Math.min(topY, py)
                const barBot = Math.max(botY, py)

                // Horizontal stubs from each child to vertical bar
                children.forEach(c => {
                    paths.push({ d: `M ${c.x} ${c.y} H ${midX}`, side })
                })

                // Vertical bar
                paths.push({ d: `M ${midX} ${barTop} V ${barBot}`, side })

                // Horizontal from bar at parent's center Y → parent card
                paths.push({ d: `M ${midX} ${py} H ${px}`, side })
            }
        })

        setConnectorPaths(paths)
    }, [matches])

    useEffect(() => {
        const t = setTimeout(calculateConnectors, 150)
        window.addEventListener('resize', calculateConnectors)
        return () => { clearTimeout(t); window.removeEventListener('resize', calculateConnectors) }
    }, [calculateConnectors])

    useEffect(() => {
        const obs = new ResizeObserver(calculateConnectors)
        if (containerRef.current) obs.observe(containerRef.current)
        return () => obs.disconnect()
    }, [calculateConnectors])

    // ─── Empty State ─────────────────────────────────────────────────────────
    if (!matches.length) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Swords className="h-8 w-8 mb-3 text-gray-300" />
                <p className="font-medium">No bracket generated yet.</p>
                <p className="text-sm mt-1">Generate matches to see the bracket.</p>
            </div>
        )
    }

    if (!tree) return null

    const finalsMatch = tree.match
    const totalWidth = maxRound * COL_WIDTH

    // ─── Simple bracket (no A/B split — 2-3 players) ────────────────────────
    if (!hasSplit) {
        const allMap = getOrderedRounds(tree)
        const allRounds: Match[][] = []
        for (let r = 1; r <= maxRound; r++) allRounds.push(allMap.get(r) || [])
        const simpleHeight = totalLeafCount * CARD_SLOT

        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
                        <Download size={16} /> Download Bracket PDF
                    </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-inner">
                    <div ref={containerRef} className="relative p-6" style={{ minWidth: `${totalWidth}px` }}>
                        <SvgConnectors paths={connectorPaths} containerRef={containerRef} />
                        <div className="flex" style={{ position: 'relative', zIndex: 2, height: `${simpleHeight}px` }}>
                            {allRounds.map((roundMatches, i) => (
                                <div key={i} className="relative" style={{ width: `${COL_WIDTH}px` }}>
                                    <div className="absolute -top-10 left-0 right-0 text-center">
                                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${i + 1 === maxRound ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                            {getRoundLabel(i + 1, maxRound)}
                                        </span>
                                    </div>
                                    {roundMatches.map(m => {
                                        const centerY = allPositions.get(m.id) ?? 0
                                        return (
                                            <div key={m.id}
                                                className="absolute left-0 right-0 flex justify-center"
                                                style={{ top: `${centerY}px`, transform: 'translateY(-50%)' }}
                                            >
                                                <div ref={setCardRef(m.id)}>
                                                    <MatchCard match={m} maxRound={maxRound} side={null} feederMap={feederMap} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ─── A/B Split Layout ────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
                    <Download size={16} /> Download Bracket PDF
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-inner">
                <div ref={containerRef} className="relative p-6 pb-8" style={{ minWidth: `${totalWidth}px` }}>
                    <SvgConnectors paths={connectorPaths} containerRef={containerRef} />

                    {/* ── Round Headers ── */}
                    <div className="flex mb-2" style={{ position: 'relative', zIndex: 2 }}>
                        {Array.from({ length: maxRound }, (_, i) => (
                            <div key={i} className="text-center" style={{ width: `${COL_WIDTH}px` }}>
                                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    i + 1 === maxRound
                                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md shadow-amber-200/50'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                    {getRoundLabel(i + 1, maxRound)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── A Side ── */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div className="flex items-center gap-2 mt-6 mb-3 pl-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                A Side
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-blue-200/70 to-transparent" />
                        </div>
                        <SideBracket
                            rounds={aSideRounds}
                            maxRound={maxRound}
                            side="A"
                            setCardRef={setCardRef}
                            positions={aPositions}
                            leafCount={aLeafCount}
                            feederMap={feederMap}
                        />
                    </div>

                    {/* ── Draw Line + Finals Card ── */}
                    <div className="flex items-center my-8" style={{ position: 'relative', zIndex: 2 }}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1 h-px bg-gradient-to-r from-blue-300 via-slate-300 to-red-300" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">Draw Line</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-slate-300 via-slate-300 to-transparent" />
                        </div>
                        <div className="flex justify-center" style={{ width: `${COL_WIDTH}px` }}>
                            <div ref={setCardRef(finalsMatch.id)}>
                                <MatchCard match={finalsMatch} maxRound={maxRound} side="final" feederMap={feederMap} />
                            </div>
                        </div>
                    </div>

                    {/* ── B Side ── */}
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div className="flex items-center gap-2 mb-3 pl-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                B Side
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-red-200/70 to-transparent" />
                        </div>
                        <SideBracket
                            rounds={bSideRounds}
                            maxRound={maxRound}
                            side="B"
                            setCardRef={setCardRef}
                            positions={bPositions}
                            leafCount={bLeafCount}
                            feederMap={feederMap}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
