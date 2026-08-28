/* eslint-disable react/no-array-index-key */
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    page: {
        padding: 28,
        fontFamily: 'Helvetica',
        backgroundColor: '#FFFFFF',
        fontSize: 9,
    },
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid #1e293b',
        paddingBottom: 6,
        marginBottom: 14,
    },
    title: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2,
    },
    disciplineBadge: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#4f46e5',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // ── Summary strip ──
    summaryStrip: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 4,
        border: '1px solid #e2e8f0',
        padding: 8,
        marginBottom: 14,
        gap: 16,
    },
    summaryItem: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
    },
    summaryLabel: {
        fontSize: 7,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 1,
    },
    // ── Category section header ──
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        borderLeft: '3px solid #4f46e5',
        paddingHorizontal: 8,
        paddingVertical: 5,
        marginTop: 12,
        marginBottom: 2,
    },
    categoryHeaderText: {
        fontSize: 9.5,
        fontFamily: 'Helvetica-Bold',
        color: '#312e81',
        textTransform: 'uppercase',
    },
    categoryHeaderCount: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#4f46e5',
    },
    // ── Table ──
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tableRowAlt: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#f8fafc',
    },
    tableRowFinal: {
        flexDirection: 'row',
        borderBottom: '1px solid #fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#fffbeb',
    },
    // ── Column LAYOUTS (width/flex/alignment only — NO colors) ──
    layoutMatch:    { width: 34,  textAlign: 'center' as const },
    layoutPlayer1:  { flex: 1,    paddingRight: 6 },
    layoutVs:       { width: 16,  textAlign: 'center' as const },
    layoutPlayer2:  { flex: 1,    paddingRight: 6 },
    layoutAthlete:  { flex: 2,    paddingRight: 6 },
    layoutRound:    { width: 48,  textAlign: 'center' as const },
    layoutCourt:    { width: 40,  textAlign: 'center' as const },
    layoutDay:      { width: 34,  textAlign: 'center' as const },
    // ── Header text (white on dark) ──
    th: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // ── Body text styles ──
    tdMatch:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4f46e5' },
    tdPlayer:   { fontSize: 8, color: '#334155' },
    tdVs:       { fontSize: 7, color: '#94a3b8', fontFamily: 'Helvetica-Bold' },
    tdRound:    { fontSize: 7, color: '#475569' },
    tdCourt:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ea580c' },
    tdDay:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f766e' },
    // ── Footer ──
    footer: {
        position: 'absolute',
        bottom: 18,
        left: 28,
        right: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1px solid #e2e8f0',
        paddingTop: 5,
    },
    footerText: {
        fontSize: 7,
        color: '#94a3b8',
    },
})

// ── Types ────────────────────────────────────────────────────────────────────

export interface CategoryScheduleMatch {
    matchId: number | null
    round: number
    roundLabel: string
    isFinal: boolean
    court: string
    day: number | null
    player1Name: string
    player2Name: string
}

export interface CategoryMatchGroup {
    categoryName: string
    matches: CategoryScheduleMatch[]
}

interface AllCategoriesMatchListPDFProps {
    tournamentName: string
    groups: CategoryMatchGroup[]
    generatedAt?: string
    isPoomsae?: boolean
    isPreview?: boolean
    disciplineLabel?: string
    // Only shown when the underlying matches actually span more than one day —
    // a single-day tournament doesn't need a Day column cluttering every row.
    showDayColumn?: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AllCategoriesMatchListPDF({
    tournamentName,
    groups,
    generatedAt,
    isPoomsae = false,
    isPreview = false,
    disciplineLabel,
    showDayColumn = false,
}: AllCategoriesMatchListPDFProps) {
    const now = generatedAt || new Date().toLocaleString()

    const totalMatches = groups.reduce((sum, g) => sum + g.matches.length, 0)
    const totalCategories = groups.length
    const courts = [...new Set(groups.flatMap(g => g.matches.map(m => m.court)).filter(c => c && c !== 'Unassigned'))]

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>

                {/* ── Header ── */}
                <View style={styles.pageHeader} fixed>
                    <View>
                        <Text style={styles.title}>{tournamentName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Text style={{ ...styles.subtitle, marginTop: 0 }}>
                                Full Match List — All Categories, By Category
                            </Text>
                            {isPreview && (
                                <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F59E0B', borderRadius: 2, marginLeft: 8 }}>
                                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: 'white' }}>DRAFT — NOT YET GENERATED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    {disciplineLabel && <Text style={styles.disciplineBadge}>{disciplineLabel}</Text>}
                </View>

                {/* ── Summary strip ── */}
                <View style={styles.summaryStrip}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalCategories}</Text>
                        <Text style={styles.summaryLabel}>Categories</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalMatches}</Text>
                        <Text style={styles.summaryLabel}>{isPoomsae ? 'Performances' : 'Matches'}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{courts.length}</Text>
                        <Text style={styles.summaryLabel}>Courts</Text>
                    </View>
                </View>

