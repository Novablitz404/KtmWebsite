/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Match } from '@prisma/client';

// ── Adaptive sizing helpers ────────────────────────────────────────────────────
// A4 landscape usable area ≈ 800 × 540 pts (after padding).
// We calculate round 1 match count, which determines the vertical height needed.
// Then we choose node width, row heights, gap, font sizes, and overall scale so
// the full tree fits on a single page when possible.

function computeLayout(totalMatches: number, maxRound: number) {
    // Number of leaf‐level (round 1) matches drives vertical space
    const round1Count = Math.ceil(totalMatches / (2 ** maxRound - 1) * (2 ** (maxRound - 1)));
    const leafMatches = Math.max(1, Math.pow(2, maxRound - 1));

    // Thresholds — tune these for A4‑L (≈800×540 pts printable)
    if (leafMatches <= 2) {
        // 2–3 matches → big cards
        return { nodeWidth: 200, headerHeight: 18, playerHeight: 24, fontSize: 10, headerFontSize: 8, gap: 60, spacerHeight: 24, elbowWidth: 30, barWidth: 4, scale: 1.0 };
    }
    if (leafMatches <= 4) {
        // 4–7 matches
        return { nodeWidth: 170, headerHeight: 16, playerHeight: 20, fontSize: 9, headerFontSize: 7, gap: 50, spacerHeight: 20, elbowWidth: 25, barWidth: 3, scale: 0.95 };
    }
    if (leafMatches <= 8) {
        // 8–15 matches
        return { nodeWidth: 150, headerHeight: 14, playerHeight: 18, fontSize: 8, headerFontSize: 7, gap: 40, spacerHeight: 16, elbowWidth: 20, barWidth: 3, scale: 0.85 };
    }
    if (leafMatches <= 16) {
        // 16–31 matches
        return { nodeWidth: 130, headerHeight: 12, playerHeight: 16, fontSize: 7, headerFontSize: 6, gap: 35, spacerHeight: 12, elbowWidth: 18, barWidth: 2, scale: 0.68 };
    }
    // 32+ — squeeze hard
    return { nodeWidth: 110, headerHeight: 10, playerHeight: 14, fontSize: 6, headerFontSize: 5, gap: 28, spacerHeight: 8, elbowWidth: 14, barWidth: 2, scale: 0.52 };
}

type LayoutConfig = ReturnType<typeof computeLayout>;

// ── Static styles (used for detail pages / non-adaptive elements) ──────────────
const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: 'Helvetica',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
    },
    header: {
        marginBottom: 10,
        borderBottom: '2px solid #000000',
        paddingBottom: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
    },
    subtitle: {
        fontSize: 10,
        color: '#4B5563',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        textAlign: 'center',
        fontSize: 8,
        color: '#6B7280',
        borderTop: '1px solid #E5E7EB',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    treeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    childWrapper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
});

interface BracketPDFProps {
    tournamentName: string;
    categoryName: string;
    matches: Match[];
}

export default function BracketPDF({ tournamentName, categoryName, matches }: BracketPDFProps) {
    if (!matches || matches.length === 0) return <Document><Page size="A4"><Text>No matches</Text></Page></Document>;

    const maxRound = Math.max(...matches.map(m => m.round));
    const roots = matches.filter(m => !m.nextMatchId);
    const finalMatch = roots[0];

    // Adaptive layout
    const layout = computeLayout(matches.length, maxRound);

    // Group matches by round for detailed pages
    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

    const getRoundDisplayName = (r: number) => {
        if (r === maxRound) return 'Finals';
        if (r === maxRound - 1) return 'Semi-Finals';
        if (r === maxRound - 2) return 'Quarter-Finals';
        return `Round ${r}`;
    }

    return (
        <Document>
            {/* Page 1: Full Bracket Tree */}
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header} fixed>
                    <View>
                        <Text style={styles.title}>{tournamentName.toUpperCase()}</Text>
                        <Text style={styles.subtitle}>{categoryName}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#6B7280' }}>Championship Bracket Tree</Text>
                </View>

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ transform: `scale(${layout.scale})`, alignItems: 'center' }}>
                        {finalMatch ? (
                            <BracketTree
                                root={finalMatch}
                                matches={matches}
                                maxRound={maxRound}
                                layout={layout}
                            />
                        ) : (
                            <Text>Bracket Data Error</Text>
                        )}
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text>Generated by KTM Manager</Text>
                    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                </View>
            </Page>

            {/* Subsequent Pages: Round Details */}
            {rounds.map(round => (
                <Page key={round} size="A4" orientation="landscape" style={styles.page}>
                    <View style={styles.header} fixed>
                        <View>
                            <Text style={styles.title}>{tournamentName.toUpperCase()}</Text>
                            <Text style={styles.subtitle}>{categoryName}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#6B7280' }}>{getRoundDisplayName(round)} Only</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 10 }}>
                            {getRoundDisplayName(round)} Matches
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {matches
                            .filter(m => m.round === round)
                            .sort((a, b) => (a.matchId ?? a.id) - (b.matchId ?? b.id))
                            .map(match => (
                                <MatchCard key={match.id} match={match} maxRound={maxRound} />
                            ))}
                    </View>

                    <View style={styles.footer} fixed>
                        <Text>Generated by KTM Manager</Text>
                        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                    </View>
                </Page>
            ))}
        </Document>
    );
}

