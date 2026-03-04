'use client'

import { useState, useEffect, useMemo } from 'react'
import { Building2, Globe, ChevronLeft, ChevronRight, ListFilter, ArrowUpDown, Users } from 'lucide-react'
import AffiliatedClubsTable from './AffiliatedClubsTable'
import AffiliatedOrgsTable from './AffiliatedOrgsTable'
import GlobalDropdown from '@/components/GlobalDropdown'

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
    const [viewType, setViewType] = useState<ClubViewType>('clubs')
    const [currentPage, setCurrentPage] = useState(1)
    const [sortKey, setSortKey] = useState<'name' | 'members'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')


    // Reset page when switching view type or search query changes
    useEffect(() => {
        setCurrentPage(1)
    }, [viewType, searchQuery])

    // Current Data Calculation with search filtering
    const currentList = viewType === 'clubs' ? (clubs || []) : (organizations || [])

    // Filter by search query
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return currentList
        const query = searchQuery.toLowerCase()
        return currentList.filter(item => {
            if (!item) return false
            const nameMatch = item.name?.toLowerCase().includes(query)
            const masterMatch = item.masterName?.toLowerCase().includes(query)
            const addressMatch = item.address?.toLowerCase().includes(query)
            return nameMatch || masterMatch || addressMatch
        })
    }, [currentList, searchQuery])

    // Sort logic
    const sortedData = [...filteredData].sort((a, b) => {
        if (!a || !b) return 0
        if (sortKey === 'name') {
            return sortOrder === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        } else {
            return sortOrder === 'asc'
                ? (a.memberCount || 0) - (b.memberCount || 0)
                : (b.memberCount || 0) - (a.memberCount || 0)
        }
    })

    const totalItems = sortedData.length
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

    const paginatedData = sortedData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header with Toggle and Sorting */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Toggle - Only show if there are organizations OR we are loading (might check later) */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setViewType('clubs')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewType === 'clubs'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Building2 size={16} />
                            Clubs
                        </button>
                        <button
                            onClick={() => setViewType('organizations')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewType === 'organizations'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Globe size={16} />
                            Orgs
                        </button>
                    </div>


                </div>

                <div className="flex items-center gap-3">
                    {/* Sorting Dropdown */}
                    <GlobalDropdown
                        label="Sort"
                        icon={<ListFilter className="w-4 h-4" />}
                        align="right"
                        items={[
                            {
                                label: 'Name (A-Z)',
                                icon: <ArrowUpDown className="w-4 h-4" />,
                                onClick: () => { setSortKey('name'); setSortOrder('asc'); }
                            },
                            {
                                label: 'Members (High-Low)',
                                icon: <Users className="w-4 h-4" />,
                                onClick: () => { setSortKey('members'); setSortOrder('desc'); }
                            }
                        ]}
                    />
                </div>
            </div>

            {/* List Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto">
                    {viewType === 'clubs' ? (
                        <AffiliatedClubsTable clubs={paginatedData} embedded={true} isLoading={isLoading} />
                    ) : (
                        <AffiliatedOrgsTable orgs={paginatedData} embedded={true} isLoading={isLoading} />
                    )}
                </div>

                {/* Pagination Footer */}
                {totalItems > 0 && (
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end z-10">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className={`p-2 rounded-lg transition-all ${currentPage <= 1
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-sm font-bold text-gray-900">Page {currentPage}</span>
                                <span className="text-xs text-gray-400 font-medium">of {Math.max(totalPages, 1)}</span>
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                                className={`p-2 rounded-lg transition-all ${currentPage >= totalPages
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Next Page"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