                {/* ── Per-category sections ──
                    The category header + table header + first row are locked
                    together in one non-splitting block so a header can never be
                    stranded at the bottom of a page with its row(s) pushed to the
                    next page with no heading — the whole block moves to the next
                    page together if it doesn't fit. Remaining rows (if any) are
                    left free to paginate normally so a large category doesn't get
                    forced to fit on a single page. */}
                {groups.map((group, gi) => {
                    const renderRow = (m: CategoryScheduleMatch, idx: number) => (
                        <View
                            key={idx}
                            style={m.isFinal ? styles.tableRowFinal : (idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt)}
                            wrap={false}
                        >
                            <Text style={{ ...styles.tdMatch, ...styles.layoutMatch }}>#{m.matchId ?? '—'}</Text>
                            {isPoomsae ? (
                                <Text style={{ ...styles.tdPlayer, ...styles.layoutAthlete }}>{m.player1Name || 'TBD'}</Text>
                            ) : (
                                <>
                                    <Text style={{ ...styles.tdPlayer, ...styles.layoutPlayer1 }}>{m.player1Name || 'TBD'}</Text>
                                    <Text style={{ ...styles.tdVs, ...styles.layoutVs }}>vs</Text>
                                    <Text style={{ ...styles.tdPlayer, ...styles.layoutPlayer2 }}>{m.player2Name || 'TBD'}</Text>
                                </>
                            )}
                            <Text style={{ ...styles.tdRound, ...styles.layoutRound }}>{m.roundLabel}</Text>
                            <Text style={{ ...styles.tdCourt, ...styles.layoutCourt }}>{m.court || '—'}</Text>
                            {showDayColumn && <Text style={{ ...styles.tdDay, ...styles.layoutDay }}>{m.day ?? '—'}</Text>}
                        </View>
                    )

                    const [firstRow, ...restRows] = group.matches

                    return (
                        <View key={gi}>
                            <View wrap={false}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryHeaderText}>{group.categoryName}</Text>
                                    <Text style={styles.categoryHeaderCount}>
                                        {group.matches.length} {isPoomsae ? 'performance' : 'match'}{group.matches.length !== 1 ? 'es' : ''}
                                    </Text>
                                </View>

                                <View style={styles.tableHeader}>
                                    <Text style={{ ...styles.th, ...styles.layoutMatch }}>#</Text>
                                    {isPoomsae ? (
                                        <Text style={{ ...styles.th, ...styles.layoutAthlete }}>Athlete / Team</Text>
                                    ) : (
                                        <>
                                            <Text style={{ ...styles.th, ...styles.layoutPlayer1 }}>Player 1 (Blue)</Text>
                                            <Text style={{ ...styles.th, ...styles.layoutVs }}>VS</Text>
                                            <Text style={{ ...styles.th, ...styles.layoutPlayer2 }}>Player 2 (Red)</Text>
                                        </>
                                    )}
                                    <Text style={{ ...styles.th, ...styles.layoutRound }}>Round</Text>
                                    <Text style={{ ...styles.th, ...styles.layoutCourt }}>Court</Text>
                                    {showDayColumn && <Text style={{ ...styles.th, ...styles.layoutDay }}>Day</Text>}
                                </View>

                                {firstRow && renderRow(firstRow, 0)}
                            </View>

                            {restRows.map((m, idx) => renderRow(m, idx + 1))}
                        </View>
                    )
                })}

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Generated by KTM Manager · {now}</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}
