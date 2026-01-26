'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteTournament } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function DeleteTournamentButton({ tournamentId, tournamentName, redirectPath = '/organization?tab=events' }: { tournamentId: string, tournamentName: string, redirectPath?: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()
    const queryClient = useQueryClient()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteTournament(tournamentId)
            if (result.success) {
                toast.success('Tournament deleted successfully')
                // Invalidate cache
                queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] })
                queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })

                router.push(redirectPath)
            } else {
                toast.error('Failed to delete tournament')
            }
        } catch (error) {
            toast.error('An error occurred while deleting')
            console.error(error)
        } finally {
            setIsDeleting(false)
            setShowConfirm(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                title="Delete Tournament"
            >
                <Trash2 className="w-5 h-5" />
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Delete Tournament</h3>
                                    <p className="mt-2 text-sm text-gray-500">
                                        Are you sure you want to delete <strong>{tournamentName}</strong>? This action cannot be undone and will permanently remove all categories, players, and matches associated with this tournament.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Tournament'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
