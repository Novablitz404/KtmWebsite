'use client'

import Link from 'next/link'
import { Calendar, MapPin, ChevronRight, Copy, Check, Eye, X, Clock, Tag, Users, Layers, Bird, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Helper for badge style
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ONGOING': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Ongoing</span>
        case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">Completed</span>
        case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-100">Cancelled</span>
        case 'RESCHEDULED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-100">Rescheduled</span>
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Upcoming</span>
    }
}

const getTierBadge = (tier?: string) => {
    if (!tier) return null
    const colors: Record<string, string> = {
        'J-1': 'bg-gray-100 text-gray-700 ring-gray-200',
        'J-2': 'bg-blue-50 text-blue-700 ring-blue-200',
        'J-3': 'bg-purple-50 text-purple-700 ring-purple-200',
        'J-4': 'bg-amber-50 text-amber-700 ring-amber-200',
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ${colors[tier] || colors['J-1']}`}>
            {tier}
        </span>
    )
}

const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return null
    const d = new Date(date)
    return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        full: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    }
}

interface TournamentsListProps {
    tournaments: any[]
    embedded?: boolean
}

export default function TournamentsList({ tournaments, embedded = false }: TournamentsListProps) {
    const searchParams = useSearchParams()
    const tenant = searchParams.get('tenant')
    const tenantQuery = tenant ? `?tenant=${tenant}` : ''
    const [selectedTournament, setSelectedTournament] = useState<any | null>(null)

    return (
        <>
            <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule & Venue</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-23 py-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tournaments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="font-medium text-gray-900">No tournaments found</p>
                                            <p className="text-sm text-gray-400 mt-1">Click "Create" to schedule a new tournament.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tournaments.map((tournament) => {
                                    const playerCount = tournament.categories.reduce((acc: number, cat: any) => acc + cat._count.players, 0)
                                    return (
                                        <tr key={tournament.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 max-w-sm">
                                                <div className="min-w-0">
                                                    <span className="block font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                        {tournament.name}
                                                    </span>
                                                    <CopyableId id={tournament.id} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    {tournament.venue && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <MapPin className="w-4 h-4 text-gray-400" />
                                                            <span className="truncate max-w-[200px]" title={tournament.venue}>{tournament.venue}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(tournament.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/tournament/${tournament.id}${tenantQuery}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Manage
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setSelectedTournament(tournament)}
                                                        className="inline-flex items-center p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
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

            {/* Tournament Details Modal */}
            {selectedTournament && (
                <TournamentDetailsModal
                    tournament={selectedTournament}
                    onClose={() => setSelectedTournament(null)}
                    tenantQuery={tenantQuery}
                />
            )}
        </>
    )
}

function TournamentDetailsModal({ tournament, onClose, tenantQuery }: { tournament: any; onClose: () => void; tenantQuery: string }) {
    const playerCount = tournament.categories.reduce((acc: number, cat: any) => acc + cat._count.players, 0)
    const startDt = formatDateTime(tournament.startDate)
    const regStartDt = formatDateTime(tournament.registrationStart)
    const regEndDt = formatDateTime(tournament.registrationEnd)
    const earlyBirdDt = formatDateTime(tournament.earlyBirdDeadline)

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{tournament.name}</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                {getStatusBadge(tournament.status)}
                                {getTierBadge(tournament.tier)}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-3"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

                        {/* Tournament ID */}
                        <DetailRow icon={<Tag className="w-4 h-4" />} label="Tournament ID">
                            <CopyableId id={tournament.id} />
                        </DetailRow>

                        {/* Date & Time */}
                        {startDt && (
                            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Tournament Date">
                                <span className="text-sm font-medium text-gray-900">{startDt.date}</span>
                                <span className="text-xs text-gray-500 ml-2">{startDt.time}</span>
                            </DetailRow>
                        )}

                        {/* Venue */}
                        {tournament.venue && (
                            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Venue">
                                <span className="text-sm text-gray-900">{tournament.venue}</span>
                            </DetailRow>
                        )}

                        {/* Registration Window */}
                        {(regStartDt || regEndDt) && (
                            <DetailRow icon={<Clock className="w-4 h-4" />} label="Registration Window">
                                <div className="flex flex-col gap-0.5">
                                    {regStartDt && (
                                        <span className="text-sm text-gray-900">Opens: <span className="font-medium">{regStartDt.full}</span></span>
                                    )}
                                    {regEndDt && (
                                        <span className="text-sm text-gray-900">Closes: <span className="font-medium">{regEndDt.full}</span></span>
                                    )}
                                </div>
                            </DetailRow>
                        )}

                        {/* Early Bird */}
                        {earlyBirdDt && (
                            <DetailRow icon={<Bird className="w-4 h-4" />} label="Early Bird">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm text-gray-900">Deadline: <span className="font-medium">{earlyBirdDt.full}</span></span>
                                    {tournament.showPricing && tournament.earlyBirdPrice != null && (
                                        <span className="text-sm text-gray-900">Early Price: <span className="font-medium text-green-600">₱{tournament.earlyBirdPrice.toFixed(2)}</span></span>
                                    )}
                                    {tournament.showPricing && tournament.regularPrice != null && (
                                        <span className="text-sm text-gray-900">Regular Price: <span className="font-medium">₱{tournament.regularPrice.toFixed(2)}</span></span>
                                    )}
                                </div>
                            </DetailRow>
                        )}

                        {/* Category Pricing */}
                        {tournament.showPricing && tournament.categoryPricing && Object.keys(tournament.categoryPricing).length > 0 && (
                            <DetailRow icon={<Tag className="w-4 h-4" />} label="Category Pricing">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm mt-1">
                                        <thead>
                                            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                                <th className="pb-1.5 pr-4">Event Type</th>
                                                <th className="pb-1.5 px-2 text-right">Early Bird</th>
                                                <th className="pb-1.5 pl-2 text-right">Regular</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(tournament.categoryPricing as Record<string, { earlyBird: number | null; regular: number | null }>).map(([key, val]) => (
                                                <tr key={key}>
                                                    <td className="py-1.5 pr-4 text-sm text-gray-700">{key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                                                    <td className="py-1.5 px-2 text-right text-sm font-medium text-green-600">
                                                        {val.earlyBird != null ? `₱${val.earlyBird.toLocaleString()}` : '—'}
                                                    </td>
                                                    <td className="py-1.5 pl-2 text-right text-sm font-medium text-gray-900">
                                                        {val.regular != null ? `₱${val.regular.toLocaleString()}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </DetailRow>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                <Layers className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                <p className="text-xl font-bold text-gray-900">{tournament._count?.categories || 0}</p>
                                <p className="text-xs text-gray-500">Categories</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                <p className="text-xl font-bold text-gray-900">{playerCount}</p>
                                <p className="text-xs text-gray-500">Athletes</p>
                            </div>
                        </div>

                        {/* Guideline Template */}
                        {tournament.guidelineTemplate?.name && (
                            <DetailRow icon={<Trophy className="w-4 h-4" />} label="Guideline Template">
                                <span className="text-sm text-gray-900">{tournament.guidelineTemplate.name}</span>
                            </DetailRow>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <Link
                            href={`/tournament/${tournament.id}${tenantQuery}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                        >
                            Manage
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                {children}
            </div>
        </div>
    )
}

function CopyableId({ id }: { id: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <span className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400 font-mono truncate max-w-[220px]" title={id}>
                {id}
            </span>
            <button
                onClick={handleCopy}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Copy ID"
            >
                {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                ) : (
                    <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                )}
            </button>
        </span>
    )
}
