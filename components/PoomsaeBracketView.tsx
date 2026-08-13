'use client'

import { PoomsaeMatch } from '@prisma/client'
import { pdf } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import PoomsaeBracketPDF from './pdf/PoomsaeBracketPDF'

// Extended interface to include teamMembers relation (mocked or fetched)
export interface ExtendedPoomsaeMatch extends PoomsaeMatch {
    player: {
        name: string
        teamId?: string | null
        club?: { name: string } | null
    } | null
    assignedForms: string | null
    matchId: number | null
    nextMatchId: number | null
    teamMembers?: { name: string }[]
}

interface PoomsaeBracketViewProps {
    matches: ExtendedPoomsaeMatch[]
    tournamentName?: string
    categoryName?: string
}

export default function PoomsaeBracketView({ matches, tournamentName = "Tournament", categoryName = "Category" }: PoomsaeBracketViewProps) {
    if (matches.length === 0) {
        return <div className="text-sm text-gray-500 italic p-4">No matches generated yet.</div>
    }

    // Group by shared matchId
    const byMatch = matches.reduce((acc, m) => {
        const id = m.matchId || 0
        if (!acc[id]) acc[id] = []
        acc[id].push(m)
        return acc
    }, {} as Record<number, ExtendedPoomsaeMatch[]>)

    // Sort by matchId
    const matchIds = Object.keys(byMatch).map(Number).sort((a, b) => {
        const roundA = byMatch[a][0].round
        const roundB = byMatch[b][0].round
        if (roundA !== roundB) return roundA - roundB
        return a - b
    })

    const getRoundName = (r: number) => {
        if (r === 1) return 'Preliminary Round'
        if (r === 2) return 'Semifinal Round'
        if (r === 3) return 'Final Round'
        return `Round ${r}`
    }

    const handleDownloadPDF = async () => {
        const blob = await pdf(
            <PoomsaeBracketPDF
                tournamentName={tournamentName}
                categoryName={categoryName}
                matches={matches}
            />
        ).toBlob()

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${categoryName}-poomsae-draw.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm"
                >
                    <Download size={16} />
                    Download Draw PDF
                </button>
            </div>

            <div className="space-y-12">
                {matchIds.map(mid => {
                    const groupMatches = byMatch[mid].sort((a, b) => (a.performanceNumber || 0) - (b.performanceNumber || 0))
                    const round = groupMatches[0].round
                    const nextMatchId = groupMatches[0].nextMatchId
                    const categoryName = groupMatches[0].category || 'Category'

                    // Head-to-head pairings are exactly 2 performers per group — once both
                    // are Completed, highlight the higher score as the winner (tie-break by
                    // accuracy, matching the API's advancement logic).
                    let winnerId: number | null = null
                    if (groupMatches.length === 2 && groupMatches.every(m => m.status === 'Completed')) {
                        const [a, b] = groupMatches
                        if (a.totalScore !== b.totalScore) winnerId = a.totalScore > b.totalScore ? a.id : b.id
                        else if (a.accuracy !== b.accuracy) winnerId = a.accuracy > b.accuracy ? a.id : b.id
                    }

                    return (
                        <div key={mid} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-indigo-600 px-5 py-4 border-b border-indigo-700 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className="text-[11px] font-bold text-white uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                                            Match #{mid.toString().padStart(3, '0')}
                                        </span>
                                        {nextMatchId && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/20 border border-green-400/30">
                                                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-green-100 uppercase tracking-widest leading-none">
                                                    Advances to Match #{nextMatchId.toString().padStart(3, '0')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white text-xl leading-tight">
                                        {categoryName} - {getRoundName(round)}
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-indigo-100 uppercase block leading-none mb-1 opacity-80">Performers</span>
                                    <span className="text-white font-mono font-bold text-2xl">{groupMatches.length}</span>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {groupMatches.map((match) => {
                                    const isTeamEvent = match.teamMembers && match.teamMembers.length > 1;
                                    const clubName = match.player?.club?.name || 'Independent';
                                    const teamId = match.player?.teamId;
                                    const isWinner = winnerId === match.id

                                    return (
                                        <div key={match.id} className={`p-5 flex items-center justify-between hover:bg-gray-50/80 transition-all group ${isWinner ? 'bg-green-50/50' : ''}`}>
                                            <div className="flex items-center gap-8">
                                                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2.5 min-w-[70px] border border-gray-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Order #</span>
                                                    <span className="text-lg font-mono font-bold text-indigo-600">
                                                        {match.performanceNumber?.toString().padStart(2, '0') || '--'}
                                                    </span>
                                                </div>

                                                <div className="min-w-[200px]">
                                                    {match.displayName ? (
                                                        // TEAM/PAIR: show team display name and member IDs
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-gray-900 text-lg leading-tight">
                                                                {match.displayName}
                                                            </p>
                                                            {match.memberNames && (
                                                                <div className="text-[11px] text-gray-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                                                                    {match.memberNames}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : !match.player ? (
                                                        <div className="flex flex-col">
                                                            <p className="font-bold text-gray-400 italic font-mono text-base uppercase tracking-tight">TBD Slot</p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Waiting for Results</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            <p className="font-bold text-gray-900 text-xl leading-tight group-hover:text-indigo-600 transition-colors">{match.player.name}</p>
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{clubName}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">
                                                {match.assignedForms && (
                                                    <div className="hidden sm:flex flex-col items-end">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Poomsae</span>
                                                        <span className="text-sm font-bold text-indigo-600 italic bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                            {match.assignedForms}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Total Score</div>
                                                        <div className="font-mono font-bold text-2xl text-gray-900">
                                                            {match.status === 'Completed' ? match.totalScore.toFixed(2) : '--.--'}
                                                        </div>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${match.status === 'Completed'
                                                        ? 'bg-green-50 text-green-600 border-green-100 shadow-sm'
                                                        : 'bg-gray-50 text-gray-400 border-gray-100'
                                                        }`}>
                                                        {isWinner ? 'Winner' : match.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
