'use client'

import { useState } from 'react'
import { Plus, Mail, Shield, Award, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { inviteOrganizer, inviteClubMaster, deleteInvite, deleteClubMasterInvite } from '../actions'

interface InviteActionsProps {
    pendingOrganizerInvites: {
        id: string
        email: string
        name: string | null
        createdAt: Date
    }[]
    pendingClubMasterInvites: {
        id: string
        email: string
        name: string | null
        clubName: string
        createdAt: Date
    }[]
}

export default function InviteActions({ pendingOrganizerInvites, pendingClubMasterInvites }: InviteActionsProps) {
    const [isOrgModalOpen, setIsOrgModalOpen] = useState(false)
    const [isCmModalOpen, setIsCmModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form Handlers
    const handleInviteOrganizer = async (formData: FormData) => {
        setIsLoading(true)
        try {
            await inviteOrganizer(formData)
            toast.success('Organizer invite sent!')
            // Optional: close modal or keep open to send more
            // setIsOrgModalOpen(false) 
            // We'll reset the form manually or just let the loading state finish
            const form = document.getElementById('org-invite-form') as HTMLFormElement
            form?.reset()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite')
        } finally {
            setIsLoading(false)
        }
    }

    const handleInviteClubMaster = async (formData: FormData) => {
        setIsLoading(true)
        try {
            await inviteClubMaster(formData)
            toast.success('Club Master invite sent!')
            const form = document.getElementById('cm-invite-form') as HTMLFormElement
            form?.reset()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to send invite')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancelInvite = async (type: 'ORG' | 'CM', id: string) => {
        const formData = new FormData()
        formData.append('inviteId', id)
        try {
            if (type === 'ORG') await deleteInvite(formData)
            else await deleteClubMasterInvite(formData)
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
                    <span>Invite Organizer</span>
                    {pendingOrganizerInvites.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {pendingOrganizerInvites.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setIsCmModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm"
                >
                    <Award className="w-4 h-4 text-orange-600" />
                    <span>Invite Club Master</span>
                    {pendingClubMasterInvites.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            {pendingClubMasterInvites.length}
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
                                Invite Organizer
                            </h3>
                            <button
                                onClick={() => setIsOrgModalOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="org-invite-form" action={handleInviteOrganizer} className="space-y-4 mb-8">
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                                    <input
                                        name="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Invitation'}
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
                                                        {invite.name && <p className="text-xs text-gray-500 truncate">{invite.name}</p>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelInvite('ORG', invite.id)}
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

            {/* Club Master Modal */}
            {isCmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-600" />
                                Invite Club Master
                            </h3>
                            <button
                                onClick={() => setIsCmModalOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="cm-invite-form" action={handleInviteClubMaster} className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="master@club.com"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                                        <input
                                            name="name"
                                            type="text"
                                            placeholder="Jane Smith"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                                        <input
                                            name="clubName"
                                            type="text"
                                            required
                                            placeholder="Tiger Academy"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </form>

                            {pendingClubMasterInvites.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pending Invites</h4>
                                    <div className="space-y-2">
                                        {pendingClubMasterInvites.map(invite => (
                                            <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                        <Mail className="w-4 h-4 text-orange-600" />
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                                                        <p className="text-xs text-green-600 truncate font-medium">{invite.clubName}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelInvite('CM', invite.id)}
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
