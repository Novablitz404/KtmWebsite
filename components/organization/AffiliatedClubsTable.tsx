'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { approveAffiliationProof, rejectAffiliationProof, manuallyActivateAffiliation, getClubMembersForOrg, createMemberForClub } from '@/app/organization/actions'
import { calculateAge } from '@/lib/placement'
import {
    Check, X, Building2, Users, Phone, Mail, MapPin,
    Calendar, Shield, ShieldCheck, ShieldAlert, ShieldX,
    Clock, Eye, CheckCircle, XCircle, ChevronRight, Globe, Award,
    Search, UserPlus, Loader2, User
} from 'lucide-react'

interface ClubData {
    id: string
    name: string
    logoUrl: string | null
    masterName: string
    masterEmail?: string | null
    masterImageUrl?: string | null
    masterBelt?: string | null
    masterGender?: string | null
    masterCountry?: string | null
    memberCount: number
    contactPhone: string | null
    address: string | null
    status: string
    affiliationStatus?: string
    affiliationExpiresAt?: string | null
    affiliationPaidAt?: string | null
    affiliationProofImageUrl?: string | null
    affiliationId?: string | null
}

interface MemberData {
    id: string
    name: string
    email: string
    belt: string | null
    gender: string | null
    weight: number | null
    height: number | null
    birthDate: string | null
    imageUrl: string | null
}

const affiliationBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE': return { bg: 'bg-green-100 text-green-700', label: 'Active', icon: ShieldCheck }
        case 'PENDING_REVIEW': return { bg: 'bg-blue-100 text-blue-700', label: 'Pending', icon: Clock }
        case 'EXPIRED': return { bg: 'bg-amber-100 text-amber-700', label: 'Expired', icon: ShieldAlert }
        default: return { bg: 'bg-red-100 text-red-700', label: 'Unpaid', icon: ShieldX }
    }
}

const BELT_OPTIONS = ['White', 'Yellow', 'Green', 'Blue', 'Red', 'Black', 'Poom']

