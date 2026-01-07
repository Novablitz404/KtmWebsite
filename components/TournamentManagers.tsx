'use client'

import { useState } from 'react'
import { removeTournamentManager } from '@/app/actions/tournament-managers'
import { inviteTournamentManager, cancelTournamentManagerInvite } from '@/app/actions/invites'
import { toast } from 'sonner'
import { User, TournamentManagerInvite } from '@prisma/client'
import { Trash2, Mail, CheckCircle, AlertCircle } from 'lucide-react'

interface TournamentManagersProps {
    tournamentId: string
    managers: User[]
    pendingInvites?: TournamentManagerInvite[] // Add this prop
    organizerId: string | null
    currentUserId: string | undefined
}

export default function TournamentManagers({ tournamentId, managers, pendingInvites = [], organizerId, currentUserId }: TournamentManagersProps) {
    const [inviteEmail, setInviteEmail] = useState('')
    const [loading, setLoading] = useState(false)

    // Only organizer can manage managers
    const isOrganizer = organizerId === currentUserId

    const handleAddManager = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('tournamentId', tournamentId)
            formData.append('email', inviteEmail)

            const result = await inviteTournamentManager(formData)

            toast.success(result.message)
            setInviteEmail('')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to invite manager')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveManager = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this manager?')) return

        try {
            const result = await removeTournamentManager(tournamentId, userId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Manager removed')
            }
        } catch (error) {
            toast.error('Failed to remove manager')
        }
    }

    const handleCancelInvite = async (inviteId: string) => {
        try {
            await cancelTournamentManagerInvite(inviteId, tournamentId)
            toast.success('Invite cancelled')
        } catch (error) {
            toast.error('Failed to cancel invite')
        }
    }

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900">Tournament Managers</h2>
                <p className="text-gray-500 text-sm">Delegated users who can manage this tournament.</p>
            </div>

            {/* Invite Form */}
            {isOrganizer && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Manager</h3>
                    <form onSubmit={handleAddManager} className="flex gap-4">
                        <input
                            type="email"
                            placeholder="Enter user email address"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Processing...' : 'Add / Invite'}
                        </button>
                    </form>
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        If they have an account, they'll be added instantly. If not, they'll receive an invite to join.
                    </p>
                </div>
            )}

            <div className="grid gap-6">
                {/* Active Managers List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            Active Managers
                        </h3>
                        <span className="text-xs font-medium text-gray-500">{managers.length} users</span>
                    </div>

                    {managers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No managers active.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {managers.map(manager => (
                                <li key={manager.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {manager.name ? manager.name.charAt(0) : manager.email.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{manager.name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500">{manager.email}</p>
                                        </div>
                                    </div>
                                    {isOrganizer && (
                                        <button
                                            onClick={() => handleRemoveManager(manager.id)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Pending Invites List */}
                {pendingInvites.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-orange-500" />
                                Pending Invites
                            </h3>
                            <span className="text-xs font-medium text-gray-500">{pendingInvites.length} pending</span>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {pendingInvites.map(invite => (
                                <li key={invite.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                            @
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{invite.email}</p>
                                            <p className="text-xs text-orange-600 font-medium">Invitation Sent</p>
                                        </div>
                                    </div>
                                    {isOrganizer && (
                                        <button
                                            onClick={() => handleCancelInvite(invite.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Cancel Invite"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}
