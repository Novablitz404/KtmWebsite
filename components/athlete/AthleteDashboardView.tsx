'use client'

import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Calendar, ChevronRight, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchAthleteDashboardData } from '@/app/actions'

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

export default function AthleteDashboardView({ clerkId, imageUrl, initialData }: AthleteDashboardViewProps) {
    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['athlete-dashboard', clerkId],
        queryFn: () => fetchAthleteDashboardData(clerkId),
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (isLoading && !dashboardData) {
        return <AthleteDashboardSkeleton />
    }

    if (!dashboardData || !dashboardData.user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-xl font-semibold text-gray-900">Unable to load dashboard</h2>
                <p className="text-gray-500 mt-2">Please try refreshing the page.</p>
            </div>
        )
    }

    const { user: dbUser, clubLogo, registrations } = dashboardData

    // Calculate stats
    const totalRegistrations = registrations.length
    const now = new Date()
    const upcomingEvents = registrations.filter(r =>
        r.category?.tournament?.startDate && new Date(r.category.tournament.startDate) > now
    )
    const completedEvents = registrations.filter(r =>
        r.category?.tournament?.startDate && new Date(r.category.tournament.startDate) <= now
    )

    // Get next upcoming event
    const nextEvent = upcomingEvents.length > 0
        ? [...upcomingEvents].sort((a, b) => { // Create a copy before sorting
            const dateA = new Date(a.category?.tournament?.startDate || 0)
            const dateB = new Date(b.category?.tournament?.startDate || 0)
            return dateA.getTime() - dateB.getTime()
        })[0]
        : null

    // Calculate days until next event
    const daysUntilNext = nextEvent?.category?.tournament?.startDate
        ? Math.ceil((new Date(nextEvent.category.tournament.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

    const beltStyle = BELT_COLORS[dbUser.belt || ''] || BELT_COLORS['White']

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column - Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        <Trophy size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Events</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{totalRegistrations}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Upcoming</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                        <Medal size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Completed</p>
                                        <h3 className="text-2xl font-bold text-gray-900">{completedEvents.length}</h3>
                                    </div>
                                </div>
                            </div>
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
                                                <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Next Event</span>
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
                                    <h3 className="font-bold text-gray-900 mb-1">No Upcoming Events</h3>
                                    <p className="text-sm text-gray-500">Register for a tournament to get started!</p>
                                    <Link href="/tournaments" className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                                        Browse Events <ChevronRight size={14} />
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Registrations Table */}
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

                            {registrations.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="text-5xl mb-4">🏆</div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">No registrations yet</h3>
                                    <p className="text-gray-500 text-sm mb-4">Start your journey by registering for a tournament!</p>
                                    <Link
                                        href="/tournaments"
                                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                                    >
                                        Find Tournaments
                                    </Link>
                                </div>
                            ) : (
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
                                            {registrations.map((reg) => {
                                                const tournament = reg.category?.tournament
                                                const isPast = tournament?.startDate && new Date(tournament.startDate) < now

                                                return (
                                                    <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {tournament?.name || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-sm text-gray-600">
                                                                {reg.category?.name || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-sm text-gray-600">
                                                                {tournament?.startDate
                                                                    ? new Date(tournament.startDate).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })
                                                                    : '-'
                                                                }
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {isPast ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                    Completed
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                                                    Upcoming
                                                                </span>
                                                            )}
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

                    {/* Right Column - Sidebar (Sticky) */}
                    <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">

                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-5">
                                {/* Avatar */}
                                <div className="mb-4">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={dbUser.name || 'Athlete'}
                                            className="w-20 h-20 rounded-xl border border-gray-200 shadow-sm object-cover bg-white"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-red-100 to-red-200 border border-gray-200 shadow-sm flex items-center justify-center text-3xl">
                                            🥋
                                        </div>
                                    )}
                                </div>

                                {/* Name & Email */}
                                <h2 className="text-lg font-bold text-gray-900">{dbUser.name || 'Athlete'}</h2>
                                <p className="text-sm text-gray-500 truncate">{dbUser.email}</p>

                                {/* Belt Badge */}
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${beltStyle.bg} ${beltStyle.text} border ${beltStyle.border}`}>
                                        {dbUser.belt || 'No Belt'}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100 my-4" />

                                {/* Club Section */}
                                <div className="flex items-center gap-3">
                                    {clubLogo ? (
                                        <img
                                            src={clubLogo}
                                            alt={dbUser.clubName || 'Club'}
                                            className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100 p-1"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                                            🏫
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Club</p>
                                        <p className="text-sm font-semibold text-gray-900">{dbUser.clubName || 'No Club'}</p>
                                    </div>
                                </div>

                                {/* Physical Stats */}
                                {(dbUser.weight || dbUser.height) && (
                                    <>
                                        <div className="border-t border-gray-100 my-4" />
                                        <div className="grid grid-cols-2 gap-4">
                                            {dbUser.weight && (
                                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                                    <p className="text-lg font-bold text-gray-900">{dbUser.weight} kg</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">Weight</p>
                                                </div>
                                            )}
                                            {dbUser.height && (
                                                <div className="text-center p-3 bg-gray-50 rounded-xl">
                                                    <p className="text-lg font-bold text-gray-900">{dbUser.height} cm</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">Height</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Announcements */}
                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">📢</span>
                                <h3 className="font-bold text-gray-900">Announcements</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-white rounded-xl border border-gray-100">
                                    <p className="text-sm font-medium text-gray-900">Welcome to KTM!</p>
                                    <p className="text-xs text-gray-500 mt-1">Stay tuned for upcoming tournaments and updates.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </main>
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

                        {/* Announcements */}
                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">📢</span>
                                <h3 className="font-bold text-gray-900">Announcements</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="p-3 bg-white rounded-xl border border-gray-100">
                                    <Skeleton className="h-4 w-32 mb-1" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
