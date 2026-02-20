import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { ExtendedPoomsaeMatch } from '../PoomsaeBracketView'

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1f2937'
    },
    header: {
        marginBottom: 20,
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        color: '#111827'
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280'
    },
    matchGroup: {
        marginBottom: 20,
        breakInside: 'avoid'
    },
    groupHeader: {
        backgroundColor: '#4f46e5',
        color: 'white',
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    groupTitle: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        padding: 6,
        paddingHorizontal: 10
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #f3f4f6',
        padding: 8,
        paddingHorizontal: 10,
        alignItems: 'center'
    },
    colOrder: { width: '10%' },
    colName: { width: '40%' },
    colClub: { width: '25%' },
    colForm: { width: '15%', textAlign: 'right' },
    colScore: { width: '10%', textAlign: 'right' },

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#9ca3af',
        borderTop: '1px solid #e5e7eb',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
    }
})

interface PoomsaeBracketPDFProps {
    tournamentName: string
    categoryName: string
    matches: ExtendedPoomsaeMatch[]
}

export default function PoomsaeBracketPDF({ tournamentName, categoryName, matches }: PoomsaeBracketPDFProps) {
    if (matches.length === 0) return <Document><Page size="A4"><Text>No matches</Text></Page></Document>

    // Group by shared matchId
    const byMatch = matches.reduce((acc, m) => {
        const id = m.matchId || 0
        if (!acc[id]) acc[id] = []
        acc[id].push(m)
        return acc
    }, {} as Record<number, ExtendedPoomsaeMatch[]>)

    // Sort by matchId
    const matchIds = Object.keys(byMatch).map(Number).sort((a, b) => {
        // Use first match in group to compare rounds
        const roundA = byMatch[a]?.[0]?.round ?? 0
        const roundB = byMatch[b]?.[0]?.round ?? 0
        if (roundA !== roundB) return roundA - roundB
        return a - b
    })

    const getRoundName = (r: number) => {
        if (r === 1) return 'Preliminary Round'
        if (r === 2) return 'Semifinal Round'
        if (r === 3) return 'Final Round'
        return `Round ${r}`
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header} fixed>
                    <View>
                        <Text style={styles.title}>{tournamentName.toUpperCase()}</Text>
                        <Text style={styles.subtitle}>{categoryName}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>Poomsae Draw</Text>
                </View>

                {matchIds.map(mid => {
                    const groupMatches = byMatch[mid].sort((a, b) => (a.performanceNumber || 0) - (b.performanceNumber || 0))
                    const round = groupMatches[0].round
                    const roundName = getRoundName(round)

                    return (
                        <View key={mid} style={styles.matchGroup} break={false}>
                            <View style={styles.groupHeader}>
                                <Text style={styles.groupTitle}>{roundName} - Match #{mid}</Text>
                                <Text style={{ fontSize: 10 }}>{groupMatches.length} Performers</Text>
                            </View>

                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={styles.colOrder}>Order</Text>
                                <Text style={styles.colName}>Name</Text>
                                <Text style={styles.colClub}>Club</Text>
                                <Text style={styles.colForm}>Form</Text>
                                <Text style={styles.colScore}>Score</Text>
                            </View>

                            {/* Table Rows */}
                            {groupMatches.map((match) => {
                                const clubName = match.player?.club?.name || 'Independent'
                                const isTeam = !!match.displayName
                                const displayName = match.displayName || match.player?.name || 'TBD'

                                const subName = isTeam
                                    ? match.memberNames || ''
                                    : clubName

                                return (
                                    <View key={match.id} style={styles.tableRow}>
                                        <Text style={{ ...styles.colOrder, fontFamily: 'Helvetica-Bold' }}>
                                            {match.performanceNumber?.toString().padStart(2, '0') || '-'}
                                        </Text>
                                        <View style={styles.colName}>
                                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{displayName}</Text>
                                            {subName && <Text style={{ fontSize: 8, color: '#6b7280' }}>{subName}</Text>}
                                        </View>
                                        <Text style={styles.colClub}>
                                            {!isTeam && clubName}
                                        </Text>
                                        <Text style={styles.colForm}>{match.assignedForms || '-'}</Text>
                                        <Text style={styles.colScore}>
                                            {match.status === 'Completed' ? match.totalScore.toFixed(2) : '--'}
                                        </Text>
                                    </View>
                                )
                            })}
                        </View>
                    )
                })}

                <View style={styles.footer} fixed>
                    <Text>Generated by KTM Manager</Text>
                    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}
