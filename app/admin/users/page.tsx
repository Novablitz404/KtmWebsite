import { prisma } from '@/lib/prisma'
import UserActions from './UserActions'
import InviteActions from './InviteActions'
import UserFilters from './UserFilters'
import PendingActions from './PendingActions'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 10

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string, status?: string, role?: string, page?: string }>
}) {
    const { q, status = 'ALL', role = 'ALL', page = '1' } = await searchParams
    const currentPage = parseInt(page) || 1

    // Build Where Clause
    const whereClause: any = {
        AND: [
            q ? {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } }
                ]
            } : {},
            role !== 'ALL' ? { role: role } : {}
        ]
    }

    // 1. Fetch Users Count for Pagination
    const totalUsers = await prisma.user.count({ where: whereClause })
    const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

    // 2. Fetch Active Users (Paginated)
    const usersPromise = prisma.user.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE
    })

    // 3. Fetch Invites (Only fetch on page 1 for simplicity, or handle separate pagination if lists get huge)
    // For now, we only show pending invites on the first page to avoid confusion across pages
    const showPending = currentPage === 1 && (status === 'ALL' || status === 'PENDING')

    const orgInvitesPromise = showPending ? prisma.organizationInvite.findMany({ orderBy: { createdAt: 'desc' } }) : Promise.resolve([])

    const [users, orgInvites] = await Promise.all([
        usersPromise,
        orgInvitesPromise
    ])

    // 4. Normalize Data
    interface UnifiedRow {
        id: string
        name: string | null
        email: string
        role: string
        clubName: string | null
        status: 'ACTIVE' | 'PENDING'
        type: 'USER' | 'INVITE_ORG'
    }

    const activeRows: UnifiedRow[] = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        clubName: u.clubName,
        status: 'ACTIVE',
        type: 'USER'
    }))

    const pendingRows: UnifiedRow[] = orgInvites.map(i => ({
        id: i.id,
        name: i.name,
        email: i.email,
        role: 'ORGANIZER',
        clubName: null,
        status: 'PENDING' as const,
        type: 'INVITE_ORG' as const
    }))

    // Client-side filtering for pending (similar logic to previous step)
    const filteredPending = pendingRows.filter(row => {
        const matchesQ = !q || (
            (row.name?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
            row.email.toLowerCase().includes(q.toLowerCase())
        )
        const matchesRole = role === 'ALL' || row.role === role
        return matchesQ && matchesRole
    })

    // Combine
    // If filtering by status=ACTIVE, pending rows are empty by default because of showPending logic check above? 
    // Actually showPending checks status param too.

    let allRows: UnifiedRow[] = []

    if (status === 'PENDING') {
        // If specifically asking for pending, showing them on every page might be desired, 
        // but our DB pagination is based on Users. 
        // For a "Pending" view, we might not need pagination if list is small. 
        // For mixed view, we pin pending to Page 1.
        allRows = filteredPending
    } else {
        // ALL or ACTIVE
        allRows = [...filteredPending, ...activeRows]
    }

    // Sort
    allRows.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1
        return (a.name || a.email).localeCompare(b.name || b.email)
    })

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                    <p className="text-gray-500 mt-1">View and manage all registered users and invite status.</p>
                </div>

                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                    <InviteActions pendingOrganizerInvites={orgInvites} />
                </div>
            </div>

            {/* Filters */}
            <UserFilters />

            {/* Unified Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] sm:min-w-0">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-4 py-3 sm:px-6 sm:py-4">User Info</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 w-32">Role</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4">Club</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 w-32">Status</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {allRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                                        No users found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                allRows.map((u) => (
                                    <tr key={`${u.type}-${u.id}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-sm sm:text-base ${u.name ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                                                    {u.name || 'No Name'}
                                                </span>
                                                <span className="text-xs sm:text-sm text-gray-500">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600 text-xs sm:text-sm">
                                            {u.clubName || '-'}
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                                            <StatusBadge status={u.status} />
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                                            {u.status === 'ACTIVE' ? (
                                                <UserActions
                                                    userId={u.id}
                                                    currentRole={u.role}
                                                    currentClub={u.clubName}
                                                    userName={u.name || 'User'}
                                                />
                                            ) : (
                                                <PendingActions inviteId={u.id} type="ORGANIZER" />
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {/* Only paginate based on Users count for now since invites are pinned to page 1 */}
                <Pagination totalPages={totalPages} currentPage={currentPage} />
            </div>
        </div>
    )
}

function RoleBadge({ role }: { role: string }) {
    const styles = {
        ADMIN: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
        ORGANIZER: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
        CLUB_MASTER: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
        ATHLETE: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
        MANAGER: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100'
    }
    const label = role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    const style = styles[role as keyof typeof styles] || styles.ATHLETE

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
            {label}
        </span>
    )
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'PENDING' }) {
    if (status === 'ACTIVE') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Active
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
        </span>
    )
}
