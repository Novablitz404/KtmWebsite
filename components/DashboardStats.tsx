import { Users, Building2, Globe, ChevronRight, Trophy } from 'lucide-react'
import Link from 'next/link'

interface DashboardStatsProps {
    stats: {
        totalMembers: number
        directMembers: number
        directClubs: number
        affiliatedOrgs: number
    } | null
}

export default function DashboardStats({ stats }: DashboardStatsProps) {

    if (!stats) return <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">Please log in to view stats.</div>

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Members (Aggregated) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Members</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.totalMembers}</h3>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>Across all affiliates</span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {stats.directMembers} direct
                        </span>
                    </div>
                </div>

                {/* Club Affiliates */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Club Affiliates</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.directClubs}</h3>
                        </div>
                    </div>
                </div>

                {/* Organization Affiliates */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Org. Affiliates</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats.affiliatedOrgs}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/organizer-tournaments" className="group bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 transition-transform active:scale-[0.99]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Active Tournaments</h3>
                    <p className="text-indigo-100 text-sm">View ongoing and upcoming events</p>
                </Link>

                <Link href="/promotions" className="group bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 transition-transform active:scale-[0.99]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Active Promotions</h3>
                    <p className="text-amber-100 text-sm">View current promos and offers</p>
                </Link>
            </div>
        </div>
    )
}
