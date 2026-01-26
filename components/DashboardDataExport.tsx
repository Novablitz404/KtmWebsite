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
            // Columns: Match_ID, Category, Round, Player_1, Player_1_ID, Player_2, Player_2_ID, Winner_To_Match_ID, Winner_To_Slot, Court
            const headers = ['Match_ID', 'Category', 'Round', 'Player_1', 'Player_1_ID', 'Player_2', 'Player_2_ID', 'Winner_To_Match_ID', 'Winner_To_Slot', 'Court']

            const rows = data.matches.map((m: any) => {
                return [
                    m.Match_ID,
                    `"${m.Category}"`, // Quote category just in case
                    m.Round,
                    `"${m.Player_1}"`, // Already formatted as Name (Club) by API
                    m.Player_1_ID,
                    `"${m.Player_2}"`, // Already formatted as Name (Club) by API
                    m.Player_2_ID,
                    m.Winner_To_Match_ID || '',
                    m.Winner_To_Slot || '',
                    m.Court || ''
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
        if (data && data.masterList) {
            // Filter only Poomsae players
            const poomsaePlayers = data.masterList.filter((p: any) => p.type === 'POOMSAE')

            if (poomsaePlayers.length > 0) {
                // Columns: Player_ID, First Name, Last Name, Date Of Birth, Gender, Belt Rank, Club, Court, Event Type, Team ID
                // Note: User requested Player_ID be added. Placing at start for consistency.
                const headers = ['Player_ID', 'First Name', 'Last Name', 'Date Of Birth', 'Gender', 'Belt Rank', 'Club', 'Court', 'Event Type', 'Team ID']

                const rows = poomsaePlayers.map((p: any) => {
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
                a.download = `poomsae-matches-${tournamentName.replace(/\s+/g, '_')}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            } else {
                alert('No Poomsae data found.')
            }
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
