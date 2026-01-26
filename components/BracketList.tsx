import { useState, useTransition } from 'react'
import { Category, Match, PoomsaeMatch } from '@prisma/client'
import BracketView from './BracketView'
import PoomsaeBracketView from './PoomsaeBracketView'
import { generateAllBrackets } from '@/app/actions'
import { Trophy, Medal, Wand2, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BracketListProps {
    categories: (Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[] })[]
    tournamentName?: string
}

export default function BracketList({ categories, tournamentName }: BracketListProps) {
    const [activeTab, setActiveTab] = useState<'kyorugi' | 'poomsae'>('kyorugi')
    const [isPending, startTransition] = useTransition()

    if (categories.length === 0) {
        return <p className="text-gray-500">Add categories to generate matches.</p>
    }

    // Filter categories based on tab
    const kyorugiCategories = categories.filter(c => c.type === 'KYORUGI' || !c.type)
    const poomsaeCategories = categories.filter(c => c.type === 'POOMSAE')

    const displayedCategories = activeTab === 'kyorugi' ? kyorugiCategories : poomsaeCategories
    const tournamentId = categories[0]?.tournamentId

    const handleGenerateAll = () => {
        if (!confirm(`Are you sure you want to regenerate ALL ${activeTab === 'kyorugi' ? 'Kyorugi' : 'Poomsae'} matches? This will overwrite existing brackets.`)) return;

        startTransition(async () => {
            try {
                const result = await generateAllBrackets(tournamentId, activeTab === 'kyorugi' ? 'KYORUGI' : 'POOMSAE')
                if (result?.success) {
                    toast.success(`Generated matches for ${result.count} categories!`)
                } else {
                    toast.error(result?.message || "Failed to generate matches.")
                }
            } catch (error) {
                console.error(error)
                toast.error("An error occurred while generating matches.")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                {/* Tab Switcher */}
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('kyorugi')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'kyorugi'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Trophy size={16} />
                        Kyorugi (Sparring)
                    </button>
                    <button
                        onClick={() => setActiveTab('poomsae')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'poomsae'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Medal size={16} />
                        Poomsae (Forms)
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleGenerateAll}
                        disabled={isPending || displayedCategories.length === 0}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isPending ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <Loader2 size={18} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Wand2 size={18} />
                                Generate All Matches
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {displayedCategories.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                            <AlertCircle className="text-gray-400" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium">No {activeTab === 'kyorugi' ? 'Kyorugi' : 'Poomsae'} categories found.</p>
                        <p className="text-sm text-gray-400 mt-1">Add athletes to create categories automatically.</p>
                    </div>
                ) : (
                    displayedCategories.map((cat) => (
                        <CollapsibleBracket
                            key={cat.id}
                            category={cat}
                            isPoomsae={activeTab === 'poomsae'}
                            tournamentName={tournamentName}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function CollapsibleBracket({
    category,
    isPoomsae = false,
    tournamentName
}: {
    category: Category & { matches: Match[], poomsaeMatches?: (PoomsaeMatch & { player: { name: string; club?: { name: string } | null } })[] },
    isPoomsae?: boolean
    tournamentName?: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const matchCount = isPoomsae ? (category.poomsaeMatches?.length || 0) : category.matches.length

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-red-200 transition-colors">
            <div
                className="p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4 flex-1">
                    <button className="text-gray-400 group-hover:text-red-500 transition-colors focus:outline-none bg-white p-1.5 rounded-md border border-gray-200 shadow-sm">
                        <svg className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <div className="flex flex-col">
                        <h3 className="font-bold text-lg text-gray-800 transition-colors">{category.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                                {matchCount} Matches
                            </span>

                            {category.court && (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 uppercase tracking-wide px-2 py-0.5 rounded border border-orange-100">
                                    Court {category.court}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center">
                        {matchCount > 0 ? (
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                        ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                        )}
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="p-6 border-t border-gray-100 bg-white">
                    <div className="overflow-x-auto">
                        {isPoomsae ? (
                            <PoomsaeBracketView
                                matches={category.poomsaeMatches || []}
                                tournamentName={tournamentName}
                                categoryName={category.name}
                            />
                        ) : (
                            <BracketView
                                matches={category.matches}
                                tournamentName={tournamentName}
                                categoryName={category.name}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