// ─── Add Member Form ─────────────────────────────────────────────
function AddMemberForm({ clubId, clubName, onSuccess, onCancel }: {
    clubId: string
    clubName: string
    onSuccess: () => void
    onCancel: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState({
        name: '',
        email: '',
        gender: '',
        belt: '',
        weight: '',
        height: '',
        birthDate: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error('Name is required')
            return
        }
        setIsSubmitting(true)
        try {
            const result = await createMemberForClub(clubId, {
                name: form.name.trim(),
                email: form.email.trim() || undefined,
                gender: form.gender || undefined,
                belt: form.belt || undefined,
                weight: form.weight ? parseFloat(form.weight) : undefined,
                height: form.height ? parseFloat(form.height) : undefined,
                birthDate: form.birthDate || undefined,
            })
            if ('error' in result) {
                toast.error(result.error)
            } else {
                toast.success(`${form.name} added to ${clubName}`)
                // Clear form for next entry — keep form open
                setForm({ name: '', email: '', gender: '', belt: '', weight: '', height: '', birthDate: '' })
                onSuccess()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5"

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {(() => {
                const age = form.birthDate ? calculateAge(form.birthDate) : null
                const isHeightBased = age !== null && age <= 11

                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {age !== null && (
                            <div className="sm:col-span-2 flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Age</span>
                                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                    {age}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHeightBased ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {isHeightBased ? 'Height-based' : 'Weight-based'}
                                </span>
                            </div>
                        )}
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className={inputClass}
                                placeholder="Full name"
                                required
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className={inputClass}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Gender</label>
                            <select
                                value={form.gender}
                                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                                className={inputClass}
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Belt</label>
                            <select
                                value={form.belt}
                                onChange={e => setForm(f => ({ ...f, belt: e.target.value }))}
                                className={inputClass}
                            >
                                <option value="">Select</option>
                                {BELT_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Birth Date</label>
                            <input
                                type="date"
                                value={form.birthDate}
                                onChange={e => {
                                    const val = e.target.value
                                    setForm(f => ({ ...f, birthDate: val }))
                                }}
                                className={inputClass}
                            />
                        </div>
                        {!isHeightBased && (
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.weight}
                                    onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                                    className={inputClass}
                                    placeholder="e.g. 55"
                                />
                            </div>
                        )}
                        {isHeightBased && (
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Height (cm)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={form.height}
                                    onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                                    className={inputClass}
                                    placeholder="e.g. 165"
                                />
                            </div>
                        )}
                    </div>
                )
            })()}

            <div className="flex items-center gap-2 pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || !form.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {isSubmitting ? 'Adding...' : 'Add Member'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form >
    )
}

// ─── Club Detail Modal ───────────────────────────────────────────
function ClubDetailModal({ club, onClose }: { club: ClubData, onClose: () => void }) {
    const [tab, setTab] = useState<'overview' | 'members'>('overview')
    const [members, setMembers] = useState<MemberData[]>([])
    const [isLoadingMembers, setIsLoadingMembers] = useState(false)
    const [memberSearch, setMemberSearch] = useState('')
    const [memberPage, setMemberPage] = useState(1)
    const [showAddForm, setShowAddForm] = useState(false)
    const [viewingProof, setViewingProof] = useState<string | null>(null)
    const MEMBERS_PER_PAGE = 10

    // Fetch members when switching to Members tab
    useEffect(() => {
        if (tab === 'members' && members.length === 0 && !isLoadingMembers) {
            loadMembers()
        }
    }, [tab])

    const loadMembers = async () => {
        setIsLoadingMembers(true)
        const result = await getClubMembersForOrg(club.id)
        if ('members' in result) {
            setMembers(result.members as MemberData[])
        } else {
            toast.error(result.error || 'Failed to load members')
        }
        setIsLoadingMembers(false)
    }

    const filteredMembers = useMemo(() => {
        if (!memberSearch.trim()) return members
        const q = memberSearch.toLowerCase()
        return members.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            (m.belt && m.belt.toLowerCase().includes(q))
        )
    }, [members, memberSearch])

    // Reset page when search changes
    useEffect(() => {
        setMemberPage(1)
    }, [memberSearch])

    const memberTotalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE)
    const paginatedMembers = filteredMembers.slice(
        (memberPage - 1) * MEMBERS_PER_PAGE,
        memberPage * MEMBERS_PER_PAGE
    )

    const handleApproveAffiliation = async (affiliationId: string) => {
        const res = await approveAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Affiliation approved — club is now active for 1 year')
            window.location.reload()
        }
    }

    const handleRejectAffiliation = async (affiliationId: string) => {
        if (!confirm('Reject this proof? The club will need to resubmit.')) return
        const res = await rejectAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Proof rejected')
            window.location.reload()
        }
    }

    const handleMarkAsPaid = async (clubId: string) => {
        if (!confirm('Mark this club as paid? Their affiliation will be activated for 1 year.')) return
        const res = await manuallyActivateAffiliation(clubId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Club affiliation activated for 1 year')
            window.location.reload()
        }
    }

    const affBadge = affiliationBadge(club.affiliationStatus || 'UNPAID')
    const AffIcon = affBadge.icon
    const affStatus = club.affiliationStatus || 'UNPAID'

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                {club.logoUrl ? (
                                    <Image src={club.logoUrl} alt={club.name} width={56} height={56} className="object-cover" unoptimized />
                                ) : (
                                    <Building2 className="w-7 h-7 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 truncate">{club.name}</h2>
                                <p className="text-sm text-gray-500">{club.memberCount} members</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setTab('overview')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Building2 size={14} />
                                Overview
                            </button>
                            <button
                                onClick={() => setTab('members')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${tab === 'members' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Users size={14} />
                                Members
                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{club.memberCount}</span>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                        {tab === 'overview' ? (
                            <div className="p-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Left Column */}
                                    <div className="space-y-5">
                                        {/* Affiliation Status Card */}
                                        <div className={`p-4 rounded-xl border ${affStatus === 'ACTIVE' ? 'bg-green-50 border-green-200' :
                                            affStatus === 'PENDING_REVIEW' ? 'bg-blue-50 border-blue-200' :
                                                affStatus === 'EXPIRED' ? 'bg-amber-50 border-amber-200' :
                                                    'bg-red-50 border-red-200'
                                            }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <AffIcon className={`w-5 h-5 ${affStatus === 'ACTIVE' ? 'text-green-600' :
                                                        affStatus === 'PENDING_REVIEW' ? 'text-blue-600' :
                                                            affStatus === 'EXPIRED' ? 'text-amber-600' : 'text-red-600'
                                                        }`} />
                                                    <span className="text-sm font-semibold text-gray-900">Affiliation</span>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${affBadge.bg}`}>
                                                    {affBadge.label}
                                                </span>
                                            </div>
                                            {club.affiliationExpiresAt && affStatus === 'ACTIVE' && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Expires: {new Date(club.affiliationExpiresAt).toLocaleDateString()}
                                                </p>
                                            )}
                                            {club.affiliationPaidAt && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Last paid: {new Date(club.affiliationPaidAt).toLocaleDateString()}
                                                </p>
                                            )}

                                            {affStatus === 'PENDING_REVIEW' && club.affiliationId && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    {club.affiliationProofImageUrl && (
                                                        <button
                                                            onClick={() => setViewingProof(club.affiliationProofImageUrl!)}
                                                            className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3" /> View Proof
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleApproveAffiliation(club.affiliationId!)}
                                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <CheckCircle className="w-3 h-3" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectAffiliation(club.affiliationId!)}
                                                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <XCircle className="w-3 h-3" /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mark as Paid */}
                                        {affStatus !== 'ACTIVE' && affStatus !== 'PENDING_REVIEW' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(club.id)}
                                                className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Mark as Paid
                                            </button>
                                        )}

                                        {/* Club Contact Details */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Club Details</h4>
                                            <div className="space-y-2.5">
                                                {club.address && (
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700">{club.address}</span>
                                                    </div>
                                                )}
                                                {club.contactPhone && (
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span className="text-sm text-gray-700">{club.contactPhone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Members Stat */}
                                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                            <p className="text-2xl font-bold text-gray-900">{club.memberCount}</p>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Members</p>
                                        </div>
                                    </div>

                                    {/* Right Column — Master Details */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Club Master</h4>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                                    {club.masterImageUrl ? (
                                                        <Image src={club.masterImageUrl} alt={club.masterName} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                                    ) : (
                                                        <Users className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{club.masterName}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Club Master</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2.5 pt-1 border-t border-gray-200/60">
                                                {club.masterEmail && (
                                                    <div className="flex items-center gap-2.5 pt-2.5">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-600 truncate">{club.masterEmail}</span>
                                                    </div>
                                                )}
                                                {club.masterBelt && (
                                                    <div className="flex items-center gap-2.5">
                                                        <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-600 capitalize">{club.masterBelt} Belt</span>
                                                    </div>
                                                )}
                                                {club.masterGender && (
                                                    <div className="flex items-center gap-2.5">
                                                        <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-600 capitalize">{club.masterGender}</span>
                                                    </div>
                                                )}
                                                {club.masterCountry && (
                                                    <div className="flex items-center gap-2.5">
                                                        <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs text-gray-600">{club.masterCountry}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ─── Members Tab ─────────────────────────── */
                            <div className="p-5 space-y-4">
                                {/* Search + Add */}
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search members..."
                                            value={memberSearch}
                                            onChange={e => setMemberSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowAddForm(!showAddForm)}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all flex-shrink-0 ${showAddForm
                                            ? 'bg-gray-200 text-gray-700'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                            }`}
                                    >
                                        {showAddForm ? <X size={16} /> : <UserPlus size={16} />}
                                        {showAddForm ? 'Cancel' : 'Add'}
                                    </button>
                                </div>

                                {/* Add Member Form */}
                                {showAddForm && (
                                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <UserPlus size={16} className="text-red-500" />
                                            Add Member to {club.name}
                                        </h4>
                                        <AddMemberForm
                                            clubId={club.id}
                                            clubName={club.name}
                                            onSuccess={() => {
                                                loadMembers()
                                            }}
                                            onCancel={() => setShowAddForm(false)}
                                        />
                                    </div>
                                )}

                                {/* Member List */}
                                {isLoadingMembers ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                                        <Loader2 size={28} className="animate-spin mb-3" />
                                        <p className="text-sm">Loading members...</p>
                                    </div>
                                ) : filteredMembers.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-semibold text-gray-900 mb-1">
                                            {memberSearch ? 'No matches' : 'No members yet'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {memberSearch ? 'Try a different search term.' : 'Click "Add" to add a member to this club.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Age</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Measurement</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {paginatedMembers.map(m => {
                                                    const age = m.birthDate ? calculateAge(m.birthDate) : null
                                                    const isHeightBased = age !== null && age <= 11

                                                    return (
                                                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                                                        {m.imageUrl ? (
                                                                            <Image src={m.imageUrl} alt={m.name} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                                                                        ) : (
                                                                            <User className="w-4 h-4 text-gray-400" />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                                                                        <p className="text-[10px] text-gray-400 truncate">{m.email.includes('noemail-') ? 'No email' : m.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {m.belt ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 capitalize">
                                                                        {m.belt}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300 text-xs">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-gray-600 capitalize">
                                                                {m.gender || <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-gray-600 hidden sm:table-cell">
                                                                {age !== null ? (
                                                                    <span className="font-medium text-gray-900">{age} <span className="text-gray-400 font-normal">y/o</span></span>
                                                                ) : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-gray-600 hidden sm:table-cell">
                                                                {isHeightBased ? (
                                                                    m.height ? <span className="text-blue-600 font-medium">{m.height}cm</span> : <span className="text-gray-300">—</span>
                                                                ) : (
                                                                    m.weight ? <span className="text-amber-600 font-medium">{m.weight}kg</span> : <span className="text-gray-300">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                Showing {((memberPage - 1) * MEMBERS_PER_PAGE) + 1}–{Math.min(memberPage * MEMBERS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
                                            </span>
                                            {memberTotalPages > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                                                        disabled={memberPage <= 1}
                                                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        Prev
                                                    </button>
                                                    <span className="text-xs font-semibold text-gray-700 px-2">
                                                        {memberPage} / {memberTotalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setMemberPage(p => Math.min(memberTotalPages, p + 1))}
                                                        disabled={memberPage >= memberTotalPages}
                                                        className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Proof of Payment Lightbox */}
            {viewingProof && (
                <div
                    className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
                    onClick={() => setViewingProof(null)}
                >
                    <div className="relative max-w-lg w-full max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Proof of Payment</h3>
                            <button onClick={() => setViewingProof(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="relative w-full h-[60vh]">
                            <Image src={viewingProof} alt="Proof of payment" fill className="object-contain" unoptimized />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AffiliatedClubsTable({
    clubs: initialClubs,
    embedded = false,
    isLoading = false
}: {
    clubs: ClubData[],
    embedded?: boolean,
    isLoading?: boolean
}) {
    const [selectedClub, setSelectedClub] = useState<ClubData | null>(null)

    const approvedClubs = initialClubs.filter(c => c.status === 'APPROVED')

    return (
        <div className="space-y-4">
            {/* Clubs Table */}
            <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Master</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Affiliation</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-100" /><div className="h-4 w-32 bg-gray-100 rounded" /></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="mx-auto h-5 w-16 bg-gray-100 rounded-full" /></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="ml-auto h-5 w-5 bg-gray-100 rounded" /></td>
                                    </tr>
                                ))
                            ) : approvedClubs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                        No affiliated clubs.
                                    </td>
                                </tr>
                            ) : (
                                approvedClubs.map((club) => {
                                    const ab = affiliationBadge(club.affiliationStatus || 'UNPAID')
                                    const ABIcon = ab.icon
                                    return (
                                        <tr
                                            key={club.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedClub(club)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {club.logoUrl ? (
                                                        <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold border border-red-100">
                                                            {club.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-gray-900 text-sm">{club.name}</span>
                                                        <p className="text-xs text-gray-400">{club.memberCount} members</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-700 font-medium">{club.masterName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ab.bg}`}>
                                                    <ABIcon className="w-3 h-3" />
                                                    {ab.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Club Detail Modal */}
            {selectedClub && (
                <ClubDetailModal
                    club={selectedClub}
                    onClose={() => setSelectedClub(null)}
                />
            )}
        </div>
    )
}
