'use client'

import { useQuery } from '@tanstack/react-query'
import { getOrganizationFinancials } from '@/app/organization/actions'
import { DollarSign, TrendingUp, TrendingDown, Clock, Users, Award, GraduationCap, Trophy, X, Search, Download, ArrowUpRight, ArrowDownRight, Building2, Percent } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'
import { useMemo, useState, useRef, useCallback } from 'react'
import { generateFinancialPDF, generateEventPDF } from '@/lib/generateFinancialPDF'

type FinancialData = NonNullable<Awaited<ReturnType<typeof getOrganizationFinancials>>>
type EventItem = FinancialData['events'][0]

function formatCurrency(amount: number) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}



// ─── Event Details Modal ─────────────────────────────────────────
function EventDetailsModal({ event, onClose, primaryColor, onExportPDF, isExporting }: {
    event: EventItem,
    onClose: () => void,
    primaryColor: string,
    onExportPDF: () => void,
    isExporting: boolean
}) {
    const [search, setSearch] = useState('')

    const filteredRegs = useMemo(() => {
        if (!search.trim()) return event.registrations
        const q = search.toLowerCase()
        return event.registrations.filter(r =>
            r.playerName.toLowerCase().includes(q) ||
            r.clubName.toLowerCase().includes(q)
        )
    }, [event.registrations, search])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2 rounded-lg ${event.type === 'tournament' ? 'bg-red-50' : event.type === 'promotion' ? 'bg-blue-50' : event.type === 'affiliation' ? 'bg-violet-50' : 'bg-amber-50'}`}>
                                {event.type === 'tournament'
                                    ? <Trophy size={20} className="text-red-500" />
                                    : event.type === 'promotion'
                                        ? <Award size={20} className="text-blue-500" />
                                        : event.type === 'affiliation'
                                            ? <Building2 size={20} className="text-violet-500" />
                                            : <GraduationCap size={20} className="text-amber-500" />
                                }
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                        </div>
                        <p className="text-sm text-gray-500 ml-11">{formatDate(event.date)} • {event.totalRegistrations} {event.type === 'affiliation' ? 'Payment' : 'Registrations'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onExportPDF}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Download size={14} />
                            {isExporting ? 'Generating...' : 'PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                {event.registrations.length > 3 && (
                    <div className="px-6 py-3 border-b border-gray-100">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by player or club..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>
                    </div>
                )}

                {/* Content - Registrations Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredRegs.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{search ? 'No Matches Found' : 'No Registrations Yet'}</h3>
                            <p className="text-gray-500 text-sm">{search ? 'Try a different search term.' : 'Waiting for athletes to register for this event.'}</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Player</th>
                                        <th className="px-6 py-4">Club</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Expected</th>
                                        <th className="px-6 py-4 text-right">Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRegs.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{reg.playerName}</td>
                                            <td className="px-6 py-4 text-gray-600">{reg.clubName}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${reg.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(reg.amountExpected)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(reg.amountPaid)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-right text-gray-500 uppercase text-xs tracking-wider">Totals</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(event.totalExpected)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(event.totalCollected)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Pure CSS Donut Chart ────────────────────────────────────────
function DonutChart({ data, primaryColor }: {
    data: { label: string; value: number; color: string }[],
    primaryColor: string
}) {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center h-full min-h-[280px]">
                <div className="w-32 h-32 rounded-full border-[12px] border-gray-100 mb-4" />
                <p className="text-sm text-gray-400">No revenue data yet</p>
            </div>
        )
    }

    let cumulative = 0
    const segments = data.filter(d => d.value > 0).map(d => {
        const pct = (d.value / total) * 100
        const start = cumulative
        cumulative += pct
        return { ...d, pct, start }
    })

    // Build conic gradient
    const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg mb-5">Revenue Distribution</h3>
            <div className="flex items-center gap-6">
                {/* Donut */}
                <div className="relative w-36 h-36 flex-shrink-0">
                    <div
                        className="w-full h-full rounded-full"
                        style={{ background: `conic-gradient(${gradientParts})` }}
                    />
                    <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 font-medium">Total</p>
                            <p className="text-sm font-black text-gray-900">{formatCurrency(total)}</p>
                        </div>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    {segments.map(s => (
                        <div key={s.label} className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                                <span className="text-xs font-medium text-gray-600 truncate">{s.label}</span>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    <span className="text-xs font-bold text-gray-900">{formatCurrency(s.value)}</span>
                                    <span className="text-[10px] text-gray-400">{Math.round(s.pct)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Bar Chart ───────────────────────────────────────────────────
function BarChart({ data, primaryColor }: {
    data: { month: string; tournaments: number; promotions: number; seminars: number; affiliations: number }[],
    primaryColor: string
}) {
    const maxValue = Math.max(...data.map(d => d.tournaments + d.promotions + d.seminars + d.affiliations), 1)

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Monthly Revenue</h3>
                <div className="flex items-center gap-3 text-xs font-medium flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: primaryColor }} />
                        <span className="text-gray-500">Tournaments</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-blue-500" />
                        <span className="text-gray-500">Promotions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-amber-400" />
                        <span className="text-gray-500">Seminars</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-violet-500" />
                        <span className="text-gray-500">Affiliations</span>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-1.5 h-52">
                {data.map((d, i) => {
                    const total = d.tournaments + d.promotions + d.seminars + d.affiliations
                    const tourneyHeight = total > 0 ? (d.tournaments / maxValue) * 100 : 0
                    const promoHeight = total > 0 ? (d.promotions / maxValue) * 100 : 0
                    const semHeight = total > 0 ? (d.seminars / maxValue) * 100 : 0
                    const affHeight = total > 0 ? (d.affiliations / maxValue) * 100 : 0
                    const hasData = total > 0

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full group relative">
                            {/* Tooltip */}
                            {hasData && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg">
                                    <div>T: {formatCurrency(d.tournaments)}</div>
                                    <div>P: {formatCurrency(d.promotions)}</div>
                                    <div>S: {formatCurrency(d.seminars)}</div>
                                    <div>A: {formatCurrency(d.affiliations)}</div>
                                    <div className="border-t border-gray-700 mt-0.5 pt-0.5 font-bold">{formatCurrency(total)}</div>
                                </div>
                            )}

                            {/* Bars Container */}
                            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                                <div
                                    className="w-[22%] rounded-t-sm transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(tourneyHeight, hasData && d.tournaments > 0 ? 4 : 0)}%`,
                                        backgroundColor: primaryColor,
                                        minHeight: d.tournaments > 0 ? '3px' : '0px'
                                    }}
                                />
                                <div
                                    className="w-[22%] rounded-t-sm bg-blue-500 transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(promoHeight, hasData && d.promotions > 0 ? 4 : 0)}%`,
                                        minHeight: d.promotions > 0 ? '3px' : '0px'
                                    }}
                                />
                                <div
                                    className="w-[22%] rounded-t-sm bg-amber-400 transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(semHeight, hasData && d.seminars > 0 ? 4 : 0)}%`,
                                        minHeight: d.seminars > 0 ? '3px' : '0px'
                                    }}
                                />
                                <div
                                    className="w-[22%] rounded-t-sm bg-violet-500 transition-all duration-500 ease-out hover:opacity-80"
                                    style={{
                                        height: `${Math.max(affHeight, hasData && d.affiliations > 0 ? 4 : 0)}%`,
                                        minHeight: d.affiliations > 0 ? '3px' : '0px'
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

// ─── YoY Comparison Banner ───────────────────────────────────────
function YoYBanner({ yoy }: { yoy: FinancialData['yoy'] }) {
    const isUp = yoy.changePercent >= 0
    const hasLastYear = yoy.lastYear > 0

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isUp ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-red-600" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Year-over-Year</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-gray-900">{formatCurrency(yoy.thisYear)}</span>
                            <span className="text-xs text-gray-400">in {yoy.currentYear}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {hasLastYear && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400">{yoy.currentYear - 1}</p>
                            <p className="text-sm font-bold text-gray-600">{formatCurrency(yoy.lastYear)}</p>
                        </div>
                    )}
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(yoy.changePercent)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Collection Rate Ring ────────────────────────────────────────
function CollectionRateRing({ rate }: { rate: number }) {
    const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'
    const circumference = 2 * Math.PI * 18
    const offset = circumference - (rate / 100) * circumference

    return (
        <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="4" />
            <circle
                cx="22" cy="22" r="18" fill="none"
                stroke={color} strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
                className="transition-all duration-700"
            />
            <text x="22" y="22" textAnchor="middle" dy=".35em" className="text-[9px] font-bold fill-gray-900">
                {rate}%
            </text>
        </svg>
    )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function OrganizationFinancialsView() {
    const tenant = useTenant()
    const primaryColor = tenant.slug === 'ktm' ? '#DC2626' : (tenant.primaryColor || '#DC2626')
    const [filter, setFilter] = useState<'all' | 'tournament' | 'promotion' | 'seminar' | 'affiliation'>('all')
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

    const { data, isLoading } = useQuery({
        queryKey: ['organization-financials'],
        queryFn: () => getOrganizationFinancials(),
        staleTime: 1000 * 60 * 5,
    })

    const handleDownloadReport = useCallback(async () => {
        if (!data || isGeneratingPDF) return
        setIsGeneratingPDF(true)
        try {
            await generateFinancialPDF(data)
        } finally {
            setIsGeneratingPDF(false)
        }
    }, [data, isGeneratingPDF])

    const handleEventPDF = useCallback(async (event: EventItem) => {
        if (!data || isGeneratingPDF) return
        setIsGeneratingPDF(true)
        try {
            await generateEventPDF(event, data.organization)
        } finally {
            setIsGeneratingPDF(false)
        }
    }, [data, isGeneratingPDF])

    const filteredEvents = useMemo(() => {
        if (!data?.events) return []
        if (filter === 'all') return data.events
        return data.events.filter(e => e.type === filter)
    }, [data?.events, filter])

    // ───── Loading skeleton ─────
    if (isLoading) {
        const skeletonCards = [
            { label: 'Collected', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', borderColor: 'border-emerald-100' },
            { label: 'Total Expected', icon: TrendingUp, color: 'bg-blue-50 text-blue-600', borderColor: 'border-blue-100' },
            { label: 'Pending', icon: Clock, color: 'bg-amber-50 text-amber-600', borderColor: 'border-amber-100' },
            { label: 'Registrations', icon: Users, color: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-100' },
            { label: 'Collection Rate', icon: Percent, color: 'bg-teal-50 text-teal-600', borderColor: 'border-teal-100' },
        ]

        return (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6" />
                        <div className="flex items-end gap-1.5 h-52">
                            {[40, 65, 30, 55, 75, 45, 60, 35, 70, 50, 25, 55].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                                    <div className="flex-1 w-full flex items-end justify-center">
                                        <div className="w-[90%] rounded-t-sm bg-gray-200 animate-pulse" style={{ height: `${h}%` }} />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium leading-none">
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="h-6 w-44 bg-gray-200 rounded animate-pulse mb-6" />
                        <div className="flex justify-center">
                            <div className="w-36 h-36 rounded-full bg-gray-200 animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
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

    const { summary, monthlyData, revenueByType, yoy } = data

    const donutData = [
        { label: 'Tournaments', value: revenueByType.tournaments, color: primaryColor },
        { label: 'Promotions', value: revenueByType.promotions, color: '#3B82F6' },
        { label: 'Seminars', value: revenueByType.seminars, color: '#FBBF24' },
        { label: 'Affiliations', value: revenueByType.affiliations, color: '#8B5CF6' },
    ]

    const summaryCards = [
        {
            label: 'Collected',
            value: formatCurrency(summary.totalCollected),
            icon: DollarSign,
            color: 'bg-emerald-50 text-emerald-600',
            borderColor: 'border-emerald-100',
            extra: null as React.ReactNode,
        },
        {
            label: 'Total Expected',
            value: formatCurrency(summary.totalRevenue),
            icon: TrendingUp,
            color: 'bg-blue-50 text-blue-600',
            borderColor: 'border-blue-100',
            extra: null as React.ReactNode,
        },
        {
            label: 'Pending',
            value: formatCurrency(summary.totalPending),
            icon: Clock,
            color: 'bg-amber-50 text-amber-600',
            borderColor: 'border-amber-100',
            extra: summary.freeEventsCount > 0 ? (
                <span className="text-[10px] text-gray-400 mt-0.5">{summary.freeEventsCount} free event{summary.freeEventsCount > 1 ? 's' : ''}</span>
            ) : null,
        },
        {
            label: 'Registrations',
            value: summary.totalRegistrations.toLocaleString(),
            icon: Users,
            color: 'bg-purple-50 text-purple-600',
            borderColor: 'border-purple-100',
            extra: summary.affiliationRevenue > 0 ? (
                <span className="text-[10px] text-gray-400 mt-0.5">+{formatCurrency(summary.affiliationRevenue)} affiliations</span>
            ) : null,
        },
        {
            label: 'Collection Rate',
            value: `${summary.collectionRate}%`,
            icon: Percent,
            color: summary.collectionRate >= 80 ? 'bg-emerald-50 text-emerald-600' : summary.collectionRate >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600',
            borderColor: summary.collectionRate >= 80 ? 'border-emerald-100' : summary.collectionRate >= 50 ? 'border-amber-100' : 'border-red-100',
            extra: <CollectionRateRing rate={summary.collectionRate} />,
        },
    ]

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-y-auto h-[calc(100vh-5rem)] pb-24 md:pb-6">
            {/* Header with Download */}
            <div className="flex items-center justify-between">
                <div />
                <button
                    onClick={handleDownloadReport}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                >
                    <Download size={16} />
                    {isGeneratingPDF ? 'Generating PDF...' : 'Download Report'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {summaryCards.map((card, i) => {
                    const Icon = card.icon
                    const isCollectionRate = card.label === 'Collection Rate'
                    return (
                        <div key={i} className={`bg-white rounded-xl border ${card.borderColor} p-5 shadow-sm ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${card.color}`}>
                                    <Icon size={18} />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <p className="text-2xl font-black text-gray-900">{card.value}</p>
                                    {card.extra && !isCollectionRate && card.extra}
                                </div>
                                {isCollectionRate && card.extra}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* YoY Banner */}
            <YoYBanner yoy={yoy} />

            {/* Charts Section — Bar + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <BarChart data={monthlyData} primaryColor={primaryColor} />
                </div>
                <div className="lg:col-span-1">
                    <DonutChart data={donutData} primaryColor={primaryColor} />
                </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-gray-900 text-lg">Event Breakdown</h3>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {(['all', 'tournament', 'promotion', 'seminar', 'affiliation'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f === 'all' ? 'All' : f === 'tournament' ? 'Tournaments' : f === 'promotion' ? 'Promotions' : f === 'seminar' ? 'Seminars' : 'Affiliations'}
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
                                    <th className="px-6 py-3 text-center">Regs</th>
                                    <th className="px-6 py-3 text-center">Paid</th>
                                    <th className="px-6 py-3 text-center">Unpaid</th>
                                    <th className="px-6 py-3 text-right">Collected</th>
                                    <th className="px-6 py-3 text-center hidden sm:table-cell">Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredEvents.map((event) => {
                                    const rate = event.totalExpected > 0 ? Math.round((event.totalCollected / event.totalExpected) * 100) : (event.totalCollected > 0 ? 100 : 0)
                                    const rateColor = rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    return (
                                        <tr
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${event.type === 'tournament' ? 'bg-red-50' : event.type === 'promotion' ? 'bg-blue-50' : event.type === 'affiliation' ? 'bg-violet-50' : 'bg-amber-50'}`}>
                                                        {event.type === 'tournament'
                                                            ? <Trophy size={16} className="text-red-500" />
                                                            : event.type === 'promotion'
                                                                ? <Award size={16} className="text-blue-500" />
                                                                : event.type === 'affiliation'
                                                                    ? <Building2 size={16} className="text-violet-500" />
                                                                    : <GraduationCap size={16} className="text-amber-500" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 truncate max-w-[200px]">{event.name}</p>
                                                        <p className="text-xs text-gray-400 capitalize">{event.type === 'tournament' ? 'Tournament' : event.type === 'promotion' ? 'Belt Test' : event.type === 'affiliation' ? 'Club Affiliation' : 'Seminar'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(event.date)}</td>
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
                                            <td className="px-6 py-4 text-center hidden sm:table-cell">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${rateColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-semibold w-8">{rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>

                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td colSpan={2} className="px-6 py-3 font-bold text-gray-900 text-right">Totals</td>
                                    <td className="px-6 py-3 text-center font-bold text-gray-900">{filteredEvents.reduce((s, e) => s + e.totalRegistrations, 0)}</td>
                                    <td className="px-6 py-3 text-center font-bold text-emerald-700">{filteredEvents.reduce((s, e) => s + e.paidCount, 0)}</td>
                                    <td className="px-6 py-3 text-center font-bold text-amber-700">{filteredEvents.reduce((s, e) => s + e.unpaidCount, 0)}</td>
                                    <td className="px-6 py-3 text-right font-black text-gray-900">{formatCurrency(filteredEvents.reduce((s, e) => s + e.totalCollected, 0))}</td>
                                    <td className="px-6 py-3 hidden sm:table-cell" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {selectedEvent && (
                <EventDetailsModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    primaryColor={primaryColor}
                    onExportPDF={() => handleEventPDF(selectedEvent)}
                    isExporting={isGeneratingPDF}
                />
            )}
        </div>
    )
}
