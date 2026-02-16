'use client'

import { useState } from 'react'
import { SeminarRegistration } from '@prisma/client'
import { Trash2, Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, QrCode, X } from 'lucide-react'
import { updateSeminarRegistrationStatus, deleteSeminarRegistration, fetchSeminarRegistrations } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'

import GlobalDropdown from '@/components/GlobalDropdown'

interface SeminarParticipantsProps {
    registrations: SeminarRegistration[]
    seminarId: string
}

export default function SeminarParticipants({ seminarId }: SeminarParticipantsProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [viewingQrReg, setViewingQrReg] = useState<any | null>(null)
    const limit = 10

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['seminar-registrations', seminarId, page, searchQuery],
        queryFn: async () => {
            const result = await fetchSeminarRegistrations(seminarId, page, limit, searchQuery)
            if (result.error) throw new Error(result.error)
            return result
        },
        placeholderData: (previousData) => previousData,
    })

    const registrations = data?.registrations || []
    const totalPages = data?.totalPages || 0
    const total = data?.total || 0

    async function handleStatusUpdate(regId: string, value: string) {
        toast.promise(
            updateSeminarRegistrationStatus(regId, value),
            {
                loading: 'Updating status...',
                success: () => {
                    refetch()
                    return 'Status updated'
                },
                error: 'Failed to update status'
            }
        )
    }

    async function handleDelete(regId: string) {
        if (!confirm('Are you sure you want to remove this participant?')) return

        setDeletingId(regId)
        try {
            const result = await deleteSeminarRegistration(regId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Participant removed')
                refetch()
            }
        } catch (error) {
            toast.error('Failed to remove participant')
        } finally {
            setDeletingId(null)
        }
    }

    const statusOptions = [
        { label: 'Pending', value: 'PENDING', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
        { label: 'Approved', value: 'APPROVED', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
        { label: 'Rejected', value: 'REJECTED', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
    ]

    return (
        <div className="space-y-6 animate-in fade-in duration-300 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
                    <p className="text-gray-500">Manage registered seminar attendees.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-medium text-gray-500 mr-2">Total Registered:</span>
                    <span className="text-lg font-bold text-indigo-600">{total}</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or club..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setPage(1)
                        }}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Participant</th>
                                <th className="px-6 py-4">Club</th>
                                <th className="px-6 py-4">Registered On</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                            <span>Loading participants...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <p>No participants found.</p>
                                    </td>
                                </tr>
                            ) : (
                                registrations.map((reg: any) => (
                                    <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-gray-100">
                                                    {reg.user?.imageUrl ? (
                                                        <img src={reg.user.imageUrl} alt={reg.playerName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{reg.playerName.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{reg.playerName}</p>
                                                    {reg.belt && <p className="text-xs text-gray-400">{reg.belt} Belt</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {reg.clubName ? (
                                                <span className="text-sm text-gray-700">{reg.clubName}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Independent</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlobalDropdown
                                                value={reg.status}
                                                options={statusOptions}
                                                onChange={(val) => handleStatusUpdate(reg.id, val)}
                                                width="w-36"
                                                className="z-20"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {reg.status === 'APPROVED' && reg.qrCodeToken && (
                                                    <button
                                                        onClick={() => setViewingQrReg(reg)}
                                                        title="View QR Code"
                                                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(reg.id)}
                                                    disabled={deletingId === reg.id}
                                                    title="Remove Participant"
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    {deletingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span>
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || isLoading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page >= totalPages || isLoading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            {viewingQrReg && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setViewingQrReg(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <QrCode className="text-indigo-600" size={18} />
                                Participant QR Code
                            </h3>
                            <button
                                onClick={() => setViewingQrReg(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-4">
                            <QRCodeSVG
                                value={viewingQrReg.qrCodeToken}
                                size={200}
                                level="H"
                                includeMargin
                                bgColor="#ffffff"
                                fgColor="#1e1b4b"
                            />
                            <div className="text-center">
                                <p className="font-bold text-gray-900">{viewingQrReg.playerName}</p>
                                {viewingQrReg.clubName && (
                                    <p className="text-sm text-gray-500">{viewingQrReg.clubName}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
