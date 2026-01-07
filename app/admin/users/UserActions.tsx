'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Shield, Award, Trash2, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { promoteToOrganizer, promoteToClubMaster, deleteUser } from '../actions'

interface UserActionsProps {
    userId: string
    currentRole: string
    currentClub: string | null
    userName: string
}

export default function UserActions({ userId, currentRole, currentClub, userName }: UserActionsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isClubModalOpen, setIsClubModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [clubName, setClubName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handlePromoteOrganizer = async () => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        try {
            await promoteToOrganizer(formData)
            toast.success('User promoted to Organizer')
            setIsOpen(false)
        } catch (error) {
            toast.error('Failed to promote user')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePromoteClubMaster = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clubName) {
            toast.error('Club Name is required')
            return
        }
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        formData.append('clubName', clubName)
        try {
            await promoteToClubMaster(formData)
            toast.success('User promoted to Club Master')
            setIsClubModalOpen(false)
            setIsOpen(false)
            setClubName('')
        } catch (error) {
            toast.error('Failed to promote user')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteUser = async () => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        try {
            await deleteUser(formData)
            toast.success(`${userName} has been deleted`)
            setIsDeleteModalOpen(false)
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete user')
        } finally {
            setIsLoading(false)
        }
    }

    // If user is already an Admin, generally we don't show actions, or maybe Demote (not impl)
    if (currentRole === 'ADMIN') return null

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Manage {userName.split(' ')[0]}
                            </p>
                        </div>

                        {currentRole !== 'ORGANIZER' && currentRole !== 'MANAGER' && (
                            <button
                                onClick={handlePromoteOrganizer}
                                disabled={isLoading}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
                            >
                                <Shield className="w-4 h-4" />
                                Promote to Organizer
                            </button>
                        )}

                        {currentRole !== 'CLUB_MASTER' && (
                            <button
                                onClick={() => {
                                    setIsClubModalOpen(true)
                                    setIsOpen(false)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
                            >
                                <Award className="w-4 h-4" />
                                Promote to Club Master
                            </button>
                        )}

                        {/* Separator */}
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Delete Button */}
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(true)
                                setIsOpen(false)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete User
                        </button>

                    </div>
                </div>
            )}

            {/* Club Master Promotion Modal */}
            {isClubModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">Promote to Club Master</h3>
                            <button
                                onClick={() => setIsClubModalOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePromoteClubMaster} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assign Club Name
                                </label>
                                <p className="text-sm text-gray-500 mb-3">
                                    Enter the name of the club {userName} will manage.
                                </p>
                                <input
                                    type="text"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    placeholder="e.g. Eagle Taekwondo Academy"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsClubModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || !clubName.trim()}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {isLoading ? 'Promoting...' : 'Confirm Promotion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-bold text-red-900">Delete User</h3>
                            </div>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-gray-700">
                                Are you sure you want to delete <strong>{userName}</strong>?
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                                <p className="font-medium text-amber-800 mb-2">⚠️ This action will:</p>
                                <ul className="text-amber-700 space-y-1 list-disc list-inside">
                                    <li>Remove the user from Clerk (they cannot sign in)</li>
                                    <li>Delete their account from the database</li>
                                    <li>Remove their API keys</li>
                                    <li>Orphan any player registrations</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteUser}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {isLoading ? 'Deleting...' : 'Delete User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
