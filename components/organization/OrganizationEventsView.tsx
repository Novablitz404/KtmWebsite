'use client'


import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrganizerTournaments, getOrganizationEventsData } from '@/app/organization/actions'
import { getPromotionTests } from '@/app/promotions/actions'
import TournamentsList from '@/components/TournamentsList'
import PromotionsList from '@/app/promotions/PromotionsList'
import { TournamentsTableSkeleton, PromotionsTableSkeleton } from '@/components/Skeletons'
import { GraduationCap, Trophy, Award, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import CreateTournamentModal from '@/components/CreateTournamentModal'
import CreatePromotionModal from '@/components/CreatePromotionModal'
import CreateSeminarModal from '@/components/CreateSeminarModal'
import SeminarsList from '@/components/organization/SeminarsList'

type EventType = 'tournaments' | 'promotions' | 'seminars'
const ITEMS_PER_PAGE = 10

interface OrganizationEventsViewProps {
    searchQuery?: string
    templates?: { id: string; name: string }[]
}

export default function OrganizationEventsView({ searchQuery = '', templates = [] }: OrganizationEventsViewProps) {
    const [eventType, setEventType] = useState<EventType>('tournaments')
    const [currentPage, setCurrentPage] = useState(1)
    const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false)
    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)
    const [isSeminarModalOpen, setIsSeminarModalOpen] = useState(false)

    // Reset page when switching event type or search query changes
    useEffect(() => {
        setCurrentPage(1)
    }, [eventType, searchQuery])

    // Fetch BOTH tournaments and promotions in parallel via one server action
    const { data, isLoading } = useQuery({
        queryKey: ['organization-events-data'],
        queryFn: () => getOrganizationEventsData(),
        staleTime: 1000 * 60 * 5
    })

    const tournaments = data?.tournaments
    const promotionTests = data?.promotionTests
    const seminars = data?.seminars

    // Loading derivation
    const tournamentsLoading = isLoading
    const promotionsLoading = isLoading
    const seminarsLoading = isLoading

    // Filter data by search query
    const filteredTournaments = useMemo(() => {
        if (!searchQuery.trim() || !tournaments) return tournaments || []
        const query = searchQuery.toLowerCase()
        return tournaments.filter((t: any) =>
            t.name?.toLowerCase().includes(query) ||
            t.venue?.toLowerCase().includes(query)
        )
    }, [tournaments, searchQuery])

    const filteredPromotions = useMemo(() => {
        if (!searchQuery.trim() || !promotionTests) return promotionTests || []
        const query = searchQuery.toLowerCase()
        return promotionTests.filter((p: any) =>
            p.name?.toLowerCase().includes(query) ||
            p.venue?.toLowerCase().includes(query)
        )
    }, [promotionTests, searchQuery])

    const filteredSeminars = useMemo(() => {
        if (!searchQuery.trim() || !seminars) return seminars || []
        const query = searchQuery.toLowerCase()
        return seminars.filter((s: any) =>
            s.name?.toLowerCase().includes(query) ||
            s.venue?.toLowerCase().includes(query)
        )
    }, [seminars, searchQuery])

    // Pagination Logic
    const currentData = eventType === 'tournaments' ? filteredTournaments : eventType === 'promotions' ? filteredPromotions : filteredSeminars
    const totalItems = currentData?.length || 0
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

    const paginatedData = currentData?.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    ) || []

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    const handleCreateClick = () => {
        if (eventType === 'tournaments') {
            setIsTournamentModalOpen(true)
        } else if (eventType === 'promotions') {
            setIsPromotionModalOpen(true)
        } else {
            setIsSeminarModalOpen(true)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header with Toggle and Actions */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Toggle */}
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => setEventType('tournaments')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${eventType === 'tournaments'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Trophy size={16} />
                        Tournaments
                    </button>
                    <button
                        onClick={() => setEventType('promotions')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${eventType === 'promotions'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Award size={16} />
                        Promotions
                    </button>
                    <button
                        onClick={() => setEventType('seminars')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${eventType === 'seminars'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <GraduationCap size={16} />
                        Seminars
                    </button>
                </div>

                {/* Create Button */}
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Create</span>
                </button>
            </div>

            {/* Content Card - Full Height Flex Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Scrollable List Container */}
                <div className="flex-1 overflow-y-auto">
                    {eventType === 'tournaments' ? (
                        tournamentsLoading ? (
                            <TournamentsTableSkeleton />
                        ) : (
                            <TournamentsList tournaments={paginatedData as any} embedded={true} />
                        )
                    ) : eventType === 'promotions' ? (
                        promotionsLoading ? (
                            <PromotionsTableSkeleton />
                        ) : (
                            <PromotionsList promotionTests={paginatedData as any} />
                        )
                    ) : (
                        seminarsLoading ? (
                            <PromotionsTableSkeleton /> // Reusing skeleton for now
                        ) : (
                            <SeminarsList seminars={paginatedData as any} />
                        )
                    )}
                </div>

                {/* Fixed Pagination Footer */}
                {!tournamentsLoading && !promotionsLoading && !seminarsLoading && totalItems > 0 && (
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

            {/* Modals */}
            <CreateTournamentModal
                isOpen={isTournamentModalOpen}
                onClose={() => setIsTournamentModalOpen(false)}
                templates={templates}
            />
            <CreatePromotionModal
                isOpen={isPromotionModalOpen}
                onClose={() => setIsPromotionModalOpen(false)}
            />
            <CreateSeminarModal
                isOpen={isSeminarModalOpen}
                onClose={() => setIsSeminarModalOpen(false)}
            />
        </div>
    )
}
