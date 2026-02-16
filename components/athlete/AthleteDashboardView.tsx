'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trophy, Medal, Calendar, ChevronRight, Zap, Clock, Mail } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchAthleteDashboardData, unregisterFromTournament } from '@/app/actions'
import AthleteSidebar from '@/components/athlete/AthleteSidebar'
import AthleteTopBar from '@/components/athlete/AthleteTopBar'
import ProfileEditForm from '@/app/settings/ProfileEditForm'
import AthleteProfileView from '@/app/settings/AthleteProfileView'

interface AthleteDashboardViewProps {
    clerkId: string
    imageUrl?: string | null
    initialData?: Awaited<ReturnType<typeof fetchAthleteDashboardData>>
}

// Belt color mapping
const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'White': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    'Yellow': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
    'Green': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
    'Blue': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    'Red': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
    'Black': { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-900' },
    'Poom': { bg: 'bg-gradient-to-r from-red-500 to-gray-900', text: 'text-white', border: 'border-red-500' },
}

export default function AthleteDashboardView({
    clerkId,
    imageUrl,
    initialData
}: AthleteDashboardViewProps) {
    // ALL HOOKS MUST BE AT THE TOP - before any early returns
    const searchParams = useSearchParams()
    const initialView = (searchParams.get('tab') as any) || 'home'
    const [activeView, setActiveView] = useState<'home' | 'settings' | 'ranking'>(initialView)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const queryClient = useQueryClient()

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['athlete-dashboard', clerkId],
        queryFn: () => fetchAthleteDashboardData(clerkId),
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    // Sync tab param with URL for deep linking
    useEffect(() => {
        const url = new URL(window.location.href)
        if (activeView === 'home') url.searchParams.delete('tab')
        else url.searchParams.set('tab', activeView)
        window.history.replaceState({}, '', url.toString())
    }, [activeView])

    // Use server data as fallback (same pattern as ClubDashboard)
    const data = dashboardData || initialData

    // Extract data with safe fallbacks for skeleton rendering
    const dbUser = data?.user
    const clubLogo = data?.clubLogo
    const registrations = data?.registrations || []

    // Calculate stats (only if we have data)
    const now = new Date()
    const upcomingEvents = registrations.filter((r: any) =>
        r.category?.tournament?.startDate && new Date(r.category.tournament.startDate) > now
    )
    const completedEvents = registrations.filter((r: any) =>
        r.category?.tournament?.startDate && new Date(r.category.tournament.startDate) <= now
    )

    // Get next upcoming event
    const nextEvent = upcomingEvents.length > 0
        ? [...upcomingEvents].sort((a: any, b: any) => {
            const dateA = new Date(a.category?.tournament?.startDate || 0)
            const dateB = new Date(b.category?.tournament?.startDate || 0)
            return dateA.getTime() - dateB.getTime()
        })[0]
        : null

    // Calculate days until next event
    const daysUntilNext = nextEvent?.category?.tournament?.startDate
        ? Math.ceil((new Date(nextEvent.category.tournament.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

    const beltStyle = BELT_COLORS[dbUser?.belt || ''] || BELT_COLORS['White']

    const handleUnregister = async (playerId: string, registrationName: string) => {
        if (!confirm(`Are you sure you want to withdraw from ${registrationName}? This action cannot be undone.`)) return

        try {
            const result = await unregisterFromTournament(playerId)
            if (result.error) {
                alert(result.error)
            } else {
                await queryClient.invalidateQueries({ queryKey: ['athlete-dashboard', clerkId] })
            }
        } catch (e) {
            console.error(e)
            alert('Failed to unregister. Please try again.')
        }
    }

    return (
        <>
            {/* Sidebar */}
            <AthleteSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                userName={dbUser?.name}
                userImageUrl={imageUrl}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content - offset for sidebar */}
            <main className="min-h-screen md:h-screen bg-gray-50 md:ml-60 flex flex-col md:overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white px-4 py-3 flex items-center justify-between flex-shrink-0 z-30 sticky top-0 border-b border-gray-100">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                        {/* Menu Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                    </button>

                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                        {imageUrl ? (
                            <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                {dbUser?.name?.charAt(0) || 'A'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Bar (Desktop Only) */}
                <AthleteTopBar
                    userName={dbUser?.name || 'Athlete'}
                    userImageUrl={imageUrl || undefined}
                />
                {/* Conditional Content based on activeView */}
                {activeView === 'home' && (
                    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto md:overflow-y-auto">

                        {/* Flex Layout - Desktop: side-by-side, Mobile: stacked */}
                        <div className="flex flex-col lg:flex-row gap-6 h-full md:min-h-0">

                            {/* Left Column - Main Content */}
                            <div className="flex-[2] flex flex-col gap-6 md:min-h-0">

                                {/* Athlete Profile Card */}
                                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    {!dbUser ? (
                                        /* Compact Skeleton */
                                        <div className="flex flex-col md:flex-row items-center gap-6 animate-pulse">
                                            <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                                            <div className="flex-1 space-y-2 text-center md:text-left w-full">
                                                <Skeleton className="h-6 w-40 mx-auto md:mx-0" />
                                                <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
                                            </div>
                                            <div className="hidden md:block w-px h-12 bg-gray-100" />
                                            <Skeleton className="h-12 w-32" />
                                            <div className="hidden md:block w-px h-12 bg-gray-100" />
                                            <Skeleton className="h-12 w-24" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row items-center gap-6">
                                            {/* Avatar */}
                                            <div className="flex-shrink-0">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={dbUser.name || 'Athlete'}
                                                        className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover bg-gray-50"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-red-200 shadow-sm flex items-center justify-center text-2xl">
                                                        🥋
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 text-center md:text-left min-w-0">
                                                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                                    <h2 className="text-xl font-bold text-gray-900 truncate">{dbUser.name || 'Athlete'}</h2>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${beltStyle.bg} ${beltStyle.text} border ${beltStyle.border}`}>
                                                        {dbUser.belt || 'No Belt'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-gray-500 mt-1">
                                                    <Mail size={14} className="flex-shrink-0" />
                                                    <span className="truncate">{dbUser.email}</span>
                                                </div>
                                            </div>

                                            {/* Club Info */}
                                            <div className="flex items-center gap-3 px-6 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                                {clubLogo ? (
                                                    <img
                                                        src={clubLogo}
                                                        alt={dbUser.clubName || 'Club'}
                                                        className="w-8 h-8 rounded-lg object-contain bg-white"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm">
                                                        🏫
                                                    </div>
                                                )}
                                                <div className="text-left">
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Club</p>
                                                    <p className="text-sm font-semibold text-gray-900 max-w-[150px] truncate">{dbUser.clubName || 'No Club'}</p>
                                                </div>
                                            </div>

                                            {/* Physical Stats */}
                                            {(dbUser.weight || dbUser.height) && (
                                                <div className="flex items-center gap-4 pl-2">
                                                    {dbUser.weight && (
                                                        <div className="text-center">
                                                            <p className="text-base font-bold text-gray-900">{dbUser.weight}<span className="text-xs font-normal text-gray-500 ml-0.5">kg</span></p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-medium">Weight</p>
                                                        </div>
                                                    )}
                                                    {dbUser.height && (
                                                        <div className="text-center border-l border-gray-100 pl-4">
                                                            <p className="text-base font-bold text-gray-900">{dbUser.height}<span className="text-xs font-normal text-gray-500 ml-0.5">cm</span></p>
                                                            <p className="text-[10px] text-gray-400 uppercase font-medium">Height</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Performance Stats & Next Event Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Performance Summary - Coming Soon */}
                                    <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 p-5 relative overflow-hidden">
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Coming Soon</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-2">Performance Stats</h3>
                                        <p className="text-sm text-gray-500">Track your wins, medals, and improvement.</p>
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            <div className="text-center p-2 bg-white/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-400">-</p>
                                                <p className="text-[10px] text-gray-400">Win Rate</p>
                                            </div>
                                            <div className="text-center p-2 bg-white/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-400">-</p>
                                                <p className="text-[10px] text-gray-400">Medals</p>
                                            </div>
                                            <div className="text-center p-2 bg-white/50 rounded-lg">
                                                <p className="text-lg font-bold text-gray-400">-</p>
                                                <p className="text-[10px] text-gray-400">Rank</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Next Event Widget */}
                                    {nextEvent ? (
                                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Zap size={16} className="text-yellow-300" />
                                                        <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Joined Event</span>
                                                    </div>
                                                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{nextEvent.category?.tournament?.name}</h3>
                                                    <p className="text-indigo-200 text-sm line-clamp-1">{nextEvent.category?.name}</p>
                                                    <p className="text-indigo-200 text-xs mt-2 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {nextEvent.category?.tournament?.startDate
                                                            ? new Date(nextEvent.category.tournament.startDate).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })
                                                            : '-'
                                                        }
                                                    </p>
                                                </div>
                                                {daysUntilNext !== null && (
                                                    <div className="text-right flex-shrink-0">
                                                        <div className="text-3xl font-black">{daysUntilNext}</div>
                                                        <div className="text-xs text-indigo-200">days</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center text-center">
                                            <span className="text-3xl mb-2">🏆</span>
                                            <h3 className="font-bold text-gray-900 mb-1">No Joined Events</h3>
                                            <p className="text-sm text-gray-500">Check the list below to join an event!</p>
                                        </div>
                                    )}
                                </div>

                                {/* ============ SECTION 1: My Registrations ============ */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-gray-900">My Registrations</h2>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                            {registrations.length} {registrations.length === 1 ? 'entry' : 'entries'}
                                        </span>
                                    </div>

                                    {registrations.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <div className="text-4xl mb-3">📋</div>
                                            <h3 className="text-base font-bold text-gray-900 mb-1">No registrations yet</h3>
                                            <p className="text-gray-500 text-sm">Register for an event from the list below.</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto">
                                            {/* Mobile View - Cards */}
                                            <div className="md:hidden p-4 space-y-3">
                                                {registrations.map((reg: any) => {
                                                    const tournament = reg.category?.tournament
                                                    const categoryType = reg.category?.type || 'KYORUGI'
                                                    const typeBadge = categoryType === 'POOMSAE'
                                                        ? { label: 'Poomsae', style: 'bg-blue-50 text-blue-700 border-blue-200' }
                                                        : categoryType === 'KYUKPA'
                                                            ? { label: 'Kyukpa', style: 'bg-purple-50 text-purple-700 border-purple-200' }
                                                            : { label: 'Kyorugi', style: 'bg-red-50 text-red-700 border-red-200' }
                                                    const statusBadge = reg.registrationStatus === 'APPROVED'
                                                        ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                        : reg.registrationStatus === 'REJECTED'
                                                            ? { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-200' }
                                                            : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }

                                                    return (
                                                        <div key={reg.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <span className="font-bold text-gray-900 text-base">{tournament?.name || 'Unknown'}</span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${typeBadge.style}`}>
                                                                            {typeBadge.label}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">{reg.category?.name}</span>
                                                                    </div>
                                                                </div>
                                                                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.style}`}>
                                                                    {statusBadge.label}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-500 mb-3">
                                                                {tournament?.startDate
                                                                    ? new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                    : '-'
                                                                }
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {tournament?.id && (
                                                                    <Link
                                                                        href={`/tournament/${tournament.id}`}
                                                                        className="flex-1 text-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        Details
                                                                    </Link>
                                                                )}
                                                                <button
                                                                    onClick={() => handleUnregister(reg.id, `${tournament?.name} - ${reg.category?.name}`)}
                                                                    className="flex-1 text-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                                >
                                                                    Withdraw
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Desktop View - Table */}
                                            <table className="hidden md:table min-w-full divide-y divide-gray-100">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-50">
                                                    {registrations.map((reg: any) => {
                                                        const tournament = reg.category?.tournament
                                                        const categoryType = reg.category?.type || 'KYORUGI'
                                                        const typeBadge = categoryType === 'POOMSAE'
                                                            ? { label: 'Poomsae', style: 'bg-blue-50 text-blue-700 border-blue-200' }
                                                            : categoryType === 'KYUKPA'
                                                                ? { label: 'Kyukpa', style: 'bg-purple-50 text-purple-700 border-purple-200' }
                                                                : { label: 'Kyorugi', style: 'bg-red-50 text-red-700 border-red-200' }
                                                        const statusBadge = reg.registrationStatus === 'APPROVED'
                                                            ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                            : reg.registrationStatus === 'REJECTED'
                                                                ? { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-200' }
                                                                : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }

                                                        return (
                                                            <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap max-w-[180px]">
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-bold text-gray-900 truncate">{tournament?.name || 'Unknown'}</span>
                                                                        {tournament?.venue && <span className="text-xs text-gray-500 truncate">{tournament.venue}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap max-w-[120px]">
                                                                    <span className="text-sm text-gray-700 truncate block">{reg.category?.name || '-'}</span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeBadge.style}`}>
                                                                        {typeBadge.label}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="text-sm text-gray-600">
                                                                        {tournament?.startDate
                                                                            ? new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                                            : '-'
                                                                        }
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.style}`}>
                                                                        {statusBadge.label}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {tournament?.id && (
                                                                            <Link
                                                                                href={`/tournament/${tournament.id}`}
                                                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                                            >
                                                                                Details
                                                                            </Link>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleUnregister(reg.id, `${tournament?.name} - ${reg.category?.name}`)}
                                                                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                                                        >
                                                                            Withdraw
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Right Column - Sidebar */}
                            <div className="flex-1 flex flex-col gap-6 md:min-h-0">



                                {/* Available Events */}
                                {(() => {
                                    const tournamentEvents = (data?.clubUpcomingEvents || []).filter((e: any) => e.type === 'TOURNAMENT')
                                    const seminarEvents = (data?.clubUpcomingEvents || []).filter((e: any) => e.type === 'SEMINAR')
                                    const registeredCategoryIds = new Set(registrations.map((r: any) => r.categoryId))

                                    const availableTournaments = tournamentEvents
                                        .map((event: any) => {
                                            const categories = event.categories || []
                                            const allTypes = [...new Set(categories.map((c: any) => c.type))] as string[]
                                            const registeredTypes = new Set(
                                                categories
                                                    .filter((c: any) => registeredCategoryIds.has(c.id))
                                                    .map((c: any) => c.type)
                                            )
                                            const availableTypes = allTypes.filter(t => !registeredTypes.has(t))
                                            return { ...event, availableTypes }
                                        })
                                        .filter((event: any) => event.availableTypes.length > 0)

                                    const registeredSeminarIds = new Set(
                                        (data as any)?.seminarRegistrations?.map((r: any) => r.seminarId) || []
                                    )
                                    const availableSeminars = seminarEvents.filter((e: any) => !registeredSeminarIds.has(e.id))

                                    const allAvailable = [
                                        ...availableTournaments.map((t: any) => ({ ...t, eventType: 'TOURNAMENT' })),
                                        ...availableSeminars.map((s: any) => ({ ...s, eventType: 'SEMINAR' }))
                                    ]

                                    return (
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                                                <span className="text-xl">🏆</span>
                                                <h3 className="font-bold text-gray-900">Available Events</h3>
                                            </div>

                                            {allAvailable.length === 0 ? (
                                                <div className="p-6 text-center">
                                                    <div className="text-3xl mb-2">🎯</div>
                                                    <p className="text-sm font-medium text-gray-900">All caught up!</p>
                                                    <p className="text-xs text-gray-500 mt-1">No new events to register for.</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-50">
                                                    {allAvailable.slice(0, 5).map((event: any) => {
                                                        const isSeminar = event.eventType === 'SEMINAR'
                                                        const registerLink = isSeminar ? `/seminars/${event.id}/register` : `/tournament/${event.id}/register`

                                                        return (
                                                            <div key={`sidebar-${event.eventType}-${event.id}`} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-semibold text-gray-900 truncate">{event.name}</p>
                                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                                            {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                            {event.venue && ` · ${event.venue}`}
                                                                        </p>
                                                                        {!isSeminar && event.availableTypes && (
                                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                                {event.availableTypes.map((type: string) => {
                                                                                    const badge = type === 'POOMSAE'
                                                                                        ? { label: 'Poomsae', style: 'bg-blue-50 text-blue-600 border-blue-200' }
                                                                                        : type === 'KYUKPA'
                                                                                            ? { label: 'Kyukpa', style: 'bg-purple-50 text-purple-600 border-purple-200' }
                                                                                            : { label: 'Kyorugi', style: 'bg-red-50 text-red-600 border-red-200' }
                                                                                    return (
                                                                                        <span key={type} className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${badge.style}`}>
                                                                                            {badge.label}
                                                                                        </span>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                        {isSeminar && (
                                                                            <span className="inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase text-purple-600 bg-purple-50 border border-purple-200">
                                                                                Seminar
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <Link
                                                                        href={registerLink}
                                                                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        Register
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}

                                {/* Top 5 Rankings Widget */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex-1 md:min-h-0 flex flex-col overflow-hidden">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        <h3 className="font-bold text-gray-900">Top Rankings</h3>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <Trophy className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900">Rankings Coming Soon</h4>
                                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                                            Global leaderboards and club rankings will be available shortly.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setActiveView('ranking')}
                                        className="w-full mt-4 py-2 text-sm text-center text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                    >
                                        Learn More
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'ranking' && (
                    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Trophy className="w-10 h-10 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">Global Rankings Coming Soon</h2>
                            <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                                Compare your performance with athletes worldwide. Track your progress, earn points, and climb the leaderboards to become the best.
                            </p>
                            <div className="flex gap-4">
                                <div className="px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center min-w-[140px]">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Global Rank</span>
                                    <span className="text-2xl font-bold text-gray-300">---</span>
                                </div>
                                <div className="px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center min-w-[140px]">
                                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Points</span>
                                    <span className="text-2xl font-bold text-gray-300">---</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}





                {activeView === 'settings' && initialData?.user && (
                    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <AthleteProfileView
                            dbUser={initialData.user}
                            clerkImageUrl={imageUrl || undefined}
                            clubLogoUrl={clubLogo}
                            stats={{
                                registrations: registrations.length,
                                events: new Set(registrations.map((r: any) => r.category?.tournament?.id).filter(Boolean)).size,
                                medals: 0
                            }}
                        />
                    </div>
                )}


            </main >
        </>
    )
}

function AthleteDashboardSkeleton() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Stats Cards - STATIC structure */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        <Trophy size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Events</p>
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Upcoming</p>
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                        <Medal size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Completed</p>
                                        <Skeleton className="h-8 w-12 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Stats & Next Event Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Performance Summary */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl border border-gray-200 p-5 relative overflow-hidden">
                                <div className="absolute top-2 right-2">
                                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Coming Soon</span>
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">Performance Stats</h3>
                                <p className="text-sm text-gray-500">Track your wins, medals, and improvement.</p>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 bg-white/50 rounded-lg">
                                        <p className="text-lg font-bold text-gray-400">-</p>
                                        <p className="text-[10px] text-gray-400">Win Rate</p>
                                    </div>
                                    <div className="text-center p-2 bg-white/50 rounded-lg">
                                        <p className="text-lg font-bold text-gray-400">-</p>
                                        <p className="text-[10px] text-gray-400">Medals</p>
                                    </div>
                                    <div className="text-center p-2 bg-white/50 rounded-lg">
                                        <p className="text-lg font-bold text-gray-400">-</p>
                                        <p className="text-[10px] text-gray-400">Rank</p>
                                    </div>
                                </div>
                            </div>

                            {/* Next Event Skeleton */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-5">
                                <Skeleton className="h-4 w-20 mb-3" />
                                <Skeleton className="h-5 w-40 mb-2" />
                                <Skeleton className="h-4 w-32 mb-3" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>

                        {/* Registrations Table - STATIC headers */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">My Registrations</h2>
                                <Link
                                    href="/tournaments"
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                >
                                    Browse Events <ChevronRight size={16} />
                                </Link>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {[1, 2, 3].map((i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-40" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-28" /></td>
                                                <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20 rounded-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar (Sticky) */}
                    <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">

                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5">
                                {/* Avatar */}
                                <div className="mb-4">
                                    <Skeleton className="w-20 h-20 rounded-xl" />
                                </div>

                                {/* Name & Email */}
                                <Skeleton className="h-5 w-32 mb-1" />
                                <Skeleton className="h-4 w-48" />

                                {/* Belt Badge */}
                                <div className="mt-4">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 my-4" />

                                {/* Club Section */}
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Club</p>
                                        <Skeleton className="h-4 w-24 mt-0.5" />
                                    </div>
                                </div>

                                {/* Physical Stats */}
                                <div className="border-t border-gray-100 my-4" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                                        <Skeleton className="h-5 w-12 mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-500 uppercase">Weight</p>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                                        <Skeleton className="h-5 w-12 mx-auto mb-1" />
                                        <p className="text-[10px] text-gray-500 uppercase">Height</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Available Events */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🏆</span>
                                <h3 className="font-bold text-gray-900">Available Events</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <Skeleton className="h-4 w-32 mb-1" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <Skeleton className="h-4 w-28 mb-1" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
