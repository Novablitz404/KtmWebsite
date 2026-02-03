'use client'

import { useState, useEffect, use } from 'react'
import { Upload, X, Home, Settings, ClipboardList, Users, Bell, Trophy, Medal, Clock, Search, Calendar, Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { approveRegistrations, unapproveRegistration, deleteRegistration, updatePlayerDetails, bulkUnapproveRegistrations, bulkDeleteRegistrations, fetchClubDashboardData, removeMemberFromClub, updateClubMember, getClubSmartProposals } from '@/app/actions'
import { updateRegistrationStatus } from '@/app/promotions/actions'
import { approveSeminarRegistration, unapproveSeminarRegistration, deleteSeminarRegistration, updateSeminarRegistrationStatus, updateSeminarParticipantDetails } from '@/app/seminars/actions'

import CustomSelect from '@/app/components/ui/CustomSelect'
import { toast } from 'sonner'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'

import MembersGrid from '@/app/members/MembersGrid'
import NotificationList from '@/app/notifications/NotificationList'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ClubSidebar from '@/components/club/ClubSidebar'
import ClubTopBar from '@/components/club/ClubTopBar'
import ClubScheduleWidget from '@/components/club/ClubScheduleWidget'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import ClubEventBrowser from './ClubEventBrowser'
import AddAthleteModal from '@/components/club/AddAthleteModal'
import CreateMemberModal from '@/components/club/CreateMemberModal'
import ClubActionCenterModal from './ClubActionCenter'

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
    teamId?: string | null
    poomsaeType?: string | null
}

