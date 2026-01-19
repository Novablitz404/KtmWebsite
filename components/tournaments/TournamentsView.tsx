'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchTournamentsData } from '@/app/actions'

interface TournamentsViewProps {
    userId: string
}

export default function TournamentsView({ userId }: TournamentsViewProps) {
    const [page, setPage] = useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['tournaments', userId, page],
        queryFn: () => fetchTournamentsData(userId, page),
        staleTime: 1000 * 60 * 5, // 5 minutes
        placeholderData: (previousData) => previousData // Keep previous data while loading new page
    })

    if (isLoading && !data) {
        return <TournamentsSkeleton />
    }

    const tournaments = data?.tournaments || []
    const totalPages = data?.totalPages || 1
    const totalCount = data?.totalCount || 0
    const currentPage = data?.currentPage || 1
    const registeredTournamentIds = new Set(data?.registeredTournamentIds || [])

    return (
        <>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                {/* Desktop Header */}
                <header className="mb-6 hidden sm:block">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Upcoming Events
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Find and register for upcoming competitions
                    </p>
                </header>

                {tournaments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 sm:p-12 text-center">
                        <p className="text-4xl mb-4">🏆</p>
                        <p className="text-gray-900 font-medium mb-1">No Upcoming Tournaments</p>
                        <p className="text-gray-500 text-sm">Check back soon for new events.</p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {tournaments.map(tournament => {
                            const isCancelled = tournament.status === 'CANCELLED'
                            const isRegistered = registeredTournamentIds.has(tournament.id)

                            // Mobile-friendly date format
                            const mobileDate = tournament.startDate?.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            })

                            const desktopDate = tournament.startDate?.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })

                            return (
                                <div
                                    key={tournament.id}
                                    className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden active:scale-[0.99] transition-transform ${isCancelled ? 'opacity-70' : ''}`}
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 flex-wrap">
                                                    <h2 className={`text-base sm:text-xl font-bold ${isCancelled ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-900'}`}>
                                                        {tournament.name}
                                                    </h2>
                                                    {isCancelled && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 uppercase">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs sm:text-sm text-gray-500">
                                                    <span className="sm:hidden">📅 {mobileDate}</span>
                                                    <span className="hidden sm:inline">📅 {desktopDate}</span>
                                                    {tournament.venue && (
                                                        <>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="truncate">{tournament.venue}</span>
                                                        </>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-xs sm:text-sm text-gray-600">
                                                    {tournament._count.categories} categories available
                                                </p>
                                            </div>

                                            <div className="flex-shrink-0 self-stretch sm:self-center">
                                                {isCancelled ? (
                                                    <button
                                                        disabled
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed border border-gray-200"
                                                    >
                                                        Cancelled
                                                    </button>
                                                ) : isRegistered ? (
                                                    <span className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 sm:py-2 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200">
                                                        ✓ Registered
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={`/tournament/${tournament.id}/register`}
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 sm:py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                                                    >
                                                        Register
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3">
                        <div className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                            <span className="hidden sm:inline text-gray-400 ml-2">
                                ({totalCount} events)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {currentPage > 1 ? (
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                                    <ChevronLeft size={16} />
                                    <span className="hidden sm:inline">Previous</span>
                                </span>
                            )}
                            {currentPage < totalPages ? (
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight size={16} />
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

function TournamentsSkeleton() {
    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Desktop Header */}
            <header className="mb-6 hidden sm:block">
                <h1 className="text-2xl font-bold text-gray-900">
                    Upcoming Events
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Find and register for upcoming competitions
                </p>
            </header>

            <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-64" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <div className="flex-shrink-0">
                                    <Skeleton className="h-10 w-24 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
