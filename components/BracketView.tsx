import { Match } from '@prisma/client'
import { pdf } from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import BracketPDF from './pdf/BracketPDF'

interface BracketViewProps {
    matches: Match[]
    tournamentName?: string
    categoryName?: string
}

export default function BracketView({ matches, tournamentName = "Tournament", categoryName = "Category" }: BracketViewProps) {
    if (matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="font-medium">No bracket generated yet.</p>
                <p className="text-sm mt-1">Generate matches to see the bracket.</p>
            </div>
        )
    }

    // Build the tree
    const matchMap = new Map<number, Match>()
    matches.forEach(m => matchMap.set(m.id, m))

    const childrenMap = new Map<number, Match[]>()
    matches.forEach(m => {
        if (m.nextMatchId) {
            if (!childrenMap.has(m.nextMatchId)) {
                childrenMap.set(m.nextMatchId, [])
            }
            childrenMap.get(m.nextMatchId)!.push(m)
        }
    })

    // Determine Max Round for labeling
    const maxRound = Math.max(...matches.map(m => m.round))

    const roots = matches.filter(m => !m.nextMatchId)

    const handleDownloadPDF = async () => {
        const blob = await pdf(
            <BracketPDF
                tournamentName={tournamentName}
                categoryName={categoryName}
                matches={matches}
            />
        ).toBlob()

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${categoryName}-bracket.pdf`
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
                    Download Bracket PDF
                </button>
            </div>

            <div className="overflow-x-auto p-8 pb-10 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex flex-col gap-12">
                    {roots.map(root => (
                        <BracketNode key={root.id} match={root} childrenMap={childrenMap} isRoot={true} maxRound={maxRound} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function BracketNode({
    match,
    childrenMap,
    maxRound,
    isRoot = false,
    type = 'single'
}: {
    match: Match,
    childrenMap: Map<number, Match[]>,
    maxRound: number,
    isRoot?: boolean,
    type?: 'top' | 'bottom' | 'single'
}) {
    const children = childrenMap.get(match.id) || []
    const topChild = children.find(c => c.nextMatchSlot === 'player1')
    const bottomChild = children.find(c => c.nextMatchSlot === 'player2')

    const isLeaf = children.length === 0;

    const roundLabel = () => {
        if (match.round === maxRound) return 'FINALS';
        if (match.round === maxRound - 1) return 'SEMI-FINALS';
        if (match.round === maxRound - 2) return 'QUARTER-FINALS';
        return `ROUND ${match.round}`;
    }

    // Helper for name styling
    const displayName = (name: string) => name === 'BYE' ? <span className="text-gray-400 italic text-xs font-semibold">BYE</span> : name;

    // If both players are BYE, it's an empty filler match. 
    const isFiller = match.player1 === 'BYE' && match.player2 === 'BYE';

    // Status Badge Color
    const getStatusColor = () => {
        if (match.winner) return 'bg-gray-800 text-white'; // Completed
        if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE') return 'bg-green-600 text-white animate-pulse'; // Ready
        return 'bg-gray-200 text-gray-500'; // Pending
    }

    const getStatusLabel = () => {
        if (match.winner) return 'COMPLETED';
        if (match.player1 && match.player2 && match.player1 !== 'BYE' && match.player2 !== 'BYE') return 'LIVE';
        return 'PENDING';
    }

    return (
        <div className={`flex items-center ${isFiller ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
            {/* Left Side: Children */}
            {!isLeaf && (
                <div className="flex flex-col justify-center mr-[50px] relative">

                    {topChild && (
                        <div className="flex flex-col items-end relative">
                            <BracketNode match={topChild} childrenMap={childrenMap} maxRound={maxRound} type="top" />
                            {/* ELBOW CONNECTOR: Top Child */}
                            <div className="absolute right-[-25px] top-[50%] w-[25px] h-[calc(50%+2px)] border-t-2 border-r-2 border-gray-300 rounded-tr-xl pointer-events-none"></div>
                        </div>
                    )}

                    {bottomChild && (
                        <div className="flex flex-col items-end relative">
                            <BracketNode match={bottomChild} childrenMap={childrenMap} maxRound={maxRound} type="bottom" />
                            {/* ELBOW CONNECTOR: Bottom Child */}
                            <div className="absolute right-[-25px] bottom-[50%] w-[25px] h-[calc(50%+2px)] border-b-2 border-r-2 border-gray-300 rounded-br-xl pointer-events-none"></div>
                        </div>
                    )}
                </div>
            )}

            {/* The Match Node (Card) */}
            <div className="relative z-10 my-6 transition-transform hover:scale-[1.02] duration-200">
                <div className={`w-[280px] bg-white rounded-lg shadow-md border overflow-hidden ${match.winner ? 'border-gray-400 shadow-gray-200' : 'border-gray-200 shadow-sm'}`}>

                    {/* Header: Match Info */}
                    <div className="bg-gray-50 px-3 py-1.5 flex justify-between items-center border-b border-gray-100">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{roundLabel()}</span>
                        <div className="flex items-center gap-2">
                            {match.court && match.court !== 'Unassigned' && (
                                <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-1.5 rounded">
                                    C{match.court}
                                </span>
                            )}
                            <span className={`text-[9px] font-bold px-1.5 rounded ${getStatusColor()}`}>
                                #{match.matchId ?? match.id}
                            </span>
                        </div>
                    </div>

                    {/* Player 1 (Blue / Chong) */}
                    <div className={`px-3 py-2 flex justify-between items-center border-b border-gray-100 relative overflow-hidden group ${match.winner === match.player1 ? 'bg-blue-50/50' : ''
                        }`}>
                        {/* Blue Bar Indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>

                        <div className="flex flex-col pl-2">
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-0.5">Chong (Blue)</span>
                            <span className={`text-sm truncate max-w-[180px] transition-colors ${match.winner ? (match.winner === match.player1 ? 'font-black text-gray-900' : 'font-medium text-gray-400 decoration-gray-300 line-through decoration-2') : 'font-bold text-gray-800'
                                }`}>
                                {displayName(match.player1)}
                            </span>
                        </div>
                        {/* Score */}
                        {match.r1_blue_score > 0 || match.winner ? (
                            <span className={`text-lg font-black font-mono ${match.winner === match.player1 ? 'text-blue-600' : 'text-gray-300'}`}>
                                {match.r1_blue_score + match.r2_blue_score + match.r3_blue_score}
                            </span>
                        ) : null}
                    </div>

                    {/* Player 2 (Red / Hong) */}
                    <div className={`px-3 py-2 flex justify-between items-center relative overflow-hidden ${match.winner === match.player2 ? 'bg-red-50/50' : ''
                        }`}>
                        {/* Red Bar Indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>

                        <div className="flex flex-col pl-2">
                            <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-0.5">Hong (Red)</span>
                            <span className={`text-sm truncate max-w-[180px] transition-colors ${match.winner ? (match.winner === match.player2 ? 'font-black text-gray-900' : 'font-medium text-gray-400 decoration-gray-300 line-through decoration-2') : 'font-bold text-gray-800'
                                }`}>
                                {displayName(match.player2)}
                            </span>
                        </div>
                        {/* Score */}
                        {match.r1_red_score > 0 || match.winner ? (
                            <span className={`text-lg font-black font-mono ${match.winner === match.player2 ? 'text-red-600' : 'text-gray-300'}`}>
                                {match.r1_red_score + match.r2_red_score + match.r3_red_score}
                            </span>
                        ) : null}
                    </div>

                </div>

                {/* Parent Connector Stub */}
                {!isLeaf && (
                    <div className="absolute left-[-25px] top-1/2 w-[25px] h-[2px] bg-gray-300 z-[-1]"></div>
                )}
            </div>
        </div>
    )
}
