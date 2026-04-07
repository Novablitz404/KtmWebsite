'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, Building2, Globe } from 'lucide-react'

interface PlatformGrowthCardProps {
    clubs: {
        affiliationStatus: string
        affiliationPaidAt: string | null
        memberCount: number
    }[]
    totalMembers: number
    directClubs: number
    affiliatedOrgs: number
}

function getLast6Months(): { key: string; label: string }[] {
    const months: { key: string; label: string }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('en-US', { month: 'short' })
        })
    }
    return months
}

export default function PlatformGrowthCard({
    clubs, totalMembers, directClubs, affiliatedOrgs
}: PlatformGrowthCardProps) {
    const months = getLast6Months()

    // Count affiliations paid per month (proxy for "new club joins")
    const affiliationsByMonth = useMemo(() => {
        const map: Record<string, number> = {}
        months.forEach(m => { map[m.key] = 0 })
        clubs.forEach(c => {
            if (!c.affiliationPaidAt) return
            const d = new Date(c.affiliationPaidAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (map[key] !== undefined) map[key]++
        })
        return months.map(m => ({ ...m, value: map[m.key] }))
    }, [clubs, months])

    // Member count growth — distribute across months (approximate from current total)
    // Use member totals per club by their affiliation date as a proxy
    const membersByMonth = useMemo(() => {
        const map: Record<string, number> = {}
        months.forEach(m => { map[m.key] = 0 })
        clubs.forEach(c => {
            if (!c.affiliationPaidAt) return
            const d = new Date(c.affiliationPaidAt)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (map[key] !== undefined) map[key] += c.memberCount || 0
        })
        return months.map(m => ({ ...m, value: map[m.key] }))
    }, [clubs, months])

    const maxAffil  = Math.max(...affiliationsByMonth.map(d => d.value), 1)
    const maxMember = Math.max(...membersByMonth.map(d => d.value), 1)
    const BAR_HEIGHT = 120

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                        <TrendingUp size={14} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Platform Growth</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Club affiliations &amp; member registrations · Last 6 months</p>
                    </div>
                </div>
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />
                        Affiliations
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />
                        Members
                    </span>
                </div>
            </div>

            <div className="px-6 py-5">
                {/* Summary stat row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                        { icon: Users,    label: 'Total Members',  value: totalMembers,   color: 'bg-indigo-50 text-indigo-600' },
                        { icon: Building2, label: 'Clubs',         value: directClubs,    color: 'bg-orange-50 text-orange-600' },
                        { icon: Globe,    label: 'Org. Affiliates', value: affiliatedOrgs, color: 'bg-blue-50 text-blue-600'     },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                <item.icon size={14} />
                            </div>
                            <div>
                                <p className="text-lg font-black text-gray-900 leading-none">{item.value.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">{item.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grouped bar chart */}
                <div className="space-y-2">
                    {/* Chart area with grid lines */}
                    <div className="relative">
                        {/* Y-axis grid lines */}
                        <div className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height: BAR_HEIGHT }}>
                            {[1, 0.5, 0].map((pct) => (
                                <div key={pct} className="w-full h-px bg-gray-100" />
                            ))}
                        </div>
                    {/* Bars */}
                    <div className="flex items-end gap-3 relative" style={{ height: BAR_HEIGHT + 8 }}>
                        {months.map((m, i) => {
                            const affiliH  = affiliationsByMonth[i].value === 0 ? 3 : Math.ceil((affiliationsByMonth[i].value / maxAffil) * BAR_HEIGHT)
                            const memberH  = membersByMonth[i].value === 0       ? 3 : Math.ceil((membersByMonth[i].value / maxMember) * BAR_HEIGHT)
                            return (
                                <div key={m.key} className="flex-1 flex items-end justify-center gap-0.5 group relative">
                                    {/* Hover tooltip */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {affiliationsByMonth[i].value} clubs · {membersByMonth[i].value} members
                                    </div>
                                    {/* Affiliation bar */}
                                    <div
                                        className="w-full max-w-[18px] rounded-t-md bg-gradient-to-t from-red-600 to-red-400 transition-all duration-300 group-hover:from-red-700 group-hover:to-red-500"
                                        style={{ height: affiliH }}
                                    />
                                    {/* Member bar */}
                                    <div
                                        className="w-full max-w-[18px] rounded-t-md bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-300 group-hover:from-blue-600 group-hover:to-blue-400"
                                        style={{ height: memberH }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                    </div>

                    {/* Month labels */}
                    <div className="flex gap-3">
                        {months.map(m => (
                            <div key={m.key} className="flex-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-wide">
                                {m.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
