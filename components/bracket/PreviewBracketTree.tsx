'use client'

// Same tree-layout/SVG-connector algorithm as BracketView.tsx (kept as a separate
// port rather than a shared import) — but rendering the not-yet-generated preview
// with the interactive MatchCard (click-to-swap, Move) instead of BracketView's
// own read-only MatchCard, since the two need different card interactivity.

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { Swords } from 'lucide-react'
import MatchCard from './MatchCard'
import { getRoundLabel, type PreviewMatch, type PreviewPlayer } from '@/lib/bracket-preview-helpers'

interface MatchNode {
    match: PreviewMatch
    children: MatchNode[]
}

const COL_WIDTH = 340
// Wider than BracketView's 160 — this card carries an extra header row (the
// Sim badge) that BracketView's cards don't, so it needs more vertical room
// per slot to avoid crowding/overlapping neighboring cards. A fully-populated
// slot (name + club + belt/age/metric badges, both players) sits right at the
// edge of this budget even with the club name truncated to one line, so this
// has some margin built in on top of that measured worst case.
const CARD_SLOT = 220

function buildTree(matches: PreviewMatch[]): MatchNode | null {
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

function collectOrdered(node: MatchNode, out: Map<number, PreviewMatch[]>) {
    node.children.forEach(c => collectOrdered(c, out))
    const round = node.match.round
    if (!out.has(round)) out.set(round, [])
    out.get(round)!.push(node.match)
}

function getOrderedRounds(root: MatchNode): Map<number, PreviewMatch[]> {
    const out = new Map<number, PreviewMatch[]>()
    collectOrdered(root, out)
    return out
}

function assignTreePositions(node: MatchNode): Map<number, number> {
    const positions = new Map<number, number>()
    let leafIndex = 0

    function traverse(n: MatchNode): number {
        if (n.children.length === 0) {
            const centerY = leafIndex * CARD_SLOT + CARD_SLOT / 2
            positions.set(n.match.id, centerY)
            leafIndex++
            return centerY
        }
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

interface BracketPath {
    d: string
    side: 'A' | 'B' | 'final' | null
}

const SIDE_COLORS: Record<string, string> = { A: '#93bbf0', B: '#f5a0a0', final: '#f5c542' }
const DEFAULT_LINE_COLOR = '#d1d5db'

function SvgConnectors({ paths, containerRef }: { paths: BracketPath[]; containerRef: React.RefObject<HTMLDivElement | null> }) {
    if (!paths.length || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    return (
        <svg className="absolute inset-0 pointer-events-none" width={rect.width} height={rect.height} style={{ zIndex: 1 }}>
            {paths.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke={(p.side && SIDE_COLORS[p.side]) || DEFAULT_LINE_COLOR} strokeWidth={1.5} opacity={0.85} />
            ))}
        </svg>
    )
}

interface CardHandlers {
    selected: { matchId: number; slot: 'player1' | 'player2' } | null
    onPlayerClick: (matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    playerMap: Map<string, PreviewPlayer>
    heightBased: boolean
}

function SideBracket({ rounds, maxRound, side, setCardRef, positions, leafCount, cardHandlers, simulatedMatches }: {
    rounds: PreviewMatch[][]
    maxRound: number
    side: 'A' | 'B'
    setCardRef: (id: number) => (el: HTMLDivElement | null) => void
    positions: Map<number, number>
    leafCount: number
    cardHandlers: CardHandlers
    simulatedMatches?: Record<number, { globalId: number; day: number }> | null
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
                                <div key={m.id} className="absolute left-0 right-0 flex justify-center" style={{ top: `${centerY}px`, transform: 'translateY(-50%)' }}>
                                    <div ref={setCardRef(m.id)}>
                                        <MatchCard
                                            match={m} isFirstRound={roundNumber === 1} isFinalRound={false} side={side}
                                            selected={cardHandlers.selected} onPlayerClick={cardHandlers.onPlayerClick}
                                            onMoveRequest={cardHandlers.onMoveRequest} hasMovePickerOpen={cardHandlers.hasMovePickerOpen}
                                            playerMap={cardHandlers.playerMap} heightBased={cardHandlers.heightBased}
                                            simulatedMatchNumber={simulatedMatches?.[m.id]?.globalId ?? null}
                                        />
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

export default function PreviewBracketTree({
    specs, playerMap, heightBased, selected, onPlayerClick, onMoveRequest, hasMovePickerOpen, simulatedMatches
}: {
    specs: PreviewMatch[]
    playerMap: Map<string, PreviewPlayer>
    heightBased: boolean
    selected: { matchId: number; slot: 'player1' | 'player2' } | null
    onPlayerClick: (matchId: number, slot: 'player1' | 'player2', player: { id: string; name: string }) => void
    onMoveRequest: (pId: string, pName: string) => void
    hasMovePickerOpen: boolean
    simulatedMatches?: Record<number, { globalId: number; day: number }> | null
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const [connectorPaths, setConnectorPaths] = useState<BracketPath[]>([])

    const setCardRef = useCallback((id: number) => (el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(id, el)
        else cardRefs.current.delete(id)
    }, [])

    const tree = buildTree(specs)
    const maxRound = specs.length ? Math.max(...specs.map(s => s.round)) : 1

    const aSideIds = new Set<number>()
    const bSideIds = new Set<number>()
    function collectIds(node: MatchNode, target: Set<number>) {
        target.add(node.match.id)
        node.children.forEach(c => collectIds(c, target))
    }
    const hasSplit = !!(tree && tree.children.length >= 2)
    if (hasSplit) {
        collectIds(tree!.children[0], aSideIds)
        collectIds(tree!.children[1], bSideIds)
    }
    const aSideIdsRef = useRef(aSideIds)
    const bSideIdsRef = useRef(bSideIds)
    aSideIdsRef.current = aSideIds
    bSideIdsRef.current = bSideIds

    const aSideRounds: PreviewMatch[][] = []
    const bSideRounds: PreviewMatch[][] = []
    if (hasSplit) {
        const aMap = getOrderedRounds(tree!.children[0])
        const bMap = getOrderedRounds(tree!.children[1])
        for (let r = 1; r < maxRound; r++) {
            aSideRounds.push(aMap.get(r) || [])
            bSideRounds.push(bMap.get(r) || [])
        }
    }

    const aPositions = useMemo(() => hasSplit ? assignTreePositions(tree!.children[0]) : new Map<number, number>(), [specs])
    const bPositions = useMemo(() => hasSplit ? assignTreePositions(tree!.children[1]) : new Map<number, number>(), [specs])
    const allPositions = useMemo(() => tree && !hasSplit ? assignTreePositions(tree) : new Map<number, number>(), [specs])

    const aLeafCount = hasSplit ? countLeaves(tree!.children[0]) : 0
    const bLeafCount = hasSplit ? countLeaves(tree!.children[1]) : 0
    const totalLeafCount = tree && !hasSplit ? countLeaves(tree) : 0

    const calculateConnectors = useCallback(() => {
        if (!containerRef.current) return
        const cRect = containerRef.current.getBoundingClientRect()
        const paths: BracketPath[] = []

        const groups = new Map<number, number[]>()
        specs.forEach(m => {
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
            const pm = specs.find(m => m.id === parentId)
            if (pm && !pm.nextMatchId) side = 'final'
            else if (aSideIdsRef.current.has(children[0].id)) side = 'A'
            else if (bSideIdsRef.current.has(children[0].id)) side = 'B'

            const midX = (Math.max(...children.map(c => c.x)) + px) / 2

            if (children.length === 1) {
                paths.push({ d: `M ${children[0].x} ${children[0].y} H ${px}`, side })
            } else {
                const topY = children[0].y
                const botY = children[children.length - 1].y
                const barTop = Math.min(topY, py)
                const barBot = Math.max(botY, py)
                children.forEach(c => { paths.push({ d: `M ${c.x} ${c.y} H ${midX}`, side }) })
                paths.push({ d: `M ${midX} ${barTop} V ${barBot}`, side })
                paths.push({ d: `M ${midX} ${py} H ${px}`, side })
            }
        })

        setConnectorPaths(paths)
    }, [specs])

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

    if (!specs.length) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Swords className="h-8 w-8 mb-3 text-gray-300" />
                <p className="font-medium">Not enough players to generate a bracket.</p>
            </div>
        )
    }
    if (!tree) return null

    const finalsMatch = tree.match
    const totalWidth = maxRound * COL_WIDTH
    const cardHandlers: CardHandlers = { selected, onPlayerClick, onMoveRequest, hasMovePickerOpen, playerMap, heightBased }

    if (!hasSplit) {
        const allMap = getOrderedRounds(tree)
        const allRounds: PreviewMatch[][] = []
        for (let r = 1; r <= maxRound; r++) allRounds.push(allMap.get(r) || [])
        const simpleHeight = totalLeafCount * CARD_SLOT

        return (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-inner">
                <div ref={containerRef} className="relative p-6" style={{ minWidth: `${totalWidth}px` }}>
                    <SvgConnectors paths={connectorPaths} containerRef={containerRef} />
                    <div className="flex mb-8" style={{ position: 'relative', zIndex: 2 }}>
                        {allRounds.map((_, i) => (
                            <div key={i} className="text-center" style={{ width: `${COL_WIDTH}px` }}>
                                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${i + 1 === maxRound ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                    {getRoundLabel(i + 1, maxRound)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex" style={{ position: 'relative', zIndex: 2, height: `${simpleHeight}px` }}>
                        {allRounds.map((roundMatches, i) => (
                            <div key={i} className="relative" style={{ width: `${COL_WIDTH}px` }}>
                                {roundMatches.map(m => {
                                    const centerY = allPositions.get(m.id) ?? 0
                                    return (
                                        <div key={m.id} className="absolute left-0 right-0 flex justify-center" style={{ top: `${centerY}px`, transform: 'translateY(-50%)' }}>
                                            <div ref={setCardRef(m.id)}>
                                                <MatchCard match={m} isFirstRound={i + 1 === 1} isFinalRound={i + 1 === maxRound} side={null} {...cardHandlers}
                                                    simulatedMatchNumber={simulatedMatches?.[m.id]?.globalId ?? null} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 shadow-inner">
            <div ref={containerRef} className="relative p-6 pb-8" style={{ minWidth: `${totalWidth}px` }}>
                <SvgConnectors paths={connectorPaths} containerRef={containerRef} />

                <div className="flex mb-2" style={{ position: 'relative', zIndex: 2 }}>
                    {Array.from({ length: maxRound }, (_, i) => (
                        <div key={i} className="text-center" style={{ width: `${COL_WIDTH}px` }}>
                            <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${i + 1 === maxRound ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-md shadow-amber-200/50' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                {getRoundLabel(i + 1, maxRound)}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div className="flex items-center gap-2 mt-6 mb-3 pl-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> A Side
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-200/70 to-transparent" />
                    </div>
                    <SideBracket rounds={aSideRounds} maxRound={maxRound} side="A" setCardRef={setCardRef} positions={aPositions} leafCount={aLeafCount} cardHandlers={cardHandlers} simulatedMatches={simulatedMatches} />
                </div>

                <div className="flex items-center my-8" style={{ position: 'relative', zIndex: 2 }}>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1 h-px bg-gradient-to-r from-blue-300 via-slate-300 to-red-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] shrink-0">Draw Line</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-300 via-slate-300 to-transparent" />
                    </div>
                    <div className="flex justify-center" style={{ width: `${COL_WIDTH}px` }}>
                        <div ref={setCardRef(finalsMatch.id)}>
                            <MatchCard match={finalsMatch} isFirstRound={false} isFinalRound={true} side="final" {...cardHandlers}
                                simulatedMatchNumber={simulatedMatches?.[finalsMatch.id]?.globalId ?? null} />
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div className="flex items-center gap-2 mb-3 pl-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> B Side
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-red-200/70 to-transparent" />
                    </div>
                    <SideBracket rounds={bSideRounds} maxRound={maxRound} side="B" setCardRef={setCardRef} positions={bPositions} leafCount={bLeafCount} cardHandlers={cardHandlers} simulatedMatches={simulatedMatches} />
                </div>
            </div>
        </div>
    )
}
