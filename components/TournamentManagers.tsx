'use client'

import { useState } from 'react'
import { addTournamentManager, removeTournamentManager } from '@/app/actions/tournament-managers'
import { toast } from 'sonner'
import { User } from '@prisma/client'

interface TournamentManagersProps {
    tournamentId: string
    managers: User[]
    organizerId: string | null
    currentUserId: string | undefined
}

export default function TournamentManagers({ tournamentId, managers, organizerId, currentUserId }: TournamentManagersProps) {
    const [inviteEmail, setInviteEmail] = useState('')
    const [loading, setLoading] = useState(false)

    // Only organizer can manage managers
    const isOrganizer = organizerId === currentUserId

    const handleAddManager = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return

        setLoading(true)
        try {
            const result = await addTournamentManager(tournamentId, inviteEmail)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Manager added successfully')
                setInviteEmail('')
            }
        } catch (error) {
            toast.error('Failed to add manager')
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
                            {loading ? 'Adding...' : 'Add Manager'}
                        </button>
                    </form>
                    <p className="mt-2 text-xs text-gray-500">
                        Note: The user must already have an account on the platform.
                    </p>
                </div>
            )}

            {/* Managers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-700">Active Managers</h3>
                </div>

                {managers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No managers delegated yet.
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
        </div>
    )
}
