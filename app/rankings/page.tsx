import { fetchRankings } from './fetch'
import { Shield } from 'lucide-react'
import RankingFilters from './RankingFilters'
import Link from 'next/link'

export const dynamic = 'force-dynamic' // Ensure fresh data on load

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
    const params = await searchParams

    // Extract filters safely
    // Default type to KYORUGI if not specified, OR show both?
    // User asked for "Two containers". Let's show Tabs that switch the view.
    const currentType = typeof params.type === 'string' ? params.type : 'KYORUGI'

    const division = typeof params.division === 'string' ? params.division : undefined
    const belt = typeof params.belt === 'string' ? params.belt : undefined
    const skillLevel = typeof params.skillLevel === 'string' ? params.skillLevel : undefined
    const gender = typeof params.gender === 'string' ? params.gender : undefined

    const rankings = await fetchRankings({ type: currentType, division, belt, skillLevel, gender })

    // Helper to generate tab link
    const getTabLink = (type: string) => {
        const newParams = new URLSearchParams()
        if (division) newParams.set('division', division)
        if (belt) newParams.set('belt', belt)
        if (skillLevel) newParams.set('skillLevel', skillLevel)
        if (gender) newParams.set('gender', gender)
        newParams.set('type', type)
        return `/rankings?${newParams.toString()}`
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                        <span className="text-red-500">K-POINT</span> RANKINGS
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Official leaderboard for verified Taekwondo athletes.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 -mt-10 space-y-6">

                {/* Discipline Tabs */}
                <div className="flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg mx-auto max-w-md">
                    <Link
                        href={getTabLink('KYORUGI')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${currentType === 'KYORUGI' ? 'bg-red-600 text-white shadow-md' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                        KYORUGI
                    </Link>
                    <Link
                        href={getTabLink('POOMSAE')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${currentType === 'POOMSAE' ? 'bg-blue-600 text-white shadow-md' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                        POOMSAE
                    </Link>
                </div>

                <RankingFilters />

                {/* Rankings Table Container */}
                <div className={`bg-white rounded-2xl shadow-xl border overflow-hidden ${currentType === 'KYORUGI' ? 'border-red-100' : 'border-blue-100'}`}>
                    <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${currentType === 'KYORUGI' ? 'text-red-900' : 'text-blue-900'}`}>
                            {currentType} Standings
                        </h2>
                        <div className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-500">
                            Official Validation
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-16">Rank</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Athlete</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">K-Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rankings.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                            No ranked athletes found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    rankings.map((athlete) => (
                                        <tr key={athlete.userId} className={`hover:bg-gray-50 transition-colors group ${athlete.rank <= 3 ? 'bg-yellow-50/10' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${athlete.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                    athlete.rank === 2 ? 'bg-gray-100 text-gray-700' :
                                                        athlete.rank === 3 ? 'bg-orange-100 text-orange-800' :
                                                            'bg-transparent text-gray-400'
                                                    }`}>
                                                    {athlete.rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    {/* Profile Avatar */}
                                                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shadow-sm flex-shrink-0">
                                                        {athlete.profileImage ? (
                                                            <img src={athlete.profileImage} alt={athlete.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-lg">
                                                                {athlete.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        {athlete.verified && (
                                                            <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow-sm">
                                                                <Shield className="w-3 h-3 text-blue-500 fill-blue-500" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 text-lg group-hover:text-red-600 transition-colors">
                                                            {athlete.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {/* Hidden Club info, maybe show Belt if available? */}
                                                            {/* We didn't fetch belt specifically for display, but could reuse club here if desired, but user asked to hide club. */}
                                                            Verified Athlete
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="font-black text-gray-900 text-2xl tracking-tight">
                                                    {athlete.totalPoints.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Points</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
