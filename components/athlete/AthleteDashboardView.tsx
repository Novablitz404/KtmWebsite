'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trophy, Medal, Calendar, ChevronRight, Zap, Clock, Mail, QrCode, X } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchAthleteDashboardData, unregisterFromTournament } from '@/app/actions'
import AthleteSidebar from '@/components/athlete/AthleteSidebar'
import AthleteTopBar from '@/components/athlete/AthleteTopBar'
import ProfileEditForm from '@/app/settings/ProfileEditForm'
import AthleteProfileView from '@/app/settings/AthleteProfileView'
import { QRCodeSVG } from 'qrcode.react'

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
    const [activeView, setActiveView] = useState<'home' | 'events' | 'settings' | 'ranking'>(initialView)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [registrationTab, setRegistrationTab] = useState<'tournament' | 'seminar' | 'promotion'>('tournament')

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
    const seminarRegs = (data as any)?.seminarRegistrations || []
    const promotionRegs = (data as any)?.promotionRegistrations || []
    const [viewingQr, setViewingQr] = useState<any>(null)

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

                        {/* Main Content */}
                        <div className="flex flex-col gap-6 h-full md:min-h-0">

                            {/* Athlete Profile Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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

                            {/* Performance Stats Row */}
                            <div className="grid grid-cols-1 gap-4">
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
                            </div>

                            {/* ============ SECTION 1: My Registrations ============ */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-900">My Registrations</h2>
                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                        {registrations.length + seminarRegs.length + promotionRegs.length} {(registrations.length + seminarRegs.length + promotionRegs.length) === 1 ? 'entry' : 'entries'}
                                    </span>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-100 px-6">
                                    {[
                                        { key: 'tournament', label: 'Tournament', count: registrations.length },
                                        { key: 'seminar', label: 'Seminar', count: seminarRegs.length },
                                        { key: 'promotion', label: 'Promotion', count: promotionRegs.length },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setRegistrationTab(tab.key as any)}
                                            className={`relative px-4 py-3 text-sm font-medium transition-colors ${registrationTab === tab.key
                                                ? 'text-red-600'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {tab.label}
                                                {tab.count > 0 && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${registrationTab === tab.key
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {tab.count}
                                                    </span>
                                                )}
                                            </span>
                                            {registrationTab === tab.key && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tournament Tab */}
                                {registrationTab === 'tournament' && (
                                    <>
                                        {registrations.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <div className="text-4xl mb-3">🏆</div>
                                                <h3 className="text-base font-bold text-gray-900 mb-1">No tournament registrations</h3>
                                                <p className="text-gray-500 text-sm">Browse events to register for a tournament.</p>
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
                                    </>
                                )}

                                {/* Seminar Tab */}
                                {registrationTab === 'seminar' && (
                                    <>
                                        {seminarRegs.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <div className="text-4xl mb-3">📚</div>
                                                <h3 className="text-base font-bold text-gray-900 mb-1">No seminar registrations</h3>
                                                <p className="text-gray-500 text-sm">Browse events to register for a seminar.</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-auto">
                                                {/* Mobile View */}
                                                <div className="md:hidden p-4 space-y-3">
                                                    {seminarRegs.map((reg: any) => {
                                                        const statusBadge = reg.status === 'APPROVED'
                                                            ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                            : reg.status === 'REJECTED'
                                                                ? { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-200' }
                                                                : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }
                                                        return (
                                                            <div key={reg.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <span className="font-bold text-gray-900 text-base">{reg.seminar?.name || 'Unknown'}</span>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-purple-50 text-purple-700 border-purple-200">
                                                                                Seminar
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.style}`}>
                                                                        {statusBadge.label}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-gray-500 mb-3">
                                                                    {reg.seminar?.startDate
                                                                        ? new Date(reg.seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                        : '-'
                                                                    }
                                                                </div>
                                                                {reg.status === 'APPROVED' && reg.qrCodeToken && (
                                                                    <button
                                                                        onClick={() => setViewingQr(reg)}
                                                                        className="w-full text-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                                                    >
                                                                        <QrCode className="w-4 h-4" />
                                                                        View QR Code
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                {/* Desktop View */}
                                                <table className="hidden md:table min-w-full divide-y divide-gray-100">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seminar</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-50">
                                                        {seminarRegs.map((reg: any) => {
                                                            const statusBadge = reg.status === 'APPROVED'
                                                                ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                                : reg.status === 'REJECTED'
                                                                    ? { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-200' }
                                                                    : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }
                                                            return (
                                                                <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-6 py-4 whitespace-nowrap max-w-[180px]">
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-sm font-bold text-gray-900 truncate">{reg.seminar?.name || 'Unknown'}</span>
                                                                            {reg.seminar?.venue && <span className="text-xs text-gray-500 truncate">{reg.seminar.venue}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600">
                                                                            {reg.seminar?.startDate
                                                                                ? new Date(reg.seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                                                                        {reg.status === 'APPROVED' && reg.qrCodeToken && (
                                                                            <button
                                                                                onClick={() => setViewingQr(reg)}
                                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                                                            >
                                                                                <QrCode className="w-3.5 h-3.5" />
                                                                                View QR
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Promotion Tab */}
                                {registrationTab === 'promotion' && (
                                    <>
                                        {promotionRegs.length === 0 ? (
                                            <div className="p-10 text-center">
                                                <div className="text-4xl mb-3">🥋</div>
                                                <h3 className="text-base font-bold text-gray-900 mb-1">No promotion registrations</h3>
                                                <p className="text-gray-500 text-sm">Browse events to register for a belt promotion test.</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-auto">
                                                {/* Mobile View */}
                                                <div className="md:hidden p-4 space-y-3">
                                                    {promotionRegs.map((reg: any) => {
                                                        const statusBadge = reg.status === 'APPROVED'
                                                            ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                            : reg.status === 'PASSED'
                                                                ? { label: 'Passed', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                                                : reg.status === 'FAILED'
                                                                    ? { label: 'Failed', style: 'bg-red-50 text-red-700 border-red-200' }
                                                                    : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }
                                                        return (
                                                            <div key={reg.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <span className="font-bold text-gray-900 text-base">{reg.promotionTest?.name || 'Unknown'}</span>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-orange-50 text-orange-700 border-orange-200">
                                                                                Belt Test
                                                                            </span>
                                                                            <span className="text-xs text-gray-500">{reg.currentBelt}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.style}`}>
                                                                        {statusBadge.label}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-gray-500 mb-3">
                                                                    {reg.promotionTest?.testDate
                                                                        ? new Date(reg.promotionTest.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                                        : '-'
                                                                    }
                                                                </div>
                                                                {reg.promotionTest?.id && (
                                                                    <Link
                                                                        href={`/promotions/${reg.promotionTest.id}`}
                                                                        className="w-full text-center block px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        View Details
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                {/* Desktop View */}
                                                <table className="hidden md:table min-w-full divide-y divide-gray-100">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Promotion Test</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-50">
                                                        {promotionRegs.map((reg: any) => {
                                                            const statusBadge = reg.status === 'APPROVED'
                                                                ? { label: 'Approved', style: 'bg-green-50 text-green-700 border-green-200' }
                                                                : reg.status === 'PASSED'
                                                                    ? { label: 'Passed', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                                                    : reg.status === 'FAILED'
                                                                        ? { label: 'Failed', style: 'bg-red-50 text-red-700 border-red-200' }
                                                                        : { label: 'Pending', style: 'bg-amber-50 text-amber-700 border-amber-200' }
                                                            return (
                                                                <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-6 py-4 whitespace-nowrap max-w-[180px]">
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-sm font-bold text-gray-900 truncate">{reg.promotionTest?.name || 'Unknown'}</span>
                                                                            {reg.promotionTest?.venue && <span className="text-xs text-gray-500 truncate">{reg.promotionTest.venue}</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-700">{reg.currentBelt}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm text-gray-600">
                                                                            {reg.promotionTest?.testDate
                                                                                ? new Date(reg.promotionTest.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                                                                        {reg.promotionTest?.id && (
                                                                            <Link
                                                                                href={`/promotions/${reg.promotionTest.id}`}
                                                                                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                                            >
                                                                                Details
                                                                            </Link>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {activeView === 'ranking' && (
                    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        {dashboardData?.globalRanking ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-amber-100 rounded-full flex items-center justify-center mb-6 shadow-sm ring-4 ring-red-50">
                                    <Trophy className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 mb-2">
                                    <span className="text-red-600">Global</span> Rank Achieved
                                </h2>
                                <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                                    Your verified ranking points based on the World Taekwondo Decay Protocol.
                                </p>

                                <div className="flex flex-wrap justify-center gap-4 mb-8">
                                    <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[160px]">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Global Points</span>
                                        <span className="text-4xl font-black text-gray-900 tracking-tight">{dashboardData.globalRanking.totalPoints.toFixed(2)}</span>
                                    </div>
                                    <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[160px]">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Global Rank</span>
                                        <span className="text-4xl font-black text-red-600 tracking-tight">#{dashboardData.globalRanking.bestRank}</span>
                                    </div>
                                </div>

                                {dashboardData.globalRanking.disciplines.length > 0 && (
                                    <div className="w-full max-w-md">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 text-left">Disciplines</h4>
                                        <div className="space-y-2">
                                            {dashboardData.globalRanking.disciplines.map((disc: any) => (
                                                <div key={disc.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="font-bold text-gray-700">{disc.type}</span>
                                                    <div className="text-right flex items-center gap-4">
                                                        <span className="text-sm font-bold text-gray-900">{disc.points.toFixed(2)} pts</span>
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-200/50 px-2 py-1 rounded-md">Rank #{disc.rank}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Link href="/rankings" className="mt-8 px-6 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                                    View Global Leaderboard
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <Trophy className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">Unranked</h2>
                                <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                                    You have not achieved any verified global ranking points yet. Compete in K-Point events to earn your spot on the leaderboard!
                                </p>
                                <div className="flex gap-4">
                                    <div className="px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center min-w-[140px] opacity-70">
                                        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Global Rank</span>
                                        <span className="text-2xl font-bold text-gray-300">---</span>
                                    </div>
                                    <div className="px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center min-w-[140px] opacity-70">
                                        <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Points</span>
                                        <span className="text-2xl font-bold text-gray-300">---</span>
                                    </div>
                                </div>
                                <Link href="/rankings" className="mt-8 px-6 py-2.5 bg-gray-100 text-gray-600 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    View Global Leaderboard
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'events' && (
                    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto md:overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Available Events</h2>
                                <p className="text-sm text-gray-500 mt-1">Browse and register for upcoming tournaments, seminars & promotion tests</p>
                            </div>
                        </div>

                        {(() => {
                            const tournamentEvents = (data?.clubUpcomingEvents || []).filter((e: any) => e.type === 'TOURNAMENT')
                            const seminarEvents = (data?.clubUpcomingEvents || []).filter((e: any) => e.type === 'SEMINAR')
                            const promotionEvents = (data?.clubUpcomingEvents || []).filter((e: any) => e.type === 'PROMOTION_TEST')
                            const registeredCategoryIds = new Set(registrations.map((r: any) => r.categoryId))

                            const availableTournaments = tournamentEvents.map((event: any) => {
                                const categories = event.categories || []
                                const allTypes = [...new Set(categories.map((c: any) => c.type))] as string[]
                                const registeredTypes = new Set(
                                    categories
                                        .filter((c: any) => registeredCategoryIds.has(c.id))
                                        .map((c: any) => c.type)
                                )
                                const availableTypes = allTypes.filter(t => !registeredTypes.has(t))
                                const isFullyRegistered = availableTypes.length === 0
                                return { ...event, availableTypes, allTypes, isFullyRegistered }
                            })

                            const registeredSeminarIds = new Set(
                                (data as any)?.seminarRegistrations?.map((r: any) => r.seminarId) || []
                            )
                            const allSeminars = seminarEvents.map((e: any) => ({
                                ...e,
                                isRegistered: registeredSeminarIds.has(e.id)
                            }))

                            const registeredPromotionIds = new Set(
                                (data as any)?.promotionRegistrations?.map((r: any) => r.promotionTestId) || []
                            )
                            const allPromotions = promotionEvents.map((e: any) => ({
                                ...e,
                                isRegistered: registeredPromotionIds.has(e.id)
                            }))

                            const allEvents = [
                                ...availableTournaments.map((t: any) => ({ ...t, eventType: 'TOURNAMENT' })),
                                ...allSeminars.map((s: any) => ({ ...s, eventType: 'SEMINAR' })),
                                ...allPromotions.map((p: any) => ({ ...p, eventType: 'PROMOTION_TEST' }))
                            ]

                            if (allEvents.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                                        <div className="text-5xl mb-4">🎯</div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Events Available</h3>
                                        <p className="text-sm text-gray-500 max-w-sm">There are no upcoming events for your club right now. Check back later!</p>
                                    </div>
                                )
                            }

                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allEvents.map((event: any) => {
                                        const isSeminar = event.eventType === 'SEMINAR'
                                        const isPromotion = event.eventType === 'PROMOTION_TEST'
                                        const isRegistered = isSeminar ? event.isRegistered : isPromotion ? event.isRegistered : event.isFullyRegistered
                                        const registerLink = isPromotion ? `/promotions/${event.id}` : isSeminar ? `/seminars/${event.id}/register` : `/tournament/${event.id}/register`
                                        const eventDate = new Date(event.startDate)
                                        const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                                        return (
                                            <div
                                                key={`${event.eventType}-${event.id}`}
                                                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                                            >
                                                {/* Color strip */}
                                                <div className={`h-1.5 ${isPromotion ? 'bg-orange-500' : isSeminar ? 'bg-purple-500' : 'bg-red-500'}`} />

                                                <div className="p-5 flex-1 flex flex-col">
                                                    {/* Top: Type + Days */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isPromotion
                                                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                            : isSeminar
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : 'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {isPromotion ? 'Belt Test' : isSeminar ? 'Seminar' : 'Tournament'}
                                                        </span>
                                                        {daysUntil > 0 && (
                                                            <span className="text-xs text-gray-400 font-medium">
                                                                {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Name */}
                                                    <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">{event.name}</h3>

                                                    {/* Date & Venue */}
                                                    <div className="space-y-1 mb-3">
                                                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                                            <Calendar size={13} className="flex-shrink-0" />
                                                            {eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                        {event.venue && (
                                                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                <span className="truncate">{event.venue}</span>
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Category Type Badges (for tournaments) */}
                                                    {!isSeminar && !isPromotion && event.allTypes && event.allTypes.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                                            {event.allTypes.map((type: string) => {
                                                                const badge = type === 'POOMSAE'
                                                                    ? { label: 'Poomsae', style: 'bg-blue-50 text-blue-600 border-blue-200' }
                                                                    : type === 'KYUKPA'
                                                                        ? { label: 'Kyukpa', style: 'bg-purple-50 text-purple-600 border-purple-200' }
                                                                        : { label: 'Kyorugi', style: 'bg-red-50 text-red-600 border-red-200' }
                                                                const isTypeRegistered = !event.availableTypes?.includes(type)
                                                                return (
                                                                    <span
                                                                        key={type}
                                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.style} ${isTypeRegistered ? 'opacity-50 line-through' : ''}`}
                                                                    >
                                                                        {badge.label}
                                                                    </span>
                                                                )
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Spacer */}
                                                    <div className="flex-1" />

                                                    {/* Action */}
                                                    {isRegistered ? (
                                                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Registered
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href={registerLink}
                                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm"
                                                        >
                                                            Register Now
                                                            <ChevronRight size={14} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
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



                {/* QR Code Modal */}
                {viewingQr && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingQr(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end mb-2">
                                <button onClick={() => setViewingQr(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Your Seminar QR Code</h3>
                            <p className="text-sm text-gray-500 mb-6">Present this at the event for check-in</p>
                            <div className="flex justify-center mb-6">
                                <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
                                    <QRCodeSVG value={viewingQr.qrCodeToken} size={200} />
                                </div>
                            </div>
                            <p className="text-base font-bold text-gray-900">{viewingQr.playerName}</p>
                            <p className="text-sm text-gray-500">{viewingQr.seminar?.name}</p>
                        </div>
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
