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
        </div>
    )
}
