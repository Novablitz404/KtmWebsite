import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InviteActions from './InviteActions'
import MembersGrid from './MembersGrid'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function MembersPage(props: { searchParams: Promise<{ page?: string }> }) {
    const searchParams = await props.searchParams
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: { role: true, clubName: true, name: true }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Only Club Masters can access this page
    if (dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER') {
        redirect('/profile')
    }

    if (!dbUser.clubName) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500">No club associated with your account.</p>
                </div>
            </main>
        )
    }

    // Pagination Setup
    const currentPage = Number(searchParams.page) || 1
    const pageSize = 8
    const skip = (currentPage - 1) * pageSize

    // Optimized: Parallel queries with DB pagination and aggregates
    const [paginatedMembers, totalMembers, genderStats, beltStats] = await Promise.all([
        // Paginated members (only fetch current page)
        prisma.user.findMany({
            where: { clubName: dbUser.clubName, role: 'ATHLETE' },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        // Total count for pagination
        prisma.user.count({
            where: { clubName: dbUser.clubName, role: 'ATHLETE' }
        }),
        // Gender stats (aggregated in DB)
        prisma.user.groupBy({
            by: ['gender'],
            where: { clubName: dbUser.clubName, role: 'ATHLETE' },
            _count: true
        }),
        // Belt stats (aggregated in DB)
        prisma.user.groupBy({
            by: ['belt'],
            where: { clubName: dbUser.clubName, role: 'ATHLETE' },
            _count: true
        })
    ])

    const totalPages = Math.ceil(totalMembers / pageSize)

    // Fetch avatars from Clerk (Only for current page)
    const clerkIds = paginatedMembers.map(u => u.clerkId).filter(Boolean)
    let avatars: Record<string, string> = {}

    if (clerkIds.length > 0) {
        try {
            const uniqueIds = Array.from(new Set(clerkIds))
            const users = await (await clerkClient()).users.getUserList({
                userId: uniqueIds,
                limit: 100
            })
            users.data.forEach(user => {
                avatars[user.id] = user.imageUrl
            })
        } catch (error) {
            console.error('Failed to fetch Clerk users:', error)
        }
    }

    // Extract stats from grouped results
    const males = genderStats.find(s => s.gender === 'Male')?._count || 0
    const females = genderStats.find(s => s.gender === 'Female')?._count || 0
    const blackBelts = beltStats.find(s => s.belt === 'Black')?._count || 0

    // Fetch pending invites
    const pendingInvites = await prisma.clubAssistantInvite.findMany({
        where: { clubName: dbUser.clubName },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">

                {/* 📊 Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-gray-900 mb-1">{totalMembers}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total Members</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">{males}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Male</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-pink-500 mb-1">{females}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Female</div>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-800 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-white mb-1">{blackBelts}</div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Black Belts</div>
                    </div>
                </div>

                {/* Actions & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Club Roster</h2>
                        <p className="text-gray-500 text-sm mt-1">All registered members of {dbUser.clubName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {/* Only Club Master (not Assistant) can invite others? Usually yes. */}
                        {dbUser.role === 'CLUB_MASTER' && (
                            <InviteActions invites={pendingInvites} />
                        )}
                        <div className="text-sm text-gray-500">
                            Showing {skip + 1}-{Math.min(skip + pageSize, totalMembers)} of {totalMembers}
                        </div>
                    </div>
                </div>

                {paginatedMembers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-200">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No members found</h3>
                        <p className="text-gray-500">
                            Invite athletes to join <strong>{dbUser.clubName}</strong> during their signup!
                        </p>
                    </div>
                ) : (
                    <MembersGrid
                        members={paginatedMembers}
                        avatars={avatars}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        isClubMaster={dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT_CLUB_MASTER'}
                    />
                )}
            </div>
        </main>
    )
}