interface Member {
    id: string
    name: string | null
    email: string
    clerkId: string
    gender: string | null
    weight: number | null
    belt: string | null
    birthDate: Date | null
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

interface PromotionRegistration {
    id: string
    name: string
    clerkId: string
    email: string | null
    status: string
    currentBelt: string | null
    targetBelt: string | null
    eventName: string
    eventDate: Date
}

interface SeminarRegistration {
    id: string
    name: string
    status: string
    paymentStatus: string // "UNPAID", "PAID"
    belt: string | null
    eventName: string
    eventDate: Date
    imageUrl?: string | null
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
    settingsContent?: React.ReactNode
    homeDataPromise?: Promise<any>
}

export default function ClubDashboard({
    pendingPlayers: propPendingPlayers,
    approvedPlayers,
    clubId,
    avatars,
    clubTournaments: propClubTournaments,
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
    settingsContent,
    homeDataPromise
}: ClubDashboardProps) {
    // const initialStreamedData = homeDataPromise ? use(homeDataPromise) : null
    const queryClient = useQueryClient()

    const { data: streamedData, isLoading } = useQuery({
        queryKey: ['club-home', clubId],
        queryFn: () => fetchClubDashboardData(clubId, clubName || ''),
        // initialData: initialStreamedData,
        staleTime: 1000 * 60 // 1 minute
    })


    // Helper to filter upcoming
    const isUpcoming = (p: Player) => {
        // Assume tournament is populated. Access safely.
        // The data fetched in data.ts includes tournament.startDate
        const date = (p.category?.tournament as any)?.startDate
        if (!date) return true // Default to true if missing to avoid hiding unknown
        return new Date(date) > new Date()
    }

    const rawPending = (streamedData ? streamedData.pendingPlayers : propPendingPlayers) as Player[]
    const rawApproved = (streamedData ? streamedData.approvedPlayers : approvedPlayers) as Player[] // Handle prop fallback if needed

    const pendingPlayers = rawPending.filter(isUpcoming)
    const filteredApprovedPlayers = (rawApproved || []).filter(isUpcoming)

    const clubTournaments = (streamedData ? streamedData.clubTournaments : propClubTournaments) as TournamentStats[]
    const upcomingEvents = (streamedData ? (streamedData as any).upcomingEvents : []) as Array<{ id: string, name: string, startDate: string, type: 'TOURNAMENT' | 'SEMINAR' | 'PROMOTION', athleteCount: number }>
    const totalMembers = streamedData ? streamedData.totalMembers : (membersData?.paginatedMembers?.length || 0)
    const topPerformers = streamedData ? (streamedData as any).topPerformers : []

    // Calculate totals
    const totalMedals = clubTournaments.reduce((sum, t) => sum + (t.gold + t.silver + t.bronze), 0)

    // Next Event Logic
    const nextEvent = upcomingEvents[0]

    const daysUntil = nextEvent
        ? Math.ceil((new Date(nextEvent.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0


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
                    // router.refresh() // Deprecated for TanStack Query
                    queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
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
    const [registrationType, setRegistrationType] = useState<'TOURNAMENT' | 'PROMOTION' | 'SEMINAR'>('TOURNAMENT')
    const [isAddAthleteOpen, setIsAddAthleteOpen] = useState(false)
    const [isCreateMemberOpen, setIsCreateMemberOpen] = useState(false)
    const [registrationSearchQuery, setRegistrationSearchQuery] = useState('')


    // Selection State
    const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<string>>(new Set())

    const [bulkSelectMode, setBulkSelectMode] = useState(false)
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

    // Edit Modal State
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
    const [editingMember, setEditingMember] = useState<Member | null>(null)
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
    // Action Center Data
    const { data: proposals, refetch: refetchProposals } = useQuery({
        queryKey: ['club-smart-proposals', clubId],
        queryFn: () => getClubSmartProposals(clubId),
        staleTime: 1000 * 30 // 30 seconds
    })

    const [isActionModalOpen, setIsActionModalOpen] = useState(false)
    const alertCount = proposals?.filter((p: any) => !p.myVote).length || 0

    const [isEventBrowserOpen, setIsEventBrowserOpen] = useState(false)

    // URL Search Support for Members
    const pathname = usePathname()

    const handleMembersSearch = (term: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (term) {
            params.set('search', term)
        } else {
            params.delete('search')
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    // Loading state is now handled inline within the views


    // Pagination constants
    const tournamentsPerPage = 3
    const registrationsPerPage = 10

    // --- Derived Data & Helpers ---

    const allRegistrations = [...pendingPlayers, ...filteredApprovedPlayers]

    const filteredRegistrations = allRegistrations.filter(player => {
        const matchesTab = activeTab === 'ALL' || player.registrationStatus === activeTab
        if (!matchesTab) return false

        if (!registrationSearchQuery) return true
        const q = registrationSearchQuery.toLowerCase()
        return (
            player.name.toLowerCase().includes(q) ||
            player.category?.tournament.name.toLowerCase().includes(q) ||
            player.category?.name.toLowerCase().includes(q)
        )
    })

    // Registration Pagination Logic (Tournaments)
    const totalRegistrationPages = Math.ceil(filteredRegistrations.length / registrationsPerPage)
    const currentRegistrations = filteredRegistrations.slice(
        (registrationsPage - 1) * registrationsPerPage,
        registrationsPage * registrationsPerPage
    )

    // Promotion Logic
    const rawPromotions = ((streamedData as any)?.promotionRegistrations || []) as PromotionRegistration[]
    const filteredPromotions = rawPromotions.filter(p => {
        // Status Filter
        const statusMatch = activeTab === 'ALL' ? true :
            activeTab === 'PENDING' ? p.status === 'PENDING' :
                p.status === 'APPROVED' // Adjust based on DB values

        // Search Filter
        const searchMatch = !registrationSearchQuery ||
            p.name.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
            p.eventName.toLowerCase().includes(registrationSearchQuery.toLowerCase())

        return statusMatch && searchMatch
    })

    const totalPromotionPages = Math.ceil(filteredPromotions.length / registrationsPerPage)
    const currentPromotions = filteredPromotions.slice(
        (registrationsPage - 1) * registrationsPerPage,
        registrationsPage * registrationsPerPage
    )

    // Seminar Logic
    const rawSeminars = ((streamedData as any)?.seminarRegistrations || []) as SeminarRegistration[]
    const filteredSeminars = rawSeminars.filter(p => {
        // Status Filter
        const statusMatch = activeTab === 'ALL' ? true :
            activeTab === 'PENDING' ? p.status === 'PENDING' :
                p.status === 'APPROVED'

        // Search Filter
        const searchMatch = !registrationSearchQuery ||
            p.name.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
            p.eventName.toLowerCase().includes(registrationSearchQuery.toLowerCase())

        return statusMatch && searchMatch
    })

    const totalSeminarPages = Math.ceil(filteredSeminars.length / registrationsPerPage)
    const currentSeminars = filteredSeminars.slice(
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
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
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
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
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
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
        } catch {
            toast.error('Failed to delete')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSaveEdit = async (data: { name?: string, height?: number, weight?: number, belt?: string, skillLevel?: string, teamId?: string, poomsaeType?: string }) => {
        if (!editingPlayer) return
        setSubmitting(true)
        try {
            await updatePlayerDetails({ playerId: editingPlayer.id, ...data })
            setEditingPlayer(null)
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
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
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
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
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
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
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
        } catch {
            toast.error('Failed to bulk delete')
        } finally {
            setSubmitting(false)
        }
    }

    const handleMemberDelete = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member from the club? This action cannot be undone.')) return
        setSubmitting(true)
        try {
            const res = await removeMemberFromClub(memberId)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Member removed')
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            }
        } catch {
            toast.error('Failed to remove member')
        } finally {
            setSubmitting(false)
        }
    }

    const handleMemberSave = async (data: any) => {
        if (!editingMember) return
        setSubmitting(true)
        try {
            const res = await updateClubMember(editingMember.id, data)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Member updated')
                setEditingMember(null)
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName || ''] })
            }
        } catch {
            toast.error('Failed to update member')
        } finally {
            setSubmitting(false)
        }
    }

    const handlePromotionStatusChange = async (registrationId: string, newStatus: string) => {
        setSubmitting(true)
        try {
            const res = await updateRegistrationStatus(registrationId, newStatus)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Registration ${newStatus.toLowerCase()}`)
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            }
        } catch {
            toast.error('Failed to update status')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSeminarStatusChange = async (registrationId: string, newStatus: string) => {
        setSubmitting(true)
        try {
            const res = await updateSeminarRegistrationStatus(registrationId, newStatus)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Registration ${newStatus.toLowerCase()}`)
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            }
        } catch {
            toast.error('Failed to update status')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSeminarDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this registration?')) return
        setSubmitting(true)
        try {
            await deleteSeminarRegistration([id])
            toast.success('Registration deleted')
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
        } catch {
            toast.error('Failed to delete')
        } finally {
            setSubmitting(false)
        }
    }

