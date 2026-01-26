/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Match } from '@prisma/client';

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
    matchNode: {
        width: 140,
        border: '1px solid #E5E7EB',
        backgroundColor: 'white',
        flexDirection: 'column',
        zIndex: 10,
        marginVertical: 4,
    },
    matchHeader: {
        backgroundColor: '#F9FAFB',
        paddingVertical: 2,
        paddingHorizontal: 4,
        borderBottom: '1px solid #F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 14,
    },
    headerText: {
        fontSize: 6,
        fontFamily: 'Helvetica-Bold',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 18,
        position: 'relative',
        overflow: 'hidden',
    },
    playerRowBorder: {
        borderBottom: '1px solid #F3F4F6',
    },
    playerName: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#1F2937',
        marginLeft: 6,
        flex: 1,
        paddingRight: 4,
    },
    score: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#1F2937',
        width: 16,
        textAlign: 'center',
        height: '100%',
        paddingTop: 3,
    },
    blueBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#3B82F6',
    },
    redBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#EF4444',
    },
    treeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        justifyContent: 'center',
        marginRight: 40, // Wider gap (40px)
    },
    childWrapper: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    spacer: {
        height: 16,
    },
    // Elbow Connectors: Meet in middle (20px)
    elbowTop: {
        position: 'absolute',
        right: -20, // Move into gap by 20px
        top: '50%',
        bottom: -8, // Extend downward halfway through spacer (height 16 / 2 = 8)
        width: 20,
        borderTop: '1px solid #000000',
        borderRight: '1px solid #000000',
    },
    elbowBottom: {
        position: 'absolute',
        right: -20, // Move into gap by 20px
        top: -8, // Extend upward halfway through spacer
        bottom: '50%',
        width: 20,
        borderBottom: '1px solid #000000',
        borderRight: '1px solid #000000',
    },
    // Parent Stub: Meet in middle (20px) from Left
    parentStub: {
        position: 'absolute',
        left: -20, // Move left from parent by 20px
        top: '50%',
        width: 20,
        height: 1,
        backgroundColor: '#000000',
        zIndex: -1,
    }
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

    // Scale logic
    const scale = maxRound > 4 ? (maxRound > 5 ? 0.6 : 0.75) : 0.9;

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
                    <View style={{ transform: `scale(${scale})`, alignItems: 'center' }}>
                        {finalMatch ? (
                            <BracketTree
                                root={finalMatch}
                                matches={matches}
                                maxRound={maxRound}
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
                            .sort((a, b) => a.id - b.id)
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

const BracketTree = ({ root, matches, maxRound }: { root: Match, matches: Match[], maxRound: number }) => {
    const children = matches.filter(m => m.nextMatchId === root.id);
    const topChild = children.find(c => c.nextMatchSlot === 'player1');
    const bottomChild = children.find(c => c.nextMatchSlot === 'player2');

    // Check if this node is a leaf (no children)
    const isLeaf = !topChild && !bottomChild;

    return (
        <View style={styles.treeContainer}>
            {/* Children Column */}
            {!isLeaf && (
                <View style={styles.column}>

                    {/* TOP CHILD */}
                    {topChild ? (
                        <View style={styles.childWrapper}>
                            <BracketTree root={topChild} matches={matches} maxRound={maxRound} />
                            {/* Elbow Connector */}
                            <View style={styles.elbowTop} />
                        </View>
                    ) : (
                        bottomChild && <View style={{ height: 1 }} />
                    )}

                    {/* SPACER */}
                    {topChild && bottomChild && (
                        <View style={styles.spacer} />
                    )}

                    {/* BOTTOM CHILD */}
                    {bottomChild ? (
                        <View style={styles.childWrapper}>
                            <BracketTree root={bottomChild} matches={matches} maxRound={maxRound} />
                            {/* Elbow Connector */}
                            <View style={styles.elbowBottom} />
                        </View>
                    ) : (
                        topChild && <View style={{ height: 1 }} />
                    )}
                </View>
            )}

            {/* Current Node */}
            <View style={{ position: 'relative' }}>
                <MatchNode match={root} maxRound={maxRound} />
                {/* Parent Stub Connector (Left Side) - Only if we have children */}
                {!isLeaf && <View style={styles.parentStub} />}
            </View>
        </View>
    )
}

const MatchCard = ({ match, maxRound }: { match: Match, maxRound: number }) => {
    // Bigger card for Detail Pages
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

    return (
        <View style={{
            ...styles.matchNode,
            width: 280, // Bigger width
            margin: 15,
            border: '1px solid #D1D5DB'
        }}>
            {/* Header */}
            <View style={{ ...styles.matchHeader, height: 20 }}>
                <Text style={{ ...styles.headerText, fontSize: 8 }}>
                    Match #{match.id}
                </Text>
                {match.court && (
                    <Text style={{ ...styles.headerText, fontSize: 8, backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        Court {match.court}
                    </Text>
                )}
            </View>

            {/* Blue Player */}
            <View style={[styles.playerRow, styles.playerRowBorder, { backgroundColor: blueBg, height: 24 }]}>
                <View style={styles.blueBar} />
                <Text style={{ ...styles.playerName, fontSize: 10, color: getTextColor(match.player1) }}>
                    {match.player1 === 'BYE' ? 'BYE' : match.player1}
                </Text>
                {(match.r1_blue_score > 0 || match.winner) && (
                    <Text style={{ ...styles.score, fontSize: 10, color: match.winner === match.player1 ? '#2563EB' : '#D1D5DB' }}>
                        {match.r1_blue_score + match.r2_blue_score + match.r3_blue_score}
                    </Text>
                )}
            </View>

            {/* Red Player */}
            <View style={[styles.playerRow, { backgroundColor: redBg, height: 24 }]}>
                <View style={styles.redBar} />
                <Text style={{ ...styles.playerName, fontSize: 10, color: getTextColor(match.player2) }}>
                    {match.player2 === 'BYE' ? 'BYE' : match.player2}
                </Text>
                {(match.r1_red_score > 0 || match.winner) && (
                    <Text style={{ ...styles.score, fontSize: 10, color: match.winner === match.player2 ? '#DC2626' : '#D1D5DB' }}>
                        {match.r1_red_score + match.r2_red_score + match.r3_red_score}
                    </Text>
                )}
            </View>
        </View>
    )
}

const MatchNode = ({ match, maxRound }: { match: Match, maxRound: number }) => {
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

    return (
        <View style={styles.matchNode}>
            {/* Header */}
            <View style={styles.matchHeader}>
                <Text style={styles.headerText}>
                    {getRoundName(match.round, maxRound)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {match.court && (
                        <Text style={{ ...styles.headerText, backgroundColor: '#E5E7EB', paddingHorizontal: 4, borderRadius: 2, marginRight: 4 }}>
                            C{match.court}
                        </Text>
                    )}
                    <Text style={{ ...styles.headerText, backgroundColor: '#E5E7EB', paddingHorizontal: 4, borderRadius: 2 }}>
                        #{match.id}
                    </Text>
                </View>
            </View>

            {/* Blue Player */}
            <View style={[styles.playerRow, styles.playerRowBorder, { backgroundColor: blueBg }]}>
                <View style={styles.blueBar} />
                <Text style={{ ...styles.playerName, color: getTextColor(match.player1) }}>
                    {match.player1 === 'BYE' ? 'BYE' : match.player1}
                </Text>
                {(match.r1_blue_score > 0 || match.winner) && (
                    <Text style={{ ...styles.score, color: match.winner === match.player1 ? '#2563EB' : '#D1D5DB' }}>
                        {match.r1_blue_score + match.r2_blue_score + match.r3_blue_score}
                    </Text>
                )}
            </View>

            {/* Red Player */}
            <View style={[styles.playerRow, { backgroundColor: redBg }]}>
                <View style={styles.redBar} />
                <Text style={{ ...styles.playerName, color: getTextColor(match.player2) }}>
                    {match.player2 === 'BYE' ? 'BYE' : match.player2}
                </Text>
                {(match.r1_red_score > 0 || match.winner) && (
                    <Text style={{ ...styles.score, color: match.winner === match.player2 ? '#DC2626' : '#D1D5DB' }}>
                        {match.r1_red_score + match.r2_red_score + match.r3_red_score}
                    </Text>
                )}
            </View>
        </View>
    )
}

