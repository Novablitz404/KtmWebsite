'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ChevronRight, Users } from 'lucide-react'
import { approveRegistrations, unapproveRegistration, deleteRegistration, updatePlayerDetails, bulkUnapproveRegistrations, bulkDeleteRegistrations } from '@/app/actions'
import CustomSelect from '@/app/components/ui/CustomSelect'
import PullToRefresh from '@/components/ui/PullToRefresh'
import ClubRegistrationModal from '@/components/club/ClubRegistrationModal'

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
            startDate: Date
        }
    }
    user: {
        name: string | null
        email: string
        clerkId?: string
    } | null
}

interface ClubRegistrationViewProps {
    pendingPlayers?: Player[]
    approvedPlayers?: Player[]
    clubId: string
    clubName: string
    avatars: Record<string, string>
}

export default function ClubRegistrationView({
    pendingPlayers: propPendingPlayers = [],
    approvedPlayers: propApprovedPlayers = [],
    clubId,
    clubName,
    avatars
}: ClubRegistrationViewProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)

    // Local state for immediate UI updates/optimistic UI could be added, 
    // but relying on props + router.refresh() for now as per original.

    const queryClient = useQueryClient()

    // 1. Wrap data in useQuery to enable caching and optimistic updates
    // 1. Wrap data in useQuery to enable caching and optimistic updates
    const { data: registrationData, isLoading } = useQuery({
        queryKey: ['club-registrations', clubId],
        queryFn: async () => {
            const data = await import('@/app/actions').then(mod => mod.fetchClubRegistrationData(clubId))
            return [...data.pendingPlayers, ...data.approvedPlayers]
        },
        initialData: (propPendingPlayers.length > 0 || propApprovedPlayers.length > 0) ? [...propPendingPlayers, ...propApprovedPlayers] : undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const allRegistrations = registrationData || []



    // 2. Mutations with Optimistic Updates

    const approveMutation = useMutation({
        mutationFn: async (player: Player) => {
            const result = await approveRegistrations([{ id: player.id, skillLevel: player.skillLevel || 'Novice' }])
            if (result.error) throw new Error(result.error)
            return result
        },
        onMutate: async (player) => {
            await queryClient.cancelQueries({ queryKey: ['club-registrations', clubId] })
            const previousData = queryClient.getQueryData<Player[]>(['club-registrations', clubId])

            // Optimistically update
            queryClient.setQueryData<Player[]>(['club-registrations', clubId], (old) => {
                if (!old) return []
                return old.map(p => p.id === player.id ? { ...p, registrationStatus: 'APPROVED' } : p)
            })

            return { previousData }
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['club-registrations', clubId], context?.previousData)
            toast.error('Failed to approve')
        },
        onSettled: () => {
            // queryClient.invalidateQueries({ queryKey: ['club-registrations', clubId] })
            // We can skip invalidation if we trust our return, but ideally we invalidate.
            router.refresh() // Keep this as backup purely for server-side props sync if needed, but Query handles UI.
        }
    })

    const unapproveMutation = useMutation({
        mutationFn: unapproveRegistration,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['club-registrations', clubId] })
            const previousData = queryClient.getQueryData<Player[]>(['club-registrations', clubId])
            queryClient.setQueryData<Player[]>(['club-registrations', clubId], (old) => {
                if (!old) return []
                return old.map(p => p.id === id ? { ...p, registrationStatus: 'PENDING' } : p)
            })
            return { previousData }
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['club-registrations', clubId], context?.previousData)
            toast.error('Failed to unapprove')
        },
        onSettled: () => router.refresh()
    })

    const deleteMutation = useMutation({
        mutationFn: deleteRegistration,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['club-registrations', clubId] })
            const previousData = queryClient.getQueryData<Player[]>(['club-registrations', clubId])
            queryClient.setQueryData<Player[]>(['club-registrations', clubId], (old) => {
                if (!old) return []
                return old.filter(p => p.id !== id)
            })
            return { previousData }
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['club-registrations', clubId], context?.previousData)
            toast.error('Failed to delete')
        },
        onSettled: () => router.refresh()
    })

    // UI States
    const [registrationsPage, setRegistrationsPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')
    const [registrationSearchQuery, setRegistrationSearchQuery] = useState('')

    // Selection State
    const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<string>>(new Set())
    const [bulkSelectMode, setBulkSelectMode] = useState(false)
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

    // Edit Modal State
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

    // Pagination constants
    const registrationsPerPage = 10

    // Realtime Updates Subscription
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
                    if (payload.eventType === 'INSERT') {
                        toast.info('New registration request')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clubId, router])

    // --- Derived Data ---

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

    // Registration Pagination Logic
    const totalRegistrationPages = Math.ceil(filteredRegistrations.length / registrationsPerPage)
    const currentRegistrations = filteredRegistrations.slice(
        (registrationsPage - 1) * registrationsPerPage,
        registrationsPage * registrationsPerPage
    )

    const getPlayerAvatar = (player: Player) => {
        const clerkId = player.user?.clerkId
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
        e.stopPropagation()
        const newSet = new Set(selectedRegistrationIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedRegistrationIds(newSet)
    }

    // --- Action Handlers ---

    const handleApprove = (player: Player) => {
        approveMutation.mutate(player, {
            onSuccess: () => toast.success('Registration approved')
        })
    }

    const handleUnapprove = (id: string) => {
        unapproveMutation.mutate(id, {
            onSuccess: () => toast.success('Registration unapproved')
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm('Are you sure you want to delete this registration?')) return
        deleteMutation.mutate(id, {
            onSuccess: () => toast.success('Registration deleted')
        })
    }

    const handleSaveEdit = async (data: { name?: string, height?: number, weight?: number, belt?: string, skillLevel?: string }) => {
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

    if (isLoading && !registrationData) {
        return (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                    <div className="h-16 bg-gray-50 border-b border-gray-100 flex items-center px-6 gap-8">
                        <div className="h-4 bg-gray-200 rounded w-6"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-4 bg-gray-200 rounded w-32 ml-auto"></div>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-20 border-b border-gray-50 px-6 flex items-center gap-8">
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            <div className="flex items-center gap-3 w-48">
                                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                            <div className="h-4 w-48 bg-gray-200 rounded"></div>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                            <div className="h-8 w-24 bg-gray-200 rounded-lg ml-auto"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20 sm:pb-8">
            <div className="max-w-[1400px] mx-auto sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900">Registration</h1>
                        </div>
                        <p className="text-gray-500">Manage pending approvals and athlete registrations</p>
                    </div>

                    {/* Pending Count Badge (if any) */}
                    <div className="flex items-center gap-4">
                        {propPendingPlayers.length > 0 && (
                            <div className="inline-flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100 self-start sm:self-auto">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                                <span className="text-sm font-bold text-yellow-700">{propPendingPlayers.length} Pending Actions</span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsRegistrationModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
                        >
                            <Users size={16} />
                            <span className="hidden sm:inline">Add Participant</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-0 z-20 mx-4 sm:mx-0">
                        {/* Search */}
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, tournament..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                value={registrationSearchQuery}
                                onChange={(e) => {
                                    setRegistrationSearchQuery(e.target.value)
                                    setRegistrationsPage(1)
                                }}
                            />
                        </div>

                        {/* Status Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                            {(['ALL', 'PENDING', 'APPROVED'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab)
                                        setRegistrationsPage(1)
                                        setSelectedRegistrationIds(new Set())
                                    }}
                                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>

                        {/* Mobile Bulk Toggle */}
                        <div className="sm:hidden w-full">
                            <button
                                onClick={() => setBulkSelectMode(!bulkSelectMode)}
                                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${bulkSelectMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                {bulkSelectMode ? 'Cancel Selection' : 'Select Multiple'}
                            </button>
                        </div>
                    </div>


                    {/* --- Content Area --- */}
                    <PullToRefresh className="min-h-[60vh] mx-4 sm:mx-0" mode="overlay">

                        {/* Desktop Table View */}
                        <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={currentRegistrations.length > 0 && selectedRegistrationIds.size === currentRegistrations.length}
                                                    onChange={toggleSelectAll}
                                                    disabled={currentRegistrations.length === 0}
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Details</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Specs</th>
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {currentRegistrations.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-24 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-3xl">📝</div>
                                                        <h3 className="text-lg font-semibold text-gray-900">No registrations found</h3>
                                                        <p className="text-gray-500 mt-1">Try adjusting your filters</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentRegistrations.map((player) => {
                                                const avatar = getPlayerAvatar(player)
                                                const isPending = player.registrationStatus === 'PENDING'
                                                return (
                                                    <tr key={player.id} className="group hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRegistrationIds.has(player.id)}
                                                                    onChange={(e) => toggleSelect(player.id, e as any)}
                                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {avatar ? (
                                                                    <img src={avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                                                        {player.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-semibold text-gray-900">{player.name}</div>
                                                                    {player.user?.email && <div className="text-xs text-gray-500">{player.user.email}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-medium text-gray-900">{player.category.tournament.name}</div>
                                                            <div className="text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">
                                                                {player.category.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-1">
                                                                <div className="text-xs text-gray-500">Belt: <span className="font-medium text-gray-900">{player.belt || 'N/A'}</span></div>
                                                                <div className="text-xs text-gray-500">Weight: <span className="font-medium text-gray-900">{player.weight ? `${player.weight}kg` : 'N/A'}</span></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {isPending ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                                                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                                                                    PENDING
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                                    APPROVED
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {isPending ? (
                                                                    <button
                                                                        onClick={() => handleApprove(player)}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm disabled:opacity-50"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleUnapprove(player.id)}
                                                                        disabled={submitting}
                                                                        className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setEditingPlayer(player)}
                                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                                    title="Edit"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(player.id)}
                                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                    title="Delete"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile List View */}
                        <div className="sm:hidden space-y-3">
                            {currentRegistrations.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                                    No registrations found.
                                </div>
                            ) : (
                                currentRegistrations.map((player) => {
                                    const avatar = getPlayerAvatar(player)
                                    const isPending = player.registrationStatus === 'PENDING'
                                    const isSelected = selectedRegistrationIds.has(player.id)

                                    return (
                                        <div key={player.id} className={`bg-white rounded-xl border p-4 transition-all ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                                            <div className="flex items-start gap-3">
                                                {/* Selection Checkbox (Visible in bulk mode) */}
                                                {bulkSelectMode && (
                                                    <div className="pt-1">
                                                        <div
                                                            onClick={(e) => toggleSelect(player.id, e)}
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                                                        >
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-center gap-2">
                                                            {avatar ? (
                                                                <img src={avatar} className="w-8 h-8 rounded-full bg-gray-100 object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{player.name.charAt(0)}</div>
                                                            )}
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 text-sm">{player.name}</h3>
                                                                <p className="text-xs text-gray-500">{player.category.tournament.name}</p>
                                                            </div>
                                                        </div>
                                                        {isPending ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">PENDING</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">APPROVED</span>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                        <span className="font-medium text-indigo-600">{player.category.name}</span>
                                                        <span>•</span>
                                                        <span>{player.belt}</span>
                                                        <span>•</span>
                                                        <span>{player.weight}kg</span>
                                                    </div>

                                                    {/* Action Buttons (if not selecting) */}
                                                    {!bulkSelectMode && (
                                                        <div className="mt-3 flex gap-2">
                                                            {isPending ? (
                                                                <button
                                                                    onClick={() => handleApprove(player)}
                                                                    disabled={submitting}
                                                                    className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold shadow-sm"
                                                                >
                                                                    Approve
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUnapprove(player.id)}
                                                                    disabled={submitting}
                                                                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-semibold"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setEditingPlayer(player)}
                                                                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Pagination */}
                        {totalRegistrationPages > 1 && (
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 mt-4">
                                <button
                                    onClick={() => setRegistrationsPage(p => Math.max(1, p - 1))}
                                    disabled={registrationsPage === 1}
                                    className="px-4 py-2 text-sm font-medium disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-500">{registrationsPage} / {totalRegistrationPages}</span>
                                <button
                                    onClick={() => setRegistrationsPage(p => Math.min(totalRegistrationPages, p + 1))}
                                    disabled={registrationsPage === totalRegistrationPages}
                                    className="px-4 py-2 text-sm font-medium disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        <div className="h-12" /> {/* Bottom Spacer */}
                    </PullToRefresh>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedRegistrationIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                        <div>
                            <span className="font-bold text-gray-900">{selectedRegistrationIds.size}</span>
                            <span className="text-gray-500 text-sm ml-1">selected</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkApprove}
                                disabled={submitting}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-green-700"
                            >
                                Approve
                            </button>
                            <button
                                onClick={handleBulkUnapprove}
                                disabled={submitting}
                                className="px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-yellow-600"
                            >
                                Revoke
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={submitting}
                                className="px-4 py-2 bg-red-100 text-red-700 text-sm font-bold rounded-lg hover:bg-red-200"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Participant Modal */}
            <ClubRegistrationModal
                isOpen={isRegistrationModalOpen}
                onClose={() => setIsRegistrationModalOpen(false)}
                clubId={clubId}
                clubName={clubName}
            />

            {/* Edit Modal */}
            {editingPlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingPlayer(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-4">Edit {editingPlayer.name}</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const fd = new FormData(e.currentTarget)
                                handleSaveEdit({
                                    name: fd.get('name') as string,
                                    weight: Number(fd.get('weight')),
                                    height: Number(fd.get('height')),
                                    belt: fd.get('belt') as string,
                                    skillLevel: fd.get('skillLevel') as string
                                })
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                <input name="name" defaultValue={editingPlayer.name} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <CustomSelect
                                        label="Belt"
                                        value={editingPlayer.belt || ''}
                                        onChange={(v) => setEditingPlayer({ ...editingPlayer, belt: v })}
                                        options={['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']}
                                        className="w-full"
                                    />
                                    <input type="hidden" name="belt" value={editingPlayer.belt || ''} />
                                </div>
                                <div>
                                    <CustomSelect
                                        label="Level"
                                        value={editingPlayer.skillLevel || 'Novice'}
                                        onChange={(v) => setEditingPlayer({ ...editingPlayer, skillLevel: v })}
                                        options={['Novice', 'Advance']}
                                        className="w-full"
                                    />
                                    <input type="hidden" name="skillLevel" value={editingPlayer.skillLevel || 'Novice'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (kg)</label>
                                    <input type="number" step="0.1" name="weight" defaultValue={editingPlayer.weight || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Height (cm)</label>
                                    <input type="number" name="height" defaultValue={editingPlayer.height || ''} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setEditingPlayer(null)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}
