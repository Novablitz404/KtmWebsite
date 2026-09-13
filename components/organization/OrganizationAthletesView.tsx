'use client'

import { useState, useEffect } from 'react'
import { Search, ShieldCheck, ShieldOff, IdCard, Users, Pencil, X, Loader2, KeyRound } from 'lucide-react'
import { getOrganizationAthletes, getOrganizationClubNames, updateOrgAthleteDetails } from '@/app/organization/actions'
import { toast } from 'sonner'
import UserAvatar from '@/components/UserAvatar'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { COUNTRIES } from '@/lib/countries'

interface Athlete {
    id: string
    name: string | null
    email: string
    clubName: string | null
    belt: string | null
    isVerified: boolean
    athleteNumber: string | null
    imageUrl: string | null
    country: string | null
    createdAt: Date | null
    licensePaymentStatus: string | null
    licenseRequestedVia: string | null
    birthDate: Date | null
    weight: number | null
    height: number | null
    gender: string | null
}

const PAGE_SIZE = 15

export default function OrganizationAthletesView() {
    const [athletes, setAthletes]           = useState<Athlete[]>([])
    const [isLoading, setIsLoading]         = useState(true)
    const [search, setSearch]               = useState('')
    const [filter, setFilter]               = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
    const [page, setPage]                   = useState(1)
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    const [availableClubs, setAvailableClubs] = useState<string[]>([])
    const [isEditing, setIsEditing]         = useState(false)
    const [editForm, setEditForm]           = useState<any>({})
    const [isSavingEdit, setIsSavingEdit]   = useState(false)

    useEffect(() => { loadAthletes() }, [])
    useEffect(() => { setPage(1) }, [search, filter])

    async function loadAthletes() {
        setIsLoading(true)
        try {
            const [data, clubs] = await Promise.all([
                getOrganizationAthletes(),
                getOrganizationClubNames(),
            ])
            setAthletes(data as Athlete[])
            setAvailableClubs(clubs)
        } catch {
            toast.error('Failed to load athletes')
        } finally {
            setIsLoading(false)
        }
    }

    function openAthlete(athlete: Athlete) {
        setSelectedAthlete(athlete)
        setIsEditing(false)
        setEditForm({
            birthDate: athlete.birthDate ? (() => {
                const d = new Date(athlete.birthDate!);
                return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            })() : '',
            weight: athlete.weight ?? '',
            height: athlete.height ?? '',
            belt: athlete.belt || '',
            gender: athlete.gender || '',
            clubName: athlete.clubName || '',
            country: athlete.country || '',
        })
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedAthlete) return
        setIsSavingEdit(true)
        try {
            const result = await updateOrgAthleteDetails(selectedAthlete.id, editForm)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success('Athlete details updated')
                setIsEditing(false)
                await loadAthletes()
                const updated = { ...selectedAthlete, ...editForm, weight: editForm.weight ? parseFloat(editForm.weight) : null, height: editForm.height ? parseFloat(editForm.height) : null, birthDate: editForm.birthDate ? new Date(editForm.birthDate) : null }
                setSelectedAthlete(updated)
            }
        } catch {
            toast.error('Failed to update athlete details')
        } finally {
            setIsSavingEdit(false)
        }
    }

    const filteredAthletes = athletes.filter(a => {
        const matchesSearch =
            !search ||
            a.name?.toLowerCase().includes(search.toLowerCase()) ||
            a.email.toLowerCase().includes(search.toLowerCase()) ||
            a.clubName?.toLowerCase().includes(search.toLowerCase()) ||
            a.athleteNumber?.toLowerCase().includes(search.toLowerCase())
        const matchesFilter =
            filter === 'all' ||
            (filter === 'active'   && a.isVerified) ||
            (filter === 'inactive' && !a.isVerified && a.licensePaymentStatus !== 'PENDING_ACTIVATION') ||
            (filter === 'pending'  && a.licensePaymentStatus === 'PENDING_ACTIVATION')
        return matchesSearch && matchesFilter
    })

    const totalPages       = Math.ceil(filteredAthletes.length / PAGE_SIZE)
    const paginatedAthletes = filteredAthletes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const activeCount      = athletes.filter(a => a.isVerified).length
    const inactiveCount    = athletes.filter(a => !a.isVerified && a.licensePaymentStatus !== 'PENDING_ACTIVATION').length
    const pendingCount     = athletes.filter(a => a.licensePaymentStatus === 'PENDING_ACTIVATION').length

    const FILTER_TABS = [
        { id: 'all'      as const, label: 'All',      count: athletes.length },
        { id: 'active'   as const, label: 'Active',   count: activeCount },
        { id: 'pending'  as const, label: 'Pending',  count: pendingCount },
        { id: 'inactive' as const, label: 'Inactive', count: inactiveCount },
    ]

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Athletes</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage athlete profiles. License activation is handled by KTM.</p>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Athletes', value: athletes.length, Icon: Users,        iconBg: 'bg-gray-100',   iconColor: 'text-gray-600',   valColor: 'text-gray-900' },
                    { label: 'Active Licenses',   value: activeCount,     Icon: ShieldCheck,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valColor: 'text-emerald-600' },
                    { label: 'Inactive Licenses', value: inactiveCount,   Icon: ShieldOff,    iconBg: 'bg-gray-100',   iconColor: 'text-gray-400',   valColor: 'text-gray-400' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                                <s.Icon className={`w-5 h-5 ${s.iconColor}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-black ${s.valColor}`}>{isLoading ? '—' : s.value}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main table card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Card toolbar: filter pills + search */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                        {FILTER_TABS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    filter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {f.label}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                    filter === f.id ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, club, or number..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
                        />
                    </div>
                </div>

                {/* Table content */}
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 size={28} className="animate-spin mb-3" />
                        <p className="text-sm font-medium">Loading athletes...</p>
                    </div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <IdCard className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">No Athletes Found</p>
                        <p className="text-xs text-gray-400">
                            {search ? 'Try a different search term or filter.' : 'No athletes are registered under your clubs.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Athlete</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Club</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Belt</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Athlete Number</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar
                                                    src={athlete.imageUrl}
                                                    name={athlete.name}
                                                    size={36}
                                                    className="!bg-gray-100 border border-gray-200"
                                                    textClassName="!text-gray-400"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{athlete.name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{athlete.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <p className="text-sm text-gray-700 font-medium">{athlete.clubName || <span className="text-gray-300">—</span>}</p>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-sm text-gray-700 capitalize">{athlete.belt || <span className="text-gray-300">—</span>}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                                {athlete.athleteNumber || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            {athlete.isVerified ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                                </span>
                                            ) : athlete.licensePaymentStatus === 'PENDING_ACTIVATION' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openAthlete(athlete)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200"
                                                    title="Edit athlete profile"
                                                >
                                                    <Pencil className="w-3 h-3" /> Edit Profile
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Premium pagination footer */}
                {!isLoading && filteredAthletes.length > PAGE_SIZE && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAthletes.length)} of {filteredAthletes.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Prev
                            </button>
                            <span className="text-xs font-black text-gray-700 px-2">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl border border-transparent hover:border-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Edit athlete profile modal ── */}
            {selectedAthlete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAthlete(null)}>
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Basic details and attributes.</p>
                            </div>
                            <button onClick={() => { setSelectedAthlete(null); setIsEditing(false) }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto bg-white">
                            <div className="space-y-8 text-left">

                                <form id="edit-athlete-form" onSubmit={handleSaveEdit} className="space-y-6">
                                    <div className="flex justify-between items-start mb-2 pb-6 border-b border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <UserAvatar
                                                src={selectedAthlete.imageUrl}
                                                name={selectedAthlete.name}
                                                size={64}
                                                className="!bg-red-50 border-2 border-red-100 shadow-sm"
                                                textClassName="!text-red-600"
                                            />
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{selectedAthlete.name || 'Unknown'}</h3>
                                                <p className="text-sm text-gray-500 mt-0.5">{selectedAthlete.email}</p>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full mt-1.5 ${
                                                    selectedAthlete.isVerified
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        : selectedAthlete.licensePaymentStatus === 'PENDING_ACTIVATION'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                                                }`}>
                                                    {selectedAthlete.isVerified ? 'License Active' : selectedAthlete.licensePaymentStatus === 'PENDING_ACTIVATION' ? 'Pending Approval' : 'License Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        {!isEditing && (
                                            <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-blue-600 font-medium hover:underline flex-shrink-0">
                                                Edit Details
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Birth Date</label>
                                            {isEditing ? (
                                                <GlobalCalendar
                                                    value={editForm.birthDate}
                                                    onChange={(date) => setEditForm({ ...editForm, birthDate: date.toISOString().split('T')[0] })}
                                                    fullWidth
                                                />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.birthDate ? (() => {
                                                const d = new Date(selectedAthlete.birthDate);
                                                return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString();
                                            })() : 'Not set'}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                            {isEditing ? (
                                                <GlobalDropdown
                                                    value={editForm.gender}
                                                    options={[
                                                        { label: 'Male', value: 'Male' },
                                                        { label: 'Female', value: 'Female' }
                                                    ]}
                                                    onChange={(val) => setEditForm({ ...editForm, gender: val })}
                                                    fullWidth
                                                />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.gender || 'Not set'}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Weight (kg)</label>
                                            {isEditing ? (
                                                <input type="number" step="0.1" value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none" />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.weight || 'Not set'}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Height (cm)</label>
                                            {isEditing ? (
                                                <input type="number" step="0.1" value={editForm.height} onChange={e => setEditForm({ ...editForm, height: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none" />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.height || 'Not set'}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Belt</label>
                                            {isEditing ? (
                                                <GlobalDropdown
                                                    value={editForm.belt}
                                                    options={[
                                                        'White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'
                                                    ]}
                                                    onChange={(val) => setEditForm({ ...editForm, belt: val })}
                                                    fullWidth
                                                />
                                            ) : <p className="text-sm text-gray-900 capitalize">{selectedAthlete.belt || 'Not set'}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Club Name</label>
                                            {isEditing ? (
                                                <GlobalDropdown
                                                    value={editForm.clubName}
                                                    options={availableClubs.map(c => ({ label: c, value: c }))}
                                                    searchable
                                                    onChange={(val) => setEditForm({ ...editForm, clubName: val })}
                                                    fullWidth
                                                />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.clubName || 'Independent'}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Athlete Number</label>
                                            <input
                                                type="text"
                                                value={selectedAthlete.athleteNumber || 'Not assigned'}
                                                disabled
                                                title="Athlete Numbers are issued by KTM and can't be edited here."
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed font-mono"
                                            />
                                        </div>
                                        <div className="z-[60]">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Country</label>
                                            {isEditing ? (
                                                <GlobalDropdown
                                                    value={editForm.country}
                                                    options={COUNTRIES.map(c => ({ label: c, value: c }))}
                                                    searchable
                                                    onChange={(val) => setEditForm({ ...editForm, country: val })}
                                                    fullWidth
                                                />
                                            ) : <p className="text-sm text-gray-900">{selectedAthlete.country || 'Not set'}</p>}
                                        </div>
                                    </div>
                                </form>

                                {/* License status note — activation is KTM's call, not the org's */}
                                {selectedAthlete.licensePaymentStatus === 'PENDING_ACTIVATION' && (
                                    <div className="pt-6 border-t border-gray-200">
                                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                                            <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                A license activation request for this athlete is pending KTM's review
                                                {selectedAthlete.licenseRequestedVia === 'CLUB_MASTER' ? ' (requested by your club master)' : ' (submitted by the athlete)'}.
                                                Only KTM can approve or reject Athlete License activations.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Password Reset — only for athletes with real emails */}
                                {selectedAthlete.email && !selectedAthlete.email.includes('noemail-') && (
                                    <div className="pt-6 border-t border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
                                            <KeyRound className="w-4 h-4 text-gray-400" />
                                            Reset Password
                                        </h4>
                                        <p className="text-xs text-gray-500 mb-4">
                                            Generate a random temporary password and send it to the athlete's email.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isResettingPassword}
                                            onClick={async () => {
                                                if (!confirm(`Reset password for ${selectedAthlete.name}? A temporary password will be emailed to them.`)) return
                                                setIsResettingPassword(true)
                                                try {
                                                    const { orgResetPassword } = await import('@/app/organization/actions')
                                                    await orgResetPassword(selectedAthlete.id)
                                                    toast.success(`Password reset! Temporary password sent to ${selectedAthlete.name}'s email.`)
                                                } catch (error: any) {
                                                    toast.error(error?.message || 'Failed to reset password')
                                                } finally {
                                                    setIsResettingPassword(false)
                                                }
                                            }}
                                            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isResettingPassword ? 'Resetting...' : 'Reset Password & Send Email'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end items-center">
                            {isEditing ? (
                                <>
                                    <button onClick={() => { setIsEditing(false) }} disabled={isSavingEdit} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button type="submit" form="edit-athlete-form" disabled={isSavingEdit} className="px-5 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                        {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setSelectedAthlete(null)} className="px-5 py-2 bg-white border border-gray-200 text-sm text-gray-700 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-all">
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
