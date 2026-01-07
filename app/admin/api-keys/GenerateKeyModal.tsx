'use client'

import { useState } from 'react'
import { generateApiKey } from '@/app/actions/api-keys'
import { toast } from 'sonner'
import { X, Copy, Check } from 'lucide-react'

interface UserOption {
    id: string
    name: string | null
    email: string
    role: string
}

export default function GenerateKeyModal({
    users,
    onClose
}: {
    users: UserOption[],
    onClose: () => void
}) {
    const [selectedUser, setSelectedUser] = useState<string>('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [generatedKey, setGeneratedKey] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    async function handleGenerate() {
        if (!selectedUser) {
            toast.error("Please select a user")
            return
        }

        setLoading(true)
        const result = await generateApiKey(selectedUser, description || 'General Access Key')
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else if (result.key) {
            setGeneratedKey(result.key)
            toast.success("Key generated successfully!")
        }
    }

    function handleCopy() {
        if (generatedKey) {
            navigator.clipboard.writeText(generatedKey)
            setCopied(true)
            toast.success("Copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-4 text-slate-900">Generate Access Key</h2>

                {!generatedKey ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Assign to User (Organizer)
                            </label>
                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">-- Select Organizer --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name || 'Unnamed'} ({u.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Court 1 Laptop"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Generating...' : 'Generate Key'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-medium mb-2">
                                ⚠️ Copy this key now! It won't be shown again.
                            </p>
                            <div className="flex items-center gap-2 bg-white border border-yellow-300 rounded px-3 py-2">
                                <code className="flex-1 font-mono text-slate-800 break-all">
                                    {generatedKey}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                    title="Copy"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
