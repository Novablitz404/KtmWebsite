/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { Match } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────────

interface MatchNode {
    match: Match;
    children: MatchNode[];
}

interface BracketPDFProps {
    tournamentName: string;
    categoryName: string;
    matches: Match[];
}

// ── A4 Landscape dimensions (pts) ───────────────────────────────────────────────
const PAGE_W = 842;
const PAGE_H = 595;
const PAD_X = 28;
const PAD_Y = 20;
const HEADER_H = 48;
const FOOTER_H = 20;

const DRAW_W = PAGE_W - PAD_X * 2;
const DRAW_H = PAGE_H - PAD_Y * 2 - HEADER_H - FOOTER_H - 16; // 16pt for round labels

// ── Colors ──────────────────────────────────────────────────────────────────────
const COLORS = {
    dark: '#0F172A',       // slate-900
    medium: '#475569',     // slate-600
    light: '#94A3B8',      // slate-400
    border: '#E2E8F0',     // slate-200
    bg: '#F8FAFC',         // slate-50
    white: '#FFFFFF',
    blue: '#3B82F6',
    blueLight: '#EFF6FF',
    blueBorder: '#BFDBFE',
    red: '#EF4444',
    redLight: '#FEF2F2',
    redBorder: '#FECACA',
    gold: '#D97706',
    goldLight: '#FFFBEB',
    goldBorder: '#FDE68A',
    connA: '#93BBFA',
    connB: '#F5A0A0',
    connFinal: '#F5C542',
    connDefault: '#CBD5E1',
    winBlueTxt: '#1D4ED8',
    winRedTxt: '#DC2626',
    loseTxt: '#CBD5E1',
};

// ── Tree Builder ────────────────────────────────────────────────────────────────

function buildTree(matches: Match[]): MatchNode | null {
    if (matches.length === 0) return null;
    const nodeMap = new Map<number, MatchNode>();
    matches.forEach(m => nodeMap.set(m.id, { match: m, children: [] }));
    let root: MatchNode | null = null;
    matches.forEach(m => {
        if (m.nextMatchId && nodeMap.has(m.nextMatchId)) {
            const parent = nodeMap.get(m.nextMatchId)!;
            if (m.nextMatchSlot === 'player1') parent.children.unshift(nodeMap.get(m.id)!);
            else parent.children.push(nodeMap.get(m.id)!);
        } else if (!m.nextMatchId) {
            root = nodeMap.get(m.id)!;
        }
    });
    return root;
}

