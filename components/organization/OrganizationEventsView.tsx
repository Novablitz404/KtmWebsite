'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrganizationEventsData } from '@/app/organization/actions'
import TournamentsList from '@/components/TournamentsList'
import PromotionsList from '@/app/promotions/PromotionsList'
import SeminarsList from '@/components/organization/SeminarsList'
import { TournamentsTableSkeleton, PromotionsTableSkeleton } from '@/components/Skeletons'
import { GraduationCap, Trophy, Award, Plus, Loader2 } from 'lucide-react'
import CreateTournamentModal from '@/components/CreateTournamentModal'
import CreatePromotionModal from '@/components/CreatePromotionModal'
import CreateSeminarModal from '@/components/CreateSeminarModal'

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

    useEffect(() => { setCurrentPage(1) }, [eventType, searchQuery])

    const { data, isLoading } = useQuery({
        queryKey: ['organization-events-data'],
        queryFn: () => getOrganizationEventsData(),
        staleTime: 1000 * 60 * 5,
    })

    const tournaments    = data?.tournaments    || []
    const promotionTests = data?.promotionTests || []
    const seminars       = data?.seminars       || []

    const filteredTournaments = useMemo(() => {
        if (!searchQuery.trim()) return tournaments
        const q = searchQuery.toLowerCase()
        return tournaments.filter((t: any) => t.name?.toLowerCase().includes(q) || t.venue?.toLowerCase().includes(q))
    }, [tournaments, searchQuery])

    const filteredPromotions = useMemo(() => {
        if (!searchQuery.trim()) return promotionTests
        const q = searchQuery.toLowerCase()
        return promotionTests.filter((p: any) => p.name?.toLowerCase().includes(q) || p.venue?.toLowerCase().includes(q))
    }, [promotionTests, searchQuery])

    const filteredSeminars = useMemo(() => {
        if (!searchQuery.trim()) return seminars
        const q = searchQuery.toLowerCase()
        return seminars.filter((s: any) => s.name?.toLowerCase().includes(q) || s.venue?.toLowerCase().includes(q))
    }, [seminars, searchQuery])

    const currentData  = eventType === 'tournaments' ? filteredTournaments : eventType === 'promotions' ? filteredPromotions : filteredSeminars
    const totalItems   = currentData.length
    const totalPages   = Math.ceil(totalItems / ITEMS_PER_PAGE)
    const paginatedData = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

    const handleCreateClick = () => {
        if (eventType === 'tournaments') setIsTournamentModalOpen(true)
        else if (eventType === 'promotions') setIsPromotionModalOpen(true)
        else setIsSeminarModalOpen(true)
    }

    const TABS = [
        { id: 'tournaments' as const, label: 'Tournaments', Icon: Trophy,        count: tournaments.length },
        { id: 'promotions'  as const, label: 'Promotions',  Icon: Award,         count: promotionTests.length },
        { id: 'seminars'    as const, label: 'Seminars',    Icon: GraduationCap, count: seminars.length },
    ]

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Events</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage tournaments, promotion tests, and seminars.</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                >
                    <Plus size={14} />
                    Create {eventType === 'tournaments' ? 'Tournament' : eventType === 'promotions' ? 'Promotion Test' : 'Seminar'}
                </button>
            </div>

            {/* ── Tab toggle ── */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-1 self-start w-fit">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setEventType(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            eventType === t.id
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <t.Icon size={14} />
                        {t.label}
                        {!isLoading && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                eventType === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Table card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Card header strip */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {eventType === 'tournaments' ? 'All Tournaments' : eventType === 'promotions' ? 'All Promotion Tests' : 'All Seminars'}
                    </p>
                    {!isLoading && totalItems > 0 && (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {totalItems} {eventType === 'tournaments' ? 'events' : eventType === 'promotions' ? 'tests' : 'seminars'}
                        </span>
                    )}
                </div>

                {/* Loading state */}
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={28} className="animate-spin mb-3" />
                        <p className="text-sm font-medium">Loading events...</p>
                    </div>
                ) : totalItems === 0 ? (
                    <div className="py-20 text-center">
                        {(() => { const T = TABS.find(t => t.id === eventType)!; return (
                            <>
                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <T.Icon size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-900 mb-1">
                                    {searchQuery ? `No ${T.label.toLowerCase()} match "${searchQuery}"` : `No ${T.label.toLowerCase()} yet`}
                                </p>
                                <p className="text-xs text-gray-400 mb-5">
                                    {searchQuery ? 'Try a different search term.' : `Create your first ${T.label.slice(0, -1).toLowerCase()} to get started.`}
                                </p>
                                {!searchQuery && (
                                    <button onClick={handleCreateClick}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm">
                                        <Plus size={14} /> Create {T.label.slice(0, -1)}
                                    </button>
                                )}
                            </>
                        )})()}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {eventType === 'tournaments' ? (
                            <TournamentsList tournaments={paginatedData as any} embedded={true} />
                        ) : eventType === 'promotions' ? (
                            <PromotionsList promotionTests={paginatedData as any} />
                        ) : (
                            <SeminarsList seminars={paginatedData as any} />
                        )}
                    </div>
                )}

                {/* Premium pagination footer */}
                {!isLoading && totalItems > ITEMS_PER_PAGE && (
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

            {/* Modals */}
            <CreateTournamentModal isOpen={isTournamentModalOpen} onClose={() => setIsTournamentModalOpen(false)} templates={templates} />
            <CreatePromotionModal  isOpen={isPromotionModalOpen}  onClose={() => setIsPromotionModalOpen(false)} />
            <CreateSeminarModal    isOpen={isSeminarModalOpen}    onClose={() => setIsSeminarModalOpen(false)} />
        </div>
    )
}
