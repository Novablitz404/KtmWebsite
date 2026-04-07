'use client'

import { useState, useEffect } from 'react'
import { Search, ShieldCheck, ShieldOff, IdCard, Users, Eye, X, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { getOrganizationAthletes, toggleAthleteCardStatus } from '@/app/organization/actions'
import { approveAthleteCardPayment, rejectAthleteCardPayment } from '@/app/actions'
import { toast } from 'sonner'
import AthleteCard from '@/components/athlete/AthleteCard'

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
    cardPaymentProofUrl: string | null
    cardPaymentStatus: string | null
}

const PAGE_SIZE = 10

export default function OrganizationAthletesView() {
    const [athletes, setAthletes]           = useState<Athlete[]>([])
    const [isLoading, setIsLoading]         = useState(true)
    const [search, setSearch]               = useState('')
    const [filter, setFilter]               = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
    const [togglingId, setTogglingId]       = useState<string | null>(null)
    const [page, setPage]                   = useState(1)
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
    const [isApproving, setIsApproving]     = useState(false)
    const [isRejecting, setIsRejecting]     = useState(false)

    useEffect(() => { loadAthletes() }, [])
    useEffect(() => { setPage(1) }, [search, filter])

    async function loadAthletes() {
        setIsLoading(true)
        try {
            const data = await getOrganizationAthletes()
            setAthletes(data as Athlete[])
        } catch {
            toast.error('Failed to load athletes')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleToggle(athleteId: string) {
        setTogglingId(athleteId)
        try {
            const result = await toggleAthleteCardStatus(athleteId)
            if (result.error) toast.error(result.error)
            else {
                toast.success('Card status updated')
                setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, isVerified: !a.isVerified } : a))
            }
        } catch { toast.error('Failed to update card status') }
        finally { setTogglingId(null) }
    }

    async function handleApprovePayment(athleteId: string) {
        setIsApproving(true)
        try {
            const result = await approveAthleteCardPayment(athleteId)
            if (result?.error) toast.error(result.error)
            else { toast.success('Card activated and payment approved'); await loadAthletes(); setSelectedAthlete(null) }
        } catch { toast.error('Failed to approve payment') }
        finally { setIsApproving(false) }
    }

    async function handleRejectPayment(athleteId: string) {
        setIsRejecting(true)
        try {
            const result = await rejectAthleteCardPayment(athleteId)
            if (result?.error) toast.error(result.error)
            else { toast.success('Payment rejected'); await loadAthletes(); setSelectedAthlete(null) }
        } catch { toast.error('Failed to reject payment') }
        finally { setIsRejecting(false) }
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
            (filter === 'inactive' && !a.isVerified && a.cardPaymentStatus !== 'PENDING_ACTIVATION') ||
            (filter === 'pending'  && a.cardPaymentStatus === 'PENDING_ACTIVATION')
        return matchesSearch && matchesFilter
    })

    const totalPages       = Math.ceil(filteredAthletes.length / PAGE_SIZE)
    const paginatedAthletes = filteredAthletes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const activeCount      = athletes.filter(a => a.isVerified).length
    const inactiveCount    = athletes.filter(a => !a.isVerified && a.cardPaymentStatus !== 'PENDING_ACTIVATION').length
    const pendingCount     = athletes.filter(a => a.cardPaymentStatus === 'PENDING_ACTIVATION').length

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
                    <p className="text-sm text-gray-500 mt-1">Manage athlete ID cards and payment approvals.</p>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Athletes', value: athletes.length, Icon: Users,        iconBg: 'bg-gray-100',   iconColor: 'text-gray-600',   valColor: 'text-gray-900' },
                    { label: 'Active Cards',   value: activeCount,     Icon: ShieldCheck,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valColor: 'text-emerald-600' },
                    { label: 'Inactive Cards', value: inactiveCount,   Icon: ShieldOff,    iconBg: 'bg-gray-100',   iconColor: 'text-gray-400',   valColor: 'text-gray-400' },
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
                            placeholder="Search by name, club, or ID..."
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
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Card ID</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                                                    {athlete.imageUrl ? (
                                                        <img src={athlete.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-black text-gray-400">
                                                            {athlete.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    )}
                                                </div>
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
                                            ) : athlete.cardPaymentStatus === 'PENDING_ACTIVATION' ? (
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
                                                    onClick={() => setSelectedAthlete(athlete)}
                                                    className="p-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200"
                                                    title="View card"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggle(athlete.id)}
                                                    disabled={togglingId === athlete.id}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-xl transition-all disabled:opacity-50 ${
                                                        athlete.isVerified
                                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                                    }`}
                                                >
                                                    {togglingId === athlete.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : athlete.isVerified ? (
                                                        <><ShieldOff className="w-3 h-3" /> Deactivate</>
                                                    ) : (
                                                        <><ShieldCheck className="w-3 h-3" /> Activate</>
                                                    )}
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

            {/* ── Athlete detail modal ── */}
            {selectedAthlete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAthlete(null)}>
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Dark hero header */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-5">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {selectedAthlete.imageUrl ? (
                                        <img src={selectedAthlete.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-white/60">
                                            {selectedAthlete.name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-black text-white truncate">{selectedAthlete.name || 'Unknown'}</p>
                                    <p className="text-xs text-white/50 mt-0.5">{selectedAthlete.clubName || 'No club'}</p>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {selectedAthlete.belt && (
                                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest bg-white/10 px-2 py-1 rounded-lg border border-white/10 capitalize">
                                                {selectedAthlete.belt} Belt
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${
                                            selectedAthlete.isVerified
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                : selectedAthlete.cardPaymentStatus === 'PENDING_ACTIVATION'
                                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                    : 'bg-white/10 text-white/40 border-white/10'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                selectedAthlete.isVerified ? 'bg-emerald-400' :
                                                selectedAthlete.cardPaymentStatus === 'PENDING_ACTIVATION' ? 'bg-amber-400 animate-pulse' : 'bg-white/30'
                                            }`} />
                                            {selectedAthlete.isVerified ? 'Active' : selectedAthlete.cardPaymentStatus === 'PENDING_ACTIVATION' ? 'Pending Approval' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAthlete(null)}
                                    className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Card preview */}
                        {selectedAthlete.cardPaymentStatus !== 'PENDING_ACTIVATION' && (
                            <div className="px-6 pt-5">
                                <AthleteCard
                                    name={selectedAthlete.name}
                                    athleteId={selectedAthlete.athleteNumber}
                                    imageUrl={selectedAthlete.imageUrl}
                                    createdAt={selectedAthlete.createdAt?.toString() || null}
                                    isVerified={selectedAthlete.isVerified}
                                    cardPaymentStatus={selectedAthlete.cardPaymentStatus}
                                />
                            </div>
                        )}

                        {/* Pending payment approval section */}
                        {selectedAthlete.cardPaymentStatus === 'PENDING_ACTIVATION' && selectedAthlete.cardPaymentProofUrl && (
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Proof</p>
                                    <div className="w-full bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
                                        <img src={selectedAthlete.cardPaymentProofUrl} alt="Payment Proof" className="w-full h-auto object-contain max-h-60" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRejectPayment(selectedAthlete.id)}
                                        disabled={isRejecting || isApproving}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        {isRejecting ? 'Rejecting...' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={() => handleApprovePayment(selectedAthlete.id)}
                                        disabled={isRejecting || isApproving}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {isApproving ? 'Approving...' : 'Approve Payment'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Info footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card ID</p>
                                    <p className="text-sm font-mono font-bold text-gray-700 mt-0.5">{selectedAthlete.athleteNumber || '—'}</p>
                                </div>
                                <button
                                    onClick={() => handleToggle(selectedAthlete.id)}
                                    disabled={togglingId === selectedAthlete.id}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 ${
                                        selectedAthlete.isVerified
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                    }`}
                                >
                                    {togglingId === selectedAthlete.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : selectedAthlete.isVerified
                                            ? <><ShieldOff className="w-3.5 h-3.5" /> Deactivate</>
                                            : <><ShieldCheck className="w-3.5 h-3.5" /> Activate</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