// ── Bracket Tree (adaptive) ────────────────────────────────────────────────────

const BracketTree = ({ root, matches, maxRound, layout }: { root: Match, matches: Match[], maxRound: number, layout: LayoutConfig }) => {
    const children = matches.filter(m => m.nextMatchId === root.id);
    const topChild = children.find(c => c.nextMatchSlot === 'player1');
    const bottomChild = children.find(c => c.nextMatchSlot === 'player2');

    const isLeaf = !topChild && !bottomChild;
    const ew = layout.elbowWidth;

    return (
        <View style={styles.treeContainer}>
            {/* Children Column */}
            {!isLeaf && (
                <View style={{ flexDirection: 'column', justifyContent: 'center', marginRight: layout.gap }}>
                    {/* TOP CHILD */}
                    {topChild ? (
                        <View style={styles.childWrapper}>
                            <BracketTree root={topChild} matches={matches} maxRound={maxRound} layout={layout} />
                            <View style={{
                                position: 'absolute', right: -ew, top: '50%',
                                bottom: -(layout.spacerHeight / 2), width: ew,
                                borderTop: '1px solid #000000', borderRight: '1px solid #000000',
                            }} />
                        </View>
                    ) : (
                        bottomChild && <View style={{ height: 1 }} />
                    )}

                    {/* SPACER */}
                    {topChild && bottomChild && (
                        <View style={{ height: layout.spacerHeight }} />
                    )}

                    {/* BOTTOM CHILD */}
                    {bottomChild ? (
                        <View style={styles.childWrapper}>
                            <BracketTree root={bottomChild} matches={matches} maxRound={maxRound} layout={layout} />
                            <View style={{
                                position: 'absolute', right: -ew,
                                top: -(layout.spacerHeight / 2), bottom: '50%', width: ew,
                                borderBottom: '1px solid #000000', borderRight: '1px solid #000000',
                            }} />
                        </View>
                    ) : (
                        topChild && <View style={{ height: 1 }} />
                    )}
                </View>
            )}

            {/* Current Node */}
            <View style={{ position: 'relative' }}>
                <MatchNode match={root} maxRound={maxRound} layout={layout} />
                {/* Parent Stub Connector (Left Side) */}
                {!isLeaf && (
                    <View style={{
                        position: 'absolute', left: -ew, top: '50%',
                        width: ew, height: 1, backgroundColor: '#000000', zIndex: -1,
                    }} />
                )}
            </View>
        </View>
    )
}

// ── MatchCard (detail pages — always large) ────────────────────────────────────

const MatchCard = ({ match, maxRound }: { match: Match, maxRound: number }) => {
    const getRoundName = (r: number, max: number) => {
        if (r === max) return 'Finals';
        if (r === max - 1) return 'Semis';
        if (r === max - 2) return 'Quarters';
        return `R${r}`;
    }

    const blueBg = (match.winner && match.winner === match.player1) ? '#EFF6FF' : '#FFFFFF';
    const redBg = (match.winner && match.winner === match.player2) ? '#FEF2F2' : '#FFFFFF';

    const getTextColor = (player: string) => {
        if (!match.winner) return '#1F2937';
        if (match.winner === player) return '#111827';
        return '#9CA3AF';
    }

    const displayId = match.matchId ?? match.id;

    return (
        <View style={{
            width: 280,
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
            flexDirection: 'column',
            margin: 15,
        }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#F9FAFB', paddingVertical: 3, paddingHorizontal: 6,
                borderBottom: '1px solid #F3F4F6', flexDirection: 'row',
                justifyContent: 'space-between', alignItems: 'center', height: 20,
            }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase' }}>
                    Match #{displayId}
                </Text>
                {match.court && match.court !== 'Unassigned' && (
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        Court {match.court}
                    </Text>
                )}
            </View>

            {/* Blue Player */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 24, position: 'relative', overflow: 'hidden', borderBottom: '1px solid #F3F4F6', backgroundColor: blueBg }}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#3B82F6' }} />
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: getTextColor(match.player1), marginLeft: 6, flex: 1, paddingRight: 4 }}>
                    {match.player1 === 'BYE' ? 'BYE' : match.player1}
                </Text>
                {(match.r1_blue_score > 0 || match.winner) && (
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', width: 16, textAlign: 'center', paddingTop: 3, color: match.winner === match.player1 ? '#2563EB' : '#D1D5DB' }}>
                        {match.r1_blue_score + match.r2_blue_score + match.r3_blue_score}
                    </Text>
                )}
            </View>

            {/* Red Player */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 24, position: 'relative', overflow: 'hidden', backgroundColor: redBg }}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: getTextColor(match.player2), marginLeft: 6, flex: 1, paddingRight: 4 }}>
                    {match.player2 === 'BYE' ? 'BYE' : match.player2}
                </Text>
                {(match.r1_red_score > 0 || match.winner) && (
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', width: 16, textAlign: 'center', paddingTop: 3, color: match.winner === match.player2 ? '#DC2626' : '#D1D5DB' }}>
                        {match.r1_red_score + match.r2_red_score + match.r3_red_score}
                    </Text>
                )}
            </View>
        </View>
    )
}

