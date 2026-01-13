'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Home, Settings, ClipboardList, Users, Bell, Trophy } from 'lucide-react'
import { approveRegistrations, unapproveRegistration, deleteRegistration, updatePlayerDetails, bulkUnapproveRegistrations, bulkDeleteRegistrations } from '@/app/actions'
import { useRouter, useSearchParams } from 'next/navigation'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { toast } from 'sonner'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'
import SettingsView from '@/components/pwa/SettingsView'
import MembersGrid from '@/app/members/MembersGrid'
import NotificationList from '@/app/notifications/NotificationList'
import ClubHomeView from '@/components/pwa/ClubHomeView'
import PullToRefresh from '@/components/ui/PullToRefresh'
import { Suspense } from 'react'
import ClubHomeViewContainer from '@/components/pwa/ClubHomeViewContainer'
import { Skeleton } from '@/components/ui/Skeleton'
import ClubHomeSkeleton from '@/components/skeletons/ClubHomeSkeleton'

interface Player {
    id: string
    name: string
    gender: string
    belt: string | null
    weight: number | null
    height: number | null
    skillLevel: string | null
    registrationStatus: string
    category: {
        name: string
        tournament: {
            name: string
        }
    }
    user: {
        name: string | null
        email: string
    } | null
}

interface TournamentStats {
    id: string
    name: string
    startDate: Date
    athleteCount: number
    gold: number
    silver: number
    bronze: number
}

interface ClubDashboardProps {
    pendingPlayers: Player[]
    approvedPlayers: Player[]
    clubId: string
    avatars: Record<string, string>
    clubTournaments: TournamentStats[]
    clubLogo?: string | null
    clubName?: string
    clubAddress?: string | null
    clubPhone?: string | null
    userRole: string
    userData?: any
    clerkImageUrl?: string
    membersData?: any
    pagination?: any
    membersContent?: React.ReactNode
    notificationsContent?: React.ReactNode
    eventsContent?: React.ReactNode
    homeDataPromise?: Promise<any>
}

