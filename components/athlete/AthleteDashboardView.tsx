'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trophy, Medal, Calendar, ChevronRight, Zap, Clock, Mail, QrCode, X, ClipboardList, ShieldCheck, Copy, Check, Eye } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchAthleteDashboardData, unregisterFromTournament, submitAthleteCardPaymentProof } from '@/app/actions'
import AthleteSidebar from '@/components/athlete/AthleteSidebar'
import AthleteTopBar from '@/components/athlete/AthleteTopBar'


import AthleteProfileView from '@/app/settings/AthleteProfileView'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

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
    const [activeView, setActiveView] = useState<'home' | 'events' | 'achievements' | 'settings' | 'ranking'>(initialView)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [registrationTab, setRegistrationTab] = useState<'tournament' | 'seminar' | 'promotion'>('tournament')
    const [achievementsPage, setAchievementsPage] = useState(1)
    const ACHIEVEMENTS_PER_PAGE = 10

    // Activation Modal State
    const [showActivationModal, setShowActivationModal] = useState(false)
    const [activationProof, setActivationProof] = useState<File | null>(null)
    const [isActivating, setIsActivating] = useState(false)
    const [copiedNo, setCopiedNo] = useState<string | null>(null)
    const [viewingPaymentQr, setViewingPaymentQr] = useState<string | null>(null)
    const [viewingQr, setViewingQr] = useState<any>(null)

    // Scroll lock for all modals
    useEffect(() => {
        if (showActivationModal || viewingQr || viewingPaymentQr) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showActivationModal, viewingQr, viewingPaymentQr])

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

    const handleActivationSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dbUser?.id || !activationProof) return

        setIsActivating(true)
        try {
            const formData = new FormData()
            formData.append('userId', dbUser.id)
            formData.append('proofImage', activationProof)

            const result = await submitAthleteCardPaymentProof(formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Payment proof uploaded successfully. Pending approval.')
                setShowActivationModal(false)
                setActivationProof(null)
                await queryClient.invalidateQueries({ queryKey: ['athlete-dashboard', clerkId] })
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred while uploading payment proof')
        } finally {
            setIsActivating(false)
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

                {/* Calculate Achievements */}
                {(() => {
                    const tournamentAchievements = registrations.filter((r: any) =>
                        r.category?.tournament?.startDate && new Date(r.category.tournament.startDate) <= now
                    ).map((r: any) => ({
                        id: r.id,
                        name: r.category.tournament.name,
                        date: new Date(r.category.tournament.startDate),
                        medal: r.medal,
                        type: 'Tournament'
                    }))

                    const seminarAchievements = seminarRegs.filter((r: any) => r.status === 'COMPLETED').map((r: any) => ({
                        id: r.id,
                        name: r.seminar.name,
                        date: new Date(r.seminar.startDate),
                        medal: null,
                        type: 'Seminar'
                    }))

                    const promotionAchievements = promotionRegs.filter((r: any) => r.status === 'PASSED').map((r: any) => ({
                        id: r.id,
                        name: r.promotionTest.name,
                        date: new Date(r.promotionTest.testDate),
                        medal: r.targetBelt, // Hack, storing what they achieved here
                        type: 'Promotion Test'
                    }))

                    const allAchievements = [...tournamentAchievements, ...seminarAchievements, ...promotionAchievements]
                        .sort((a, b) => b.date.getTime() - a.date.getTime())

                    // Pagination logic
                    const totalPages = Math.ceil(allAchievements.length / ACHIEVEMENTS_PER_PAGE)
                    const paginatedAchievements = allAchievements.slice(
                        (achievementsPage - 1) * ACHIEVEMENTS_PER_PAGE,
                        achievementsPage * ACHIEVEMENTS_PER_PAGE
                    )

                    return (
                        <>
                            {/* Top Bar (Desktop Only) */}
                            <AthleteTopBar
                                userName={dbUser?.name}
                                userImageUrl={imageUrl}
                            />
                            {/* Conditional Content based on activeView */}
                            {activeView === 'achievements' && (
                                <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto md:overflow-y-auto">
                                    <div className="flex flex-col gap-6 flex-1">
                                        <div>
                                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Achievements</h1>
                                            <p className="text-sm text-gray-500 mt-1">Your timeline of completed events, test passes, and medals.</p>
                                        </div>

                                        {isLoading || !data ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                                        <Skeleton className="w-10 h-10 rounded-xl" />
                                                        <div className="space-y-2">
                                                            <Skeleton className="h-5 w-3/4" />
                                                            <Skeleton className="h-4 w-1/2" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : allAchievements.length > 0 ? (
                                            <>
                                                {/* Mobile View: Card Style */}
                                                <div className="block md:hidden space-y-4">
                                                    {paginatedAchievements.map((achievement: any) => {
                                                        let icon = <Trophy className="w-5 h-5 text-indigo-500" />
                                                        let bg = "bg-indigo-50 text-indigo-700"
                                                        let medalBadge = null
                                                        if (achievement.type === 'Tournament') {
                                                            if (achievement.medal === 'Gold') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">🥇 Gold</span>
                                                            else if (achievement.medal === 'Silver') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 shadow-sm">🥈 Silver</span>
                                                            else if (achievement.medal === 'Bronze') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">🥉 Bronze</span>
                                                            else medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100">Participant</span>
                                                        } else if (achievement.type === 'Promotion Test') {
                                                            icon = <Zap className="w-5 h-5 text-emerald-500" />
                                                            bg = "bg-emerald-50 text-emerald-700"
                                                            medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Passed: {achievement.medal}</span>
                                                        } else if (achievement.type === 'Seminar') {
                                                            icon = <ClipboardList className="w-5 h-5 text-blue-500" />
                                                            bg = "bg-blue-50 text-blue-700"
                                                            medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Completed</span>
                                                        }

                                                        return (
                                                            <div key={`${achievement.type}-${achievement.id}`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start gap-4">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} shadow-inner`}>
                                                                    {icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0 w-full">
                                                                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{achievement.name}</h3>
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                                            <Calendar className="w-3.5 h-3.5" />
                                                                            {achievement.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </div>
                                                                        <div className="flex items-center justify-between w-full mt-1">
                                                                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{achievement.type}</span>
                                                                            {medalBadge}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Desktop View: Table Style */}
                                                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Event Name</th>
                                                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                                                    <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Achievement</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {paginatedAchievements.map((achievement: any) => {
                                                                    let medalBadge = null
                                                                    if (achievement.type === 'Tournament') {
                                                                        if (achievement.medal === 'Gold') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">🥇 Gold</span>
                                                                        else if (achievement.medal === 'Silver') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 shadow-sm">🥈 Silver</span>
                                                                        else if (achievement.medal === 'Bronze') medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">🥉 Bronze</span>
                                                                        else medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500 border border-gray-100">Participant</span>
                                                                    } else if (achievement.type === 'Promotion Test') {
                                                                        medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Passed: {achievement.medal}</span>
                                                                    } else if (achievement.type === 'Seminar') {
                                                                        medalBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Completed</span>
                                                                    }

                                                                    let typeColor = "bg-gray-100 text-gray-700"
                                                                    if (achievement.type === 'Tournament') typeColor = "bg-indigo-50 text-indigo-700"
                                                                    else if (achievement.type === 'Promotion Test') typeColor = "bg-emerald-50 text-emerald-700"
                                                                    else if (achievement.type === 'Seminar') typeColor = "bg-blue-50 text-blue-700"

                                                                    return (
                                                                        <tr key={`${achievement.type}-${achievement.id}`} className="hover:bg-gray-50/50 transition-colors">
                                                                            <td className="py-4 px-6 whitespace-nowrap">
                                                                                <div className="font-bold text-gray-900">{achievement.name}</div>
                                                                                <div className="text-sm text-gray-500 mt-0.5">{achievement.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                                            </td>
                                                                            <td className="py-4 px-6 whitespace-nowrap">
                                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeColor}`}>
                                                                                    {achievement.type}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-4 px-6 whitespace-nowrap text-right">
                                                                                {medalBadge}
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="flex items-center justify-between pt-4 mt-auto">
                                                        <span className="text-sm text-gray-500">
                                                            Showing <span className="font-medium">{(achievementsPage - 1) * ACHIEVEMENTS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(achievementsPage * ACHIEVEMENTS_PER_PAGE, allAchievements.length)}</span> of <span className="font-medium">{allAchievements.length}</span> results
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setAchievementsPage(p => Math.max(1, p - 1))}
                                                                disabled={achievementsPage === 1}
                                                                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                                            </button>
                                                            <span className="text-sm font-medium text-gray-700 px-2">
                                                                Page {achievementsPage} of {totalPages}
                                                            </span>
                                                            <button
                                                                onClick={() => setAchievementsPage(p => Math.min(totalPages, p + 1))}
                                                                disabled={achievementsPage === totalPages}
                                                                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 px-6">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-gray-100">
                                                    <Trophy className="w-10 h-10 text-gray-300" />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900 mb-2">No achievements yet</h3>
                                                <p className="text-gray-500 max-w-sm mx-auto">
                                                    Register for tournaments, complete seminars, and pass promotion tests to build your achievements timeline here.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )
                })()}

                {/* Conditional Content based on activeView */}
                {activeView === 'home' && (
                    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1600px] mx-auto md:overflow-y-auto">
                        <div className="flex flex-col gap-4">

                            {/* ═══════ ROW 1: Profile Info ═══════ */}
                            <div className="grid grid-cols-1 gap-4 items-stretch">
                                {/* Profile Info Grid */}
                                <div className="h-full bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden flex flex-col">
                                    <div className="px-5 py-3 border-b border-gray-50">
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[1.5px]">Profile</h3>
                                    </div>
                                    <div className="p-4 flex-1 grid grid-cols-2 gap-2">
                                        {[
                                            { label: 'Full Name', value: dbUser?.name || '—' },
                                            { label: 'Email', value: dbUser?.email || '—' },
                                            { label: 'Weight', value: dbUser?.weight ? `${dbUser.weight} kg` : '—' },
                                            { label: 'Height', value: dbUser?.height ? `${dbUser.height} cm` : '—' },
                                        ].map((item) => (
                                            <div key={item.label} className="p-3 rounded-lg hover:bg-gray-50/80 transition-colors">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                                <p className="text-base font-bold text-gray-800 truncate mt-1">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ═══════ ROW 3: Stat Cards ═══════ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Current Rank */}
                                <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Rank</p>
                                            <h3 className="text-xl font-black text-gray-900 mt-1 tracking-tight">{dbUser?.belt || '—'}</h3>
                                            <p className="text-[11px] font-medium text-gray-400 mt-0.5">{dbUser?.belt ? 'Belt level' : 'Not assigned'}</p>
                                        </div>
                                        {dbUser?.belt && (() => {
                                            // Map rank to belt image filename (ported from WOTF Website)
                                            const getBeltImage = (rank: string): string | null => {
                                                const danMatch = rank.match(/(\d+)(?:st|nd|rd|th)\s*Dan/i);
                                                if (danMatch) {
                                                    const danNum = parseInt(danMatch[1]);
                                                    if (danNum >= 1 && danNum <= 9) {
                                                        return `${danNum}${danNum === 1 ? 'st' : danNum === 2 ? 'nd' : danNum === 3 ? 'rd' : 'th'} dan black`;
                                                    }
                                                    return 'black';
                                                }
                                                if (rank.includes('White')) return 'white';
                                                if (rank.includes('Yellow')) return 'yellow';
                                                if (rank.includes('Orange')) return 'orange';
                                                if (rank.includes('Green')) return 'green';
                                                if (rank.includes('Purple')) return 'purple';
                                                if (rank.includes('Blue') && rank.includes('Red')) return 'blue_red';
                                                if (rank.includes('Blue')) return 'blue_red';
                                                if (rank.includes('Maroon')) return 'maroon';
                                                if (rank.includes('Red')) return 'red';
                                                if (rank.includes('Brown')) return 'brown';
                                                if (rank.includes('Black') || rank.includes('Dan')) return 'black';
                                                return null;
                                            };
                                            const beltImage = getBeltImage(dbUser.belt);
                                            if (!beltImage) return null;
                                            return (
                                                <img
                                                    src={`/wotf/Belt Color/${beltImage}.svg`}
                                                    alt={`${dbUser.belt} Belt`}
                                                    width={200}
                                                    height={80}
                                                    className="flex-shrink-0"
                                                />
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Club */}
                                <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Club</p>
                                            <h3 className="text-xl font-black text-gray-900 mt-1 tracking-tight">{dbUser?.clubName || '—'}</h3>
                                            <p className="text-[11px] font-medium text-gray-400 mt-0.5">{dbUser?.clubName ? 'Active member' : 'No club assigned'}</p>
                                        </div>
                                        {clubLogo && (
                                            <div className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-100 shadow-sm flex-shrink-0 bg-white">
                                                <img src={clubLogo} alt={dbUser?.clubName || 'Club'} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ═══════ ROW 4: Membership + Journey ═══════ */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Membership Status */}
                                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-gray-50">
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[1.5px]">Membership</h3>
                                    </div>
                                    <div className="p-5">
                                        <div className="text-center mb-4">
                                            {dbUser?.isVerified ? (
                                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-green-50 text-green-600">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    Active
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-amber-50 text-amber-600">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                    Inactive
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Status</span>
                                                <span className={`font-bold ${dbUser?.isVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {dbUser?.isVerified ? 'Verified' : 'Unverified'}
                                                </span>
                                            </div>
                                            <div className="h-px bg-gray-50" />
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Valid Until</span>
                                                <span className="font-bold text-gray-800">
                                                    {dbUser?.createdAt
                                                        ? new Date(new Date(dbUser.createdAt).setFullYear(new Date(dbUser.createdAt).getFullYear() + 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="h-px bg-gray-50" />
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Athlete ID</span>
                                                <span className="font-bold text-gray-800">{dbUser?.athleteNumber || '—'}</span>
                                            </div>
                                            <div className="h-px bg-gray-50" />
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Type</span>
                                                <span className="font-bold text-gray-800">{dbUser?.role === 'CLUB_MASTER' ? 'Club Master' : 'Athlete'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Journey Timeline */}
                                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-gray-50">
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[1.5px]">Journey</h3>
                                    </div>
                                    <div className="p-5">
                                        <div className="relative pl-6 space-y-5">
                                            {/* Timeline line */}
                                            <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-gradient-to-b from-red-500 via-amber-400 to-green-500 rounded-full opacity-40" />

                                            {/* Registration */}
                                            <div className="relative">
                                                <div className="absolute -left-6 top-0.5 w-[16px] h-[16px] rounded-full bg-red-500 border-[3px] border-white shadow-sm" />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">Registered</p>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                        {dbUser?.birthDate ? 'Member' : 'Profile created'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Club */}
                                            {dbUser?.clubName && (
                                                <div className="relative">
                                                    <div className="absolute -left-6 top-0.5 w-[16px] h-[16px] rounded-full bg-amber-400 border-[3px] border-white shadow-sm" />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">Joined {dbUser.clubName}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Club assignment</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Rank */}
                                            {dbUser?.belt && (
                                                <div className="relative">
                                                    <div className="absolute -left-6 top-0.5 w-[16px] h-[16px] rounded-full bg-green-500 border-[3px] border-white shadow-sm" />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800">Rank: {dbUser.belt}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Belt progression</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Events */}
                                            <div className="relative">
                                                <div className={`absolute -left-6 top-0.5 w-[16px] h-[16px] rounded-full ${completedEvents.length > 0 ? 'bg-green-500' : 'bg-gray-300'} border-[3px] border-white shadow-sm`} />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">
                                                        {completedEvents.length > 0 ? `${completedEvents.length} event${completedEvents.length > 1 ? 's' : ''} completed` : 'No events yet'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                        {upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming` : 'Browse events to get started'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ═══════ ROW 5: My Registrations ═══════ */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-[500px]">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-xs font-black text-gray-900 uppercase tracking-[1.5px]">My Registrations</h2>
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
                                                <h3 className="text-sm font-bold text-gray-900 mb-1">No tournament registrations</h3>
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
                                                <h3 className="text-sm font-bold text-gray-900 mb-1">No seminar registrations</h3>
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
                                                <h3 className="text-sm font-bold text-gray-900 mb-1">No promotion registrations</h3>
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
                                <h2 className="text-2xl font-black text-gray-900 mb-2">
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
                                <h2 className="text-2xl font-black text-gray-900 mb-3">Unranked</h2>
                                <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                                    You have not achieved any verified global ranking points yet. Compete in J-Score events to earn your spot on the leaderboard!
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

                                {/* Athlete Card Notice */}
                                {!dbUser?.isVerified && (
                                    <div className="mt-6 w-full max-w-md bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-800">Athlete Card Required</p>
                                            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                                                To earn J-Scores and appear on the global leaderboard, you need an activated Athlete Card. Contact your organization to get verified.
                                            </p>
                                        </div>
                                    </div>
                                )}

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
                                <h2 className="text-2xl font-black text-gray-900">Available Events</h2>
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
                                        <h3 className="text-sm font-bold text-gray-900 mb-2">No Events Available</h3>
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
                                                    <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">{event.name}</h3>

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



                {/* Seminar QR Code Modal */}
                {viewingQr && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={() => setViewingQr(null)}>
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
                        </div>
                    </div>
                )}

                {/* Payment QR Lightbox Modal */}
                {viewingPaymentQr && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={() => setViewingPaymentQr(null)}>
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900">Payment QR Code</h3>
                                <button onClick={() => setViewingPaymentQr(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1.5">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-center p-6 bg-gray-50">
                                <img src={viewingPaymentQr} alt="Large QR Code" className="w-full h-auto max-h-[60vh] object-contain rounded-lg border border-gray-200" />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Activation Modal */}
            {showActivationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-red-600" />
                                Activate Athlete Card
                            </h3>
                            <button
                                onClick={() => { setShowActivationModal(false); setActivationProof(null); }}
                                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm text-gray-700">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-blue-900">Manual Payment Required</p>
                                    <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full text-xs">
                                        {data?.athleteCardFee ? `₱${data.athleteCardFee.toLocaleString()}` : 'Fee TBA'}
                                    </span>
                                </div>
                                {data?.athleteCardPaymentInstructions ? (
                                    <p className="whitespace-pre-wrap leading-relaxed bg-white/60 p-2.5 rounded border border-blue-100 mt-2">{data.athleteCardPaymentInstructions}</p>
                                ) : (
                                    <p>To activate your athlete card, please pay the activation fee directly to your organization and upload the proof of payment below.</p>
                                )}
                            </div>

                            {data?.athleteCardPaymentMethods && data.athleteCardPaymentMethods.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-gray-900">Payment Methods</h4>
                                    <div className="grid gap-3">
                                        {data.athleteCardPaymentMethods.map((pm: any) => (
                                            <div key={pm.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                                {pm.qrCodeUrl && (
                                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0 group">
                                                        <img src={pm.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                                                        <div
                                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                                            onClick={() => setViewingPaymentQr(pm.qrCodeUrl)}
                                                        >
                                                            <Eye size={20} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0 w-full">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{pm.label || pm.bankName}</p>
                                                    <div className="mt-1 space-y-1.5 text-xs text-gray-600">
                                                        <div className="flex justify-between items-center bg-white p-1.5 rounded border border-gray-100">
                                                            <span className="text-gray-400 font-medium">Account No:</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-800 font-mono text-[13px]">{pm.accountNo}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(pm.accountNo)
                                                                        setCopiedNo(pm.accountNo)
                                                                        setTimeout(() => setCopiedNo(null), 2000)
                                                                    }}
                                                                    className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                                                                    title="Copy Account Number"
                                                                >
                                                                    {copiedNo === pm.accountNo ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between px-1.5 pt-0.5">
                                                            <span className="text-gray-400 font-medium">Account Name:</span>
                                                            <span className="font-bold text-gray-800">{pm.accountName}</span>
                                                        </div>
                                                        {pm.label && pm.bankName && (
                                                            <div className="flex justify-between px-1.5">
                                                                <span className="text-gray-400 font-medium">Bank:</span>
                                                                <span className="font-bold text-gray-800">{pm.bankName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleActivationSubmit} className="space-y-4 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Upload Proof of Payment</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setActivationProof(e.target.files?.[0] || null)}
                                        required
                                        className="w-full text-sm text-gray-500
                                          file:mr-4 file:py-2 file:px-4
                                          file:rounded-full file:border-0
                                          file:text-sm file:font-semibold
                                          file:bg-red-50 file:text-red-700
                                          hover:file:bg-red-100 transition-all cursor-pointer border border-gray-200 rounded-xl px-2 py-2"
                                    />
                                    {activationProof && (
                                        <p className="mt-2 text-xs text-green-600 select-none">File selected: {activationProof.name}</p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowActivationModal(false); setActivationProof(null); }}
                                        className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                                        disabled={isActivating}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2"
                                        disabled={!activationProof || isActivating}
                                    >
                                        {isActivating ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading...
                                            </>
                                        ) : 'Submit Proof'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function AthleteDashboardSkeleton() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                {/* Header */}
                <div>
                    <Skeleton className="h-7 w-32 mb-1" />
                    <Skeleton className="h-4 w-56" />
                </div>

                {/* Profile Row */}
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 lg:min-w-[320px]">
                        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-3 w-40" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="p-2">
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                            <Skeleton className="h-3 w-24 mb-2" />
                            <Skeleton className="h-6 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>

                {/* Membership + Journey */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-50">
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <div className="p-5 space-y-4">
                                <Skeleton className="h-8 w-24 mx-auto rounded-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Registrations */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="p-6 space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-12 w-full rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}
