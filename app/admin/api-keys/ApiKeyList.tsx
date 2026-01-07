'use client'

import { useState } from 'react'
import { revokeApiKey, deleteApiKey } from '@/app/actions/api-keys'
import { toast } from 'sonner'
import { Key, Trash2, Ban, ShieldCheck, Plus } from 'lucide-react'
import GenerateKeyModal from './GenerateKeyModal'

interface ApiKeyWithUser {
    id: string
    key: string // In reality, we might not send full key to client if sensitive, but here needed for admin check? Or masked.
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

export default function ApiKeyList({
    initialKeys,
    users
}: {
    initialKeys: ApiKeyWithUser[],
    users: UserOption[]
}) {
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)

    async function handleRevoke(id: string) {
        if (!confirm('Are you sure you want to deactivate this key?')) return
        const res = await revokeApiKey(id)
        if (res.error) toast.error(res.error)
        else toast.success("Key deactivated")
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This action cannot be undone.')) return
        const res = await deleteApiKey(id)
        if (res.error) toast.error(res.error)
        else toast.success("Key deleted")
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-600" />
                    Active Access Keys
                </h2>
                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 transition"
                >
                    <Plus className="w-4 h-4" />
                    Generate New Key
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Assigned To</th>
                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {initialKeys.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                    No API keys found.
                                </td>
                            </tr>
                        ) : (
                            initialKeys.map((key) => (
                                <tr key={key.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-4">
                                        {key.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                <ShieldCheck className="w-3 h-3" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                <Ban className="w-3 h-3" />
                                                Revoked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-700 block">
                                            {key.description || 'No description'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {key.key.substring(0, 12)}...
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div className="font-medium text-slate-900">{key.owner.name || 'Unnamed'}</div>
                                            <div className="text-slate-500 text-xs">{key.owner.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {key.isActive && (
                                            <button
                                                onClick={() => handleRevoke(key.id)}
                                                className="text-orange-500 hover:text-orange-700 text-xs font-medium px-2 py-1 border border-orange-200 rounded hover:bg-orange-50 transition"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(key.id)}
                                            className="text-slate-400 hover:text-red-600 transition p-1"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isGenerateModalOpen && (
                <GenerateKeyModal
                    users={users}
                    onClose={() => setIsGenerateModalOpen(false)}
                />
            )}
        </div>
    )
}
