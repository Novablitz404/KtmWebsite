'use client'

import { compressImage } from '@/lib/compress-image'

import { useState, useEffect, use } from 'react'
import { Upload, X, Home, Settings, ClipboardList, Users, Bell, Trophy, Medal, Clock, Search, Calendar, Zap, ChevronLeft, ChevronRight, Loader2, Camera, Download } from 'lucide-react'
import Link from 'next/link'
import { approveRegistrations, unapproveRegistration, deleteRegistration, updatePlayerDetails, bulkUnapproveRegistrations, bulkDeleteRegistrations, fetchClubDashboardData, removeMemberFromClub, updateClubMember, getClubSmartProposals, getClubAffiliationData, generatePlayerQRCode } from '@/app/actions'
import { uploadMemberAvatar } from '@/app/club/actions'
import { updateRegistrationStatus, deletePromotionRegistration } from '@/app/promotions/actions'
import { approveSeminarRegistration, unapproveSeminarRegistration, deleteSeminarRegistration, updateSeminarRegistrationStatus, updateSeminarParticipantDetails, generateSeminarQRCode } from '@/app/seminars/actions'

import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { calculateAge } from '@/lib/placement'
import { toast } from 'sonner'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'

import MembersGrid from '@/app/members/MembersGrid'
import NotificationList from '@/app/notifications/NotificationList'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ClubSidebar from '@/components/club/ClubSidebar'
import ClubGrowthCard from '@/components/club/ClubGrowthCard'
import ClubTopBar from '@/components/club/ClubTopBar'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import ClubEventBrowser from './ClubEventBrowser'
import AddAthleteModal from '@/components/club/AddAthleteModal'
import CreateMemberModal from '@/components/club/CreateMemberModal'
import UserAvatar from '@/components/UserAvatar'
import ClubActionCenterModal from './ClubActionCenter'
import ClubAffiliationCard from '@/components/ClubAffiliationCard'

interface Player {
    id: string
    name: string
    gender: string
    belt: string | null
    weight: number | null
    height: number | null
    skillLevel: string | null
    registrationStatus: string
    paymentStatus: string | null
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
    height: number | null
    belt: string | null
    birthDate: Date | null
    imageUrl?: string | null
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
    paymentStatus: string | null
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
    const [membersSearchQuery, setMembersSearchQuery] = useState('')


    // Selection State
    const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<string>>(new Set())

    const [bulkSelectMode, setBulkSelectMode] = useState(false)
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

    // Edit Modal State
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
    const [editingMember, setEditingMember] = useState<Member | null>(null)
    const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
    const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
    // Action Center Data
    const { data: proposals, refetch: refetchProposals } = useQuery({
        queryKey: ['club-smart-proposals', clubId],
        queryFn: () => getClubSmartProposals(clubId),
        staleTime: 1000 * 30 // 30 seconds
    })

    const [isActionModalOpen, setIsActionModalOpen] = useState(false)
    const alertCount = proposals?.filter((p: any) => !p.myVote).length || 0

    // Affiliation data
    const { data: affiliationData } = useQuery({
        queryKey: ['club-affiliation', clubId],
        queryFn: () => getClubAffiliationData(clubId),
        staleTime: 1000 * 60
    })



    // URL Search Support for Members
    const pathname = usePathname()

    // Reset registration page when search query changes
    useEffect(() => {
        setRegistrationsPage(1)
    }, [registrationSearchQuery])

    // Members search is now handled server-side via MembersGrid

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
                // Upload avatar if a new file was selected
                if (editAvatarFile) {
                    try {
                        const formData = new FormData()
                        formData.append('avatar', editAvatarFile)
                        formData.append('memberId', editingMember.id)
                        await uploadMemberAvatar(formData)
                    } catch (err) {
                        console.error('Avatar upload failed:', err)
                    }
                }
                toast.success('Member updated')
                setEditingMember(null)
                setEditAvatarFile(null)
                setEditAvatarPreview(null)
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