export default function ClubDashboard({
    pendingPlayers,
    approvedPlayers,
    clubId,
    avatars,
    clubTournaments,
    clubLogo,
    clubName,
    clubAddress,
    clubPhone,
    userRole,
    userData,
    clerkImageUrl,
    membersData,
    pagination,
    membersContent,
    notificationsContent,
    eventsContent,
    homeDataPromise
}: ClubDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [submitting, setSubmitting] = useState(false)
    const initialView = (searchParams.get('tab') as any) || 'home'
    const [activeView, setActiveView] = useState<'home' | 'settings' | 'members' | 'notifications' | 'tournaments'>(initialView)

    // Sync tab param (optional, for deeplinking)
    useEffect(() => {
        const url = new URL(window.location.href)
        if (activeView === 'home') url.searchParams.delete('tab')
        else url.searchParams.set('tab', activeView)
        // If members tab and using pagination, preserve page?
        // Let's just push state
        window.history.replaceState({}, '', url.toString())
    }, [activeView])

    // Realtime Updates
    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey || !clubId) return

        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)

        const channel = supabase
            .channel(`club-updates-${clubId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Player',
                    filter: `clubId=eq.${clubId}`
                },
                (payload: any) => {
                    console.log('Realtime update received:', payload)
                    router.refresh()
                    // Show toast for external changes (optional, but nice)
                    if (payload.eventType === 'INSERT') {
                        toast.info('New activity detected')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clubId, router])

    // UI States
    const [selectedTournament, setSelectedTournament] = useState<TournamentStats | null>(null)
    const [tournamentPage, setTournamentPage] = useState(1)
    const [registrationsPage, setRegistrationsPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')


    // Selection State
    const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<string>>(new Set())
    const [bulkSelectMode, setBulkSelectMode] = useState(false)
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

    // Edit Modal State
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

    // Pagination constants
    const tournamentsPerPage = 3
    const registrationsPerPage = 10

    // --- Derived Data & Helpers ---

    const allRegistrations = [...pendingPlayers, ...approvedPlayers]

    const filteredRegistrations = allRegistrations.filter(player => {
        if (activeTab === 'ALL') return true
        return player.registrationStatus === activeTab
    })

    // Registration Pagination Logic
    const totalRegistrationPages = Math.ceil(filteredRegistrations.length / registrationsPerPage)
    const currentRegistrations = filteredRegistrations.slice(
        (registrationsPage - 1) * registrationsPerPage,
        registrationsPage * registrationsPerPage
    )

    // Tournament Pagination Logic
    const totalTournamentPages = Math.ceil(clubTournaments.length / tournamentsPerPage)
    const currentTournaments = clubTournaments.slice(
        (tournamentPage - 1) * tournamentsPerPage,
        tournamentPage * tournamentsPerPage
    )

    const getPlayerAvatar = (player: Player) => {
        const clerkId = (player.user as any)?.clerkId
        return clerkId && avatars[clerkId] ? avatars[clerkId] : null
    }

    // --- Selection Handlers ---

    const toggleSelectAll = () => {
        if (selectedRegistrationIds.size === currentRegistrations.length && currentRegistrations.length > 0) {
            setSelectedRegistrationIds(new Set())
        } else {
            const newSet = new Set<string>()
            currentRegistrations.forEach(p => newSet.add(p.id))
            setSelectedRegistrationIds(newSet)
        }
    }

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row click
        const newSet = new Set(selectedRegistrationIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedRegistrationIds(newSet)
    }

    // --- Action Handlers ---

    const handleApprove = async (player: Player) => {
        setSubmitting(true)
        try {
            const result = await approveRegistrations([{ id: player.id, skillLevel: player.skillLevel || 'Novice' }])
            if (result.error) toast.error(result.error)
            else {
                toast.success('Registration approved')
                router.refresh()
            }
        } catch {
            toast.error('Failed to approve')
        } finally {
            setSubmitting(false)
        }
    }

    const handleUnapprove = async (id: string) => {
        setSubmitting(true)
        try {
            await unapproveRegistration(id)
            toast.success('Registration unapproved')
            router.refresh()
        } catch {
            toast.error('Failed to unapprove')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this registration?')) return
        setSubmitting(true)
        try {
            await deleteRegistration(id)
            toast.success('Registration deleted')
            router.refresh()
        } catch {
            toast.error('Failed to delete')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSaveEdit = async (data: { height?: number, weight?: number, belt?: string, skillLevel?: string }) => {
        if (!editingPlayer) return
        setSubmitting(true)
        try {
            await updatePlayerDetails({ playerId: editingPlayer.id, ...data })
            setEditingPlayer(null)
            router.refresh()
            toast.success('Player details updated')
        } catch {
            toast.error('Failed to update details')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkApprove = async () => {
        const ids = Array.from(selectedRegistrationIds)
        if (ids.length === 0) return

        setSubmitting(true)
        try {
            // Map IDs to objects with default skill level
            const playersToApprove = ids.map(id => ({ id, skillLevel: 'Novice' }))
            const result = await approveRegistrations(playersToApprove)
            if (result.error) toast.error(result.error)
            else {
                toast.success(`Approved ${ids.length} registrations`)
                setSelectedRegistrationIds(new Set())
                router.refresh()
            }
        } catch {
            toast.error('Failed to bulk approve')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkUnapprove = async () => {
        const ids = Array.from(selectedRegistrationIds)
        if (ids.length === 0) return
        if (!confirm(`Unapprove ${ids.length} registrations?`)) return

        setSubmitting(true)
        try {
            await bulkUnapproveRegistrations(ids)
            toast.success(`Unapproved ${ids.length} registrations`)
            setSelectedRegistrationIds(new Set())
            router.refresh()
        } catch {
            toast.error('Failed to bulk unapprove')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedRegistrationIds)
        if (ids.length === 0) return
        if (!confirm(`Delete ${ids.length} registrations?`)) return

        setSubmitting(true)
        try {
            await bulkDeleteRegistrations(ids)
            toast.success(`Deleted ${ids.length} registrations`)
            setSelectedRegistrationIds(new Set())
            router.refresh()
        } catch {
            toast.error('Failed to bulk delete')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="sm:pb-0 min-h-[calc(100vh-64px)]">
            {activeView === 'home' && (
                <>
                    {/* Mobile Home View - Uses ClubHomeView component */}
                    <div className="sm:hidden">
                        {homeDataPromise ? (
                            <PullToRefresh className="min-h-[85vh]" mode="overlay">
                                <Suspense fallback={
                                    <ClubHomeSkeleton
                                        clubName={clubName}
                                        clubMasterName={userData?.name || ''}
                                        clubLogo={clubLogo}
                                        clubAddress={clubAddress}
                                    />
                                }>
                                    <ClubHomeViewContainer
                                        dataPromise={homeDataPromise}
                                        clubName={clubName}
                                        clubMasterName={userData?.name || ''}
                                        clubLogo={clubLogo}
                                        clubAddress={clubAddress}
                                        onNavigateToMembers={() => setActiveView('members')}
                                        onNavigateToTournaments={() => {
                                            setActiveView('tournaments')
                                            setActiveTab('PENDING')
                                        }}
                                        onApprove={async (playerId) => {
                                            setSubmitting(true)
                                            try {
                                                const result = await approveRegistrations([{ id: playerId, skillLevel: 'Novice' }])
                                                if (result.error) toast.error(result.error)
                                                else {
                                                    toast.success('Registration approved')
                                                    router.refresh()
                                                }
                                            } catch {
                                                toast.error('Failed to approve')
                                            } finally {
                                                setSubmitting(false)
                                            }
                                        }}
                                    />
                                </Suspense>
                            </PullToRefresh>
                        ) : (
                            <ClubHomeView
                                clubName={clubName}
                                clubMasterName={userData?.name || ''}
                                clubLogo={clubLogo}
                                clubAddress={clubAddress}
                                totalMembers={membersData?.paginatedMembers?.length || 0}
                                totalMedals={{
                                    gold: clubTournaments.reduce((sum, t) => sum + t.gold, 0),
                                    silver: clubTournaments.reduce((sum, t) => sum + t.silver, 0),
                                    bronze: clubTournaments.reduce((sum, t) => sum + t.bronze, 0)
                                }}
                                pendingPlayers={pendingPlayers}
                                upcomingTournaments={clubTournaments.filter(t => new Date(t.startDate) > new Date())}
                                onNavigateToMembers={() => setActiveView('members')}
                                onNavigateToTournaments={() => {
                                    setActiveView('tournaments')
                                    setActiveTab('PENDING')
                                }}
                                onApprove={async (playerId) => {
                                    setSubmitting(true)
                                    try {
                                        // Default to Novice for quick approve
                                        const result = await approveRegistrations([{ id: playerId, skillLevel: 'Novice' }])
                                        if (result.error) toast.error(result.error)
                                        else {
                                            toast.success('Registration approved')
                                            router.refresh()
                                        }
                                    } catch {
                                        toast.error('Failed to approve')
                                    } finally {
                                        setSubmitting(false)
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Desktop Home View - Full dashboard */}
                    <div className="hidden sm:block space-y-8 sm:space-y-12 relative animate-in fade-in duration-300">

                        {/* Header / Settings Button - Desktop Only */}
                        <div className="hidden sm:flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {clubLogo && (
                                    <div className="w-16 h-16 rounded-xl border border-gray-200 p-1 bg-white shadow-sm">
                                        <img src={clubLogo} alt="Club Logo" className="w-full h-full object-contain rounded-lg" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Club Dashboard</h1>
                                    <p className="text-gray-500">Manage your club, tournaments, and athletes</p>
                                </div>
                            </div>
                            {userRole === 'CLUB_MASTER' && (
                                <ClubSettingsButton
                                    clubId={clubId}
                                    clubLogo={clubLogo}
                                    address={clubAddress}
                                    phone={clubPhone}
                                    buttonText="Club Settings"
                                />
                            )}
                        </div>

                        {/* 🏆 My Tournaments Section */}
                        <section>
                            <div className="flex items-center justify-between mb-4 sm:mb-6">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Tournaments</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                        {clubTournaments.length}
                                    </span>
                                </div>
                            </div>

                            {clubTournaments.length === 0 ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center text-gray-500">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl sm:text-3xl">🏆</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">No Tournament History</h3>
                                    <p className="text-gray-500 mt-1 text-sm">Join upcoming tournaments to start!</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="sm:hidden space-y-3">
                                        {currentTournaments.map(tournament => {
                                            const isUpcoming = new Date(tournament.startDate) > new Date()
                                            return (
                                                <div
                                                    key={tournament.id}
                                                    onClick={() => setSelectedTournament(tournament)}
                                                    className="bg-white rounded-xl border border-gray-200 p-4 active:scale-[0.98] transition-transform"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-gray-900 truncate">{tournament.name}</h3>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {new Date(tournament.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${isUpcoming ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {isUpcoming ? 'Upcoming' : 'Done'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex items-center gap-1 text-sm">🥇 {tournament.gold}</span>
                                                            <span className="flex items-center gap-1 text-sm">🥈 {tournament.silver}</span>
                                                            <span className="flex items-center gap-1 text-sm">🥉 {tournament.bronze}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{tournament.athleteCount} athletes</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Desktop Table */}
                                    <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Athletes</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-50">
                                                    {currentTournaments.map(tournament => {
                                                        const isUpcoming = new Date(tournament.startDate) > new Date()
                                                        return (
                                                            <tr
                                                                key={tournament.id}
                                                                onClick={() => setSelectedTournament(tournament)}
                                                                className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                                            >
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                                            {tournament.name}
                                                                        </span>
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium w-fit mt-1 border ${isUpcoming
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                                                            }`}>
                                                                            {isUpcoming ? 'Upcoming' : 'Completed'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-500">
                                                                        {new Date(tournament.startDate).toLocaleDateString(undefined, {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <div className="flex items-center gap-1" title="Gold">
                                                                            <span className="text-lg">🥇</span>
                                                                            <span className="font-semibold text-gray-700">{tournament.gold}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1" title="Silver">
                                                                            <span className="text-lg">🥈</span>
                                                                            <span className="font-semibold text-gray-700">{tournament.silver}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1" title="Bronze">
                                                                            <span className="text-lg">🥉</span>
                                                                            <span className="font-semibold text-gray-700">{tournament.bronze}</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                        {tournament.athleteCount}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <span className="text-indigo-600 hover:text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        View Stats →
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Tournament Pagination Controls */}
                            {totalTournamentPages > 1 && (
                                <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 rounded-b-2xl -mt-6 mb-12 border-x border-b border-gray-200">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setTournamentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={tournamentPage === 1}
                                            className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setTournamentPage(prev => Math.min(prev + 1, totalTournamentPages))}
                                            disabled={tournamentPage === totalTournamentPages}
                                            className="relative ml-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(tournamentPage - 1) * tournamentsPerPage + 1}</span> to <span className="font-medium">{Math.min(tournamentPage * tournamentsPerPage, clubTournaments.length)}</span> of <span className="font-medium">{clubTournaments.length}</span> results
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTournamentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={tournamentPage === 1}
                                                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setTournamentPage(prev => Math.min(prev + 1, totalTournamentPages))}
                                                disabled={tournamentPage === totalTournamentPages}
                                                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* 📋 Registrations Section */}
                        <section>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Registrations</h2>
                                    <p className="hidden sm:block text-gray-500 text-sm mt-1">Manage pending approvals and view all registered athletes.</p>
                                </div>

                                {/* Status Filters */}
                                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                    {/* Bulk Actions Overlay (Desktop only) */}
                                    {selectedRegistrationIds.size > 0 && (
                                        <div className="hidden sm:flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                            <span className="text-sm font-medium text-gray-600 mr-2">{selectedRegistrationIds.size} selected</span>
                                            <button
                                                onClick={handleBulkApprove}
                                                disabled={submitting}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={handleBulkUnapprove}
                                                disabled={submitting}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                                            >
                                                Unapprove
                                            </button>
                                            <button
                                                onClick={handleBulkDelete}
                                                disabled={submitting}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex p-1 bg-gray-100 rounded-xl">
                                        {(['ALL', 'PENDING', 'APPROVED'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setActiveTab(tab)
                                                    setRegistrationsPage(1)
                                                    setSelectedRegistrationIds(new Set())
                                                }}
                                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${activeTab === tab
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {currentRegistrations.length === 0 ? (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p className="text-gray-500">No registrations found.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="sm:hidden space-y-3">
                                        {currentRegistrations.map(player => {
                                            const avatar = getPlayerAvatar(player)
                                            const isPending = player.registrationStatus === 'PENDING'
                                            return (
                                                <div
                                                    key={player.id}
                                                    className="bg-white rounded-xl border border-gray-200 p-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {avatar ? (
                                                            <img src={avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                                {player.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <h3 className="font-semibold text-gray-900 text-sm">{player.name}</h3>
                                                                    <p className="text-xs text-gray-500 truncate">{player.category.tournament.name}</p>
                                                                </div>
                                                                {isPending ? (
                                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-50 text-yellow-700">
                                                                        <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse" />
                                                                        Pending
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                                                                        ✓
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                                <span>{player.category.name}</span>
                                                                <span>•</span>
                                                                <span>{player.belt || 'N/A'}</span>
                                                                <span>•</span>
                                                                <span>{player.weight ? `${player.weight}kg` : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                                        {isPending ? (
                                                            <button
                                                                onClick={() => handleApprove(player)}
                                                                disabled={submitting}
                                                                className="flex-1 text-xs font-medium bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUnapprove(player.id)}
                                                                disabled={submitting}
                                                                className="flex-1 text-xs font-medium bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                                            >
                                                                Unapprove
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setEditingPlayer(player)}
                                                            className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(player.id)}
                                                            disabled={submitting}
                                                            className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Desktop Table */}
                                    <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left">
                                                            <input
                                                                type="checkbox"
                                                                checked={currentRegistrations.length > 0 && selectedRegistrationIds.size === currentRegistrations.length}
                                                                onChange={toggleSelectAll}
                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Competing In</th>
                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-50">
                                                    {currentRegistrations.map(player => {
                                                        const avatar = getPlayerAvatar(player)
                                                        const isPending = player.registrationStatus === 'PENDING'
                                                        return (
                                                            <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedRegistrationIds.has(player.id)}
                                                                            // @ts-ignore
                                                                            onChange={(e) => toggleSelect(player.id, e)}
                                                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div
                                                                        className="flex items-center gap-3 cursor-pointer group"
                                                                        onClick={() => setEditingPlayer(player)}
                                                                    >
                                                                        {avatar ? (
                                                                            <img src={avatar} alt={player.name} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                                                        ) : (
                                                                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold border border-indigo-100">
                                                                                {player.name.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                                                {player.name}
                                                                            </span>
                                                                            <p className="text-xs text-gray-400 group-hover:text-indigo-400">Click to edit</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-medium text-gray-900">{player.category.tournament.name}</div>
                                                                    <div className="text-xs text-gray-500">{player.category.name}</div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex flex-col text-xs text-gray-500">
                                                                        <span>Belt: <span className="font-medium text-gray-700">{player.belt || 'N/A'}</span></span>
                                                                        <span>Weight: <span className="font-medium text-gray-700">{player.weight ? `${player.weight}kg` : 'N/A'}</span></span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                                    {isPending ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                                                            Pending
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                            Approved
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {isPending ? (
                                                                            <button
                                                                                onClick={() => handleApprove(player)}
                                                                                disabled={submitting}
                                                                                className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleUnapprove(player.id)}
                                                                                disabled={submitting}
                                                                                className="text-xs font-medium bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                                            >
                                                                                Unapprove
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDelete(player.id)}
                                                                            disabled={submitting}
                                                                            className="text-xs font-medium bg-white border border-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Registration Pagination Controls */}
                            {totalRegistrationPages > 1 && (
                                <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 rounded-b-2xl -mt-6 mb-12 border-x border-b border-gray-200">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setRegistrationsPage(prev => Math.max(prev - 1, 1))}
                                            disabled={registrationsPage === 1}
                                            className="relative inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setRegistrationsPage(prev => Math.min(prev + 1, totalRegistrationPages))}
                                            disabled={registrationsPage === totalRegistrationPages}
                                            className="relative ml-3 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{(registrationsPage - 1) * registrationsPerPage + 1}</span> to <span className="font-medium">{Math.min(registrationsPage * registrationsPerPage, filteredRegistrations.length)}</span> of <span className="font-medium">{filteredRegistrations.length}</span> results
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setRegistrationsPage(prev => Math.max(prev - 1, 1))}
                                                disabled={registrationsPage === 1}
                                                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setRegistrationsPage(prev => Math.min(prev + 1, totalRegistrationPages))}
                                                disabled={registrationsPage === totalRegistrationPages}
                                                className="relative inline-flex items-center rounded-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Modals moved to global scope */}

                    </div>
                </>
            )}
            {
                activeView === 'members' && (
                    <div className="bg-gray-50 min-h-full pb-24">
                        {membersContent ? (
                            <PullToRefresh className="min-h-[85vh]" mode="overlay">
                                {membersContent}
                            </PullToRefresh>
                        ) : (membersData && (
                            <>
                                {/* Header */}
                                <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                                    <h1 className="text-xl font-bold text-gray-900">Club Members</h1>
                                    <p className="text-sm text-gray-500 mt-0.5">{membersData.totalMembers || 0} registered members</p>
                                </div>

                                {/* Members List */}
                                <PullToRefresh className="min-h-[85vh]" mode="overlay">
                                    <MembersGrid
                                        members={membersData.paginatedMembers}
                                        avatars={avatars}
                                        currentPage={pagination.currentPage}
                                        totalPages={pagination.totalPages}
                                        isClubMaster={true}
                                        baseUrl="/club"
                                    />
                                </PullToRefresh>
                            </>
                        ))}
                    </div>
                )
            }

            {
                activeView === 'notifications' && (
                    <div className="bg-gray-50 min-h-full pb-24">
                        {notificationsContent ? (
                            <PullToRefresh className="min-h-[85vh]" mode="overlay">
                                {notificationsContent}
                            </PullToRefresh>
                        ) : (
                            <>
                                <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                                    <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                                </div>
                                <PullToRefresh className="min-h-[85vh]" mode="overlay">
                                    <NotificationList userId={userData.id} />
                                </PullToRefresh>
                            </>
                        )}
                    </div>
                )
            }

            {
                activeView === 'settings' && userData && (
                    <SettingsView
                        dbUser={userData}
                        clerkImageUrl={clerkImageUrl}
                        club={{
                            id: clubId,
                            name: clubName || '',
                            logoUrl: clubLogo || null,
                            address: clubAddress || null,
                            phone: clubPhone || null
                        }}
                    />
                )
            }

            {activeView === 'tournaments' && (
                <div className="bg-gray-50 min-h-full pb-24">
                    {eventsContent ? (
                        <PullToRefresh className="min-h-[85vh]" mode="overlay">
                            {eventsContent}
                        </PullToRefresh>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="bg-white px-4 py-5 sticky top-0 z-10 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h1 className="text-lg font-bold text-gray-900">Event Registrations</h1>
                                        <p className="text-xs text-gray-500 mt-0.5">Manage your athletes</p>
                                    </div>
                                    {/* Stats badges */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-xs font-semibold text-green-700">{approvedPlayers.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 border border-yellow-100">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                            <span className="text-xs font-semibold text-yellow-700">{pendingPlayers.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Tabs with Select button */}
                                <div className="flex gap-1">
                                    <div className="flex flex-1 p-1 bg-gray-100 rounded-xl">
                                        {(['ALL', 'PENDING', 'APPROVED'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setActiveTab(tab)
                                                    setRegistrationsPage(1)
                                                    setSelectedRegistrationIds(new Set())
                                                }}
                                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab
                                                    ? 'bg-white text-gray-900 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {tab === 'ALL' ? `All ${allRegistrations.length}` :
                                                    tab === 'PENDING' ? `Pending ${pendingPlayers.length}` :
                                                        `Done ${approvedPlayers.length}`}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setBulkSelectMode(!bulkSelectMode)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${bulkSelectMode
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {bulkSelectMode ? 'Done' : 'Select'}
                                    </button>
                                </div>
                            </div>

                            <PullToRefresh className="min-h-[85vh]" mode="overlay">

                                {/* Player List */}
                                {currentRegistrations.length === 0 ? (
                                    <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                                        <p className="text-4xl mb-4">📋</p>
                                        <p className="text-gray-900 font-medium mb-1">No registrations found</p>
                                        <p className="text-gray-500 text-sm">Athletes will appear here once registered</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 bg-white">
                                        {currentRegistrations.map((player, index) => {
                                            const avatar = getPlayerAvatar(player)
                                            const isPending = player.registrationStatus === 'PENDING'
                                            const isSelected = selectedRegistrationIds.has(player.id)
                                            // check if it's one of the last 2 items to flip the menu
                                            const isLastItems = index >= currentRegistrations.length - 2
                                            return (
                                                <div
                                                    key={player.id}
                                                    className={`px-4 py-3 flex items-center gap-3 ${isSelected ? 'bg-indigo-50' : ''}`}
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {/* Selection Checkbox - Only show in bulk mode */}
                                                        {bulkSelectMode && (
                                                            <button
                                                                onClick={(e) => toggleSelect(player.id, e)}
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                    : 'border-gray-300 hover:border-indigo-400'
                                                                    }`}
                                                            >
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}

                                                        {/* Avatar */}
                                                        {avatar ? (
                                                            <img src={avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                                                {player.name.charAt(0)}
                                                            </div>
                                                        )}

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-gray-900 text-sm truncate">{player.name}</h3>
                                                                {isPending ? (
                                                                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700">
                                                                        PENDING
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                                                                        APPROVED
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">{player.category.name} • {player.category.tournament.name}</p>
                                                        </div>
                                                    </div>

                                                    {/* Three-dot menu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setActionMenuOpen(actionMenuOpen === player.id ? null : player.id)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>

                                                        {/* Dropdown Menu */}
                                                        {actionMenuOpen === player.id && (
                                                            <>
                                                                {/* Backdrop */}
                                                                <div
                                                                    className="fixed inset-0 z-40"
                                                                    onClick={() => setActionMenuOpen(null)}
                                                                />
                                                                {/* Menu */}
                                                                <div className={`absolute right-0 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 ${isLastItems ? 'bottom-8' : 'top-8'}`}>
                                                                    {isPending ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleApprove(player)
                                                                                setActionMenuOpen(null)
                                                                            }}
                                                                            disabled={submitting}
                                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 flex items-center gap-2"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                            Approve
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleUnapprove(player.id)
                                                                                setActionMenuOpen(null)
                                                                            }}
                                                                            disabled={submitting}
                                                                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-yellow-600 hover:bg-yellow-50 disabled:opacity-50 flex items-center gap-2"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                            </svg>
                                                                            Unapprove
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingPlayer(player)
                                                                            setActionMenuOpen(null)
                                                                        }}
                                                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                        </svg>
                                                                        Edit
                                                                    </button>
                                                                    <div className="border-t border-gray-100 my-1" />
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDelete(player.id)
                                                                            setActionMenuOpen(null)
                                                                        }}
                                                                        disabled={submitting}
                                                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Pagination */}
                                {totalRegistrationPages > 1 && (
                                    <div className="px-4 pb-4 flex justify-between">
                                        <button
                                            onClick={() => setRegistrationsPage(prev => Math.max(prev - 1, 1))}
                                            disabled={registrationsPage === 1}
                                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-500 py-2">
                                            {registrationsPage} / {totalRegistrationPages}
                                        </span>
                                        <button
                                            onClick={() => setRegistrationsPage(prev => Math.min(prev + 1, totalRegistrationPages))}
                                            disabled={registrationsPage === totalRegistrationPages}
                                            className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}

                                {/* Floating Bulk Action Bar - appears when items selected */}
                                {bulkSelectMode && (
                                    <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white rounded-2xl shadow-xl p-3 z-40 animate-in slide-in-from-bottom-4 duration-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{selectedRegistrationIds.size} selected</span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRegistrationIds(new Set())
                                                        setBulkSelectMode(false)
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-white"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleBulkApprove}
                                                    disabled={submitting || selectedRegistrationIds.size === 0}
                                                    className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={handleBulkUnapprove}
                                                    disabled={submitting || selectedRegistrationIds.size === 0}
                                                    className="px-3 py-1.5 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 rounded-lg disabled:opacity-50"
                                                >
                                                    Unapprove
                                                </button>
                                                <button
                                                    onClick={handleBulkDelete}
                                                    disabled={submitting || selectedRegistrationIds.size === 0}
                                                    className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </PullToRefresh>

                            {/* Floating Add Button - hide when in bulk mode */}
                            {!bulkSelectMode && (
                                <button
                                    onClick={() => {
                                        toast.info('Add athlete feature coming soon')
                                    }}
                                    className="fixed bottom-24 right-4 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-40"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Bottom Navigation - Mobile Only */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 sm:hidden">
                <nav className="flex items-center justify-around h-16 relative">
                    {/* Members */}
                    <button
                        onClick={() => setActiveView('members')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeView === 'members' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Users size={22} strokeWidth={activeView === 'members' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Members</span>
                    </button>

                    {/* Tournaments */}
                    <button
                        onClick={() => setActiveView('tournaments')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeView === 'tournaments' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Trophy size={22} strokeWidth={activeView === 'tournaments' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </button>

                    {/* Center Home Button - Floating Circle */}
                    <button
                        onClick={() => setActiveView('home')}
                        className={`flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg transition-all active:scale-95 ${activeView === 'home'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Home size={26} strokeWidth={2.5} />
                    </button>

                    {/* Notifications */}
                    <button
                        onClick={() => setActiveView('notifications')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 relative ${activeView === 'notifications' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Bell size={22} strokeWidth={activeView === 'notifications' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Alerts</span>
                    </button>

                    {/* Settings (Right) */}
                    <button
                        onClick={() => setActiveView('settings')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeView === 'settings' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Settings size={22} strokeWidth={activeView === 'settings' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Settings</span>
                    </button>
                </nav>
            </div>

            {/* ✏️ Edit Player Modal */}
            {editingPlayer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingPlayer(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Edit Player Details</h3>
                                <p className="text-gray-500 text-sm mt-1">{editingPlayer.name}</p>
                            </div>
                            <button
                                onClick={() => setEditingPlayer(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                handleSaveEdit({
                                    weight: Number(formData.get('weight')),
                                    height: Number(formData.get('height')),
                                    belt: formData.get('belt') as string,
                                    skillLevel: formData.get('skillLevel') as string
                                })
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <CustomSelect
                                    label="Belt Rank"
                                    value={editingPlayer.belt || 'White'}
                                    onChange={(val) => {
                                        setEditingPlayer({ ...editingPlayer, belt: val })
                                    }}
                                    options={['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']}
                                    className="w-full"
                                />
                                <input type="hidden" name="belt" value={editingPlayer.belt || 'White'} />
                            </div>

                            <div>
                                <CustomSelect
                                    label="Skill Level"
                                    value={editingPlayer.skillLevel || 'Novice'}
                                    onChange={(val) => {
                                        setEditingPlayer({ ...editingPlayer, skillLevel: val })
                                    }}
                                    options={['Novice', 'Advance']}
                                    className="w-full"
                                />
                                <input type="hidden" name="skillLevel" value={editingPlayer.skillLevel || 'Novice'} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        name="weight"
                                        step="0.1"
                                        defaultValue={editingPlayer.weight || ''}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                                    <input
                                        type="number"
                                        name="height"
                                        defaultValue={editingPlayer.height || ''}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setEditingPlayer(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Saving...</span>
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Modal (Torunament Details) */}
            {selectedTournament && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTournament(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedTournament.name}</h3>
                                <p className="text-gray-500 text-sm mt-1">Tournament Statistics</p>
                            </div>
                            <button
                                onClick={() => setSelectedTournament(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {/* Medal Row */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="text-center p-3 rounded-xl bg-yellow-50 border border-yellow-100/50">
                                    <div className="text-3xl mb-1">🥇</div>
                                    <div className="font-bold text-gray-900 text-xl">{selectedTournament.gold}</div>
                                    <div className="text-xs text-yellow-700/70 font-bold uppercase tracking-wide">Gold</div>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="text-3xl mb-1">🥈</div>
                                    <div className="font-bold text-gray-900 text-xl">{selectedTournament.silver}</div>
                                    <div className="text-xs text-gray-500/70 font-bold uppercase tracking-wide">Silver</div>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-orange-50 border border-orange-100/50">
                                    <div className="text-3xl mb-1">🥉</div>
                                    <div className="font-bold text-gray-900 text-xl">{selectedTournament.bronze}</div>
                                    <div className="text-xs text-orange-700/70 font-bold uppercase tracking-wide">Bronze</div>
                                </div>
                            </div>

                            {/* Footer Stats */}
                            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                                <span className="text-gray-500 font-medium">Total Athletes Entered</span>
                                <span className="text-lg font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                                    {selectedTournament.athleteCount}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div >
    )
}
