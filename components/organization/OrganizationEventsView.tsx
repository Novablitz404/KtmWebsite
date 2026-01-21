'use client'


import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrganizerTournaments } from '@/app/organizer-tournaments/actions'
import { getPromotionTests } from '@/app/promotions/actions'
import TournamentsList from '@/components/TournamentsList'
import PromotionsList from '@/app/promotions/PromotionsList'
import { TournamentsTableSkeleton, PromotionsTableSkeleton } from '@/components/Skeletons'
import { Trophy, Award, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import CreateTournamentModal from '@/components/CreateTournamentModal'
import CreatePromotionModal from '@/components/CreatePromotionModal'

type EventType = 'tournaments' | 'promotions'
const ITEMS_PER_PAGE = 10

export default function OrganizationEventsView() {
    const [eventType, setEventType] = useState<EventType>('tournaments')
    const [currentPage, setCurrentPage] = useState(1)
    const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false)
    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false)

    // Reset page when switching event type
    useEffect(() => {
        setCurrentPage(1)
    }, [eventType])

    // Fetch tournaments
    const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
        queryKey: ['organizer-tournaments'],
        queryFn: () => getOrganizerTournaments(),
        staleTime: 1000 * 60 * 5
    })

    // Fetch promotions
    const { data: promotionTests, isLoading: promotionsLoading } = useQuery({
        queryKey: ['promotion-tests'],
        queryFn: () => getPromotionTests(),
        staleTime: 1000 * 60 * 5
    })

    // Pagination Logic
    const currentData = eventType === 'tournaments' ? tournaments : promotionTests
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
        } else {
            setIsPromotionModalOpen(true)
        }
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header with Toggle and Actions */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <span className="text-3xl">{eventType === 'tournaments' ? '🏆' : '🥋'}</span>
                        {eventType === 'tournaments' ? 'Tournaments' : 'Promotion Tests'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {eventType === 'tournaments'
                            ? 'Create and manage your tournaments.'
                            : 'Schedule and manage belt promotion tests.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setEventType('tournaments')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${eventType === 'tournaments'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Trophy size={16} />
                            Tournaments
                        </button>
                        <button
                            onClick={() => setEventType('promotions')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${eventType === 'promotions'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Award size={16} />
                            Promotions
                        </button>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={handleCreateClick}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Create</span>
                    </button>
                </div>
            </div>

            {/* Content Card - Full Height Flex Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Scrollable List Container */}
                <div className="flex-1 overflow-y-auto">
                    {eventType === 'tournaments' ? (
                        tournamentsLoading ? (
                            <TournamentsTableSkeleton />
                        ) : tournaments && tournaments.length > 0 ? (
                            <TournamentsList tournaments={paginatedData as any} embedded={true} />
                        ) : (
                            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                                <Trophy className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500">No tournaments found.</p>
                                <button
                                    onClick={() => setIsTournamentModalOpen(true)}
                                    className="mt-4 inline-block text-indigo-600 hover:text-indigo-500 font-medium"
                                >
                                    Create your first tournament →
                                </button>
                            </div>
                        )
                    ) : (
                        promotionsLoading ? (
                            <PromotionsTableSkeleton />
                        ) : promotionTests && promotionTests.length > 0 ? (
                            <PromotionsList promotionTests={paginatedData as any} />
                        ) : (
                            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
                                <Award className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-gray-500">No promotion tests found.</p>
                                <button
                                    onClick={() => setIsPromotionModalOpen(true)}
                                    className="mt-4 inline-block text-indigo-600 hover:text-indigo-500 font-medium"
                                >
                                    Create your first promotion test →
                                </button>
                            </div>
                        )
                    )}
                </div>

                {/* Fixed Pagination Footer */}
                {!tournamentsLoading && !promotionsLoading && totalItems > 0 && (
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
                templates={[]} // If templates are needed, fetch them or pass appropriate default
            />
            <CreatePromotionModal
                isOpen={isPromotionModalOpen}
                onClose={() => setIsPromotionModalOpen(false)}
            />
        </div>
    )
}
