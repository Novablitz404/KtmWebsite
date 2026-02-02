'use client'

import { useState } from 'react'
import { GraduationCap, Plus, X, Calendar, MapPin, DollarSign, Trash2, Users, ListFilter } from 'lucide-react'
import { deleteSeminar, updateSeminarStatus } from '@/app/organization/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import GlobalDropdown from '@/components/GlobalDropdown'
import CreateSeminarModal from '@/components/CreateSeminarModal'

interface Seminar {
    id: string
    name: string
    startDate: Date
    venue: string | null
    status: string
    fee: number | null
    _count: { registrations: number }
}

const statusConfig: Record<string, { bg: string, text: string }> = {
    UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700' },
    OPEN: { bg: 'bg-green-50', text: 'text-green-700' },
    CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
    COMPLETED: { bg: 'bg-purple-50', text: 'text-purple-700' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' }
}

export default function SeminarsWidget({ seminars: initial }: { seminars: Seminar[] }) {
    const [seminars, setSeminars] = useState(initial)
    const [showModal, setShowModal] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')

    const filteredSeminars = seminars.filter(s =>
        filterStatus === 'ALL' ? true : s.status === filterStatus
    )

    async function handleDelete(id: string) {
        if (!confirm('Delete this seminar?')) return

        const result = await deleteSeminar(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Seminar deleted')
            setSeminars(prev => prev.filter(s => s.id !== id))
        }
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-sky-50/50 to-white">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-sky-500" />
                        <h3 className="font-bold text-gray-900">Seminars</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <GlobalDropdown
                            trigger={
                                <button className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-sky-600 transition-colors">
                                    <ListFilter className="w-4 h-4" />
                                </button>
                            }
                            align="right"
                            items={[
                                { label: 'All Status', onClick: () => setFilterStatus('ALL') },
                                { label: 'Upcoming', onClick: () => setFilterStatus('UPCOMING'), icon: <Calendar className="w-3 h-3 text-blue-500" /> },
                                { label: 'Open', onClick: () => setFilterStatus('OPEN'), icon: <Calendar className="w-3 h-3 text-green-500" /> },
                                { label: 'Closed', onClick: () => setFilterStatus('CLOSED'), icon: <X className="w-3 h-3 text-gray-500" /> },
                                { label: 'Completed', onClick: () => setFilterStatus('COMPLETED') }
                            ]}
                        />
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {filteredSeminars.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400 text-center">No seminars found</p>
                    ) : (
                        filteredSeminars.slice(0, 3).map(seminar => {
                            const config = statusConfig[seminar.status] || statusConfig.UPCOMING
                            return (
                                <div key={seminar.id} className="p-4 hover:bg-gray-50/50 group relative">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{seminar.name}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(seminar.startDate).toLocaleDateString()}
                                                </span>
                                                {seminar.venue && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {seminar.venue}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                                                {seminar.status}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(seminar.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <Users className="w-3 h-3" />
                                            {seminar._count.registrations} registered
                                        </span>
                                        {seminar.fee && (
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <DollarSign className="w-3 h-3" />
                                                ₱{seminar.fee.toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {filteredSeminars.length > 3 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <Link href="/seminars" className="text-xs text-sky-600 font-medium hover:underline">
                            View all {filteredSeminars.length} seminars →
                        </Link>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <CreateSeminarModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false)
                    // Optionally refresh the list or rely on server action revalidation + router.refresh() 
                    // But since we pass data down from server component, we might need a refresh.
                    window.location.reload()
                }}
            />
        </>
    )
}
