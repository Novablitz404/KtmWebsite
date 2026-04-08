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
    // ── Page header (tournament name + discipline) ──
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderBottom: '2px solid #1e293b',
        paddingBottom: 6,
        marginBottom: 14,
    },
    tournamentName: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        textTransform: 'uppercase',
    },
    disciplineBadge: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // ── Category block ──
    categoryBlock: {
        marginBottom: 14,
        breakInside: 'avoid',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 3,
        marginBottom: 3,
    },
    categoryName: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        flex: 1,
    },
    categoryMeta: {
        fontSize: 8,
        color: '#94a3b8',
        marginLeft: 8,
    },
    // ── Table ──
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderBottom: '1px solid #cbd5e1',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    tableRowAlt: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: '#f8fafc',
    },
    colNum:    { width: 20,  fontSize: 8, color: '#64748b', fontFamily: 'Helvetica-Bold', textAlign: 'center', paddingRight: 4 },
    colName:   { flex: 1,   fontSize: 8, color: '#0f172a', fontFamily: 'Helvetica-Bold', paddingRight: 8 },
    colBday:   { width: 58, fontSize: 7, color: '#475569', paddingRight: 6 },
    colAge:    { width: 20, fontSize: 7, color: '#475569', textAlign: 'center', paddingRight: 6 },
    colMeasure:{ width: 40, fontSize: 7, color: '#475569', textAlign: 'center', paddingRight: 6 },
    colBelt:   { width: 48, fontSize: 7, color: '#475569', paddingRight: 6 },
    colClub:   { flex: 1,   fontSize: 7, color: '#475569' },
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

// ── Types (mirrored from modal) ──────────────────────────────────────────────

interface PlayerInfo {
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
    skillLevel?: string | null
}

interface CategoryData {
    categoryId: string
    categoryName: string
    gender: string | null
    skillLevel: string | null
    type: string
    subtype?: string | null
    playerCount: number
    players: PlayerInfo[]
}

interface BracketListPDFProps {
    tournamentName: string
    discipline: string
    categories: CategoryData[]
    generatedAt?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null): string {
    if (!birthDate) return '-'
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return String(age)
}

function formatDate(birthDate: string | null): string {
    if (!birthDate) return '-'
    const d = new Date(birthDate)
    const day   = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year  = d.getFullYear()
    return `${day}/${month}/${year}`
}

// Show height for young divisions, weight for older ones
function isHeightBased(categoryName: string): boolean {
    const n = categoryName.toLowerCase()
    return /supertoddler|super.?toddler|toddler|grade.?school|gradeschool/.test(n)
}

function disciplineLabel(d: string): string {
    if (d === 'KYORUGI') return 'Sparring (Kyorugi)'
    if (d === 'POOMSAE') return 'Forms (Poomsae)'
    if (d === 'KYUKPA')  return 'Board Breaking (Kyukpa)'
    return d
}

function subtypeLabel(subtype?: string | null): string {
    if (!subtype || subtype === 'INDIVIDUAL') return ''
    if (subtype === 'PAIR') return ' · Pair'
    if (subtype === 'TEAM') return ' · Team'
    return ''
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BracketListPDF({ tournamentName, discipline, categories, generatedAt }: BracketListPDFProps) {
    const now = generatedAt || new Date().toLocaleString()

    return (
        <Document>
            <Page size="A4" style={styles.page} wrap>

                {/* ── Page-level header (repeats on every page) ── */}
                <View style={styles.pageHeader} fixed>
                    <View>
                        <Text style={styles.tournamentName}>{tournamentName}</Text>
                        <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>
                            Bracket Roster List
                        </Text>
                    </View>
                    <Text style={styles.disciplineBadge}>{disciplineLabel(discipline)}</Text>
                </View>

                {/* ── Category blocks ── */}
                {categories.map((cat, catIdx) => {
                    const players = [...cat.players].sort((a, b) => a.name.localeCompare(b.name))
                    const heightOnly = isHeightBased(cat.categoryName)
                    const measureLabel = heightOnly ? 'Height' : 'Weight'
                    return (
                        <View key={cat.categoryId} style={styles.categoryBlock} wrap={false}>

                            {/* Category title bar */}
                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryName}>
                                    {cat.categoryName}{subtypeLabel(cat.subtype)}
                                </Text>
                                <Text style={styles.categoryMeta}>
                                    {players.length} athlete{players.length !== 1 ? 's' : ''}
                                    {cat.gender ? ` · ${cat.gender}` : ''}
                                    {cat.skillLevel ? ` · ${cat.skillLevel}` : ''}
                                </Text>
                            </View>

                            {/* Table header */}
                            <View style={styles.tableHeader}>
                                <Text style={styles.colNum}>#</Text>
                                <Text style={styles.colName}>Name</Text>
                                <Text style={styles.colBday}>Birthday</Text>
                                <Text style={styles.colAge}>Age</Text>
                                <Text style={styles.colMeasure}>{measureLabel}</Text>
                                <Text style={styles.colBelt}>Belt</Text>
                                <Text style={styles.colClub}>Club</Text>
                            </View>

                            {/* Player rows */}
                            {players.length === 0 ? (
                                <View style={styles.tableRow}>
                                    <Text style={{ fontSize: 8, color: '#94a3b8', paddingLeft: 4 }}>No athletes registered</Text>
                                </View>
                            ) : players.map((p, idx) => (
                                <View key={p.id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                                    <Text style={styles.colNum}>{idx + 1}</Text>
                                    <Text style={styles.colName}>{p.name}</Text>
                                    <Text style={styles.colBday}>{formatDate(p.birthDate)}</Text>
                                    <Text style={styles.colAge}>{calcAge(p.birthDate)}</Text>
                                    <Text style={styles.colMeasure}>
                                        {heightOnly
                                            ? (p.height ? `${p.height}cm` : '-')
                                            : (p.weight ? `${p.weight}kg` : '-')
                                        }
                                    </Text>
                                    <Text style={styles.colBelt}>{p.belt || '-'}</Text>
                                    <Text style={styles.colClub}>{p.clubName || '-'}</Text>
                                </View>
                            ))}
                        </View>
                    )
                })}

                {/* ── Footer (repeats on every page) ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Generated by KTM Manager · {now}</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}