    const [editingSeminar, setEditingSeminar] = useState<SeminarRegistration | null>(null)

    const handleSeminarSave = async (data: { name: string, belt: string }) => {
        if (!editingSeminar) return
        setSubmitting(true)
        try {
            const res = await updateSeminarParticipantDetails(editingSeminar.id, data)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Participant details updated')
                setEditingSeminar(null)
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            }
        } catch {
            toast.error('Failed to update details')
        } finally {
            setSubmitting(false)
        }
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen md:h-screen bg-gray-50 md:overflow-hidden">
            {/* Sidebar - Responsive */}
            <ClubSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                clubLogo={clubLogo}
                clubName={clubName}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 md:ml-60 flex flex-col h-full overflow-hidden">
                {/* Mobile Header (Sticky) */}
                <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>



                    <div className="flex items-center gap-3">
                        {/* Profile Pic */}
                        {clerkImageUrl ? (
                            <img src={clerkImageUrl} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                                {userData?.name?.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop Top Bar */}
                <ClubTopBar
                    userName={userData?.name || 'User'}
                    userImageUrl={clerkImageUrl}
                    notificationCount={0}
                    onNotificationsClick={() => setActiveView('notifications')}
                    // Dynamic Props based on View
                    onBrowseEvents={activeView === 'home' ? () => setIsEventBrowserOpen(true) : undefined}

                    // Search Props
                    searchQuery={
                        activeView === 'members' ? searchParams.get('search') || '' :
                            activeView === 'tournaments' ? registrationSearchQuery :
                                undefined
                    }
                    onSearchChange={
                        activeView === 'members' ? handleMembersSearch :
                            activeView === 'tournaments' ? setRegistrationSearchQuery :
                                undefined
                    }
                    searchPlaceholder={
                        activeView === 'members' ? 'Search members...' :
                            activeView === 'tournaments' ? 'Search registrations...' :
                                undefined
                    }
                    title={activeView === 'settings' ? 'Settings' : undefined}
                    onActionClick={() => setIsActionModalOpen(true)}
                    actionCount={alertCount}
                />

                <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    {activeView === 'home' && (
                        <>
                            {/* Desktop Home View - Full dashboard */}
                            <div className="relative animate-in fade-in duration-300 p-4 md:p-6 h-auto md:h-[calc(100vh-80px)] overflow-visible md:overflow-hidden">
                                {/* Main 2-Column Layout */}
                                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 h-auto md:h-full">

                                    {/* Left Column - Main Content */}
                                    <div className="flex flex-col gap-6 h-auto md:h-full overflow-visible md:overflow-hidden">

                                        {/* Action Center Modal moved to global scope */}

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
                                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Members</span>
                                                    <span className="text-xs text-emerald-600">+12%</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-gray-900">
                                                        {isLoading ? <Skeleton className="h-8 w-12" /> : totalMembers}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Total Members</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">New</span>
                                                    <span className="text-xs text-gray-400">This month</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-gray-900">
                                                        {isLoading ? <Skeleton className="h-8 w-12" /> : ((streamedData as any)?.newMembersCount || 0)}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">New Members</p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Pending</span>
                                                    <span className="text-xs text-red-500">Requires action</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-bold text-gray-900">
                                                        {isLoading ? <Skeleton className="h-8 w-12" /> : pendingPlayers.length}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">Pending Requests</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Schedule Calendar Widget */}
                                        <div className="hidden md:flex flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex-col overflow-hidden">
                                            <ClubScheduleWidget tournaments={clubTournaments} isLoading={isLoading} />
                                        </div>
                                    </div>

                                    {/* Right Column - Sidebar Widgets */}
                                    <div className="flex flex-col gap-6 h-auto md:h-full overflow-visible md:overflow-hidden">
                                        {/* Upcoming Events - Swapped to top */}
                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col flex-1">
                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <h2 className="font-bold text-gray-900">Upcoming Events</h2>
                                            </div>

                                            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                                {isLoading ? (
                                                    // Skeleton Loading for Tournaments
                                                    <div className="space-y-3">
                                                        <Skeleton className="h-32 w-full rounded-2xl" />
                                                        <Skeleton className="h-16 w-full rounded-lg" />
                                                    </div>
                                                ) : nextEvent ? (
                                                    <>
                                                        {/* Next Event Card */}
                                                        <Link
                                                            href={nextEvent.type === 'TOURNAMENT' ? `/tournament/${nextEvent.id}` : '#'}
                                                            className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all block"
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <div className="mb-2 flex items-center gap-2">
                                                                        <span className="text-xs font-medium text-red-100 uppercase tracking-wider bg-red-800/30 px-2 py-0.5 rounded-full border border-red-400/20">
                                                                            {nextEvent.type}
                                                                        </span>
                                                                        <span className="text-xs font-medium text-red-200 uppercase tracking-wider">Next Event</span>
                                                                    </div>
                                                                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{nextEvent.name}</h3>
                                                                    <p className="text-red-200 text-xs mt-2 flex items-center gap-1">
                                                                        <Clock size={12} />
                                                                        {new Date(nextEvent.startDate).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <div className="text-3xl font-black">{daysUntil}</div>
                                                                    <div className="text-xs text-red-200">days</div>
                                                                </div>
                                                            </div>
                                                        </Link>

                                                        {/* Other upcoming events */}
                                                        {upcomingEvents.length > 1 && (
                                                            <div className="mt-2 space-y-2">
                                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">Later</p>
                                                                {upcomingEvents.slice(1, 3).map(event => (
                                                                    <Link
                                                                        key={event.id}
                                                                        href={event.type === 'TOURNAMENT' ? `/tournament/${event.id}` : '#'}
                                                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-red-100 hover:bg-red-50 cursor-pointer transition-all group"
                                                                    >
                                                                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex flex-col items-center justify-center text-[10px] leading-tight border border-gray-200 group-hover:border-red-200 group-hover:bg-white text-center">
                                                                            <span className="text-gray-500 font-bold uppercase">{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                                                                            <span className="text-gray-900 font-bold">{new Date(event.startDate).getDate()}</span>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${event.type === 'TOURNAMENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                                    event.type === 'SEMINAR' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                                    }`}>
                                                                                    {event.type}
                                                                                </span>
                                                                            </div>
                                                                            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-red-700">{event.name}</h4>
                                                                            <p className="text-xs text-gray-500 truncate">{event.athleteCount || 0} athletes registered</p>
                                                                        </div>
                                                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-red-400" />
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                                                        <span className="text-4xl mb-3">🏆</span>
                                                        <h3 className="font-bold text-gray-900 mb-1">No Upcoming Events</h3>
                                                        <p className="text-sm text-gray-500 mb-4">Register for an event to get started!</p>
                                                        <button
                                                            onClick={() => setActiveView('tournaments')}
                                                            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                                        >
                                                            Browse Events <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Top Performers - Swapped to bottom */}
                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col h-1/2">
                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <h2 className="font-bold text-gray-900">Top Performers</h2>
                                                <span className="text-xs text-red-600 cursor-pointer hover:text-red-700 font-medium">All →</span>
                                            </div>
                                            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                                {isLoading ? (
                                                    // Skeleton Loading for Top Performers
                                                    [1, 2, 3].map((i) => (
                                                        <div key={i} className="flex items-center gap-3 p-2">
                                                            <Skeleton className="w-8 h-8 rounded-full" />
                                                            <div className="flex-1">
                                                                <Skeleton className="h-4 w-24 mb-1" />
                                                                <Skeleton className="h-3 w-16" />
                                                            </div>
                                                            <Skeleton className="h-4 w-4" />
                                                        </div>
                                                    ))
                                                ) : topPerformers && topPerformers.length > 0 ? (
                                                    topPerformers.slice(0, 10).map((athlete: any, index: number) => (
                                                        <div key={athlete.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                                index === 1 ? 'bg-gray-100 text-gray-600' :
                                                                    index === 2 ? 'bg-red-100 text-red-700' :
                                                                        'bg-red-50 text-red-600'
                                                                }`}>
                                                                {athlete.name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">{athlete.name}</p>
                                                                <p className="text-[10px] text-gray-500">
                                                                    🥇{athlete.gold} 🥈{athlete.silver} 🥉{athlete.bronze}
                                                                </p>
                                                            </div>
                                                            <span className="text-xs text-gray-400">#{index + 1}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-400 text-center py-4">No medals yet</p>
                                                )}
                                            </div>
                                            <button className="w-full mt-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex-shrink-0">
                                                View all
                                            </button>
                                        </div>

                                    </div>
                                </div>

                                {/* Modals moved to global scope */}

                            </div>
                        </>
                    )
                    }
                    {
                        activeView === 'members' && (
                            <div className="bg-gray-50 h-auto md:h-[calc(100vh-80px)] flex flex-col overflow-visible md:overflow-hidden md:p-0">
                                <div className="flex-1 flex flex-col min-h-[600px] md:min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">
                                    <div className="flex-1 flex flex-col min-h-0 md:bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-200 overflow-hidden">
                                        <div className="h-full flex flex-col">
                                            {/* Header with Create Member Button */}
                                            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
                                                <h2 className="text-lg font-bold text-gray-900">Club Members</h2>
                                                <button
                                                    onClick={() => setIsCreateMemberOpen(true)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    Create Member
                                                </button>
                                            </div>
                                            <MembersGrid
                                                members={membersData?.paginatedMembers || []}
                                                avatars={avatars}
                                                currentPage={pagination?.currentPage || 1}
                                                totalPages={pagination?.totalPages || 1}
                                                isClubMaster={true}
                                                baseUrl="/club"
                                                clubName={clubName || ''}
                                                onEdit={(m: any) => setEditingMember(m)}
                                                onDelete={handleMemberDelete}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeView === 'notifications' && (
                            <div className="bg-gray-50 min-h-full pb-24">
                                {notificationsContent ? (
                                    <div className="min-h-[85vh]">
                                        {notificationsContent}
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                                            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                                        </div>
                                        <div className="min-h-[85vh]">
                                            <NotificationList userId={userData.id} />
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    }

                    {
                        activeView === 'settings' && (
                            <div className="bg-gray-50 min-h-full">
                                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                                    {settingsContent}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeView === 'tournaments' && (
                            <div className="bg-gray-50 h-auto md:h-[calc(100vh-80px)] flex flex-col overflow-visible md:overflow-hidden md:p-0">
                                <div className="flex-1 flex flex-col min-h-[600px] md:min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">
                                    <div className="flex-1 flex flex-col min-h-0 md:bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-200 overflow-hidden">
                                        {eventsContent ? (
                                            <div className="min-h-[85vh]">
                                                {eventsContent}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Header */}
                                                <div className="bg-white px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between gap-4">

                                                    {/* Filter Tabs with Select button */}
                                                    <div className="flex flex-wrap gap-4 items-center flex-1">
                                                        {/* Type Toggle */}
                                                        <div className="flex p-1 bg-red-50/50 rounded-xl border border-red-100/50">
                                                            <button
                                                                onClick={() => {
                                                                    setRegistrationType('TOURNAMENT')
                                                                    setRegistrationsPage(1)
                                                                    setSelectedRegistrationIds(new Set())
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${registrationType === 'TOURNAMENT'
                                                                    ? 'bg-red-600 text-white shadow-sm'
                                                                    : 'text-red-600 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                Tournaments
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setRegistrationType('PROMOTION')
                                                                    setRegistrationsPage(1)
                                                                    setSelectedRegistrationIds(new Set())
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${registrationType === 'PROMOTION'
                                                                    ? 'bg-red-600 text-white shadow-sm'
                                                                    : 'text-red-600 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                Promotions
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setRegistrationType('SEMINAR')
                                                                    setRegistrationsPage(1)
                                                                    setSelectedRegistrationIds(new Set())
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${registrationType === 'SEMINAR'
                                                                    ? 'bg-red-600 text-white shadow-sm'
                                                                    : 'text-red-600 hover:bg-red-100'
                                                                    }`}
                                                            >
                                                                Seminars
                                                            </button>
                                                        </div>

                                                        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

                                                        <div className="flex gap-2">
                                                            {registrationType !== 'SEMINAR' && (
                                                                <button
                                                                    onClick={() => setBulkSelectMode(!bulkSelectMode)}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${bulkSelectMode
                                                                        ? 'bg-red-600 text-white'
                                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                        }`}
                                                                >
                                                                    {bulkSelectMode ? 'Done' : 'Select'}
                                                                </button>
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
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                                            : 'text-gray-500 hover:text-gray-700'
                                                                            }`}
                                                                    >
                                                                        {tab === 'ALL' ? `All ${registrationType === 'TOURNAMENT' ? allRegistrations.length : registrationType === 'PROMOTION' ? rawPromotions.length : rawSeminars.length}` :
                                                                            tab === 'PENDING' ? `Pending ${registrationType === 'TOURNAMENT' ? pendingPlayers.length : registrationType === 'PROMOTION' ? rawPromotions.filter(p => p.status === 'PENDING').length : rawSeminars.filter(p => p.status === 'PENDING').length}` :
                                                                                `Done ${registrationType === 'TOURNAMENT' ? approvedPlayers.length : registrationType === 'PROMOTION' ? rawPromotions.filter(p => p.status === 'APPROVED').length : rawSeminars.filter(p => p.status === 'APPROVED').length}`}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsAddAthleteOpen(true)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Add Athlete</span>
                                                    </button>
                                                </div>

                                                <div className={`min-h-[85vh] ${bulkSelectMode ? 'pb-24' : ''}`}>

                                                    {/* Player List */}
                                                    {(registrationType === 'TOURNAMENT' ? currentRegistrations : registrationType === 'PROMOTION' ? currentPromotions : currentSeminars).length === 0 ? (
                                                        <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                                                            <p className="text-4xl mb-4">📋</p>
                                                            <p className="text-gray-900 font-medium mb-1">No {registrationType.toLowerCase()} registrations found</p>
                                                            <p className="text-gray-500 text-sm">Athletes will appear here once registered</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 md:space-y-0 md:divide-y md:divide-gray-200 bg-transparent md:bg-white px-4 md:px-0 pb-24 md:pb-0">
                                                            {registrationType === 'TOURNAMENT' ? (
                                                                // Tournament List
                                                                currentRegistrations.map((player, index) => {
                                                                    const avatar = getPlayerAvatar(player)
                                                                    const isPending = player.registrationStatus === 'PENDING'
                                                                    const isSelected = selectedRegistrationIds.has(player.id)
                                                                    const isLastItems = currentRegistrations.length > 2 && index >= currentRegistrations.length - 2
                                                                    return (
                                                                        <div
                                                                            key={player.id}
                                                                            className={`flex items-center gap-3 md:px-4 md:py-3 p-4 rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 md:border-0 bg-white md:bg-transparent transition-all ${isSelected ? 'bg-red-50 ring-1 ring-red-500 md:ring-0' : ''}`}
                                                                        >
                                                                            {/* ... (Existing Tournament Row Logic) ... */}
                                                                            {/* Card Header */}
                                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                {/* Selection Checkbox - Only show in bulk mode */}
                                                                                {bulkSelectMode && (
                                                                                    <button
                                                                                        onClick={(e) => toggleSelect(player.id, e)}
                                                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                                                            ? 'bg-red-600 border-red-600 text-white'
                                                                                            : 'border-gray-300 hover:border-red-400'
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
                                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
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
                                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                                        {player.category.name} • {player.category.tournament.name}
                                                                                        {player.poomsaeType && player.poomsaeType !== 'INDIVIDUAL' && (
                                                                                            <span className="ml-2 font-medium text-blue-600">
                                                                                                {player.poomsaeType} {player.teamId ? `(Team ${player.teamId})` : '(No ID)'}
                                                                                            </span>
                                                                                        )}
                                                                                    </p>
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
                                                                                                Delete
                                                                                            </button>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })) : registrationType === 'PROMOTION' ? (
                                                                    // Promotion List
                                                                    currentPromotions.map((promo, index) => {
                                                                        const isPending = promo.status === 'PENDING'
                                                                        const isLastItems = currentPromotions.length > 2 && index >= currentPromotions.length - 2

                                                                        return (
                                                                            <div key={promo.id} className="flex items-center gap-3 md:px-4 md:py-3 p-4 rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 md:border-0 bg-white md:bg-transparent">
                                                                                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                                                                                    {promo.name.charAt(0)}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <h3 className="font-semibold text-gray-900 text-sm truncate">{promo.name}</h3>
                                                                                        {isPending ? (
                                                                                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700">PENDING</span>
                                                                                        ) : (
                                                                                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">APPROVED</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                                        {promo.eventName} • {promo.currentBelt} → {promo.targetBelt}
                                                                                    </p>
                                                                                </div>

                                                                                {/* Actions */}
                                                                                <div className="relative">
                                                                                    <button
                                                                                        onClick={() => setActionMenuOpen(actionMenuOpen === promo.id ? null : promo.id)}
                                                                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                                    >
                                                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                                        </svg>
                                                                                    </button>

                                                                                    {actionMenuOpen === promo.id && (
                                                                                        <div className={`absolute right-0 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 ${isLastItems ? 'bottom-8' : 'top-8'}`}>
                                                                                            {/* Backdrop */}
                                                                                            <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                                                                            <div className="relative z-50">
                                                                                                {isPending ? (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            handlePromotionStatusChange(promo.id, 'APPROVED')
                                                                                                            setActionMenuOpen(null)
                                                                                                        }}
                                                                                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                                                                    >
                                                                                                        Approve
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            handlePromotionStatusChange(promo.id, 'PENDING')
                                                                                                            setActionMenuOpen(null)
                                                                                                        }}
                                                                                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-yellow-600 hover:bg-yellow-50 flex items-center gap-2"
                                                                                                    >
                                                                                                        Unapprove
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })) : (
                                                                // Seminar List
                                                                currentSeminars.map((seminar, index) => {
                                                                    const isPending = seminar.status === 'PENDING'
                                                                    const isLastItems = currentSeminars.length > 2 && index >= currentSeminars.length - 2

                                                                    return (
                                                                        <div key={seminar.id} className="flex items-center gap-3 md:px-4 md:py-3 p-4 rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 md:border-0 bg-white md:bg-transparent">
                                                                            {seminar.imageUrl ? (
                                                                                <img src={seminar.imageUrl} alt={seminar.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                                                            ) : (
                                                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                                                    {seminar.name.charAt(0)}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-3">
                                                                                    <h3 className="font-semibold text-gray-900 text-sm truncate">{seminar.name}</h3>
                                                                                    {/* Registration Status */}
                                                                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${isPending
                                                                                        ? 'bg-yellow-100 text-yellow-700'
                                                                                        : seminar.status === 'APPROVED'
                                                                                            ? 'bg-green-100 text-green-700'
                                                                                            : 'bg-red-100 text-red-700'
                                                                                        }`}>
                                                                                        {seminar.status}
                                                                                    </span>
                                                                                    {/* Payment Status */}
                                                                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${seminar.paymentStatus === 'PAID'
                                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                                        : 'bg-gray-100 text-gray-600'
                                                                                        }`}>
                                                                                        {seminar.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID'}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                                    {seminar.eventName} • {new Date(seminar.eventDate).toLocaleDateString()}
                                                                                    {seminar.belt && <span className="ml-2 text-gray-400">| {seminar.belt}</span>}
                                                                                </p>
                                                                            </div>

                                                                            {/* Actions */}
                                                                            <div className="relative">
                                                                                <button
                                                                                    onClick={() => setActionMenuOpen(actionMenuOpen === seminar.id ? null : seminar.id)}
                                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                                >
                                                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                                    </svg>
                                                                                </button>

                                                                                {actionMenuOpen === seminar.id && (
                                                                                    <div className={`absolute right-0 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 ${isLastItems ? 'bottom-8' : 'top-8'}`}>
                                                                                        {/* Backdrop */}
                                                                                        <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                                                                        <div className="relative z-50">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setEditingSeminar(seminar)
                                                                                                    setActionMenuOpen(null)
                                                                                                }}
                                                                                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                                            >
                                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                                </svg>
                                                                                                Edit Details
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                }))}
                                                        </div>
                                                    )}

                                                    {/* Pagination */}
                                                    {(registrationType === 'TOURNAMENT' ? totalRegistrationPages : registrationType === 'PROMOTION' ? totalPromotionPages : totalSeminarPages) > 1 && (
                                                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                                            <button
                                                                onClick={() => setRegistrationsPage(p => Math.max(1, p - 1))}
                                                                disabled={registrationsPage === 1}
                                                                className="px-3 py-1 rounded-md text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                                            >
                                                                Previous
                                                            </button>
                                                            <span className="text-xs font-semibold text-gray-500">
                                                                Page {registrationsPage} of {registrationType === 'TOURNAMENT' ? totalRegistrationPages : registrationType === 'PROMOTION' ? totalPromotionPages : totalSeminarPages}
                                                            </span>
                                                            <button
                                                                onClick={() => setRegistrationsPage(p => Math.min(registrationType === 'TOURNAMENT' ? totalRegistrationPages : registrationType === 'PROMOTION' ? totalPromotionPages : totalSeminarPages, p + 1))}
                                                                disabled={registrationsPage === (registrationType === 'TOURNAMENT' ? totalRegistrationPages : registrationType === 'PROMOTION' ? totalPromotionPages : totalSeminarPages)}
                                                                className="px-3 py-1 rounded-md text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Floating Bulk Action Bar - appears when items selected */}
                                                    {bulkSelectMode && (
                                                        <div className="fixed bottom-6 left-4 right-4 md:left-64 bg-gray-900 text-white rounded-2xl shadow-xl p-3 z-40 animate-in slide-in-from-bottom-4 duration-200">
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

                                                </div>


                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }



                    {/* ✏️ Edit Player Modal */}
                    {
                        editingPlayer && (
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
                                                name: formData.get('name') as string,
                                                weight: Number(formData.get('weight')),
                                                height: Number(formData.get('height')),
                                                belt: formData.get('belt') as string,
                                                skillLevel: formData.get('skillLevel') as string,
                                                teamId: formData.get('teamId') as string,
                                                poomsaeType: formData.get('poomsaeType') as string
                                            })
                                        }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                defaultValue={editingPlayer.name}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                                placeholder="Enter full name"
                                            />
                                        </div>

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

                                        {/* Poomsae Event Type & Team ID */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <CustomSelect
                                                    label="Event Type"
                                                    value={editingPlayer.poomsaeType || 'INDIVIDUAL'}
                                                    onChange={(val) => {
                                                        setEditingPlayer({ ...editingPlayer, poomsaeType: val })
                                                    }}
                                                    options={['INDIVIDUAL', 'PAIR', 'TEAM']}
                                                    className="w-full"
                                                />
                                                <input type="hidden" name="poomsaeType" value={editingPlayer.poomsaeType || 'INDIVIDUAL'} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Team ID</label>
                                                <input
                                                    type="text"
                                                    name="teamId"
                                                    defaultValue={editingPlayer.teamId || ''}
                                                    placeholder="e.g. 1"
                                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    name="weight"
                                                    step="0.1"
                                                    defaultValue={editingPlayer.weight || ''}
                                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    name="height"
                                                    defaultValue={editingPlayer.height || ''}
                                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
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
                                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        )
                    }


                    {/* ✏️ Edit Member Modal */}
                    {
                        editingMember && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
                                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Edit Member</h3>
                                            <p className="text-gray-500 text-sm mt-1">{editingMember.name}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingMember(null)}
                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            const formData = new FormData(e.currentTarget)
                                            handleMemberSave({
                                                name: formData.get('name'),
                                                belt: formData.get('belt'),
                                                weight: Number(formData.get('weight')) || null,
                                                gender: formData.get('gender')
                                            })
                                        }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                defaultValue={editingMember.name || ''}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                                placeholder="Full Name"
                                            />
                                        </div>

                                        <div>
                                            <CustomSelect
                                                label="Gender"
                                                value={editingMember.gender || 'Male'}
                                                onChange={(val) => setEditingMember({ ...editingMember, gender: val })}
                                                options={['Male', 'Female']}
                                                className="w-full"
                                                name="gender"
                                            />
                                            <input type="hidden" name="gender" value={editingMember.gender || 'Male'} />
                                        </div>

                                        <div>
                                            <CustomSelect
                                                label="Belt Rank"
                                                value={editingMember.belt || 'White'}
                                                onChange={(val) => setEditingMember({ ...editingMember, belt: val })}
                                                options={['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']}
                                                className="w-full"
                                                name="belt"
                                            />
                                            <input type="hidden" name="belt" value={editingMember.belt || 'White'} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                            <input
                                                type="number"
                                                name="weight"
                                                step="0.1"
                                                defaultValue={editingMember.weight || ''}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => setEditingMember(null)}
                                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {submitting ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    {/* ✏️ Edit Seminar Participant Modal */}
                    {
                        editingSeminar && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingSeminar(null)} />
                                <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Edit Participant</h3>
                                            <p className="text-gray-500 text-sm mt-1">{editingSeminar.name}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingSeminar(null)}
                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            const formData = new FormData(e.currentTarget)
                                            handleSeminarSave({
                                                name: formData.get('name') as string,
                                                belt: formData.get('belt') as string
                                            })
                                        }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                type="text"
                                                name="name"
                                                defaultValue={editingSeminar.name}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                                placeholder="Enter full name"
                                            />
                                        </div>

                                        <div>
                                            <CustomSelect
                                                label="Belt Rank"
                                                value={editingSeminar.belt || 'White'}
                                                onChange={(val) => {
                                                    setEditingSeminar({ ...editingSeminar, belt: val })
                                                }}
                                                options={['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']}
                                                className="w-full"
                                                name="belt"
                                            />
                                            <input type="hidden" name="belt" value={editingSeminar.belt || 'White'} />
                                        </div>

                                        <div className="flex justify-end gap-3 mt-8">
                                            <button
                                                type="button"
                                                onClick={() => setEditingSeminar(null)}
                                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {submitting ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )
                    }

                    {/* Stats Modal (Torunament Details) */}
                    {
                        selectedTournament && (
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
                                            <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100/50">
                                                <div className="text-3xl mb-1">🥉</div>
                                                <div className="font-bold text-gray-900 text-xl">{selectedTournament.bronze}</div>
                                                <div className="text-xs text-red-700/70 font-bold uppercase tracking-wide">Bronze</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Global Modals */}
            {
                isEventBrowserOpen && (
                    <ClubEventBrowser
                        clubId={clubId}
                        onClose={() => setIsEventBrowserOpen(false)}
                    />
                )
            }

            <AddAthleteModal
                isOpen={isAddAthleteOpen}
                onClose={() => setIsAddAthleteOpen(false)}
                clubId={clubId}
                clubName={clubName || ''}
                defaultType={registrationType}
            />

            <CreateMemberModal
                isOpen={isCreateMemberOpen}
                onClose={() => setIsCreateMemberOpen(false)}
            />

            <ClubActionCenterModal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                clubId={clubId}
                proposals={proposals || []}
                onRefresh={refetchProposals}
            />
        </div >
    )
}
