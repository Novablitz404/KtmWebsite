'use client'

import { useQuery } from '@tanstack/react-query'
import { getOrganizationFinancials } from '@/app/organization/actions'
import { DollarSign, TrendingUp, Clock, Users, Award, GraduationCap } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'
import { useMemo, useState } from 'react'

function formatCurrency(amount: number) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Pure CSS Bar Chart Component - no external dep
function BarChart({ data, primaryColor }: {
    data: { month: string; promotions: number; seminars: number }[],
    primaryColor: string
}) {
    const maxValue = Math.max(...data.map(d => d.promotions + d.seminars), 1)

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Monthly Revenue</h3>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
                        <span className="text-gray-500">Promotions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-amber-400" />
                        <span className="text-gray-500">Seminars</span>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-1.5 h-52">
                {data.map((d, i) => {
                    const total = d.promotions + d.seminars
                    const promoHeight = total > 0 ? (d.promotions / maxValue) * 100 : 0
                    const semHeight = total > 0 ? (d.seminars / maxValue) * 100 : 0
                    const hasData = total > 0

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full group relative">
                            {/* Tooltip */}
                            {hasData && (
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                    <div>P: {formatCurrency(d.promotions)}</div>
                                    <div>S: {formatCurrency(d.seminars)}</div>
                                </div>
                            )}

                            {/* Bars Container */}
                            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                                {/* Promotions bar */}
                                <div
                                    className="w-[45%] rounded-t-sm transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(promoHeight, hasData && d.promotions > 0 ? 4 : 0)}%`,
                                        backgroundColor: primaryColor,
                                        minHeight: d.promotions > 0 ? '3px' : '0px'
                                    }}
                                />
                                {/* Seminars bar */}
                                <div
                                    className="w-[45%] rounded-t-sm bg-amber-400 transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(semHeight, hasData && d.seminars > 0 ? 4 : 0)}%`,
                                        minHeight: d.seminars > 0 ? '3px' : '0px'
                                    }}
                                />
                            </div>

                            {/* Month label */}
                            <span className="text-[10px] text-gray-400 font-medium leading-none">{d.month}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function OrganizationFinancialsView() {
    const tenant = useTenant()
    const primaryColor = tenant.slug === 'ktm' ? '#DC2626' : (tenant.primaryColor || '#DC2626')
    const [filter, setFilter] = useState<'all' | 'promotion' | 'seminar'>('all')

    const { data, isLoading } = useQuery({
        queryKey: ['organization-financials'],
        queryFn: () => getOrganizationFinancials(),
        staleTime: 1000 * 60 * 5,
    })

    const filteredEvents = useMemo(() => {
        if (!data?.events) return []
        if (filter === 'all') return data.events
        return data.events.filter(e => e.type === filter)
    }, [data?.events, filter])

    // Loading skeleton - shows structure/titles, only skeleton-loads data
    if (isLoading) {
        const skeletonCards = [
            { label: 'Total Expected', icon: TrendingUp, color: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-100' },
            { label: 'Collected', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', borderColor: 'border-emerald-100' },
            { label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-600', borderColor: 'border-amber-100' },
            { label: 'Total Registrations', icon: Users, color: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-100' },
        ]

        return (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {skeletonCards.map((card, i) => {
                        const Icon = card.icon
                        return (
                            <div key={i} className={`bg-white rounded-xl border ${card.borderColor} p-5 shadow-sm`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${card.color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                                </div>
                                <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse" />
                            </div>
                        )
                    })}
                </div>

                {/* Bar Chart Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">Monthly Revenue</h3>
                        <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
                                <span className="text-gray-500">Promotions</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm bg-amber-400" />
                                <span className="text-gray-500">Seminars</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end gap-1.5 h-52">
                        {[40, 65, 30, 55, 75, 45, 60, 35, 70, 50, 25, 55].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                                <div className="flex-1 w-full flex items-end justify-center">
                                    <div
                                        className="w-[90%] rounded-t-sm bg-gray-200 animate-pulse"
                                        style={{ height: `${h}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium leading-none">
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Events Table Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h3 className="font-bold text-gray-900 text-lg">Event Breakdown</h3>
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                            {['All', 'Promotions', 'Seminars'].map(f => (
                                <span key={f} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${f === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-6 py-3">Event</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Fee</th>
                                    <th className="px-6 py-3 text-center">Regs</th>
                                    <th className="px-6 py-3 text-center">Paid</th>
                                    <th className="px-6 py-3 text-center">Unpaid</th>
                                    <th className="px-6 py-3 text-right">Collected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-gray-100 animate-pulse">
                                                    <div className="w-4 h-4" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                                                    <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-4 text-center"><div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4 text-center"><div className="h-5 w-8 bg-emerald-100 rounded-full animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4 text-center"><div className="h-5 w-8 bg-amber-100 rounded-full animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Financial Data</h2>
                    <p className="text-gray-500">Financial data will appear once you have events with fees.</p>
                </div>
            </div>
        )
    }

    const { summary, monthlyData } = data

    const summaryCards = [
        {
            label: 'Total Expected',
            value: formatCurrency(summary.totalRevenue),
            icon: TrendingUp,
            color: 'bg-blue-50 text-blue-600',
            borderColor: 'border-blue-100'
        },
        {
            label: 'Collected',
            value: formatCurrency(summary.totalCollected),
            icon: DollarSign,
            color: 'bg-emerald-50 text-emerald-600',
            borderColor: 'border-emerald-100'
        },
        {
            label: 'Pending',
            value: formatCurrency(summary.totalPending),
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
            borderColor: 'border-amber-100'
        },
        {
            label: 'Total Registrations',
            value: summary.totalRegistrations.toLocaleString(),
            icon: Users,
            color: 'bg-purple-50 text-purple-600',
            borderColor: 'border-purple-100'
        },
    ]

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-y-auto h-[calc(100vh-5rem)] pb-24 md:pb-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, i) => {
                    const Icon = card.icon
                    return (
                        <div key={i} className={`bg-white rounded-xl border ${card.borderColor} p-5 shadow-sm`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${card.color}`}>
                                    <Icon size={18} />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900">{card.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Bar Chart */}
            <BarChart data={monthlyData} primaryColor={primaryColor} />

            {/* Events Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900 text-lg">Event Breakdown</h3>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {(['all', 'promotion', 'seminar'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'promotion' ? 'Promotions' : 'Seminars'}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredEvents.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">
                        No events found for this filter.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="px-6 py-3">Event</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3 text-right">Fee</th>
                                    <th className="px-6 py-3 text-center">Regs</th>
                                    <th className="px-6 py-3 text-center">Paid</th>
                                    <th className="px-6 py-3 text-center">Unpaid</th>
                                    <th className="px-6 py-3 text-right">Collected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredEvents.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${event.type === 'promotion' ? 'bg-red-50' : 'bg-amber-50'}`}>
                                                    {event.type === 'promotion'
                                                        ? <Award size={16} className="text-red-500" />
                                                        : <GraduationCap size={16} className="text-amber-500" />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 truncate max-w-[200px]">{event.name}</p>
                                                    <p className="text-xs text-gray-400 capitalize">{event.type === 'promotion' ? 'Belt Test' : 'Seminar'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(event.date)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">{event.fee > 0 ? formatCurrency(event.fee) : '—'}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{event.totalRegistrations}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                                {event.paidCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                                {event.unpaidCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{event.totalCollected > 0 ? formatCurrency(event.totalCollected) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td colSpan={3} className="px-6 py-3 font-bold text-gray-900 text-right">Totals</td>
                                    <td className="px-6 py-3 text-center font-bold text-gray-900">{filteredEvents.reduce((s, e) => s + e.totalRegistrations, 0)}</td>
                                    <td className="px-6 py-3 text-center font-bold text-emerald-700">{filteredEvents.reduce((s, e) => s + e.paidCount, 0)}</td>
                                    <td className="px-6 py-3 text-center font-bold text-amber-700">{filteredEvents.reduce((s, e) => s + e.unpaidCount, 0)}</td>
                                    <td className="px-6 py-3 text-right font-black text-gray-900">{formatCurrency(filteredEvents.reduce((s, e) => s + e.totalCollected, 0))}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
