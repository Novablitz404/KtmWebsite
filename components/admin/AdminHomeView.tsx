'use client'

import PendingOrganizations from '@/components/admin/PendingOrganizations'

interface StatsData {
    totalUsers: number
    countByRole: Record<string, number>
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
    const { totalUsers, countByRole } = stats

    return (
        <div className="space-y-8">
            {/* Dashboard Stats */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">System Statistics</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard title="Total Users" value={totalUsers} icon="👥" color="bg-blue-500" />
                    <StatCard title="Organizers" value={countByRole['ORGANIZER'] || 0} icon="📋" color="bg-green-500" />
                    <StatCard title="Club Masters" value={countByRole['CLUB_MASTER'] || 0} icon="🏫" color="bg-purple-500" />
                    <StatCard title="Athletes" value={countByRole['ATHLETE'] || 0} icon="🥋" color="bg-red-500" />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Role Distribution Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">User Distribution</h3>
                    <div className="space-y-4">
                        <BarChartRow label="Athletes" count={countByRole['ATHLETE'] || 0} total={totalUsers} color="bg-red-500" />
                        <BarChartRow label="Club Masters" count={countByRole['CLUB_MASTER'] || 0} total={totalUsers} color="bg-purple-500" />
                        <BarChartRow label="Organizers" count={countByRole['ORGANIZER'] || 0} total={totalUsers} color="bg-green-500" />
                        <BarChartRow label="Managers" count={countByRole['MANAGER'] || 0} total={totalUsers} color="bg-teal-500" />
                        <BarChartRow label="Admins" count={countByRole['ADMIN'] || 0} total={totalUsers} color="bg-gray-800" />
                    </div>
                </div>

                {/* Pending Approvals Widget */}
                <div className="h-full">
                    <PendingOrganizations organizations={pendingOrganizations} />
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) {
    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${color} bg-opacity-10 flex items-center justify-center text-xl md:text-2xl`}>
                {icon}
            </div>
        </div>
    )
}

function BarChartRow({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{count} ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}
