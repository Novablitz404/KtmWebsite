import { fetchRankings } from '@/app/rankings/fetch'
import { Shield } from 'lucide-react'
import WOTFRankingFilters from '@/components/landing/wotf/pages/WOTFRankingFilters'
import Link from 'next/link'
import Navbar from "@/components/landing/wotf/Navbar"
import Footer from "@/components/landing/wotf/Footer"
import { getTenant } from '@/lib/tenant'

interface Props {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function WOTFRankingPage({ searchParams }: Props) {
    const tenant = await getTenant()
    const currentType = typeof searchParams.type === 'string' ? searchParams.type : 'KYORUGI'

    const division = typeof searchParams.division === 'string' ? searchParams.division : undefined
    const belt = typeof searchParams.belt === 'string' ? searchParams.belt : undefined
    const skillLevel = typeof searchParams.skillLevel === 'string' ? searchParams.skillLevel : undefined
    const gender = typeof searchParams.gender === 'string' ? searchParams.gender : undefined
    const search = typeof searchParams.search === 'string' ? searchParams.search : undefined

    const tenantId = tenant.slug !== 'ktm' ? (tenant.id || undefined) : undefined

    const rankings = await fetchRankings({ type: currentType, division, belt, skillLevel, gender, tenantId, search })
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
        <main className="min-h-screen bg-white flex flex-col">
            <Navbar />

            <div className="flex-1 pb-20">
                {/* Hero Section */}
                <div className="bg-[#0F172A] relative overflow-hidden py-24 pt-32 md:pt-40 px-4">
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-congo-blue/20 rounded-full blur-[100px]" />
                        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-spanish-red/10 rounded-full blur-[100px]" />
                    </div>

                    <div className="w-full max-w-[1400px] mx-auto text-center relative z-10">
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase text-white">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-congo-blue to-cyan-400">GSS</span> RANKINGS
                        </h1>
                        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                            Official leaderboard for verified WOTF Taekwondo athletes.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="w-full max-w-[1400px] mx-auto px-4 py-8 md:py-12 space-y-6 relative z-20">

                    <WOTFRankingFilters />

                    {/* Results Meta */}
                    <div className="flex items-center justify-between text-sm font-bold text-gray-700 bg-gray-50 p-4 border-y border-gray-200 mb-4">
                        <div>
                            <span className="text-congo-blue">{rankings.length}</span> results found.
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Show Records:</span>
                                <select className="border-gray-300 rounded text-sm py-1 font-medium bg-gray-50 focus:ring-0 focus:border-gray-300">
                                    <option>25</option>
                                    <option>50</option>
                                    <option>100</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-4 text-gray-500 font-medium">
                                <div className="flex items-center gap-1"><span className="text-spanish-red font-black">X</span> Suspended</div>
                                <div className="flex items-center gap-1"><span className="text-gray-800 font-black">R</span> Retired</div>
                            </div>
                        </div>
                    </div>

                    {/* Rankings Table Container */}
                    <div className="w-full bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b-2 border-congo-blue">
                                    <tr>
                                        <th className="px-6 py-4 text-center text-xs font-black text-congo-blue uppercase tracking-widest w-20">Rank <span className="text-gray-400">↑↓</span></th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-congo-blue uppercase tracking-widest">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-congo-blue uppercase tracking-widest">Member Nation / Club</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-congo-blue uppercase tracking-widest">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rankings.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-gray-400 font-medium">
                                                No ranked athletes found matching your filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        rankings.map((athlete) => (
                                            <tr key={athlete.userId} className={`hover:bg-gray-50 transition-colors group ${athlete.rank <= 3 ? 'bg-gray-50/50' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className={`font-medium text-lg ${athlete.rank <= 3 ? 'text-gray-900 font-black' : 'text-gray-700'}`}>
                                                            {athlete.rank}
                                                        </div>
                                                        <div className="text-gray-400 font-bold text-xs">-</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-4">
                                                        {/* Profile Avatar */}
                                                        <div className="relative w-12 h-12 rounded bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                            {athlete.profileImage ? (
                                                                <img src={athlete.profileImage} alt={athlete.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-black text-lg">
                                                                    {athlete.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <Link href={`/athlete/${athlete.userId}`} className="font-bold text-congo-blue text-base hover:underline tracking-tight">
                                                                {athlete.name.toUpperCase()}
                                                            </Link>
                                                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                                                                ({tenant.slug === 'wotf-global' ? 'WOTF' : 'KTM'} ID: {athlete.userId.substring(0, 8)})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {/* Dummy Flag / Org Logo Placeholder */}
                                                        <div className="w-8 h-5 bg-gray-200 rounded-sm overflow-hidden flex items-center justify-center border border-gray-300">
                                                            {/* We don't have flags yet, just a colored block placeholder */}
                                                            <div className="w-full h-full bg-gradient-to-br from-red-500 to-blue-500 opacity-50"></div>
                                                        </div>
                                                        <span className="font-medium text-gray-700 text-sm">
                                                            {athlete.clubName || 'Independent'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="font-medium text-gray-700 text-base">
                                                        {athlete.totalPoints.toFixed(2)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Dummy */}
                        {rankings.length > 0 && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <nav className="flex items-center gap-1">
                                    <button className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50">&laquo;</button>
                                    <button className="px-3 py-1 text-sm font-bold text-white bg-congo-blue rounded shadow-sm">1</button>
                                    <button className="px-3 py-1 text-sm text-congo-blue bg-white border border-gray-200 rounded hover:bg-gray-50">2</button>
                                    <button className="px-3 py-1 text-sm text-congo-blue bg-white border border-gray-200 rounded hover:bg-gray-50">3</button>
                                    <button className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-50">&raquo;</button>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    )
}
