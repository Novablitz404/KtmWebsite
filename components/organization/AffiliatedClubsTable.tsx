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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

                    {/* ── Dark Hero Header ── */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 flex-shrink-0">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {club.logoUrl ? <Image src={club.logoUrl} alt={club.name} width={64} height={64} className="object-cover" unoptimized /> : <Building2 className="w-8 h-8 text-white/50" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-black text-white tracking-tight truncate">{club.name}</h2>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        affStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                        affStatus === 'PENDING_REVIEW' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                        affStatus === 'EXPIRED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-red-500/20 text-red-300 border border-red-500/30'
                                    }`}>
                                        <AffIcon className="w-3 h-3" />
                                        {affBadge.label}
                                    </span>
                                    <span className="text-white/50 text-xs font-medium">{club.memberCount} members</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stat pills */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
                                <Users className="w-3.5 h-3.5 text-white/60" />
                                <span className="text-xs font-bold text-white">{club.memberCount}</span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Members</span>
                            </div>
                            {club.affiliationExpiresAt && affStatus === 'ACTIVE' && (
                                <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
                                    <Calendar className="w-3.5 h-3.5 text-white/60" />
                                    <span className="text-xs font-bold text-white">Expires {new Date(club.affiliationExpiresAt).toLocaleDateString()}</span>
                                </div>
                            )}
                            {club.affiliationPaidAt && (
                                <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10">
                                    <Shield className="w-3.5 h-3.5 text-white/60" />
                                    <span className="text-xs font-bold text-white">Paid {new Date(club.affiliationPaidAt).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Tab switcher */}
                        <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1 w-fit">
                            {([
                                { id: 'overview' as const, label: 'Overview', Icon: Building2 },
                                { id: 'members'  as const, label: 'Members',  Icon: Users },
                            ]).map(t => (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}>
                                    <t.Icon size={13} />
                                    {t.label}
                                    {t.id === 'members' && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === 'members' ? 'bg-gray-100 text-gray-600' : 'bg-white/20 text-white'}`}>{club.memberCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="flex-1 overflow-y-auto">
                        {tab === 'overview' ? (
                            <div className="p-6 space-y-4">

                                {/* Affiliation Actions */}
                                {affStatus === 'PENDING_REVIEW' && club.affiliationId && (

                                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Pending Review — Action Required</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {club.affiliationProofImageUrl && (
                                                <button onClick={() => setViewingProof(club.affiliationProofImageUrl!)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors">
                                                    <Eye className="w-3.5 h-3.5" /> View Proof
                                                </button>
                                            )}
                                            <button onClick={() => handleApproveAffiliation(club.affiliationId!)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                                            </button>
                                            <button onClick={() => handleRejectAffiliation(club.affiliationId!)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors">
                                                <XCircle className="w-3.5 h-3.5" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {affStatus !== 'ACTIVE' && affStatus !== 'PENDING_REVIEW' && (
                                    <button onClick={() => handleMarkAsPaid(club.id)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-2xl hover:bg-emerald-700 transition-colors shadow-sm">
                                        <CheckCircle className="w-4 h-4" /> Mark as Paid — Activate for 1 Year
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Club Details */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Club Details</p>
                                        {club.address ? (
                                            <div className="flex items-start gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <span className="text-sm text-gray-700 leading-snug">{club.address}</span>
                                            </div>
                                        ) : null}
                                        {club.contactPhone ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <span className="text-sm text-gray-700">{club.contactPhone}</span>
                                            </div>
                                        ) : null}
                                        {!club.address && !club.contactPhone && (
                                            <p className="text-xs text-gray-400">No contact details on file.</p>
                                        )}
                                    </div>

                                    {/* Club Master */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Club Master</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                                {club.masterImageUrl ? (
                                                    <Image src={club.masterImageUrl} alt={club.masterName} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                                                ) : (
                                                    <Users className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{club.masterName}</p>
                                                {club.masterBelt && <p className="text-xs text-gray-500 capitalize">{club.masterBelt} Belt</p>}
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-200 pt-3 space-y-2">
                                            {club.masterEmail && (
                                                <div className="flex items-center gap-2.5">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 truncate">{club.masterEmail}</span>
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
                        ) : (
                            /* ── Members Tab ── */
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" placeholder="Search members..." value={memberSearch}
                                            onChange={e => setMemberSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors bg-gray-50"
                                        />
                                    </div>
                                    <button onClick={() => setShowAddForm(!showAddForm)}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex-shrink-0 ${showAddForm ? 'bg-gray-200 text-gray-700' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'}`}>
                                        {showAddForm ? <X size={14} /> : <UserPlus size={14} />}
                                        {showAddForm ? 'Cancel' : 'Add'}
                                    </button>
                                </div>

                                {showAddForm && (
                                    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Add Member to {club.name}</p>
                                        <AddMemberForm clubId={club.id} clubName={club.name}
                                            onSuccess={() => { loadMembers() }}
                                            onCancel={() => setShowAddForm(false)} />
                                    </div>
                                )}

                                {isLoadingMembers ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                                        <Loader2 size={28} className="animate-spin mb-3" />
                                        <p className="text-sm font-medium">Loading members...</p>
                                    </div>
                                ) : filteredMembers.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <User className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 mb-1">{memberSearch ? 'No matches' : 'No members yet'}</p>
                                        <p className="text-xs text-gray-400">{memberSearch ? 'Try a different search.' : 'Click "Add" to add a member.'}</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100 bg-gray-50">
                                                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Athlete</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Belt</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Gender</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Age</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Measurement</th>
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
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                                                        {m.imageUrl ? <Image src={m.imageUrl} alt={m.name} width={32} height={32} className="object-cover w-full h-full" unoptimized /> : <User className="w-4 h-4 text-gray-400" />}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 truncate">{m.name}</p>
                                                                        <p className="text-[10px] text-gray-400 truncate">{m.email.includes('noemail-') ? 'No email' : m.email}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {m.belt ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-700 capitalize">{m.belt}</span> : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs text-gray-600 capitalize">{m.gender || <span className="text-gray-300">—</span>}</td>
                                                            <td className="px-4 py-3 text-center text-xs hidden sm:table-cell">
                                                                {age !== null ? <span className="font-bold text-gray-900">{age}<span className="text-gray-400 font-normal"> y/o</span></span> : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-xs hidden sm:table-cell">
                                                                {isHeightBased ? (m.height ? <span className="text-blue-600 font-bold">{m.height}cm</span> : <span className="text-gray-300">—</span>) : (m.weight ? <span className="text-amber-600 font-bold">{m.weight}kg</span> : <span className="text-gray-300">—</span>)}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-xs text-gray-500 font-medium">
                                                {((memberPage - 1) * MEMBERS_PER_PAGE) + 1}–{Math.min(memberPage * MEMBERS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
                                            </span>
                                            {memberTotalPages > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setMemberPage(p => Math.max(1, p - 1))} disabled={memberPage <= 1}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30">Prev</button>
                                                    <span className="text-xs font-black text-gray-700 px-2">{memberPage} / {memberTotalPages}</span>
                                                    <button onClick={() => setMemberPage(p => Math.min(memberTotalPages, p + 1))} disabled={memberPage >= memberTotalPages}
                                                        className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30">Next</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Proof Lightbox */}
            {viewingProof && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setViewingProof(null)}>
                    <div className="relative max-w-lg w-full max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proof of Payment</p>
                            <button onClick={() => setViewingProof(null)} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"><X className="w-4 h-4" /></button>
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
