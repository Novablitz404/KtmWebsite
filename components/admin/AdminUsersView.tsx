'use client'

import { useState, useMemo } from 'react'
import { MoreHorizontal, Shield, Award, Trash2, X, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { promoteToOrganizer, promoteToClubMaster, deleteUser, toggleAthleteVerification } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchAdminUsers } from '@/app/admin/fetch'
import AdminTableSkeleton from '@/components/admin/AdminTableSkeleton'

import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'

interface User {
    id: string
    name: string | null
    email: string
    role: string
    clubName: string | null
    isVerified: boolean
}

interface AdminUsersViewProps {
    initialUsers?: User[]
    searchQuery: string
}

const PAGE_SIZE = 10

export default function AdminUsersView({ initialUsers = [], searchQuery }: AdminUsersViewProps) {
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [currentPage, setCurrentPage] = useState(1)
    const router = useRouter()

    // Reset page when filters change
    useMemo(() => {
        setCurrentPage(1)
    }, [searchQuery, roleFilter])

    const { data, isLoading } = useQuery({
        queryKey: ['admin-users', currentPage, searchQuery, roleFilter],
        queryFn: () => fetchAdminUsers(currentPage, PAGE_SIZE, searchQuery, roleFilter),
        placeholderData: (prev) => prev
    })

    const users = data?.users || []
    const totalPages = data?.totalPages || 1

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">

                {/* Filters Toolbar */}
                <div className="flex justify-end mb-4 px-4 sm:px-0">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="ATHLETE">Athletes</option>
                        <option value="CLUB_MASTER">Club Masters</option>
                        <option value="ORGANIZER">Organizers</option>
                        <option value="MANAGER">Managers</option>
                        <option value="ADMIN">Admins</option>
                    </select>
                </div>

                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">

                    {/* Users Table */}
                    <div className="flex-1 overflow-auto bg-white">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading && !data ? (
                                    <TableRowsSkeleton columns={4} />
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium pt-20">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold text-sm flex items-center gap-2 ${user.name ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                                                        {user.name || 'No Name'}
                                                        {user.isVerified && (
                                                            <div className="group relative">
                                                                <Shield className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap">
                                                                    Verified Athlete
                                                                </span>
                                                            </div>
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <RoleBadge role={user.role} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                                                {user.clubName || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <UserActionsDropdown
                                                    userId={user.id}
                                                    currentRole={user.role}
                                                    userName={user.name || 'User'}
                                                    isVerified={user.isVerified}
                                                    onRefresh={() => router.refresh()}
                                                />
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
            </div>
        </div>
    )
}

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        ADMIN: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
        ORGANIZER: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
        CLUB_MASTER: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
        ATHLETE: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
        MANAGER: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100'
    }
    const label = role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    const style = styles[role] || styles.ATHLETE

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
            {label}
        </span>
    )
}

function UserActionsDropdown({
    userId,
    currentRole,
    userName,
    isVerified,
    onRefresh
}: {
    userId: string,
    currentRole: string,
    userName: string,
    isVerified: boolean,
    onRefresh: () => void
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isClubModalOpen, setIsClubModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [clubName, setClubName] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    if (currentRole === 'ADMIN') return null

    const handleToggleVerification = async () => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        try {
            await toggleAthleteVerification(formData)
            toast.success(isVerified ? 'Athlete unverified' : 'Athlete verified')
            onRefresh()
            setIsOpen(false)
        } catch (error) {
            toast.error('Failed to update verification status')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePromoteOrganizer = async () => {
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        try {
            await promoteToOrganizer(formData)
            toast.success('User promoted to Organizer')
            onRefresh()
            setIsOpen(false)
        } catch (error) {
            toast.error('Failed to promote user')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePromoteClubMaster = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clubName) return
        setIsLoading(true)
        const formData = new FormData()
        formData.append('userId', userId)
        formData.append('clubName', clubName)
        try {
            await promoteToClubMaster(formData)
            toast.success('User promoted to Club Master')
            onRefresh()
            setIsClubModalOpen(false)
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
            onRefresh()
            setIsDeleteModalOpen(false)
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete user')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                            <div className="py-1">
                                <div className="px-4 py-2 border-b border-gray-50 bg-gray-50/50">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Manage {userName.split(' ')[0]}</p>
                                </div>

                                {currentRole !== 'ORGANIZER' && currentRole !== 'MANAGER' && (
                                    <button
                                        onClick={handlePromoteOrganizer}
                                        disabled={isLoading}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                    >
                                        <Shield className="w-4 h-4" />
                                        Promote to Organizer
                                    </button>
                                )}

                                {currentRole !== 'CLUB_MASTER' && (
                                    <button
                                        onClick={() => { setIsClubModalOpen(true); setIsOpen(false) }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2"
                                    >
                                        <Award className="w-4 h-4" />
                                        Promote to Club Master
                                    </button>
                                )}

                                <button
                                    onClick={handleToggleVerification}
                                    disabled={isLoading}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                >
                                    <Shield className={`w-4 h-4 ${isVerified ? 'text-blue-600 fill-blue-600' : ''}`} />
                                    {isVerified ? 'Revoke Athlete License' : 'Grant Athlete License'}
                                </button>

                                <div className="border-t border-gray-100 my-1" />

                                <button
                                    onClick={() => { setIsDeleteModalOpen(true); setIsOpen(false) }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div >

            {/* Club Master Modal */}
            {
                isClubModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">Promote to Club Master</h3>
                                <button onClick={() => setIsClubModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 text-gray-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handlePromoteClubMaster} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                                    <input
                                        type="text"
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                        placeholder="e.g. Eagle Taekwondo Academy"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsClubModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isLoading || !clubName.trim()} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                                        {isLoading ? 'Promoting...' : 'Confirm'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <h3 className="text-lg font-bold text-red-900">Delete User</h3>
                                </div>
                                <button onClick={() => setIsDeleteModalOpen(false)} className="p-1 rounded-full hover:bg-red-100 text-red-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-gray-700">Are you sure you want to delete <strong>{userName}</strong>?</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
                                        Cancel
                                    </button>
                                    <button onClick={handleDeleteUser} disabled={isLoading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                                        {isLoading ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    )
}
