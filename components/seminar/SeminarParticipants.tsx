'use client'

import { useState } from 'react'
import { SeminarRegistration } from '@prisma/client'
import { Trash2, Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, X } from 'lucide-react'
import { updateSeminarRegistrationStatus, deleteSeminarRegistration, fetchSeminarRegistrations } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import GlobalDropdown from '@/components/GlobalDropdown'

// Basic type matching the schema
interface SeminarParticipantsProps {
    registrations: SeminarRegistration[] // kept for initial data if needed, or we can just ignore
    seminarId: string // We need seminarId to fetch data
}

export default function SeminarParticipants({ seminarId }: SeminarParticipantsProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)

    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null)
    const limit = 10

    // Fetch data using TanStack Query
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['seminar-registrations', seminarId, page, searchQuery],
        queryFn: async () => {
            const result = await fetchSeminarRegistrations(seminarId, page, limit, searchQuery)
            if (result.error) throw new Error(result.error)
            return result
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new
    })

    const registrations = data?.registrations || []
    const totalPages = data?.totalPages || 0
    const total = data?.total || 0

    async function handleStatusUpdate(regId: string, field: 'status' | 'paymentStatus', value: string) {
        toast.promise(
            updateSeminarRegistrationStatus(
                regId,
                field === 'status' ? value : undefined,
                field === 'paymentStatus' ? value : undefined
            ),
            {
                loading: 'Updating status...',
                success: () => {
                    refetch() // Refetch data to ensure consistency
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

    // Debounce search input? For now simple controlled input with query key dependency is fine 
    // but might trigger too many requests. A simple debounce is better.
    // However, for simplicity let's stick to direct state for now or add a small timeout.
    // The user didn't explicitly ask for debounce but it's good practice. 
    // I will stick to direct binding to keep it simple as query handles some caching.

    // Status Options
    const statusOptions = [
        { label: 'Pending', value: 'PENDING', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
        { label: 'Approved', value: 'APPROVED', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
        { label: 'Rejected', value: 'REJECTED', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
    ]

    const paymentOptions = [
        { label: 'Unpaid', value: 'UNPAID', icon: <div className="w-2 h-2 rounded-full bg-red-400" /> },
        { label: 'Paid', value: 'PAID', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
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
                            setPage(1) // Reset to page 1 on search
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
                                <th className="px-6 py-4">Payment Status</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                            <span>Loading participants...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                                                value={reg.paymentStatus}
                                                options={paymentOptions}
                                                onChange={(val) => handleStatusUpdate(reg.id, 'paymentStatus', val)}
                                                width="w-36"
                                                className="z-20"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <GlobalDropdown
                                                value={reg.status}
                                                options={statusOptions}
                                                onChange={(val) => handleStatusUpdate(reg.id, 'status', val)}
                                                width="w-36"
                                                className="z-20"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {reg.proofOfPaymentUrl && (
                                                    <button
                                                        onClick={() => setViewingProofUrl(reg.proofOfPaymentUrl)}
                                                        title="View Proof of Payment"
                                                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
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

            {/* Proof of Payment Modal */}
            {viewingProofUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Proof of Payment</h3>
                            <button
                                onClick={() => setViewingProofUrl(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto bg-gray-50 flex items-center justify-center flex-1">
                            <img
                                src={viewingProofUrl}
                                alt="Proof of Payment"
                                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                            />
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <a
                                href={viewingProofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                            >
                                Open in new tab
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

