'use client'

import { Calendar, MapPin, ChevronRight, Eye, X, Clock, DollarSign, Users, Copy, Check, Settings } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'OPEN': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Open</span>
        case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600 ring-1 ring-purple-200">Completed</span>
        case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-100">Cancelled</span>
        case 'CLOSED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">Closed</span>
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Upcoming</span>
    }
}

interface Seminar {
    id: string
    name: string
    description?: string | null
    startDate: string | Date
    venue?: string | null
    fee?: number | null
    status: string
    _count: {
        registrations: number
    }
}

interface SeminarsListProps {
    seminars: Seminar[]
}

export default function SeminarsList({ seminars }: SeminarsListProps) {
    const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null)

    return (
        <>
            <div className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seminar</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule & Venue</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-23 py-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {seminars.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="font-medium text-gray-900">No seminars found</p>
                                            <p className="text-sm text-gray-400 mt-1">Click "Create" to schedule a new seminar.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                seminars.map((seminar) => (
                                    <tr key={seminar.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="min-w-0">
                                                <span className="block font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {seminar.name}
                                                </span>
                                                <CopyableId id={seminar.id} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                {seminar.venue && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate max-w-[200px]" title={seminar.venue}>{seminar.venue}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(seminar.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/seminars/${seminar.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                                                >
                                                    Manage
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setSelectedSeminar(seminar)}
                                                    className="inline-flex items-center p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedSeminar && (
                <SeminarDetailsModal
                    seminar={selectedSeminar}
                    onClose={() => setSelectedSeminar(null)}
                />
            )}
        </>
    )
}

function SeminarDetailsModal({ seminar, onClose }: { seminar: Seminar; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{seminar.name}</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                {getStatusBadge(seminar.status)}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-3">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        <DetailRow icon={<Calendar className="w-4 h-4" />} label="Date">
                            <span className="text-sm font-medium text-gray-900">
                                {new Date(seminar.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </DetailRow>

                        {seminar.venue && (
                            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Venue">
                                <span className="text-sm text-gray-900">{seminar.venue}</span>
                            </DetailRow>
                        )}

                        <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Fee">
                            <span className="text-sm font-medium text-gray-900">
                                {seminar.fee ? `₱${seminar.fee.toFixed(2)}` : <span className="text-green-600">Free</span>}
                            </span>
                        </DetailRow>

                        {seminar.description && (
                            <DetailRow icon={<Settings className="w-4 h-4" />} label="Description">
                                <span className="text-sm text-gray-700">{seminar.description}</span>
                            </DetailRow>
                        )}

                        <div className="grid grid-cols-1 gap-3 pt-2">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                <p className="text-xl font-bold text-gray-900">{seminar._count.registrations}</p>
                                <p className="text-xs text-gray-500">Registrations</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                            Close
                        </button>
                        <Link
                            href={`/seminars/${seminar.id}`}
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
