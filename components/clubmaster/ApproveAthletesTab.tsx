'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCheck, UserX, Search, Loader2, Scale, Ruler, Award, ChevronDown } from 'lucide-react'
import GlobalDropdown from '@/components/GlobalDropdown'
import UserAvatar from '@/components/UserAvatar'

const BELT_OPTIONS = [
    'White', 'Yellow', 'Orange', 'Green', 'Purple',
    'Blue', 'Red', 'Maroon', 'Brown', 'Black'
]

interface PendingAthlete {
    id: string
    name: string | null
    email: string
    gender: string | null
    birthDate: string | null
    country: string | null
    imageUrl: string | null
    clubName: string | null
    createdAt: string | null
}

interface ApproveAthletesTabProps {
    clubName: string
}

export default function ApproveAthletesTab({ clubName }: ApproveAthletesTabProps) {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Form state for each expanded athlete
    const [approvalForms, setApprovalForms] = useState<Record<string, { weight: string; height: string; belt: string }>>({})
    const [submitting, setSubmitting] = useState<string | null>(null)

    // Fetch pending athletes
    const { data: pendingAthletes = [], isLoading, refetch } = useQuery({
        queryKey: ['pending-athletes', clubName],
        queryFn: async () => {
            const res = await fetch(`/api/auth/approve-athlete?clubName=${encodeURIComponent(clubName)}`)
            if (!res.ok) return []
            const data = await res.json()
            return data.data || []
        },
        staleTime: 1000 * 30,
    })

    const filtered = (pendingAthletes as PendingAthlete[]).filter(a => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            a.name?.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.country?.toLowerCase().includes(q)
        )
    })

    const getAge = (birthDate: string | null) => {
        if (!birthDate) return null
        const birth = new Date(birthDate)
        const now = new Date()
        let age = now.getFullYear() - birth.getFullYear()
        const m = now.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
        return age
    }

    const handleExpand = (id: string) => {
        if (expandedId === id) {
            setExpandedId(null)
        } else {
            setExpandedId(id)
            if (!approvalForms[id]) {
                setApprovalForms(prev => ({
                    ...prev,
                    [id]: { weight: '', height: '', belt: 'White' }
                }))
            }
        }
    }

    const handleApprove = async (athlete: PendingAthlete) => {
        const form = approvalForms[athlete.id]
        if (!form?.weight || !form?.height || !form?.belt) {
            toast.error('Please fill in weight, height, and belt rank')
            return
        }

        setSubmitting(athlete.id)
        try {
            const res = await fetch('/api/auth/approve-athlete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    athleteId: athlete.id,
                    action: 'approve',
                    weight: parseFloat(form.weight),
                    height: parseFloat(form.height),
                    belt: form.belt,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Failed to approve')
            } else {
                toast.success(`${athlete.name} has been approved!`)
                setExpandedId(null)
                refetch()
                queryClient.invalidateQueries({ queryKey: ['club-members'] })
            }
        } catch {
            toast.error('Failed to approve athlete')
        } finally {
            setSubmitting(null)
        }
    }

    const handleReject = async (athlete: PendingAthlete) => {
        if (!confirm(`Are you sure you want to reject ${athlete.name}? This will permanently delete their account.`)) return

        setSubmitting(athlete.id)
        try {
            const res = await fetch('/api/auth/approve-athlete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    athleteId: athlete.id,
                    action: 'reject',
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Failed to reject')
            } else {
                toast.success(`${athlete.name} has been rejected and removed`)
                setExpandedId(null)
                refetch()
            }
        } catch {
            toast.error('Failed to reject athlete')
        } finally {
            setSubmitting(null)
        }
    }

    const updateForm = (id: string, field: string, value: string) => {
        setApprovalForms(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Pending Approvals</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {pendingAthletes.length} athlete{pendingAthletes.length !== 1 ? 's' : ''} awaiting verification
                    </p>
                </div>
            </div>

            {/* Search */}
            {pendingAthletes.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or country..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    />
                </div>
            )}

            {/* List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <UserCheck className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-gray-900 font-semibold">No Pending Approvals</p>
                    <p className="text-gray-500 text-sm mt-1">All athletes have been reviewed.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(athlete => {
                        const isExpanded = expandedId === athlete.id
                        const form = approvalForms[athlete.id]
                        const age = getAge(athlete.birthDate)
                        const isProcessing = submitting === athlete.id

                        return (
                            <div key={athlete.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm">
                                {/* Summary Row */}
                                <button
                                    onClick={() => handleExpand(athlete.id)}
                                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                                >
                                    <UserAvatar
                                        src={athlete.imageUrl}
                                        name={athlete.name || '?'}
                                        size={44}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{athlete.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 truncate">{athlete.email}</p>
                                    </div>
                                    <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
                                        {age !== null && <span>{age} yrs</span>}
                                        {athlete.gender && <span>{athlete.gender}</span>}
                                        {athlete.country && <span>{athlete.country}</span>}
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {/* Expanded Form */}
                                {isExpanded && form && (
                                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-4">
                                        {/* Athlete Details */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Gender</p>
                                                <p className="text-gray-900 font-medium">{athlete.gender || '—'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Age</p>
                                                <p className="text-gray-900 font-medium">{age !== null ? `${age} years` : '—'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Country</p>
                                                <p className="text-gray-900 font-medium">{athlete.country || '—'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-1">Club</p>
                                                <p className="text-gray-900 font-medium">{athlete.clubName || '—'}</p>
                                            </div>
                                        </div>

                                        {/* Verification Fields */}
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">
                                                Assign Details
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-1.5">
                                                        <Scale size={12} /> Weight (kg) <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={form.weight}
                                                        onChange={(e) => updateForm(athlete.id, 'weight', e.target.value)}
                                                        placeholder="e.g. 60"
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-1.5">
                                                        <Ruler size={12} /> Height (cm) <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={form.height}
                                                        onChange={(e) => updateForm(athlete.id, 'height', e.target.value)}
                                                        placeholder="e.g. 170"
                                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-1.5">
                                                        <Award size={12} /> Belt Rank <span className="text-red-500">*</span>
                                                    </label>
                                                    <GlobalDropdown
                                                        options={BELT_OPTIONS}
                                                        value={form.belt}
                                                        onChange={(val: string) => updateForm(athlete.id, 'belt', val)}
                                                        fullWidth
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(athlete)}
                                                disabled={isProcessing}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                                            >
                                                {isProcessing ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <UserCheck size={14} />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(athlete)}
                                                disabled={isProcessing}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                                            >
                                                <UserX size={14} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
