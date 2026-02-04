'use client'

import { Users, UserCog, Building2, Trophy, TrendingUp } from 'lucide-react'
import PendingOrganizations from '@/components/admin/PendingOrganizations'

interface StatsData {
    totalUsers: number
    countByRole: Record<string, number>
    totalRevenue: number
    approvedTournamentRegistrations: number
    approvedSeminarRegistrations: number
}

interface PendingOrg {
    id: string
    name: string
    createdAt: Date
    owner: {
        name: string | null
        email: string
    }
}

interface AdminHomeViewProps {
    stats: StatsData
    pendingOrganizations: PendingOrg[]
}

export default function AdminHomeView({ stats, pendingOrganizations }: AdminHomeViewProps) {
    const { totalUsers, countByRole, totalRevenue, approvedTournamentRegistrations, approvedSeminarRegistrations } = stats

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Revenue Card - Featured */}
                <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                        </div>
                        <p className="text-3xl font-black text-white">₱{totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Total Users */}
                <StatCard
                    title="Total Users"
                    value={totalUsers}
                    icon={<Users className="w-5 h-5" />}
                    color="bg-blue-500"
                    lightColor="bg-blue-50"
                    textColor="text-blue-600"
                />

                {/* Organizers */}
                <StatCard
                    title="Organizers"
                    value={countByRole['ORGANIZER'] || 0}
                    icon={<Building2 className="w-5 h-5" />}
                    color="bg-indigo-500"
                    lightColor="bg-indigo-50"
                    textColor="text-indigo-600"
                />

                {/* Club Masters */}
                <StatCard
                    title="Club Masters"
                    value={countByRole['CLUB_MASTER'] || 0}
                    icon={<UserCog className="w-5 h-5" />}
                    color="bg-purple-500"
                    lightColor="bg-purple-50"
                    textColor="text-purple-600"
                />

                {/* Athletes */}
                <StatCard
                    title="Athletes"
                    value={countByRole['ATHLETE'] || 0}
                    icon={<Trophy className="w-5 h-5" />}
                    color="bg-red-500"
                    lightColor="bg-red-50"
                    textColor="text-red-600"
                />
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Revenue Breakdown</h3>
                        <p className="text-xs text-gray-400 mt-0.5">By registration type (₱100 per registration)</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">₱{totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Total Revenue</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Tournament Registrations Bar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full" />
                                <span className="text-sm font-semibold text-gray-700">Tournament Registrations</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-gray-900">₱{(approvedTournamentRegistrations * 100).toLocaleString()}</span>
                                <span className="text-xs text-gray-400 ml-2">({approvedTournamentRegistrations} reg.)</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                                className="h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-700"
                                style={{
                                    width: totalRevenue > 0
                                        ? `${((approvedTournamentRegistrations * 100) / totalRevenue) * 100}%`
                                        : '0%'
                                }}
                            />
                        </div>
                    </div>

                    {/* Seminar Registrations Bar */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                                <span className="text-sm font-semibold text-gray-700">Seminar Registrations</span>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-bold text-gray-900">₱{(approvedSeminarRegistrations * 100).toLocaleString()}</span>
                                <span className="text-xs text-gray-400 ml-2">({approvedSeminarRegistrations} reg.)</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                                className="h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                                style={{
                                    width: totalRevenue > 0
                                        ? `${((approvedSeminarRegistrations * 100) / totalRevenue) * 100}%`
                                        : '0%'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Approvals - Full Width */}
            <div>
                <PendingOrganizations organizations={pendingOrganizations} />
            </div>
        </div>
    )
}

function StatCard({
    title,
    value,
    icon,
    color,
    lightColor,
    textColor
}: {
    title: string
    value: number
    icon: React.ReactNode
    color: string
    lightColor: string
    textColor: string
}) {
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${lightColor} rounded-xl flex items-center justify-center ${textColor}`}>
                    {icon}
                </div>
                <div className={`w-2 h-2 ${color} rounded-full`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">{title}</p>
        </div>
    )
}