// ── MatchNode (bracket tree — adaptive size) ───────────────────────────────────

const MatchNode = ({ match, maxRound, layout }: { match: Match, maxRound: number, layout: LayoutConfig }) => {
    const getRoundName = (r: number, max: number) => {
        if (r === max) return 'Finals';
        if (r === max - 1) return 'Semis';
        if (r === max - 2) return 'Quarters';
        return `R${r}`;
    }

    const blueBg = (match.winner && match.winner === match.player1) ? '#EFF6FF' : '#FFFFFF';
    const redBg = (match.winner && match.winner === match.player2) ? '#FEF2F2' : '#FFFFFF';

    const getTextColor = (player: string) => {
        if (!match.winner) return '#1F2937';
        if (match.winner === player) return '#111827';
        return '#9CA3AF';
    }

    const displayId = match.matchId ?? match.id;

    return (
        <View style={{
            width: layout.nodeWidth,
            border: '1px solid #E5E7EB',
            backgroundColor: 'white',
            flexDirection: 'column',
            zIndex: 10,
            marginVertical: 4,
        }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#F9FAFB', paddingVertical: 2, paddingHorizontal: 4,
                borderBottom: '1px solid #F3F4F6', flexDirection: 'row',
                justifyContent: 'space-between', alignItems: 'center', height: layout.headerHeight,
            }}>
                <Text style={{ fontSize: layout.headerFontSize, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase' }}>
                    {getRoundName(match.round, maxRound)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {match.court && match.court !== 'Unassigned' && (
                        <Text style={{ fontSize: layout.headerFontSize, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', backgroundColor: '#E5E7EB', paddingHorizontal: 4, borderRadius: 2, marginRight: 4 }}>
                            C{match.court}
                        </Text>
                    )}
                    <Text style={{ fontSize: layout.headerFontSize, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', backgroundColor: '#E5E7EB', paddingHorizontal: 4, borderRadius: 2 }}>
                        #{displayId}
                    </Text>
                </View>
            </View>

            {/* Blue Player */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: layout.playerHeight, position: 'relative', overflow: 'hidden', borderBottom: '1px solid #F3F4F6', backgroundColor: blueBg }}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: layout.barWidth, backgroundColor: '#3B82F6' }} />
                <Text style={{ fontSize: layout.fontSize, fontFamily: 'Helvetica-Bold', color: getTextColor(match.player1), marginLeft: 6, flex: 1, paddingRight: 4 }}>
                    {match.player1 === 'BYE' ? 'BYE' : match.player1}
                </Text>
                {(match.r1_blue_score > 0 || match.winner) && (
                    <Text style={{ fontSize: layout.fontSize, fontFamily: 'Helvetica-Bold', width: 16, textAlign: 'center', height: '100%', paddingTop: 3, color: match.winner === match.player1 ? '#2563EB' : '#D1D5DB' }}>
                        {match.r1_blue_score + match.r2_blue_score + match.r3_blue_score}
                    </Text>
                )}
            </View>

            {/* Red Player */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: layout.playerHeight, position: 'relative', overflow: 'hidden', backgroundColor: redBg }}>
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: layout.barWidth, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: layout.fontSize, fontFamily: 'Helvetica-Bold', color: getTextColor(match.player2), marginLeft: 6, flex: 1, paddingRight: 4 }}>
                    {match.player2 === 'BYE' ? 'BYE' : match.player2}
                </Text>
                {(match.r1_red_score > 0 || match.winner) && (
                    <Text style={{ fontSize: layout.fontSize, fontFamily: 'Helvetica-Bold', width: 16, textAlign: 'center', height: '100%', paddingTop: 3, color: match.winner === match.player2 ? '#DC2626' : '#D1D5DB' }}>
                        {match.r1_red_score + match.r2_red_score + match.r3_red_score}
                    </Text>
                )}
            </View>
        </View>
    )
}
