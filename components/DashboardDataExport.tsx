'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface DashboardDataExportProps {
    tournamentId: string
    tournamentName: string
    className?: string
}

export default function DashboardDataExport({ tournamentId, tournamentName, className = '' }: DashboardDataExportProps) {
    const [downloading, setDownloading] = useState<string | null>(null)

    const fetchTournamentData = async () => {
        try {
            const response = await fetch(`/api/tournament/${tournamentId}/download`)
            if (!response.ok) throw new Error('Failed to fetch data')
            return await response.json()
        } catch (error) {
            console.error('Download error:', error)
            alert('Failed to download tournament data. Please try again.')
            return null
        }
    }

    const downloadJSON = async () => {
        setDownloading('json')
        const data = await fetchTournamentData()
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `tournament-${tournamentId}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }
        setDownloading(null)
    }

    const downloadMatchesCSV = async () => {
        setDownloading('matches')
        const data = await fetchTournamentData()
        if (data && data.matches) {
            const headers = ['id', 'matchId', 'category', 'round', 'player1', 'player1Id', 'player1Club', 'player2', 'player2Id', 'player2Club', 'winner', 'nextMatchId', 'nextMatchSlot', 'court', 'r1_blue_score', 'r1_red_score', 'r2_blue_score', 'r2_red_score', 'r3_blue_score', 'r3_red_score', 'total_blue_score', 'total_red_score', 'blue_gam_jeom', 'red_gam_jeom', 'blue_rounds_won', 'red_rounds_won']

            const rows = data.matches.map((m: any) => {
                return [
                    m.id,
                    m.matchId || '',
                    `"${m.category}"`,
                    m.round,
                    `"${m.player1}"`,
                    m.player1Id,
                    `"${m.player1Club || ''}"`,
                    `"${m.player2}"`,
                    m.player2Id,
                    `"${m.player2Club || ''}"`,
                    `"${m.winner || ''}"`,
                    m.nextMatchId || '',
                    m.nextMatchSlot || '',
                    m.court || '',
                    m.r1_blue_score ?? 0,
                    m.r1_red_score ?? 0,
                    m.r2_blue_score ?? 0,
                    m.r2_red_score ?? 0,
                    m.r3_blue_score ?? 0,
                    m.r3_red_score ?? 0,
                    m.total_blue_score ?? 0,
                    m.total_red_score ?? 0,
                    m.blue_gam_jeom ?? 0,
                    m.red_gam_jeom ?? 0,
                    m.blue_rounds_won ?? 0,
                    m.red_rounds_won ?? 0
                ].join(',')
            })

            const csvContent = [headers.join(','), ...rows].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `matches-${tournamentName.replace(/\s+/g, '_')}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }
        setDownloading(null)
    }

    const downloadPoomsaeMatchesCSV = async () => {
        setDownloading('poomsaeMatches')
        const data = await fetchTournamentData()
        if (data && data.poomsaeMatches && data.poomsaeMatches.length > 0) {
            const headers = ['id', 'matchId', 'nextMatchId', 'category', 'subtype', 'round', 'performanceNumber', 'playerId', 'player', 'displayName', 'memberIds', 'memberNames', 'assignedForms', 'targetRank', 'accuracy', 'presentation', 'totalScore', 'rank', 'status', 'court']

            const rows = data.poomsaeMatches.map((m: any) => {
                return [
                    m.id,
                    m.matchId ?? '',
                    m.nextMatchId ?? '',
                    `"${m.category}"`,
                    m.subtype || 'INDIVIDUAL',
                    m.round,
                    m.performanceNumber ?? '',
                    m.playerId || '',
                    `"${m.player || ''}"`,
                    `"${m.displayName || ''}"`,
                    `"${m.memberIds || ''}"`,
                    `"${m.memberNames || ''}"`,
                    `"${m.assignedForms || ''}"`,
                    m.targetRank ?? '',
                    m.accuracy ?? '',
                    m.presentation ?? '',
                    m.totalScore ?? '',
                    m.rank ?? '',
                    m.status || '',
                    m.court || ''
                ].join(',')
            })

            const csvContent = [headers.join(','), ...rows].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `poomsae-matches-${tournamentName.replace(/\s+/g, '_')}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } else {
            alert('No Poomsae match data found.')
        }
        setDownloading(null)
    }

    const downloadMasterlistCSV = async () => {
        setDownloading('masterlist')
        const data = await fetchTournamentData()

        if (data && data.masterList) {
            // Columns from User Request
            const headers = ['Player_ID', 'First Name', 'Last Name', 'Date Of Birth', 'Gender', 'Belt Rank', 'Club', 'Court', 'Event Type', 'Team ID']

            const rows = data.masterList.map((p: any) => {
                return [
                    p.Player_ID,
                    `"${p["First Name"]}"`,
                    `"${p["Last Name"]}"`,
                    p["Date Of Birth"] || '',
                    p.Gender,
                    p["Belt Rank"],
                    `"${p.Club}"`,
                    p.Court || '',
                    p["Event Type"],
                    p["Team ID"] || ''
                ].join(',')
            })

            const csvContent = [headers.join(','), ...rows].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            // Renamed file for clarity
            a.download = `masterlist-${tournamentName.replace(/\s+/g, '_')}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }
        setDownloading(null)
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            <button
                onClick={downloadMatchesCSV}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
                {downloading === 'matches' ? (
                    <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                Export Kyorugi Matches
            </button>

            <button
                onClick={downloadPoomsaeMatchesCSV}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
                {downloading === 'poomsaeMatches' ? (
                    <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                Export Poomsae Matches
            </button>

            <button
                onClick={downloadMasterlistCSV}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
                {downloading === 'masterlist' ? (
                    <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                Export Masterlist
            </button>

            <button
                onClick={downloadJSON}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
                {downloading === 'json' ? (
                    <span className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
                JSON Backup
            </button>
        </div>
    )
}
