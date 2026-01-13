'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveRegistrations, unapproveRegistration, deleteRegistration, updatePlayerDetails, bulkUnapproveRegistrations, bulkDeleteRegistrations } from '@/app/actions'
import CustomSelect from '@/app/components/ui/CustomSelect'
import PullToRefresh from '@/components/ui/PullToRefresh'

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

interface ClubEventsViewProps {
    pendingPlayers: Player[]
    approvedPlayers: Player[]
    clubTournaments: TournamentStats[]
    avatars: Record<string, string>
}

export default function ClubEventsView({
    pendingPlayers,
    approvedPlayers,
    clubTournaments,
    avatars
}: ClubEventsViewProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [registrationsPage, setRegistrationsPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL')

    // Selection State
    const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<Set<string>>(new Set())
    const [bulkSelectMode, setBulkSelectMode] = useState(false)
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

    // Constants
    const registrationsPerPage = 10
    const allRegistrations = [...pendingPlayers, ...approvedPlayers]

    const filteredRegistrations = allRegistrations.filter(player => {
        if (activeTab === 'ALL') return true
        return player.registrationStatus === activeTab
    })

    const totalRegistrationPages = Math.ceil(filteredRegistrations.length / registrationsPerPage)
    const currentRegistrations = filteredRegistrations.slice(
        (registrationsPage - 1) * registrationsPerPage,
        registrationsPage * registrationsPerPage
    )

    const getPlayerAvatar = (player: Player) => {
        const clerkId = (player.user as any)?.clerkId
        return clerkId && avatars[clerkId] ? avatars[clerkId] : null
    }

    // --- Handlers ---
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const newSet = new Set(selectedRegistrationIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedRegistrationIds(newSet)
    }

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
            setBulkSelectMode(false)
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
            setBulkSelectMode(false)
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
            setBulkSelectMode(false)
        }
    }

    return (
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
                                                <div
                                                    className="fixed inset-0 z-30"
                                                    onClick={() => setActionMenuOpen(null)}
                                                />
                                                <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 z-40 overflow-hidden ${isLastItems ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
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

                {/* Floating Bulk Action Bar */}
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
    )
}
