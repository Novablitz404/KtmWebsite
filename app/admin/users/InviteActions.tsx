'use client'

import { useState } from 'react'
import { Mail, Shield, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { inviteOrganizer, deleteInvite } from '../actions'

interface InviteActionsProps {
    pendingOrganizerInvites: {
        id: string
        email: string
        name: string | null
        createdAt: Date
    }[]
}

export default function InviteActions({ pendingOrganizerInvites }: InviteActionsProps) {
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form Handlers
    const handleInviteOrganizer = async (formData: FormData) => {
        setIsLoading(true)
        try {
            await inviteOrganizer(formData)
            toast.success('Organization invite sent!')
            setIsOrgModalOpen(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancelInvite = async (id: string) => {
        const formData = new FormData()
        formData.append('inviteId', id)
        try {
            await deleteInvite(formData)
            toast.success('Invite cancelled')
        } catch (error) {
            toast.error('Failed to cancel invite')
        }
    }

    return (
        <>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setIsOrgModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm"
                >
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Invite Organization</span>
                    {pendingOrganizerInvites.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {pendingOrganizerInvites.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Organizer Modal */}
            {isOrgModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Invite Organization
                            </h3>
                            <button
                                onClick={() => setIsOrgModalOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="org-invite-form" onSubmit={async (e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                await handleInviteOrganizer(formData)
                            }} className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="organizer@example.com"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                            {pendingOrganizerInvites.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pending Invites</h4>
                                    <div className="space-y-2">
                                        {pendingOrganizerInvites.map(invite => (
                                            <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <Mail className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelInvite(invite.id)}
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
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
