'use client'

import { useState, useTransition, useMemo } from 'react'
import { Calendar, Trophy, Medal, MapPin, Building2, Trash2, X, AlertTriangle, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTournament } from '@/app/actions'
import { deletePromotionTest } from '@/app/organization/actions'
import { useRouter } from 'next/navigation'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchAdminEvents } from '@/app/admin/fetch'
import AdminTableSkeleton from '@/components/admin/AdminTableSkeleton'

import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'

interface Tournament {
    id: string
    name: string
    startDate: Date
    venue: string | null
    status: string
    organizer: {
        name: string | null
        email: string
    } | null
}

interface PromotionTest {
    id: string
    name: string
    testDate: Date
    venue: string | null
    status: string
    organization: {
        name: string
    } | null
}

interface AdminEventsViewProps {
    // Data is now fetched internally
}

const PAGE_SIZE = 10

export default function AdminEventsView({ }: AdminEventsViewProps) {
    const [activeTab, setActiveTab] = useState<'tournaments' | 'promotions'>('tournaments')
    const [currentPage, setCurrentPage] = useState(1)

    const [isPending, startTransition] = useTransition()
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string, type: 'tournament' | 'promotion' } | null>(null)
    const router = useRouter()

    // Reset pagination when tab changes
    useMemo(() => {
        setCurrentPage(1)
    }, [activeTab])

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['admin-events', activeTab, currentPage],
        queryFn: () => fetchAdminEvents(currentPage, PAGE_SIZE, activeTab),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const items = data?.items || []
    const totalPages = data?.totalPages || 1
    const totalCountForActiveTab = data?.totalCount || 0

    const handleDeleteClick = (id: string, name: string, type: 'tournament' | 'promotion') => {
        setItemToDelete({ id, name, type })
        setIsDeleteModalOpen(true)
    }

    const confirmDelete = () => {
        if (!itemToDelete) return

        startTransition(async () => {
            try {
                if (itemToDelete.type === 'tournament') {
                    await deleteTournament(itemToDelete.id)
                    toast.success('Tournament deleted successfully')
                } else {
                    await deletePromotionTest(itemToDelete.id)
                    toast.success('Promotion test deleted successfully')
                }
                router.refresh()
                // Invalidate query to refetch data after deletion
                // queryClient.invalidateQueries(['admin-events', activeTab]) // If using queryClient
            } catch (error: any) {
                toast.error(error?.message || 'Failed to delete event')
            } finally {
                setIsDeleteModalOpen(false)
                setItemToDelete(null)
            }
        })
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">

                {/* Header & Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Events Management</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage tournaments and promotion tests.</p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'tournaments'
                                ? 'bg-red-50 text-red-700'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Trophy className="w-4 h-4" />
                            Tournaments
                            <span className="ml-1 px-1.5 py-0.5 bg-white rounded-md text-xs border border-gray-100 shadow-sm text-gray-600">
                                {activeTab === 'tournaments' ? totalCountForActiveTab : '?'}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('promotions')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'promotions'
                                ? 'bg-red-50 text-red-700'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Medal className="w-4 h-4" />
                            Promotions
                            <span className="ml-1 px-1.5 py-0.5 bg-white rounded-md text-xs border border-gray-100 shadow-sm text-gray-600">
                                {activeTab === 'promotions' ? totalCountForActiveTab : '?'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Venue</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {activeTab === 'tournaments' ? 'Organizer' : 'Organization'}
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {isLoading && !data ? (
                                    <TableRowsSkeleton columns={5} />
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                            No {activeTab} found.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-900 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(activeTab === 'tournaments' ? item.startDate : item.testDate).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </div>
                                                    {item.venue && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                            {item.venue}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {activeTab === 'tournaments' ? (
                                                    item.organizer ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                {(item.organizer.name || '?').charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-gray-900">{item.organizer.name || 'Unknown'}</span>
                                                                <span className="text-xs text-gray-500">{item.organizer.email}</span>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-gray-400 text-sm italic">No organizer</span>
                                                ) : (
                                                    item.organization ? (
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-700 font-medium">{item.organization.name}</span>
                                                        </div>
                                                    ) : <span className="text-gray-400 text-sm italic">No organization</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={item.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a
                                                        href={activeTab === 'tournaments' ? `/tournament/${item.id}` : `/promotions/${item.id}`}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={`Manage ${activeTab === 'tournaments' ? 'Tournament' : 'Promotion Test'}`}
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteClick(item.id, item.name, activeTab === 'tournaments' ? 'tournament' : 'promotion')}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end">
                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg transition-all ${currentPage === 1
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1.5 px-3">
                                <span className="text-sm font-bold text-gray-900">Page {currentPage}</span>
                                <span className="text-xs text-gray-400 font-medium">of {Math.max(totalPages, 1)}</span>
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg transition-all ${currentPage === totalPages
                                    ? 'text-gray-300 cursor-not-allowed hidden'
                                    : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                                    }`}
                                title="Next Page"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-red-900">Delete Event</h3>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-red-100 text-red-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-700">
                                Are you sure you want to delete the {itemToDelete.type === 'tournament' ? 'tournament' : 'promotion test'}{' '}
                                <strong>{itemToDelete.name}</strong>?
                            </p>
                            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                                This action cannot be undone. All related data (matches, registrations) will be permanently removed.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isPending}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        UPCOMING: 'bg-blue-50 text-blue-700 border-blue-100',
        ONGOING: 'bg-green-50 text-green-700 border-green-100',
        COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
        CANCELLED: 'bg-red-50 text-red-700 border-red-100',
        OPEN: 'bg-green-50 text-green-700 border-green-100',
        CLOSED: 'bg-orange-50 text-orange-700 border-orange-100',
        PRIVATE: 'bg-gray-50 text-gray-600 border-gray-200',
        PUBLIC: 'bg-green-50 text-green-700 border-green-100'
    }

    const style = styles[status] || styles.PRIVATE

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            {status}
        </span>
    )
}
