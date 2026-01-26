'use client'

import { useState } from 'react'
import { Key, Plus, ShieldCheck, Ban, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { revokeApiKey, deleteApiKey } from '@/app/actions/api-keys'
import GenerateKeyModal from '@/components/admin/GenerateKeyModal'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchAdminApiKeys } from '@/app/admin/fetch'
import AdminTableSkeleton from '@/components/admin/AdminTableSkeleton'

import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'

interface ApiKeyWithUser {
    id: string
    key: string
    description: string | null
    isActive: boolean
    createdAt: Date
    owner: {
        id: string
        name: string | null
        email: string
    }
}

interface UserOption {
    id: string
    name: string | null
    email: string
    role: string
}

interface AdminApiKeysViewProps {
    users: UserOption[]
}

const PAGE_SIZE = 10

export default function AdminApiKeysView({ users }: AdminApiKeysViewProps) {
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['admin-api-keys', currentPage],
        queryFn: () => fetchAdminApiKeys(currentPage, PAGE_SIZE),
        placeholderData: keepPreviousData
    })

    const keys = data?.keys || []
    const totalPages = data?.totalPages || 1

    async function handleRevoke(id: string) {
        if (!confirm('Are you sure you want to deactivate this key?')) return
        const res = await revokeApiKey(id)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Key deactivated")
            queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This action cannot be undone.')) return
        const res = await deleteApiKey(id)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Key deleted")
            queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
        }
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">

                {/* Header Actions */}
                <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Access Key Management</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage API keys for external applications.</p>
                    </div>
                    <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Generate New Key
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {isLoading && !data ? (
                                    <TableRowsSkeleton columns={5} />
                                ) : keys.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                            No API keys found.
                                        </td>
                                    </tr>
                                ) : (
                                    keys.map((key: ApiKeyWithUser) => (
                                        <tr key={key.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {key.isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                        <Ban className="w-3 h-3" />
                                                        Revoked
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 text-sm">
                                                        {key.description || 'No description'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono mt-0.5">
                                                        {key.key.substring(0, 12)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 text-sm">{key.owner.name || 'Unnamed'}</span>
                                                    <span className="text-xs text-gray-500">{key.owner.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(key.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {key.isActive && (
                                                        <button
                                                            onClick={() => handleRevoke(key.id)}
                                                            className="text-orange-600 hover:text-orange-700 p-2 hover:bg-orange-50 rounded-lg transition-colors"
                                                            title="Revoke Access"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(key.id)}
                                                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Key"
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

                {isGenerateModalOpen && (
                    <GenerateKeyModal
                        users={users}
                        onClose={() => {
                            setIsGenerateModalOpen(false)
                            queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
                        }}
                    />
                )}
            </div>
        </div>
    )
}