    const handlePromotionDelete = async (registrationId: string) => {
        if (!confirm('Are you sure you want to delete this promotion registration?')) return
        setSubmitting(true)
        try {
            const res = await deletePromotionRegistration(registrationId)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Registration deleted')
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
            }
        } catch {
            toast.error('Failed to delete registration')
        } finally {
            setSubmitting(false)
        }
    }

    // --- QR Code Download ---
    const handleDownloadQR = async (type: 'tournament' | 'seminar', id: string) => {
        try {
            toast.loading('Generating QR code...', { id: 'qr-gen' })
            const result = type === 'tournament'
                ? await generatePlayerQRCode(id)
                : await generateSeminarQRCode(id)

            if ('error' in result && result.error) {
                toast.error(result.error, { id: 'qr-gen' })
                return
            }

            if (!('success' in result) || !result.success || !result.qrDataUrl || !result.player) {
                toast.error('Failed to generate QR code', { id: 'qr-gen' })
                return
            }

            // HD canvas (2x resolution for crisp output)
            const scale = 2
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            const w = 400, h = 520
            canvas.width = w * scale
            canvas.height = h * scale
            ctx.scale(scale, scale)

            // White card background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, w, h)

            // Header bar
            ctx.fillStyle = '#1e1b4b'
            ctx.fillRect(0, 0, w, 56)
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 14px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('CHECK-IN QR CODE', w / 2, 36)

            // QR code image
            const qrImg = new Image()
            qrImg.crossOrigin = 'anonymous'
            await new Promise<void>((resolve) => {
                qrImg.onload = () => resolve()
                qrImg.src = result.qrDataUrl!
            })
            const qrSize = 240
            ctx.imageSmoothingEnabled = false
            ctx.drawImage(qrImg, (w - qrSize) / 2, 76, qrSize, qrSize)
            ctx.imageSmoothingEnabled = true

            const maxTextWidth = w - 40 // 20px padding on each side

            // Helper to auto-shrink font if text is too wide
            const fillTextFit = (text: string, x: number, y: number, font: string, maxW: number) => {
                ctx.font = font
                if (ctx.measureText(text).width > maxW) {
                    ctx.fillText(text, x, y, maxW)
                } else {
                    ctx.fillText(text, x, y)
                }
            }

            // Player info
            const p = result.player
            ctx.fillStyle = '#111827'
            ctx.textAlign = 'center'
            fillTextFit(p.name || 'Unknown', w / 2, 350, 'bold 20px system-ui, sans-serif', maxTextWidth)

            ctx.fillStyle = '#6b7280'
            if (p.event) fillTextFit(p.event, w / 2, 378, '13px system-ui, sans-serif', maxTextWidth)

            const details = [('category' in p ? p.category : null) || ('belt' in p ? p.belt : null), p.club].filter(Boolean).join(' \u2022 ')
            if (details) {
                ctx.fillStyle = '#9ca3af'
                fillTextFit(details, w / 2, 400, '12px system-ui, sans-serif', maxTextWidth)
            }

            // ID footer
            ctx.fillStyle = '#d1d5db'
            fillTextFit(`ID: ${p.id}`, w / 2, 430, '10px monospace', maxTextWidth)

            // Footer bar
            ctx.fillStyle = '#f3f4f6'
            ctx.fillRect(0, h - 44, w, 44)
            ctx.fillStyle = '#9ca3af'
            ctx.font = '10px system-ui, sans-serif'
            ctx.fillText('Scan this code at the event check-in station', w / 2, h - 18)

            // Border
            ctx.strokeStyle = '#e5e7eb'
            ctx.lineWidth = 1
            ctx.strokeRect(0, 0, w, h)

            // Download
            const link = document.createElement('a')
            link.download = `QR-${(p.name || 'athlete').replace(/\s+/g, '-')}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

            toast.success('QR code downloaded!', { id: 'qr-gen' })
        } catch {
            toast.error('Failed to download QR code', { id: 'qr-gen' })
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
                        <UserAvatar
                            src={clerkImageUrl}
                            name={userData?.name}
                            size={32}
                            className="border border-gray-200"
                        />
                    </div>
                </div>

                {/* Desktop Top Bar */}
                <ClubTopBar
                    userName={userData?.name || 'User'}
                    userImageUrl={clerkImageUrl}
                    notificationCount={0}
                    onNotificationsClick={() => setActiveView('notifications')}
                    // Dynamic Props based on View

                    // Search Props
                    searchQuery={
                        activeView === 'members' ? membersSearchQuery :
                            activeView === 'tournaments' ? registrationSearchQuery :
                                undefined
                    }
                    onSearchChange={
                        activeView === 'members' ? setMembersSearchQuery :
                            activeView === 'tournaments' ? setRegistrationSearchQuery :
                                undefined
                    }
                    searchPlaceholder={
                        activeView === 'members' ? 'Search members...' :
                            activeView === 'tournaments' ? 'Search registrations...' :
                                undefined
                    }
                    title={undefined}
                    onActionClick={() => setIsActionModalOpen(true)}
                    actionCount={alertCount}
                />

                <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                    {activeView === 'home' && (
                        <>
                            {/* Desktop Home View - Premium Dashboard */}
                            <div className="relative animate-in fade-in duration-300 p-6 md:p-8 space-y-5 overflow-y-auto h-auto md:h-[calc(100vh-80px)]">

                                {/* Affiliation Alert Banner */}
                                {affiliationData?.affiliationStatus && affiliationData.affiliationStatus.status !== 'ACTIVE' && (
                                    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <Bell className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-amber-800">
                                                Your club affiliation is {affiliationData.affiliationStatus.status === 'EXPIRED' ? 'expired' : 'unpaid'}.
                                                Athletes may not be able to register for events.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setActiveView('settings')}
                                            className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                                        >
                                            Go to Settings
                                        </button>
                                    </div>
                                )}

                                {/* Row 1: Growth Chart — full width */}
                                <ClubGrowthCard
                                    totalMembers={totalMembers}
                                    newMembersCount={(streamedData as any)?.newMembersCount || 0}
                                    membersByMonth={(streamedData as any)?.membersByMonth || []}
                                    beltStats={(streamedData as any)?.beltStats || []}
                                    pendingCount={pendingPlayers.length}
                                    eventsJoined={upcomingEvents.length + clubTournaments.length}
                                    isLoading={isLoading}
                                />

                                {/* Row 2: Pending Registrations — full width */}
                                {pendingPlayers.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                                    <ClipboardList size={14} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">Pending Registrations</h3>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">{pendingPlayers.length} athlete{pendingPlayers.length !== 1 ? 's' : ''} awaiting approval</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setActiveView('tournaments')}
                                                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                                            >
                                                View All <ChevronRight size={14} />
                                            </button>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {pendingPlayers.slice(0, 4).map((player) => (
                                                <div key={player.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-sm font-semibold text-gray-900 truncate">{player.name}</h4>
                                                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-700">PENDING</span>
                                                            {player.paymentStatus && (
                                                                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                    player.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' :
                                                                    player.paymentStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                    {player.paymentStatus === 'PAID' ? '💰 PAID' : player.paymentStatus}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">{player.category?.name} • {player.category?.tournament?.name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleApprove(player)}
                                                        disabled={submitting}
                                                        className="ml-4 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex-shrink-0"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {pendingPlayers.length > 4 && (
                                            <div className="px-6 py-3 border-t border-gray-100 text-center">
                                                <button
                                                    onClick={() => setActiveView('tournaments')}
                                                    className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                                                >
                                                    +{pendingPlayers.length - 4} more pending registration{pendingPlayers.length - 4 !== 1 ? 's' : ''}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Browse Events Widget */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <ClubEventBrowser clubId={clubId} />
                                </div>

                                {/* Upcoming Events | Action Center */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    {/* Upcoming Events */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                <Calendar size={14} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">Upcoming Events</h3>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{upcomingEvents.length} event{upcomingEvents.length !== 1 ? 's' : ''} scheduled</p>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            {isLoading ? (
                                                <div className="space-y-3">
                                                    <Skeleton className="h-28 w-full rounded-2xl" />
                                                    <Skeleton className="h-14 w-full rounded-lg" />
                                                </div>
                                            ) : nextEvent ? (
                                                <div className="space-y-3">
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
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1">Later</p>
                                                            {upcomingEvents.slice(1, 4).map(event => (
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
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
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

                                    {/* Action Center Widget */}
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                                    <Zap size={14} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">Action Center</h3>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">Tasks requiring your attention</p>
                                                </div>
                                            </div>
                                            {alertCount > 0 && (
                                                <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">
                                                    {alertCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-5">
                                            <div className="space-y-2">
                                                {isLoading ? (
                                                    [1, 2, 3].map((i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                                            <Skeleton className="w-8 h-8 rounded-full" />
                                                            <div className="flex-1">
                                                                <Skeleton className="h-4 w-32 mb-1" />
                                                                <Skeleton className="h-3 w-20" />
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : proposals && proposals.length > 0 ? (
                                                    <>
                                                        {proposals.slice(0, 4).map((proposal: any) => (
                                                            <div
                                                                key={proposal.id}
                                                                className={`flex items-center gap-3 p-3 rounded-xl ${!proposal.myVote
                                                                    ? 'bg-red-50 border border-red-100'
                                                                    : 'bg-gray-50 border border-gray-100'
                                                                    }`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${!proposal.myVote
                                                                    ? 'bg-red-100 text-red-600'
                                                                    : 'bg-green-100 text-green-600'
                                                                    }`}>
                                                                    {!proposal.myVote ? '⚠️' : '✓'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">{proposal.title || proposal.type}</p>
                                                                    <p className="text-xs text-gray-500 truncate">{proposal.description || 'Needs your review'}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {proposals.length > 4 && (
                                                            <p className="text-xs text-gray-400 text-center pt-1">
                                                                +{proposals.length - 4} more action{proposals.length - 4 > 1 ? 's' : ''}
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center py-8">
                                                        <span className="text-3xl mb-2">✅</span>
                                                        <p className="text-sm font-medium text-gray-900">All caught up!</p>
                                                        <p className="text-xs text-gray-500 mt-1">No pending actions</p>
                                                    </div>
                                                )}
                                            </div>
                                            {proposals && proposals.length > 0 && (
                                                <button
                                                    onClick={() => setIsActionModalOpen(true)}
                                                    className="w-full mt-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                                >
                                                    View all actions
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </>
                    )
                    }
                    {
                        activeView === 'members' && (
                            <div className="flex flex-col h-full min-h-screen md:min-h-0 bg-gray-50 p-4 sm:p-6">
                                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                                                <Users size={14} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold text-gray-900">Club Members</h2>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    {totalMembers > 0 ? `${totalMembers} registered athlete${totalMembers !== 1 ? 's' : ''}` : 'Manage your club roster'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsCreateMemberOpen(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="hidden sm:inline">Create Member</span>
                                            <span className="sm:hidden">Add</span>
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
                                        searchQuery={membersSearchQuery}
                                        onEdit={(m: any) => setEditingMember(m)}
                                        onDelete={handleMemberDelete}
                                    />
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
                                    <div className="flex-1 flex flex-col min-h-0 md:bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 overflow-hidden">
                                        {eventsContent ? (
                                            <div className="min-h-[85vh]">
                                                {eventsContent}
                                            </div>
                                        ) : (
                                            <>
                                                {/* ── Toolbar ── */}
                                                <div className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap">

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {/* Type switcher */}
                                                        <div className="flex p-1 bg-gray-100 rounded-xl">
                                                            {([
                                                                { key: 'TOURNAMENT', label: 'Tournaments' },
                                                                { key: 'PROMOTION', label: 'Promotions' },
                                                                { key: 'SEMINAR', label: 'Seminars' },
                                                            ] as const).map(({ key, label }) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => { setRegistrationType(key); setRegistrationsPage(1); setSelectedRegistrationIds(new Set()) }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${registrationType === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

                                                        {/* Status filter */}
                                                        <div className="flex p-1 bg-gray-100 rounded-xl">
                                                            {(['ALL', 'PENDING', 'APPROVED'] as const).map((tab) => {
                                                                const count = tab === 'ALL'
                                                                    ? (registrationType === 'TOURNAMENT' ? allRegistrations.length : registrationType === 'PROMOTION' ? rawPromotions.length : rawSeminars.length)
                                                                    : tab === 'PENDING'
                                                                    ? (registrationType === 'TOURNAMENT' ? pendingPlayers.length : registrationType === 'PROMOTION' ? rawPromotions.filter(p => p.status === 'PENDING').length : rawSeminars.filter(p => p.status === 'PENDING').length)
                                                                    : (registrationType === 'TOURNAMENT' ? filteredApprovedPlayers.length : registrationType === 'PROMOTION' ? rawPromotions.filter(p => p.status === 'APPROVED').length : rawSeminars.filter(p => p.status === 'APPROVED').length)
                                                                return (
                                                                    <button
                                                                        key={tab}
                                                                        onClick={() => { setActiveTab(tab); setRegistrationsPage(1); setSelectedRegistrationIds(new Set()) }}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                                    >
                                                                        {tab === 'ALL' ? 'All' : tab === 'PENDING' ? 'Pending' : 'Approved'}
                                                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeTab === tab
                                                                            ? tab === 'PENDING' ? 'bg-amber-100 text-amber-700' : tab === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                                            : 'bg-gray-200 text-gray-500'}`}>{count}</span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        {registrationType !== 'SEMINAR' && (
                                                            <button
                                                                onClick={() => setBulkSelectMode(!bulkSelectMode)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${bulkSelectMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                            >
                                                                {bulkSelectMode ? '✓ Done' : 'Select'}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => setIsAddAthleteOpen(true)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span className="hidden sm:inline">Add Athlete</span>
                                                    </button>
                                                </div>

                                                <div className={`flex-1 overflow-y-auto ${bulkSelectMode ? 'pb-24' : ''}`}>
                                                    {(registrationType === 'TOURNAMENT' ? currentRegistrations : registrationType === 'PROMOTION' ? currentPromotions : currentSeminars).length === 0 ? (
                                                        <div className="p-8 text-center min-h-[300px] flex flex-col items-center justify-center gap-3">
                                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900">No registrations yet</p>
                                                                <p className="text-xs text-gray-400 mt-1">Athletes will appear here once registered</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-50">
                                                            {registrationType === 'TOURNAMENT' ? (
                                                                currentRegistrations.map((player, index) => {
                                                                    const isPending = player.registrationStatus === 'PENDING'
                                                                    const isSelected = selectedRegistrationIds.has(player.id)
                                                                    const isLastItems = currentRegistrations.length > 2 && index >= currentRegistrations.length - 2
                                                                    return (
                                                                        <div
                                                                            key={player.id}
                                                                            className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isSelected ? 'bg-red-50 ring-1 ring-inset ring-red-200' : 'hover:bg-gray-50/80'}`}
                                                                        >
                                                                            {bulkSelectMode && (
                                                                                <button
                                                                                    onClick={(e) => toggleSelect(player.id, e)}
                                                                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 hover:border-red-400'}`}
                                                                                >
                                                                                    {isSelected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                                </button>
                                                                            )}

                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-black text-gray-900">{player.name}</span>
                                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                                        {isPending ? 'PENDING' : 'APPROVED'}
                                                                                    </span>
                                                                                    {player.paymentStatus && (
                                                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${player.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' : player.paymentStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' : player.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                                            {player.paymentStatus === 'PAID' ? 'PAID' : player.paymentStatus}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                                                    {player.category.name}
                                                                                    <span className="text-gray-300 mx-1">·</span>
                                                                                    {player.category.tournament.name}
                                                                                    {player.poomsaeType && player.poomsaeType !== 'INDIVIDUAL' && (
                                                                                        <span className="ml-2 font-bold text-blue-500">{player.poomsaeType}{player.teamId ? ` #${player.teamId}` : ''}</span>
                                                                                    )}
                                                                                </p>
                                                                            </div>

                                                                            <div className="relative flex-shrink-0">
                                                                                <button
                                                                                    onClick={() => setActionMenuOpen(actionMenuOpen === player.id ? null : player.id)}
                                                                                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                                                                >
                                                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                                                    </svg>
                                                                                </button>
                                                                                {actionMenuOpen === player.id && (
                                                                                    <>
                                                                                        <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                                                                        <div className={`absolute right-0 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden ${isLastItems ? 'bottom-9' : 'top-9'}`}>
                                                                                            {isPending ? (
                                                                                                <button onClick={() => { handleApprove(player); setActionMenuOpen(null) }} disabled={submitting} className="w-full px-4 py-2.5 text-left text-xs font-bold text-green-600 hover:bg-green-50 disabled:opacity-50 flex items-center gap-2">
                                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                                                    Approve
                                                                                                </button>
                                                                                            ) : (
                                                                                                <button onClick={() => { handleUnapprove(player.id); setActionMenuOpen(null) }} disabled={submitting} className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2">
                                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                                                    Unapprove
                                                                                                </button>
                                                                                            )}
                                                                                            <button onClick={() => { setEditingPlayer(player); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                                                Edit
                                                                                            </button>
                                                                                            {!isPending && (
                                                                                                <button onClick={() => { handleDownloadQR('tournament', player.id); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                                                                                                    <Download className="w-3.5 h-3.5" />
                                                                                                    Download QR
                                                                                                </button>
                                                                                            )}
                                                                                            <div className="border-t border-gray-100 my-1" />
                                                                                            <button onClick={() => { handleDelete(player.id); setActionMenuOpen(null) }} disabled={submitting} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-2">
                                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                                                                            <div key={promo.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <span className="text-sm font-black text-gray-900">{promo.name}</span>
                                                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                                            {isPending ? 'PENDING' : 'APPROVED'}
                                                                                        </span>
                                                                                        {promo.paymentStatus && (
                                                                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${promo.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' : promo.paymentStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' : promo.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                                                {promo.paymentStatus === 'PAID' ? 'PAID' : promo.paymentStatus}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                                                        {promo.eventName}
                                                                                        <span className="text-gray-300 mx-1">·</span>
                                                                                        {promo.currentBelt} → {promo.targetBelt}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="relative flex-shrink-0">
                                                                                    <button
                                                                                        onClick={() => setActionMenuOpen(actionMenuOpen === promo.id ? null : promo.id)}
                                                                                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                                                    </button>
                                                                                    {actionMenuOpen === promo.id && (
                                                                                        <div className={`absolute right-0 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden ${isLastItems ? 'bottom-9' : 'top-9'}`}>
                                                                                            <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                                                                            <div className="relative z-50">
                                                                                                {isPending ? (
                                                                                                    <button onClick={() => { handlePromotionStatusChange(promo.id, 'APPROVED'); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-green-600 hover:bg-green-50 flex items-center gap-2">
                                                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                                                        Approve
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <button onClick={() => { handlePromotionStatusChange(promo.id, 'PENDING'); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                                                                                        Unapprove
                                                                                                    </button>
                                                                                                )}
                                                                                                <div className="border-t border-gray-100 my-1" />
                                                                                                <button onClick={() => { handlePromotionDelete(promo.id); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                                                    Delete
                                                                                                </button>
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
                                                                        <div key={seminar.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <span className="text-sm font-black text-gray-900">{seminar.name}</span>
                                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${isPending ? 'bg-amber-100 text-amber-700' : seminar.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                        {seminar.status}
                                                                                    </span>
                                                                                    {seminar.paymentStatus && (
                                                                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${seminar.paymentStatus === 'PAID' ? 'bg-blue-100 text-blue-700' : seminar.paymentStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' : seminar.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                                            {seminar.paymentStatus === 'PAID' ? 'PAID' : seminar.paymentStatus}
                                                                                        </span>
                                                                                    )}

                                                                                </div>
                                                                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                                                    {seminar.eventName}
                                                                                    <span className="text-gray-300 mx-1">·</span>
                                                                                    {new Date(seminar.eventDate).toLocaleDateString()}
                                                                                    {seminar.belt && <span className="ml-2 font-bold text-gray-500">· {seminar.belt}</span>}
                                                                                </p>
                                                                            </div>

                                                                                <div className="relative flex-shrink-0">
                                                                                    <button
                                                                                        onClick={() => setActionMenuOpen(actionMenuOpen === seminar.id ? null : seminar.id)}
                                                                                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                                                    </button>
                                                                                    {actionMenuOpen === seminar.id && (
                                                                                        <div className={`absolute right-0 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden ${isLastItems ? 'bottom-9' : 'top-9'}`}>
                                                                                            <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />
                                                                                            <div className="relative z-50">
                                                                                                {isPending ? (
                                                                                                    <button onClick={() => { handleSeminarStatusChange(seminar.id, 'APPROVED'); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-green-600 hover:bg-green-50 flex items-center gap-2">
                                                                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                                                        Approve
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <button onClick={() => { handleSeminarStatusChange(seminar.id, 'PENDING'); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                                                                                        Unapprove
                                                                                                    </button>
                                                                                                )}
                                                                                                <button onClick={() => { setEditingSeminar(seminar); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                                                    Edit Details
                                                                                                </button>
                                                                                                {!isPending && (
                                                                                                    <button onClick={() => { handleDownloadQR('seminar', seminar.id); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
                                                                                                        <Download className="w-3.5 h-3.5" />
                                                                                                        Download QR
                                                                                                    </button>
                                                                                                )}
                                                                                                <div className="border-t border-gray-100 my-1" />
                                                                                                <button onClick={() => { handleSeminarDelete(seminar.id); setActionMenuOpen(null) }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                                                    Delete
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

                                                </div>

                                                {/* Pagination - pinned at bottom */}
                                                {(() => {
                                                    const totalPages = registrationType === 'TOURNAMENT' ? totalRegistrationPages : registrationType === 'PROMOTION' ? totalPromotionPages : totalSeminarPages
                                                    const totalItems = registrationType === 'TOURNAMENT' ? filteredRegistrations.length : registrationType === 'PROMOTION' ? filteredPromotions.length : filteredSeminars.length
                                                    if (totalPages <= 1) return null
                                                    return (
                                                        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                Showing {((registrationsPage - 1) * registrationsPerPage) + 1}–{Math.min(registrationsPage * registrationsPerPage, totalItems)} of {totalItems}
                                                            </span>
                                                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                                                <button
                                                                    onClick={() => setRegistrationsPage(p => Math.max(1, p - 1))}
                                                                    disabled={registrationsPage === 1}
                                                                    className={`p-2 rounded-lg transition-all ${registrationsPage <= 1
                                                                        ? 'text-gray-300 cursor-not-allowed hidden'
                                                                        : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                                                        }`}
                                                                >
                                                                    <ChevronLeft className="w-5 h-5" />
                                                                </button>
                                                                <div className="flex items-center gap-1.5 px-3">
                                                                    <span className="text-sm font-bold text-gray-900">Page {registrationsPage}</span>
                                                                    <span className="text-xs text-gray-400 font-medium">of {totalPages}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => setRegistrationsPage(p => Math.min(totalPages, p + 1))}
                                                                    disabled={registrationsPage >= totalPages}
                                                                    className={`p-2 rounded-lg transition-all ${registrationsPage >= totalPages
                                                                        ? 'text-gray-300 cursor-not-allowed hidden'
                                                                        : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                                                        }`}
                                                                >
                                                                    <ChevronRight className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}

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


                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }



                    {/* ✏️ Edit Player Modal */}
                    {
                        editingPlayer && (() => {
                            const categoryName = editingPlayer.category?.name || ''
                            const isHeightBased = /supertoddler|toddler|grade\s*school/i.test(categoryName)
                            const categoryType = /poomsae/i.test(categoryName) ? 'POOMSAE' : /kyukpa/i.test(categoryName) ? 'KYUKPA' : 'KYORUGI'
                            const isPoomsae = categoryType === 'POOMSAE'
                            const isKyukpa = categoryType === 'KYUKPA'
                            return (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingPlayer(null)} />
                                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                                        {/* Header */}
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">Edit Registration</h3>
                                                <p className="text-xs text-gray-500 mt-0.5">{editingPlayer.name} • {editingPlayer.category?.tournament?.name}</p>
                                            </div>
                                            <button
                                                onClick={() => setEditingPlayer(null)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Category Badge */}
                                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</span>
                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                                                {categoryName}
                                            </span>
                                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${isPoomsae ? 'bg-purple-50 text-purple-600' :
                                                isKyukpa ? 'bg-orange-50 text-orange-600' :
                                                    isHeightBased ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {isPoomsae ? 'Poomsae' : isKyukpa ? 'Kyukpa' : isHeightBased ? 'Height-based' : 'Weight-based'}
                                            </span>
                                        </div>

                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault()
                                                const formData = new FormData(e.currentTarget)
                                                handleSaveEdit({
                                                    name: formData.get('name') as string,
                                                    weight: Number(formData.get('weight')) || 0,
                                                    height: Number(formData.get('height')) || 0,
                                                    belt: formData.get('belt') as string,
                                                    skillLevel: formData.get('skillLevel') as string,
                                                    teamId: isPoomsae ? formData.get('teamId') as string : undefined,
                                                    poomsaeType: isPoomsae ? formData.get('poomsaeType') as string : undefined
                                                })
                                            }}
                                            className="px-6 py-5 space-y-5"
                                        >
                                            {/* Name */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Athlete Name</label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    defaultValue={editingPlayer.name}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                    placeholder="Enter full name"
                                                />
                                            </div>

                                            {/* Belt & Skill Level */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Belt Rank</label>
                                                    <GlobalDropdown
                                                        value={editingPlayer.belt || 'White'}
                                                        onChange={(val) => setEditingPlayer({ ...editingPlayer, belt: val })}
                                                        options={['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']}
                                                        fullWidth
                                                    />
                                                    <input type="hidden" name="belt" value={editingPlayer.belt || 'White'} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Skill Level</label>
                                                    <GlobalDropdown
                                                        value={editingPlayer.skillLevel || 'Novice'}
                                                        onChange={(val) => setEditingPlayer({ ...editingPlayer, skillLevel: val })}
                                                        options={['Novice', 'Intermediate', 'Advance']}
                                                        fullWidth
                                                    />
                                                    <input type="hidden" name="skillLevel" value={editingPlayer.skillLevel || 'Novice'} />
                                                </div>
                                            </div>

                                            {/* Smart Height or Weight (Kyorugi only — Kyukpa/Poomsae don't use it for placement) */}
                                            {!isKyukpa && (
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                        {isHeightBased ? 'Height (cm)' : 'Weight (kg)'}
                                                    </label>
                                                    {isHeightBased ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                name="height"
                                                                step="0.1"
                                                                defaultValue={editingPlayer.height || ''}
                                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                                placeholder="Enter height in cm"
                                                            />
                                                            <input type="hidden" name="weight" value={editingPlayer.weight || 0} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="number"
                                                                name="weight"
                                                                step="0.1"
                                                                defaultValue={editingPlayer.weight || ''}
                                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                                placeholder="Enter weight in kg"
                                                            />
                                                            <input type="hidden" name="height" value={editingPlayer.height || 0} />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {isKyukpa && (
                                                <>
                                                    <input type="hidden" name="weight" value={editingPlayer.weight || 0} />
                                                    <input type="hidden" name="height" value={editingPlayer.height || 0} />
                                                </>
                                            )}

                                            {/* Poomsae Event Type & Team ID — Only for POOMSAE */}
                                            {isPoomsae && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Poomsae Type</label>
                                                        <GlobalDropdown
                                                            value={editingPlayer.poomsaeType || 'INDIVIDUAL'}
                                                            onChange={(val) => setEditingPlayer({ ...editingPlayer, poomsaeType: val })}
                                                            options={['INDIVIDUAL', 'PAIR', 'TEAM']}
                                                            fullWidth
                                                        />
                                                        <input type="hidden" name="poomsaeType" value={editingPlayer.poomsaeType || 'INDIVIDUAL'} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Team ID</label>
                                                        <input
                                                            type="text"
                                                            name="teamId"
                                                            defaultValue={editingPlayer.teamId || ''}
                                                            placeholder="e.g. 1, A"
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingPlayer(null)}
                                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="animate-spin w-4 h-4" />
                                                            Saving...
                                                        </>
                                                    ) : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        })()
                    }


                    {/* ✏️ Edit Member Modal */}
                    {
                        editingMember && (() => {
                            const memberAge = editingMember.birthDate
                                ? calculateAge(editingMember.birthDate)
                                : null
                            const isHeightBased = memberAge !== null && memberAge <= 11
                            return (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
                                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                                        {/* ── Header ── */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-red-100 flex items-center justify-center flex-shrink-0 ring-2 ring-gray-100">
                                                    {(editAvatarPreview || editingMember.imageUrl) ? (
                                                        <img src={editAvatarPreview || editingMember.imageUrl || ''} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-red-600 font-black text-sm">{editingMember.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-900">Edit Member Details</h3>
                                                    <p className="text-[11px] text-gray-400 font-medium">{editingMember.name || editingMember.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setEditingMember(null)}
                                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* ── Form ── */}
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault()
                                                const formData = new FormData(e.currentTarget)
                                                handleMemberSave({
                                                    name: formData.get('name'),
                                                    email: formData.get('email') || undefined,
                                                    belt: formData.get('belt'),
                                                    weight: Number(formData.get('weight')) || null,
                                                    height: Number(formData.get('height')) || null,
                                                    gender: formData.get('gender'),
                                                    birthDate: formData.get('birthDate') ? (() => {
                                                        const dateStr = formData.get('birthDate') as string
                                                        const [year, month, day] = dateStr.split('-').map(Number)
                                                        return new Date(Date.UTC(year, month - 1, day))
                                                    })() : undefined
                                                })
                                            }}
                                            className="flex-1 overflow-y-auto"
                                        >
                                            {/* Two-column body */}
                                            <div className="flex gap-0 divide-x divide-gray-100">

                                                {/* ── Left: Avatar column ── */}
                                                <div className="flex flex-col items-center gap-4 px-6 py-6 w-52 flex-shrink-0 bg-gray-50/60">
                                                    <div className="relative group">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const inp = document.getElementById('edit-avatar-input') as HTMLInputElement
                                                                inp?.click()
                                                            }}
                                                            className="w-28 h-28 rounded-2xl overflow-hidden bg-white shadow-md ring-2 ring-gray-200 group-hover:ring-red-400 transition-all relative"
                                                        >
                                                            {(editAvatarPreview || editingMember.imageUrl) ? (
                                                                <img src={editAvatarPreview || editingMember.imageUrl || ''} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-red-100 flex items-center justify-center text-red-600 text-4xl font-black">
                                                                    {editingMember.name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Camera className="w-6 h-6 text-white" />
                                                            </div>
                                                        </button>
                                                        <input
                                                            id="edit-avatar-input"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0]
                                                                if (!file) return
                                                                if (!file.type.startsWith('image/')) { toast.error('Must be an image'); return }
                                                                try {
                                                                    const compressed = await compressImage(file, { maxDimension: 800, quality: 0.8 })
                                                                    setEditAvatarFile(compressed)
                                                                    setEditAvatarPreview(URL.createObjectURL(compressed))
                                                                } catch {
                                                                    setEditAvatarFile(file)
                                                                    setEditAvatarPreview(URL.createObjectURL(file))
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-bold text-gray-700">Profile Photo</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Click to upload</p>
                                                    </div>
                                                    {memberAge !== null && (
                                                        <div className="flex flex-col items-center gap-1.5 w-full">
                                                            <span className="text-[10px] font-bold text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200 w-full text-center">{memberAge} years old</span>
                                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border w-full text-center ${isHeightBased ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                                {isHeightBased ? '⬆ Height-based' : '⚖ Weight-based'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ── Right: Fields column ── */}
                                                <div className="flex-1 px-6 py-6 space-y-5">

                                                    {/* Row 1: Name + Email */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                                                            <input
                                                                type="text"
                                                                name="name"
                                                                defaultValue={editingMember.name || ''}
                                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                                placeholder="Enter full name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                defaultValue={editingMember.email?.includes('@member.ktm') ? '' : editingMember.email || ''}
                                                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                                placeholder="athlete@example.com"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Birth Date + Gender */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Birth Date</label>
                                                            <GlobalCalendar
                                                                value={editingMember.birthDate ? new Date(editingMember.birthDate) : undefined}
                                                                onChange={(date) => setEditingMember({ ...editingMember, birthDate: date })}
                                                                fullWidth
                                                            />
                                                            <input
                                                                type="hidden"
                                                                name="birthDate"
                                                                value={editingMember.birthDate ? (() => {
                                                                    let d = new Date(editingMember.birthDate);
                                                                    const y = d.getFullYear();
                                                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                                                    const day = String(d.getDate()).padStart(2, '0');
                                                                    return `${y}-${m}-${day}`;
                                                                })() : ''}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Gender</label>
                                                            <GlobalDropdown
                                                                value={editingMember.gender || 'Male'}
                                                                onChange={(val) => setEditingMember({ ...editingMember, gender: val })}
                                                                options={['Male', 'Female']}
                                                                fullWidth
                                                            />
                                                            <input type="hidden" name="gender" value={editingMember.gender || 'Male'} />
                                                        </div>
                                                    </div>

                                                    {/* Row 3: Belt + Height/Weight */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Belt Rank</label>
                                                            <GlobalDropdown
                                                                value={editingMember.belt || 'White'}
                                                                onChange={(val) => setEditingMember({ ...editingMember, belt: val })}
                                                                options={['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Maroon', 'Red', 'Brown', 'Black']}
                                                                fullWidth
                                                            />
                                                            <input type="hidden" name="belt" value={editingMember.belt || 'White'} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                                                {isHeightBased ? 'Height' : 'Weight'}
                                                            </label>
                                                            {isHeightBased ? (
                                                                <>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            name="height"
                                                                            step="0.1"
                                                                            defaultValue={editingMember.height || ''}
                                                                            className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900"
                                                                            placeholder="0.0"
                                                                        />
                                                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-gray-400 pointer-events-none">cm</span>
                                                                    </div>
                                                                    <input type="hidden" name="weight" value={editingMember.weight || 0} />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            name="weight"
                                                                            step="0.1"
                                                                            defaultValue={editingMember.weight || ''}
                                                                            className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900"
                                                                            placeholder="0.0"
                                                                        />
                                                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-gray-400 pointer-events-none">kg</span>
                                                                    </div>
                                                                    <input type="hidden" name="height" value={editingMember.height || 0} />
                                                                </>
                                                            )}
                                                            <p className="text-[10px] text-gray-400 mt-1">
                                                                {isHeightBased ? 'For athletes 11 & under.' : 'For athletes over 11.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Sticky footer ── */}
                                            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingMember(null)}
                                                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="px-6 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <Loader2 className="animate-spin w-4 h-4" />
                                                            Saving…
                                                        </>
                                                    ) : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                        })()
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
                                            <GlobalDropdown
                                                label="Belt Rank"
                                                value={editingSeminar.belt || 'White'}
                                                onChange={(val) => {
                                                    setEditingSeminar({ ...editingSeminar, belt: val })
                                                }}
                                                options={[
                                                    'White',
                                                    'Yellow', 'Orange',
                                                    'Green', 'Purple',
                                                    'Blue', 'Maroon',
                                                    'Red', 'Brown',
                                                    'Black'
                                                ]}
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


            < AddAthleteModal
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
        </div>
    )
}
