'use client'

import { Users, UserCog, Building2, Trophy, TrendingUp } from 'lucide-react'
import PendingOrganizations from '@/components/admin/PendingOrganizations'

import { useQuery } from '@tanstack/react-query'
import { getAdminFinancials, getPlatformGrowth } from '@/app/admin/actions'

interface StatsData {
    totalUsers: number
    countByRole: Record<string, number>
    newUsersThisMonth: number
    newRegistrationsThisMonth: number
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
    const { totalUsers, countByRole, newUsersThisMonth, newRegistrationsThisMonth } = stats

    const { data: financialData, isLoading: isLoadingFinancials } = useQuery({
        queryKey: ['admin-financials'],
        queryFn: () => getAdminFinancials(),
        staleTime: 1000 * 60 * 5,
    })

    const { data: growthData, isLoading: isLoadingGrowth } = useQuery({
        queryKey: ['admin-growth'],
        queryFn: () => getPlatformGrowth(),
        staleTime: 1000 * 60 * 5,
    })

    const totalRevenue = financialData?.summary.totalCollected || 0

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
                        <p className="text-3xl font-black text-white">
                            {isLoadingFinancials ? (
                                <span className="inline-block w-32 h-8 bg-white/20 rounded-lg animate-pulse" />
                            ) : (
                                `₱${totalRevenue.toLocaleString()}`
                            )}
                        </p>
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

            {/* Platform Growth */}
            {/* Platform Growth */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Platform Growth</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Monthly users and registrations</p>
                    </div>
                </div>

                {/* This Month Highlight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Users size={18} />
                                <span className="font-semibold text-sm">New Users</span>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md uppercase tracking-wider">This Month</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 mt-2">+{newUsersThisMonth.toLocaleString()}</p>
                    </div>

                    <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-rose-600">
                                <Trophy size={18} />
                                <span className="font-semibold text-sm">New Registrations</span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md uppercase tracking-wider">This Month</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 mt-2">+{newRegistrationsThisMonth.toLocaleString()}</p>
                    </div>
                </div>

                {/* Bar Charts */}
                {isLoadingGrowth || !growthData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-64">
                        <div className="bg-gray-50 rounded-xl animate-pulse w-full h-full" />
                        <div className="bg-gray-50 rounded-xl animate-pulse w-full h-full" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-64">
                        <GrowthBarChart data={growthData} dataKey="users" color="#4F46E5" title="Historical New Users" maxValue={Math.max(...growthData.map(d => d.users), 1)} />
                        <GrowthBarChart data={growthData} dataKey="registrations" color="#E11D48" title="Historical Registrations" maxValue={Math.max(...growthData.map(d => d.registrations), 1)} />
                    </div>
                )}
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

function GrowthBarChart({ data, dataKey, color, title, maxValue }: {
    data: { month: string; users: number; registrations: number }[]
    dataKey: 'users' | 'registrations'
    color: string
    title: string
    maxValue: number
}) {
    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const val = maxValue * (i / 4)
        return val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${Math.round(val)}`
    }).reverse()

    return (
        <div className="flex flex-col h-full relative group">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">{title}</h4>
            <div className="flex gap-4 flex-1">
                <div className="flex flex-col justify-between items-end text-[10px] text-gray-400 font-medium py-1 w-8 shrink-0 pb-6">
                    {yAxisLabels.map((lbl, i) => (<span key={i} className="leading-none">{lbl}</span>))}
                </div>
                <div className="flex-1 relative">
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-6">
                        {[0, 1, 2, 3, 4].map(i => (<div key={i} className="w-full border-b border-gray-100/50 border-dashed" />))}
                    </div>
                    <div className="absolute inset-x-0 inset-y-0 flex items-end gap-2 pb-6">
                        {data.map((d, i) => {
                            const val = d[dataKey]
                            const barHeight = val > 0 ? (val / maxValue) * 100 : 0
                            const hasData = val > 0

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full relative z-10 group/bar">
                                    {hasData && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg font-bold">
                                            {val.toLocaleString()}
                                        </div>
                                    )}
                                    <div className="w-full flex items-end justify-center pb-1 h-[calc(100%-1.25rem)]">
                                        <div
                                            className="w-full max-w-[32px] rounded-t-sm transition-all duration-500 ease-out hover:opacity-80"
                                            style={{
                                                height: `${Math.max(barHeight, hasData ? 4 : 0)}%`,
                                                backgroundColor: color,
                                                minHeight: hasData ? '3px' : '0px'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium leading-none absolute -bottom-5 text-center w-full">{d.month}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
