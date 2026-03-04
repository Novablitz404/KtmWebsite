'use client'

import { useState, useEffect } from 'react'
import { Search, ShieldCheck, ShieldOff, IdCard, Users, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { getOrganizationAthletes, toggleAthleteCardStatus } from '@/app/organization/actions'
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
}

const PAGE_SIZE = 10

export default function OrganizationAthletesView() {
    const [athletes, setAthletes] = useState<Athlete[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)

    useEffect(() => {
        loadAthletes()
    }, [])

    // Reset page when filters change
    useEffect(() => {
        setPage(1)
    }, [search, filter])

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
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Card status updated')
                setAthletes(prev =>
                    prev.map(a =>
                        a.id === athleteId
                            ? { ...a, isVerified: !a.isVerified }
                            : a
                    )
                )
            }
        } catch {
            toast.error('Failed to update card status')
        } finally {
            setTogglingId(null)
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
            (filter === 'active' && a.isVerified) ||
            (filter === 'inactive' && !a.isVerified)

        return matchesSearch && matchesFilter
    })

    const totalPages = Math.ceil(filteredAthletes.length / PAGE_SIZE)
    const paginatedAthletes = filteredAthletes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const activeCount = athletes.filter(a => a.isVerified).length
    const inactiveCount = athletes.filter(a => !a.isVerified).length

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-6 gap-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{athletes.length}</p>
                            <p className="text-xs text-gray-500">Total Athletes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                            <p className="text-xs text-gray-500">Active Cards</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <ShieldOff className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
                            <p className="text-xs text-gray-500">Inactive Cards</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card — flex-1 to fill */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Filters & Search */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between flex-shrink-0">
                    <div className="flex gap-2">
                        {(['all', 'active', 'inactive'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${filter === f
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {f === 'all' ? `All (${athletes.length})` : f === 'active' ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, club, or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* Table — scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading ? (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Card ID</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="py-20">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 border-3 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                                            <p className="text-sm text-gray-500 mt-3">Loading athletes...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : filteredAthletes.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IdCard className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">No Athletes Found</h3>
                            <p className="text-sm text-gray-500">
                                {search ? 'Try a different search term.' : 'No athletes are registered under your clubs.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Card ID</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedAthletes.map((athlete) => (
                                    <tr key={athlete.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 flex-shrink-0">
                                                    {athlete.imageUrl ? (
                                                        <img src={athlete.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">
                                                            {athlete.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{athlete.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 truncate">{athlete.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-sm text-gray-700">{athlete.clubName || '—'}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-sm text-gray-700 capitalize">{athlete.belt || '—'}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs font-mono text-gray-500">
                                                {athlete.athleteNumber || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {athlete.isVerified ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {athlete.isVerified && (
                                                    <button
                                                        onClick={() => setSelectedAthlete(athlete)}
                                                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all border border-gray-200"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleToggle(athlete.id)}
                                                    disabled={togglingId === athlete.id}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50 ${athlete.isVerified
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                                        }`}
                                                >
                                                    {togglingId === athlete.id ? (
                                                        '...'
                                                    ) : athlete.isVerified ? (
                                                        <>
                                                            <ShieldOff className="w-3.5 h-3.5" />
                                                            Deactivate
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            Activate
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-semibold text-gray-700">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(page * PAGE_SIZE, filteredAthletes.length)}</span> of <span className="font-semibold text-gray-700">{filteredAthletes.length}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => {
                                    const prev = arr[idx - 1]
                                    const showEllipsis = prev && p - prev > 1
                                    return (
                                        <span key={p} className="flex items-center">
                                            {showEllipsis && <span className="px-1 text-xs text-gray-400">…</span>}
                                            <button
                                                onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page
                                                    ? 'bg-gray-900 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </span>
                                    )
                                })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Athlete Card Preview Modal */}
            {selectedAthlete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div
                        className="absolute inset-0"
                        onClick={() => setSelectedAthlete(null)}
                    />
                    <div className="relative w-full max-w-lg">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedAthlete(null)}
                            className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Card */}
                        <AthleteCard
                            name={selectedAthlete.name}
                            athleteId={selectedAthlete.athleteNumber}
                            imageUrl={selectedAthlete.imageUrl}
                            createdAt={selectedAthlete.createdAt?.toString() || null}
                            isVerified={selectedAthlete.isVerified}
                        />

                        {/* Info Footer */}
                        <div className="mt-3 bg-white/90 backdrop-blur rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900">{selectedAthlete.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{selectedAthlete.clubName || 'No club'} • {selectedAthlete.belt || 'No belt'}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${selectedAthlete.isVerified
                                ? 'bg-green-50 text-green-700 border border-green-100'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${selectedAthlete.isVerified ? 'bg-green-500' : 'bg-gray-400'}`} />
                                {selectedAthlete.isVerified ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
