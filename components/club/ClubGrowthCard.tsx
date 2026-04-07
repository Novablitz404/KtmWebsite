'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, UserPlus, Calendar } from 'lucide-react'

interface MemberMonth {
    key: string   // "2026-04"
    count: number
}

interface BeltStat {
    belt: string
    count: number
}

interface ClubGrowthCardProps {
    totalMembers: number
    newMembersCount: number
    membersByMonth: MemberMonth[]
    beltStats: BeltStat[]
    pendingCount: number
    eventsJoined: number
    isLoading?: boolean
}

const BELT_COLORS: Record<string, string> = {
    White: '#e5e7eb',
    Yellow: '#fbbf24',
    Orange: '#f97316',
    Green: '#22c55e',
    Purple: '#a855f7',
    Blue: '#3b82f6',
    Red: '#ef4444',
    Maroon: '#881337',
    Brown: '#92400e',
    Black: '#1f2937',
    Unknown: '#9ca3af',
}

export default function ClubGrowthCard({
    totalMembers,
    newMembersCount,
    membersByMonth,
    beltStats,
    eventsJoined,
    isLoading
}: ClubGrowthCardProps) {

    const BAR_HEIGHT = 120
    const maxMonthly = Math.max(...membersByMonth.map(m => m.count), 1)

    // Format month labels
    const chartData = useMemo(() =>
        membersByMonth.map(m => {
            const [year, month] = m.key.split('-')
            const date = new Date(Number(year), Number(month) - 1, 1)
            return {
                label: date.toLocaleDateString('en-US', { month: 'short' }),
                count: m.count,
            }
        }), [membersByMonth])

    // Sort belts in rank order
    const sortedBelts = useMemo(() => {
        const beltOrder = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']
        return [...beltStats]
            .sort((a, b) => beltOrder.indexOf(a.belt) - beltOrder.indexOf(b.belt))
            .filter(b => b.count > 0)
    }, [beltStats])

    const totalBeltMembers = sortedBelts.reduce((sum, b) => sum + b.count, 0)

    // Build donut chart segments (conic-gradient)
    const pieSegments = useMemo(() => {
        if (totalBeltMembers === 0) return ''
        let cumPct = 0
        const segments: string[] = []
        sortedBelts.forEach(b => {
            const pct = (b.count / totalBeltMembers) * 100
            const color = BELT_COLORS[b.belt] || BELT_COLORS.Unknown
            segments.push(`${color} ${cumPct}% ${cumPct + pct}%`)
            cumPct += pct
        })
        return `conic-gradient(${segments.join(', ')})`
    }, [sortedBelts, totalBeltMembers])

    const statItems = [
        { icon: Users, label: 'Total Members', value: totalMembers, color: 'bg-indigo-50 text-indigo-600' },
        { icon: UserPlus, label: 'New This Month', value: newMembersCount, color: 'bg-emerald-50 text-emerald-600' },
        { icon: Calendar, label: 'Events Joined', value: eventsJoined, color: 'bg-blue-50 text-blue-600' },
    ]

    if (isLoading) {
        return (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-pulse">
                    <div className="px-6 py-4 border-b border-gray-100"><div className="h-4 w-32 bg-gray-200 rounded" /></div>
                    <div className="px-6 py-5">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-gray-100" />
                                    <div><div className="h-5 w-10 bg-gray-200 rounded mb-1" /><div className="h-3 w-16 bg-gray-100 rounded" /></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-[140px] bg-gray-50 rounded-xl" />
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-pulse">
                    <div className="px-6 py-4 border-b border-gray-100"><div className="h-4 w-32 bg-gray-200 rounded" /></div>
                    <div className="px-6 py-5 flex items-center justify-center"><div className="w-[140px] h-[140px] rounded-full bg-gray-100" /></div>
                </div>
            </div>
        )
    }

    return (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            {/* Left Column — Club Growth */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                            <TrendingUp size={14} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Club Growth</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">New members · Last 6 months</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    {/* Summary stat row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {statItems.map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                    <item.icon size={14} />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-gray-900 leading-none">{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">{item.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* New Members Bar Chart */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
                                New Members Per Month
                            </span>
                        </div>

                        {chartData.some(d => d.count > 0) ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <div className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height: BAR_HEIGHT }}>
                                        {[1, 0.5, 0].map((pct) => (
                                            <div key={pct} className="w-full h-px bg-gray-100" />
                                        ))}
                                    </div>
                                    <div className="flex items-end gap-4 relative" style={{ height: BAR_HEIGHT + 8 }}>
                                        {chartData.map((d, i) => {
                                            const barH = d.count === 0 ? 3 : Math.ceil((d.count / maxMonthly) * BAR_HEIGHT)
                                            return (
                                                <div key={i} className="flex-1 flex items-end justify-center group relative">
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        {d.count} new member{d.count !== 1 ? 's' : ''}
                                                    </div>
                                                    <div
                                                        className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-red-600 to-red-400 transition-all duration-300 group-hover:from-red-700 group-hover:to-red-500"
                                                        style={{ height: barH }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    {chartData.map((d, i) => (
                                        <div key={i} className="flex-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-wide">
                                            {d.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[120px] flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                <UserPlus className="w-7 h-7 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-500">No new members yet</p>
                                <p className="text-xs text-gray-400 mt-0.5">Members will appear as they join</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column — Belt Distribution Pie Chart */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Users size={14} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Belt Distribution</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">{totalBeltMembers} member{totalBeltMembers !== 1 ? 's' : ''} across {sortedBelts.length} belt level{sortedBelts.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    {sortedBelts.length > 0 ? (
                        <div className="flex flex-col items-center gap-5">
                            {/* Donut Chart */}
                            <div className="relative">
                                <div
                                    className="w-[140px] h-[140px] rounded-full shadow-inner"
                                    style={{ background: pieSegments }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[72px] h-[72px] rounded-full bg-white shadow-sm flex flex-col items-center justify-center">
                                        <span className="text-xl font-black text-gray-900 leading-none">{totalBeltMembers}</span>
                                        <span className="text-[9px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">Total</span>
                                    </div>
                                </div>
                            </div>

                            {/* Legend Grid */}
                            <div className="w-full grid grid-cols-2 gap-x-6 gap-y-1.5">
                                {sortedBelts.map(b => {
                                    const pct = totalBeltMembers > 0 ? Math.round((b.count / totalBeltMembers) * 100) : 0
                                    return (
                                        <div key={b.belt} className="flex items-center gap-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/10"
                                                style={{ backgroundColor: BELT_COLORS[b.belt] || BELT_COLORS.Unknown }}
                                            />
                                            <span className="text-xs text-gray-700 font-medium flex-1 truncate">{b.belt}</span>
                                            <span className="text-[10px] text-gray-400 font-semibold tabular-nums">{b.count}</span>
                                            <span className="text-[10px] text-gray-300 font-medium w-7 text-right tabular-nums">{pct}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <Users className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-500">No belt data</p>
                            <p className="text-xs text-gray-400 mt-1">Add members with belt ranks to see distribution</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
