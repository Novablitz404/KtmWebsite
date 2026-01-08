'use client'

import { useState } from 'react'
import { inviteClubAssistant, cancelClubAssistantInvite } from '@/app/actions/invites'
import { toast } from 'sonner'
import { Plus, Mail, Trash2, X } from 'lucide-react'

interface Invite {
    id: string
    email: string
    createdAt: Date
}

export default function ClubAssistantInviteActions({ invites }: { invites: Invite[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleInvite = async (formData: FormData) => {
        setIsLoading(true)
        try {
            await inviteClubAssistant(formData)
            toast.success('Assistant invite sent!')
            setIsModalOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = async (id: string) => {
        try {
            await cancelClubAssistantInvite(id)
            toast.success('Invite cancelled')
        } catch (error) {
            toast.error('Failed to cancel')
        }
    }

    return (
        <div>
            {/* Trigger Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
            >
                <Plus className="w-4 h-4" />
                <span>Invite Assistant</span>
            </button>

            {/* Pending Invites List (if any) */}
            {invites.length > 0 && (
                <div className="mt-6 mb-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        Pending Invites
                    </h3>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100 shadow-sm">
                        {invites.map(invite => (
                            <div key={invite.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                <span className="text-sm text-gray-600 font-medium">{invite.email}</span>
                                <button
                                    onClick={() => handleCancel(invite.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancel Invite"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-1">Invite Assistant</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Assistants can help manage your club roster and player registrations.
                        </p>

                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            await handleInvite(formData)
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="assistant@example.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Sending...</span>
                                    </>
                                ) : 'Send Invitation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