function countLeaves(node: MatchNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

// ── Position calculation ────────────────────────────────────────────────────────

function assignPositions(node: MatchNode, slotH: number): Map<number, number> {
    const positions = new Map<number, number>();
    let leafIdx = 0;
    function traverse(n: MatchNode): number {
        if (n.children.length === 0) {
            const cy = leafIdx * slotH + slotH / 2;
            positions.set(n.match.id, cy);
            leafIdx++;
            return cy;
        }
        const childCys = n.children.map(c => traverse(c));
        const cy = childCys.reduce((a, b) => a + b, 0) / childCys.length;
        positions.set(n.match.id, cy);
        return cy;
    }
    traverse(node);
    return positions;
}

// ── Collect matches per round (tree order) ──────────────────────────────────────

function collectOrdered(node: MatchNode, out: Map<number, Match[]>) {
    node.children.forEach(c => collectOrdered(c, out));
    const round = node.match.round;
    if (!out.has(round)) out.set(round, []);
    out.get(round)!.push(node.match);
}

// ── Round label ─────────────────────────────────────────────────────────────────

function getRoundLabel(round: number, maxRound: number): string {
    if (round === maxRound) return 'FINALS';
    if (round === maxRound - 1) return 'SEMI-FINALS';
    if (round === maxRound - 2) return 'QUARTER-FINALS';
    return `ROUND ${round}`;
}

// ── Feeder map ──────────────────────────────────────────────────────────────────

function buildFeederMap(matches: Match[]): Map<string, number | string> {
    const map = new Map<string, number | string>();
    matches.forEach(m => {
        if (m.nextMatchId && m.nextMatchSlot) {
            map.set(`${m.nextMatchId}-${m.nextMatchSlot}`, m.matchId ?? m.id);
        }
    });
    return map;
}

// ── Side classification ─────────────────────────────────────────────────────────

function collectIds(node: MatchNode, target: Set<number>) {
    target.add(node.match.id);
    node.children.forEach(c => collectIds(c, target));
}

// ── Adaptive layout calculator ──────────────────────────────────────────────────

function computeLayout(leafCount: number, maxRound: number) {
    const slotH = DRAW_H / leafCount;
    const colW = DRAW_W / maxRound;
    const cardW = Math.min(Math.max(colW - 16, 70), 165);
    const cardH = Math.min(Math.max(slotH - 4, 26), 54);
    const headerFs = Math.min(Math.max(cardH * 0.17, 4), 6.5);
    const playerFs = Math.min(Math.max(cardH * 0.21, 4.5), 7.5);
    const headerH = Math.max(cardH * 0.28, 8);
    const playerH = (cardH - headerH) / 2;
    return { slotH, colW, cardW, cardH, headerFs, playerFs, headerH, playerH };
}

type Layout = ReturnType<typeof computeLayout>;

// ── Main Component ──────────────────────────────────────────────────────────────

export default function BracketPDF({ tournamentName, categoryName, matches }: BracketPDFProps) {
    if (!matches || matches.length === 0) {
        return <Document><Page size="A4"><Text>No matches</Text></Page></Document>;
    }

    const tree = buildTree(matches);
    if (!tree) return <Document><Page size="A4"><Text>Bracket Error</Text></Page></Document>;

    const maxRound = Math.max(...matches.map(m => m.round));
    const leafCount = countLeaves(tree);
    const layout = computeLayout(leafCount, maxRound);
    const positions = assignPositions(tree, layout.slotH);
    const feederMap = buildFeederMap(matches);

    // Side classification
    const aSideIds = new Set<number>();
    const bSideIds = new Set<number>();
    const hasSplit = tree.children.length >= 2;
    if (hasSplit) {
        collectIds(tree.children[0], aSideIds);
        collectIds(tree.children[1], bSideIds);
    }

    const getMatchSide = (matchId: number): 'A' | 'B' | 'final' => {
        if (aSideIds.has(matchId)) return 'A';
        if (bSideIds.has(matchId)) return 'B';
        return 'final';
    };

    // Ordered rounds
    const roundsMap = new Map<number, Match[]>();
    collectOrdered(tree, roundsMap);
    const rounds: Match[][] = [];
    for (let r = 1; r <= maxRound; r++) rounds.push(roundsMap.get(r) || []);

    // Connector groups
    const parentGroups = new Map<number, number[]>();
    matches.forEach(m => {
        if (!m.nextMatchId) return;
        if (!parentGroups.has(m.nextMatchId)) parentGroups.set(m.nextMatchId, []);
        parentGroups.get(m.nextMatchId)!.push(m.id);
    });

    const connectorColor = (childIds: number[]): string => {
        if (childIds.length === 0) return COLORS.connDefault;
        // If children span both sides, it's the finals connector
        const hasA = childIds.some(id => aSideIds.has(id));
        const hasB = childIds.some(id => bSideIds.has(id));
        if (hasA && hasB) return COLORS.connFinal;
        if (hasA) return COLORS.connA;
        if (hasB) return COLORS.connB;
        return COLORS.connDefault;
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={{ padding: 0, fontFamily: 'Helvetica', backgroundColor: COLORS.white }}>

                {/* ── Header Bar ── */}
                <View style={{
                    height: HEADER_H, backgroundColor: COLORS.dark,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: PAD_X,
                }}>
                    <View>
                        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.white, letterSpacing: 1.2 }}>
                            {tournamentName.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 8, color: COLORS.light, marginTop: 1 }}>{categoryName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.goldBorder, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                            Championship Bracket
                        </Text>
                        <Text style={{ fontSize: 5.5, color: COLORS.light, marginTop: 2 }}>
                            {matches.length} Matches · {dateStr}
                        </Text>
                    </View>
                </View>

                {/* ── Content Area ── */}
                <View style={{ paddingHorizontal: PAD_X, paddingTop: 10, flex: 1 }}>

                    {/* Round Labels Row */}
                    <View style={{ flexDirection: 'row', marginBottom: 6, height: 14 }}>
                        {rounds.map((_, i) => {
                            const isFinal = i + 1 === maxRound;
                            return (
                                <View key={i} style={{ width: layout.colW, alignItems: 'center' }}>
                                    <View style={{
                                        paddingHorizontal: 8, paddingVertical: 2,
                                        backgroundColor: isFinal ? COLORS.gold : COLORS.bg,
                                        borderRadius: 2,
                                    }}>
                                        <Text style={{
                                            fontSize: Math.min(layout.headerFs + 0.5, 6.5),
                                            fontFamily: 'Helvetica-Bold',
                                            color: isFinal ? COLORS.white : COLORS.medium,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.8,
                                        }}>
                                            {getRoundLabel(i + 1, maxRound)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Bracket Tree Area */}
                    <View style={{ position: 'relative', height: DRAW_H }}>

                        {/* ── Connectors ── */}
                        {Array.from(parentGroups.entries()).map(([parentId, childIds]) => {
                            const py = positions.get(parentId);
                            if (py === undefined) return null;
                            const parentMatch = matches.find(m => m.id === parentId);
                            if (!parentMatch) return null;

                            const pCardX = (parentMatch.round - 1) * layout.colW + (layout.colW - layout.cardW) / 2;
                            const lineColor = connectorColor(childIds);

                            const childData = childIds
                                .map(id => {
                                    const m = matches.find(mm => mm.id === id);
                                    const cy = positions.get(id);
                                    if (!m || cy === undefined) return null;
                                    const cCardRight = (m.round - 1) * layout.colW + (layout.colW + layout.cardW) / 2;
                                    return { cy, cCardRight };
                                })
                                .filter((c): c is { cy: number; cCardRight: number } => c !== null)
                                .sort((a, b) => a.cy - b.cy);

                            if (childData.length === 0) return null;
                            const midX = (Math.max(...childData.map(c => c.cCardRight)) + pCardX) / 2;

                            if (childData.length === 1) {
                                const c = childData[0];
                                return (
                                    <View key={`c-${parentId}`} style={{
                                        position: 'absolute', left: c.cCardRight, top: c.cy - 0.4,
                                        width: pCardX - c.cCardRight, height: 0.8, backgroundColor: lineColor,
                                    }} />
                                );
                            }

                            const topY = childData[0].cy;
                            const botY = childData[childData.length - 1].cy;
                            const barTop = Math.min(topY, py);
                            const barBot = Math.max(botY, py);

                            return (
                                <View key={`c-${parentId}`}>
                                    {childData.map((c, ci) => (
                                        <View key={ci} style={{
                                            position: 'absolute', left: c.cCardRight, top: c.cy - 0.4,
                                            width: midX - c.cCardRight, height: 0.8, backgroundColor: lineColor,
                                        }} />
                                    ))}
                                    <View style={{
                                        position: 'absolute', left: midX - 0.4, top: barTop,
                                        width: 0.8, height: barBot - barTop, backgroundColor: lineColor,
                                    }} />
                                    <View style={{
                                        position: 'absolute', left: midX, top: py - 0.4,
                                        width: pCardX - midX, height: 0.8, backgroundColor: lineColor,
                                    }} />
                                </View>
                            );
                        })}

                        {/* ── Match Cards ── */}
                        {rounds.map((roundMatches, roundIdx) => (
                            <React.Fragment key={roundIdx}>
                                {roundMatches.map(m => {
                                    const cy = positions.get(m.id) ?? 0;
                                    const x = roundIdx * layout.colW + (layout.colW - layout.cardW) / 2;
                                    const y = cy - layout.cardH / 2;
                                    const displayId = m.matchId ?? m.id;
                                    const isFinal = m.round === maxRound;
                                    const side = getMatchSide(m.id);

                                    // Side accent colors
                                    const sideAccent = isFinal ? COLORS.gold : side === 'A' ? COLORS.blue : side === 'B' ? COLORS.red : COLORS.light;
                                    const cardBorder = isFinal ? COLORS.goldBorder : COLORS.border;
                                    const headerBg = isFinal ? COLORS.goldLight : COLORS.bg;
                                    const headerColor = isFinal ? COLORS.gold : COLORS.medium;

                                    const blueBg = (m.winner && m.winner === m.player1) ? COLORS.blueLight : COLORS.white;
                                    const redBg = (m.winner && m.winner === m.player2) ? COLORS.redLight : COLORS.white;

                                    const textColor = (player: string) => {
                                        if (!m.winner) return COLORS.dark;
                                        return m.winner === player ? COLORS.dark : COLORS.loseTxt;
                                    };

                                    const blueTotal = m.r1_blue_score + m.r2_blue_score + m.r3_blue_score;
                                    const redTotal = m.r1_red_score + m.r2_red_score + m.r3_red_score;

                                    const displayPlayer = (name: string, slot: 'player1' | 'player2') => {
                                        if (name === 'BYE') return 'BYE';
                                        if (name === 'TBD') {
                                            const fid = feederMap.get(`${m.id}-${slot}`);
                                            return fid ? `W of #${fid}` : 'TBD';
                                        }
                                        return name;
                                    };

                                    return (
                                        <View key={m.id} style={{
                                            position: 'absolute', left: x, top: y,
                                            width: layout.cardW, height: layout.cardH,
                                            borderRight: `0.5pt solid ${cardBorder}`,
                                            borderTop: `0.5pt solid ${cardBorder}`,
                                            borderBottom: `0.5pt solid ${cardBorder}`,
                                            borderLeft: `2pt solid ${sideAccent}`,
                                            backgroundColor: COLORS.white,
                                        }}>
                                            {/* Header */}
                                            <View style={{
                                                height: layout.headerH,
                                                backgroundColor: headerBg,
                                                borderBottom: `0.5pt solid ${cardBorder}`,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingHorizontal: 3,
                                            }}>
                                                <Text style={{
                                                    fontSize: layout.headerFs, fontFamily: 'Helvetica-Bold',
                                                    color: headerColor, textTransform: 'uppercase', letterSpacing: 0.3,
                                                }}>
                                                    {isFinal ? '★ FINALS' : getRoundLabel(m.round, maxRound)}
                                                </Text>
                                                <Text style={{
                                                    fontSize: layout.headerFs, fontFamily: 'Helvetica-Bold',
                                                    color: COLORS.light, backgroundColor: COLORS.border,
                                                    paddingHorizontal: 3, paddingVertical: 0.5,
                                                }}>
                                                    #{displayId}
                                                </Text>
                                            </View>

                                            {/* Blue Player */}
                                            <View style={{
                                                height: layout.playerH, flexDirection: 'row',
                                                alignItems: 'center', borderBottom: `0.5pt solid ${COLORS.border}`,
                                                backgroundColor: blueBg, position: 'relative',
                                            }}>
                                                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, backgroundColor: COLORS.blue }} />
                                                <Text style={{
                                                    fontSize: layout.playerFs,
                                                    fontFamily: m.winner === m.player1 ? 'Helvetica-Bold' : 'Helvetica',
                                                    color: textColor(m.player1), marginLeft: 4, flex: 1,
                                                    ...(m.winner && m.winner !== m.player1 ? { textDecoration: 'line-through' } : {}),
                                                }}>
                                                    {displayPlayer(m.player1, 'player1')}
                                                </Text>
                                                {(blueTotal > 0 || m.winner) && (
                                                    <Text style={{
                                                        fontSize: layout.playerFs, fontFamily: 'Helvetica-Bold',
                                                        width: 12, textAlign: 'center',
                                                        color: m.winner === m.player1 ? COLORS.winBlueTxt : COLORS.loseTxt,
                                                    }}>
                                                        {blueTotal}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Red Player */}
                                            <View style={{
                                                height: layout.playerH, flexDirection: 'row',
                                                alignItems: 'center', backgroundColor: redBg, position: 'relative',
                                            }}>
                                                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, backgroundColor: COLORS.red }} />
                                                <Text style={{
                                                    fontSize: layout.playerFs,
                                                    fontFamily: m.winner === m.player2 ? 'Helvetica-Bold' : 'Helvetica',
                                                    color: textColor(m.player2), marginLeft: 4, flex: 1,
                                                    ...(m.winner && m.winner !== m.player2 ? { textDecoration: 'line-through' } : {}),
                                                }}>
                                                    {displayPlayer(m.player2, 'player2')}
                                                </Text>
                                                {(redTotal > 0 || m.winner) && (
                                                    <Text style={{
                                                        fontSize: layout.playerFs, fontFamily: 'Helvetica-Bold',
                                                        width: 12, textAlign: 'center',
                                                        color: m.winner === m.player2 ? COLORS.winRedTxt : COLORS.loseTxt,
                                                    }}>
                                                        {redTotal}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* ── Footer ── */}
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: FOOTER_H + PAD_Y, backgroundColor: COLORS.bg,
                    borderTop: `0.5pt solid ${COLORS.border}`,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: PAD_X,
                }}>
                    <Text style={{ fontSize: 5.5, color: COLORS.light }}>
                        Generated by KTM Manager · {dateStr}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {hasSplit && (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <View style={{ width: 6, height: 2, backgroundColor: COLORS.connA }} />
                                    <Text style={{ fontSize: 5, color: COLORS.light }}>A Side</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <View style={{ width: 6, height: 2, backgroundColor: COLORS.connB }} />
                                    <Text style={{ fontSize: 5, color: COLORS.light }}>B Side</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <View style={{ width: 6, height: 2, backgroundColor: COLORS.connFinal }} />
                                    <Text style={{ fontSize: 5, color: COLORS.light }}>Finals</Text>
                                </View>
                            </>
                        )}
                    </View>
                    <Text style={{ fontSize: 5.5, color: COLORS.light }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
