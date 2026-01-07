import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

                {/* 👥 Members Grid */}
                <div className="mb-6 flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Club Roster</h2>
                        <p className="text-gray-500 text-sm mt-1">All registered members of {dbUser.clubName}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                        Showing {skip + 1}-{Math.min(skip + pageSize, totalMembers)} of {totalMembers}
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
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {paginatedMembers.map(member => {
                                const avatar = avatars[member.clerkId]
                                const age = member.birthDate
                                    ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                                    : null

                                return (
                                    <div key={member.id} className="group bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden">

                                        {/* Top Background Decoration */}
                                        <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-gray-50 to-white z-0" />

                                        {/* Avatar */}
                                        <div className="relative z-10 mb-2">
                                            <div className="p-0.5 bg-white rounded-full shadow-sm">
                                                {avatar ? (
                                                    <img
                                                        src={avatar}
                                                        alt={member.name || 'Member'}
                                                        className="w-14 h-14 rounded-full object-cover bg-gray-100"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg font-bold">
                                                        {(member.name || '?').charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Belt Indicator (if exists) */}
                                            {member.belt && (
                                                <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shadow-sm ${member.belt === 'Black' ? 'bg-black text-white border-gray-800' :
                                                        member.belt === 'Red' ? 'bg-red-600 text-white border-red-700' :
                                                            'bg-white text-gray-700 border-gray-200'
                                                        }`}>
                                                        {member.belt}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="relative z-10 w-full">
                                            <h3 className="font-bold text-gray-900 text-sm truncate px-1" title={member.name || ''}>
                                                {member.name || 'Unnamed Athlete'}
                                            </h3>
                                            {member.email && (
                                                <p className="text-[10px] text-gray-400 truncate mb-2 px-2">{member.email}</p>
                                            )}

                                            <div className="grid grid-cols-3 gap-1 border-t border-gray-100 pt-2 mt-1">
                                                <div>
                                                    <p className="text-[8px] uppercase text-gray-400 font-semibold">Age</p>
                                                    <p className="font-medium text-xs text-gray-900">{age || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] uppercase text-gray-400 font-semibold">Sex</p>
                                                    <p className="font-medium text-xs text-gray-900">{member.gender === 'Male' ? 'M' : member.gender === 'Female' ? 'F' : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] uppercase text-gray-400 font-semibold">Kg</p>
                                                    <p className="font-medium text-xs text-gray-900">{member.weight ? member.weight : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-10 flex justify-center items-center gap-2">
                                <Link
                                    href={`/members?page=${currentPage - 1}`}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage <= 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    Previous
                                </Link>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <Link
                                        key={page}
                                        href={`/members?page=${page}`}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                            ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                            : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                            }`}
                                    >
                                        {page}
                                    </Link>
                                ))}

                                <Link
                                    href={`/members?page=${currentPage + 1}`}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage >= totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    Next
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
