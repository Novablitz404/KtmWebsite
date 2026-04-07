'use client'

import { useState, useEffect, useMemo } from 'react'
import { Building2, Globe, ArrowUpDown, Users, ChevronDown } from 'lucide-react'
import AffiliatedClubsTable from './AffiliatedClubsTable'
import AffiliatedOrgsTable from './AffiliatedOrgsTable'

type ClubViewType = 'clubs' | 'organizations'
const ITEMS_PER_PAGE = 10

interface OrganizationClubsViewProps {
    clubs: any[]
    organizations?: any[]
    orgLogo?: string | null
    orgName?: string
    isLoading?: boolean
    searchQuery?: string
}

export default function OrganizationClubsView({
    clubs,
    organizations = [],
    orgLogo,
    orgName,
    isLoading = false,
    searchQuery = ''
}: OrganizationClubsViewProps) {
    const [viewType, setViewType]   = useState<ClubViewType>('clubs')
    const [currentPage, setCurrentPage] = useState(1)
    const [sortKey, setSortKey]     = useState<'name' | 'members'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [showSort, setShowSort]   = useState(false)

    useEffect(() => { setCurrentPage(1) }, [viewType, searchQuery])

    const currentList = viewType === 'clubs' ? (clubs || []) : (organizations || [])

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return currentList
        const q = searchQuery.toLowerCase()
        return currentList.filter(item => {
            if (!item) return false
            return item.name?.toLowerCase().includes(q) ||
                   item.masterName?.toLowerCase().includes(q) ||
                   item.address?.toLowerCase().includes(q)
        })
    }, [currentList, searchQuery])

    const sortedData = [...filteredData].sort((a, b) => {
        if (!a || !b) return 0
        if (sortKey === 'name') return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        return sortOrder === 'asc' ? (a.memberCount || 0) - (b.memberCount || 0) : (b.memberCount || 0) - (a.memberCount || 0)
    })

    const totalItems  = sortedData.length
    const totalPages  = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const SORT_OPTIONS = [
        { label: 'Name (A–Z)',        key: 'name'    as const, order: 'asc'  as const },
        { label: 'Name (Z–A)',        key: 'name'    as const, order: 'desc' as const },
        { label: 'Members (High–Low)',key: 'members' as const, order: 'desc' as const },
        { label: 'Members (Low–High)',key: 'members' as const, order: 'asc'  as const },
    ]

    const activeSort = SORT_OPTIONS.find(o => o.key === sortKey && o.order === sortOrder)

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ───────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Affiliates</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage affiliated clubs and organizations.
                    </p>
                </div>
                {/* Sort dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSort(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                        <ArrowUpDown size={13} />
                        {activeSort?.label ?? 'Sort'}
                        <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                    </button>
                    {showSort && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-2xl shadow-lg z-10 overflow-hidden">
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => { setSortKey(opt.key); setSortOrder(opt.order); setShowSort(false) }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${
                                        sortKey === opt.key && sortOrder === opt.order
                                            ? 'bg-red-50 text-red-600'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tab toggle ────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-1 self-start w-fit">
                <button
                    onClick={() => setViewType('clubs')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        viewType === 'clubs'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <Building2 size={14} />
                    Clubs
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        viewType === 'clubs' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {clubs.length}
                    </span>
                </button>
                <button
                    onClick={() => setViewType('organizations')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        viewType === 'organizations'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <Globe size={14} />
                    Organizations
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        viewType === 'organizations' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {organizations.length}
                    </span>
                </button>
            </div>

            {/* ── Table card ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Table header strip */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {viewType === 'clubs' ? 'Affiliated Clubs' : 'Affiliated Organizations'}
                        </p>
                    </div>
                    {totalItems > 0 && (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {totalItems} {viewType === 'clubs' ? 'clubs' : 'orgs'}
                        </span>
                    )}
                </div>

                {/* Table content */}
                <div className="overflow-x-auto">
                    {viewType === 'clubs' ? (
                        <AffiliatedClubsTable clubs={paginatedData} embedded={true} isLoading={isLoading} />
                    ) : (
                        <AffiliatedOrgsTable orgs={paginatedData} embedded={true} isLoading={isLoading} />
                    )}
                </div>

                {/* Pagination footer */}
                {totalItems > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Prev
                            </button>
                            <span className="text-xs font-black text-gray-700 px-2">
                                {currentPage} / {Math.max(totalPages, 1)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
