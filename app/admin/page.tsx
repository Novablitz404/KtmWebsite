import { prisma } from '@/lib/prisma'

export default async function AdminDashboard() {
    // 1. Stats Counts
    const stats = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
    })

    const countByRole = stats.reduce((acc, curr) => {
        acc[curr.role] = curr._count.role
        return acc
    }, {} as Record<string, number>)

    const totalUsers = Object.values(countByRole).reduce((a, b) => a + b, 0)

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">System Statistics</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Users" value={totalUsers} icon="👥" color="bg-blue-500" />
                <StatCard title="Organizers" value={countByRole['ORGANIZER'] || 0} icon="📋" color="bg-green-500" />
                <StatCard title="Club Masters" value={countByRole['CLUB_MASTER'] || 0} icon="🏫" color="bg-purple-500" />
                <StatCard title="Athletes" value={countByRole['ATHLETE'] || 0} icon="🥋" color="bg-indigo-500" />
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Role Distribution Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">User Distribution</h2>
                    <div className="space-y-4">
                        <BarChartRow label="Athletes" count={countByRole['ATHLETE'] || 0} total={totalUsers} color="bg-indigo-500" />
                        <BarChartRow label="Club Masters" count={countByRole['CLUB_MASTER'] || 0} total={totalUsers} color="bg-purple-500" />
                        <BarChartRow label="Organizers" count={countByRole['ORGANIZER'] || 0} total={totalUsers} color="bg-green-500" />
                        <BarChartRow label="Managers" count={countByRole['MANAGER'] || 0} total={totalUsers} color="bg-teal-500" />
                        <BarChartRow label="Admins" count={countByRole['ADMIN'] || 0} total={totalUsers} color="bg-gray-800" />
                    </div>
                </div>

                {/* Mock Activity Graph (Placeholder) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Platform Activity (30 Days)</h2>
                    <p className="text-sm text-gray-400 mb-6">Mock data for demonstration</p>
                    <div className="flex-1 flex items-end gap-2 h-48 sm:h-64">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-indigo-50 rounded-t-sm relative group">
                                <div
                                    style={{ height: `${h}%` }}
                                    className="absolute bottom-0 w-full bg-indigo-500 opacity-80 rounded-t-sm group-hover:opacity-100 transition-all"
                                ></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Day 1</span>
                        <span>Day 15</span>
                        <span>Day 30</span>
                    </div>
                </div>
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

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${color} bg-opacity-10 flex items-center justify-center text-2xl`}>
                {icon}
            </div>
        </div>
    )
}
