'use client'

import { useState, useMemo } from 'react'
import { MoreHorizontal, Shield, Award, Trash2, X, AlertTriangle, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { deleteUser } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAdminUsers } from '@/app/admin/fetch'
import AdminTableSkeleton from '@/components/admin/AdminTableSkeleton'

import TableRowsSkeleton from '@/components/admin/TableRowsSkeleton'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { COUNTRIES } from '@/lib/countries'

// ... existing code ...

function UserActionButtons({
    userId,
    userName,
    onRefresh
}: {
    userId: string,
    userName: string,
    onRefresh: () => void
}) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Details state
    const [userDetails, setUserDetails] = useState<any>(null)
    const [availableClubs, setAvailableClubs] = useState<string[]>([])
    const [isFetchingDetails, setIsFetchingDetails] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})

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

    const handleOpenDetails = async () => {
        setIsDetailsModalOpen(true)
        setIsFetchingDetails(true)
        try {
            const { fetchAdminUserDetails } = await import('@/app/admin/fetch')
            const data = await fetchAdminUserDetails(userId)
            setUserDetails(data?.user)
            setAvailableClubs(data?.clubs || [])
            setEditForm({
                birthDate: data?.user?.birthDate ? (() => {
                    const d = new Date(data.user.birthDate);
                    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                })() : '',
                weight: data?.user?.weight || '',
                height: data?.user?.height || '',
                belt: data?.user?.belt || '',
                gender: data?.user?.gender || '',
                clubName: data?.user?.clubName || '',
                athleteNumber: data?.user?.athleteNumber || '',
                country: data?.user?.country || '',
            })
        } catch (error) {
            toast.error('Failed to load user details')
        } finally {
            setIsFetchingDetails(false)
        }
    }

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const { updateAdminUserDetails } = await import('@/app/admin/actions')
            await updateAdminUserDetails(userId, editForm)
            toast.success('User details updated')
            setIsEditing(false)
            onRefresh()
            // Re-fetch to update local state cleanly
            const { fetchAdminUserDetails } = await import('@/app/admin/fetch')
            const data = await fetchAdminUserDetails(userId)
            setUserDetails(data?.user)
            setAvailableClubs(data?.clubs || [])
        } catch (error) {
            toast.error('Failed to update details')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={handleOpenDetails}
                className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-blue-600 transition-colors"
                title="View/Edit Details"
            >
                <Eye className="w-4 h-4" />
            </button>
            <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Delete User"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Details Modal */}
            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Basic details and attributes.</p>
                            </div>
                            <button onClick={() => { setIsDetailsModalOpen(false); setIsEditing(false) }} className="p-1 rounded-full hover:bg-gray-200 text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto bg-white">
                            {isFetchingDetails ? (
                                <div className="py-12 flex justify-center items-center">
                                    <div className="w-8 h-8 border-4 border-gray-100 border-t-red-600 rounded-full animate-spin" />
                                </div>
                            ) : userDetails ? (
                                <div className="space-y-8 text-left">

                                    {/* Edit or View Details Form */}
                                    <form id="edit-user-form" onSubmit={handleSaveDetails} className="space-y-6">
                                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                                            <div className="flex items-center gap-4">
                                                {userDetails.imageUrl ? (
                                                    <img src={userDetails.imageUrl} alt={userName} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold border-2 border-red-100 shadow-sm">
                                                        {userName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{userName}</h3>
                                                    {userDetails && (
                                                        <p className="text-sm text-gray-500 mt-0.5">{userDetails.email} • {userDetails.role}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {!isEditing && (
                                                <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-blue-600 font-medium hover:underline">
                                                    Edit Details
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Birth Date</label>
                                                {isEditing ? (
                                                    <GlobalCalendar
                                                        value={editForm.birthDate}
                                                        onChange={(date) => setEditForm({ ...editForm, birthDate: date.toISOString().split('T')[0] })}
                                                        fullWidth
                                                    />
                                                ) : <p className="text-sm text-gray-900">{userDetails.birthDate ? (() => {
                                                    const d = new Date(userDetails.birthDate);
                                                    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString();
                                                })() : 'Not set'}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                                {isEditing ? (
                                                    <GlobalDropdown
                                                        value={editForm.gender}
                                                        options={[
                                                            { label: 'Male', value: 'Male' },
                                                            { label: 'Female', value: 'Female' }
                                                        ]}
                                                        onChange={(val) => setEditForm({ ...editForm, gender: val })}
                                                        fullWidth
                                                    />
                                                ) : <p className="text-sm text-gray-900">{userDetails.gender || 'Not set'}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Weight (kg)</label>
                                                {isEditing ? (
                                                    <input type="number" step="0.1" value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none" />
                                                ) : <p className="text-sm text-gray-900">{userDetails.weight || 'Not set'}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Height (cm)</label>
                                                {isEditing ? (
                                                    <input type="number" step="0.1" value={editForm.height} onChange={e => setEditForm({ ...editForm, height: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none" />
                                                ) : <p className="text-sm text-gray-900">{userDetails.height || 'Not set'}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Belt</label>
                                                {isEditing ? (
                                                    <GlobalDropdown
                                                        value={editForm.belt}
                                                        options={[
                                                            'White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'
                                                        ]}
                                                        onChange={(val) => setEditForm({ ...editForm, belt: val })}
                                                        fullWidth
                                                    />
                                                ) : <p className="text-sm text-gray-900">{userDetails.belt || 'Not set'}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Club Name</label>
                                                {isEditing ? (
                                                    <GlobalDropdown
                                                        value={editForm.clubName}
                                                        options={[
                                                            { label: 'Independent', value: 'Independent' },
                                                            ...availableClubs.map(c => ({ label: c, value: c }))
                                                        ]}
                                                        searchable
                                                        onChange={(val) => setEditForm({ ...editForm, clubName: val === 'Independent' ? '' : val })}
                                                        fullWidth
                                                    />
                                                ) : <p className="text-sm text-gray-900">{userDetails.clubName || 'Independent'}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Athlete Number</label>
                                                {isEditing ? (
                                                    <input type="text" value={editForm.athleteNumber} onChange={e => setEditForm({ ...editForm, athleteNumber: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 outline-none" />
                                                ) : <p className="text-sm text-gray-900">{userDetails.athleteNumber || 'Not assigned'}</p>}
                                            </div>
                                            <div className="z-[60]">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Country</label>
                                                {isEditing ? (
                                                    <GlobalDropdown
                                                        value={editForm.country}
                                                        options={COUNTRIES.map(c => ({ label: c, value: c }))}
                                                        searchable
                                                        onChange={(val) => setEditForm({ ...editForm, country: val })}
                                                        fullWidth
                                                    />
                                                ) : <p className="text-sm text-gray-900">{userDetails.country || 'Not set'}</p>}
                                            </div>
                                        </div>
                                    </form>


                                </div>
                            ) : (
                                <p className="text-center text-red-500 py-8">Failed to fetch details</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end items-center">
                            {isEditing ? (
                                <>
                                    <button onClick={() => { setIsEditing(false); setEditForm({}) }} disabled={isLoading} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button type="submit" form="edit-user-form" disabled={isLoading} className="px-5 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                                        {isLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsDetailsModalOpen(false)} className="px-5 py-2 bg-white border border-gray-200 text-sm text-gray-700 rounded-xl font-medium hover:bg-gray-50 shadow-sm transition-all">
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
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
            )}
        </div>
    )
}


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
}

const PAGE_SIZE = 10

export default function AdminUsersView({ initialUsers = [] }: AdminUsersViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [currentPage, setCurrentPage] = useState(1)
    const router = useRouter()
    const queryClient = useQueryClient()

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['admin-users'] })
        router.refresh()
    }

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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 px-4 sm:px-0">
                    <div className="relative w-full sm:w-80 border-black/5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm w-full sm:w-auto"
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
                                                <UserActionButtons
                                                    userId={user.id}
                                                    userName={user.name || 'User'}
                                                    onRefresh={handleRefresh}
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


