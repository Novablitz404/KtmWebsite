import { Match } from '@prisma/client'

interface BracketViewProps {
    matches: Match[]
}

export default function BracketView({ matches }: BracketViewProps) {
    if (matches.length === 0) {
        return <div className="p-10 text-center text-gray-500">No bracket generated yet.</div>
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

    return (
        <div className="overflow-x-auto p-4 pb-10">
            <div className="flex flex-col gap-10">
                {roots.map(root => (
                    <BracketNode key={root.id} match={root} childrenMap={childrenMap} isRoot={true} maxRound={maxRound} />
                ))}
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
        if (match.round === maxRound) return 'Finals';
        if (match.round === maxRound - 1) return 'Semifinals';
        if (match.round === maxRound - 2) return 'Quarterfinals';
        return `Eliminations (R${match.round})`;
    }

    // Helper for name styling
    const displayName = (name: string) => name === 'BYE' ? <span className="text-gray-400 italic text-xs">BYE</span> : name;

    // If both players are BYE, it's an empty filler match. 
    const isFiller = match.player1 === 'BYE' && match.player2 === 'BYE';

    return (
        <div className={`flex items-center ${isFiller ? 'opacity-50' : ''}`}>
            {/* Left Side: Children */}
            {!isLeaf && (
                <div className="flex flex-col justify-center mr-[40px] relative">

                    {topChild && (
                        <div className="flex flex-col items-end relative">
                            <BracketNode match={topChild} childrenMap={childrenMap} maxRound={maxRound} type="top" />

                            {/* ELBOW CONNECTOR: Top Child */}
                            <div className="absolute right-[-20px] top-[50%] w-[20px] h-[calc(50%+1px)] border-t border-r border-gray-300 rounded-tr-xl pointer-events-none"></div>
                        </div>
                    )}

                    {bottomChild && (
                        <div className="flex flex-col items-end relative">
                            <BracketNode match={bottomChild} childrenMap={childrenMap} maxRound={maxRound} type="bottom" />

                            {/* ELBOW CONNECTOR: Bottom Child */}
                            <div className="absolute right-[-20px] bottom-[50%] w-[20px] h-[calc(50%+1px)] border-b border-r border-gray-300 rounded-br-xl pointer-events-none"></div>
                        </div>
                    )}
                </div>
            )}

            {/* The Match Node */}
            <div className="relative z-10 my-4">
                <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-3 min-w-[200px] ${isFiller ? 'bg-gray-50 border-gray-100' : ''}`}>
                    <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{roundLabel()}</span>
                        <div className="flex flex-col items-end">
                            {match.id && <span className="text-[9px] text-gray-800 font-mono font-bold">Match {match.id}</span>}
                            {match.court && match.court !== 'Unassigned' && <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded">{match.court}</span>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${match.winner === match.player1 ? 'text-green-600' : 'text-gray-900'} truncate max-w-[120px]`}>
                            {displayName(match.player1)}
                        </span>
                        {match.r1_blue_score > 0 && <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">{match.r1_blue_score}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${match.winner === match.player2 ? 'text-green-600' : 'text-gray-900'} truncate max-w-[120px]`}>
                            {displayName(match.player2)}
                        </span>
                        {match.r1_red_score > 0 && <span className="text-xs bg-red-100 text-red-800 px-1 rounded">{match.r1_red_score}</span>}
                    </div>
                </div>

                {/* Parent Connector Stub */}
                {!isLeaf && (
                    <div className="absolute left-[-20px] top-1/2 w-[20px] h-[1px] bg-gray-300 z-[-1]"></div>
                )}
            </div>
        </div>
    )
}
