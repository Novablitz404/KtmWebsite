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
    dayBadge: {
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
    // ── Table ──
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 3,
    },
    tableHeaderText: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    colMatch:    { width: 36,  fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#4f46e5', textAlign: 'center' },
    colCategory: { flex: 1.5,  fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a', paddingRight: 6 },
    colPlayer1:  { flex: 1,    fontSize: 8, color: '#334155', paddingRight: 6 },
    colVs:       { width: 16,  fontSize: 7, color: '#94a3b8', textAlign: 'center', fontFamily: 'Helvetica-Bold' },
    colPlayer2:  { flex: 1,    fontSize: 8, color: '#334155', paddingRight: 6 },
    colRound:    { width: 48,  fontSize: 7, color: '#475569', textAlign: 'center' },
    colCourt:    { width: 44,  fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ea580c', textAlign: 'center' },
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

export interface DayScheduleMatch {
    matchId: number | null
    categoryName: string
    round: number
    roundLabel: string
    isFinal: boolean
    court: string
    player1Name: string
    player2Name: string
}

interface DaySchedulePDFProps {
    tournamentName: string
    day: number
    matches: DayScheduleMatch[]
    generatedAt?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DaySchedulePDF({ tournamentName, day, matches, generatedAt }: DaySchedulePDFProps) {
    const now = generatedAt || new Date().toLocaleString()

    // Summary stats
    const totalMatches = matches.length
    const courts = [...new Set(matches.map(m => m.court).filter(c => c && c !== 'Unassigned'))]
    const finals = matches.filter(m => m.isFinal).length

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>

                {/* ── Header ── */}
                <View style={styles.pageHeader} fixed>
                    <View>
                        <Text style={styles.title}>{tournamentName}</Text>
                        <Text style={styles.subtitle}>Match Schedule — Sorted by Match Number</Text>
                    </View>
                    <Text style={styles.dayBadge}>Day {day}</Text>
                </View>

                {/* ── Summary strip ── */}
                <View style={styles.summaryStrip}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalMatches}</Text>
                        <Text style={styles.summaryLabel}>Matches</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{courts.length}</Text>
                        <Text style={styles.summaryLabel}>Courts</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{finals}</Text>
                        <Text style={styles.summaryLabel}>Finals</Text>
                    </View>
                </View>

                {/* ── Table header ── */}
                <View style={styles.tableHeader} fixed>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colMatch }}>#</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colCategory }}>Category</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colPlayer1 }}>Player 1 (Blue)</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colVs }}>VS</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colPlayer2 }}>Player 2 (Red)</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colRound }}>Round</Text>
                    <Text style={{ ...styles.tableHeaderText, ...styles.colCourt }}>Court</Text>
                </View>

                {/* ── Rows ── */}
                {matches.map((m, idx) => (
                    <View
                        key={idx}
                        style={m.isFinal ? styles.tableRowFinal : (idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt)}
                        wrap={false}
                    >
                        <Text style={styles.colMatch}>#{m.matchId ?? '—'}</Text>
                        <Text style={styles.colCategory}>{m.categoryName}</Text>
                        <Text style={styles.colPlayer1}>{m.player1Name || 'TBD'}</Text>
                        <Text style={styles.colVs}>vs</Text>
                        <Text style={styles.colPlayer2}>{m.player2Name || 'TBD'}</Text>
                        <Text style={styles.colRound}>{m.roundLabel}</Text>
                        <Text style={styles.colCourt}>{m.court || '—'}</Text>
                    </View>
                ))}

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Generated by KTM Manager · {now}</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}
