import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import InviteActions from './InviteActions' // Keep this? Yes, needed for props if we kept it. Wait, I deleted the fetching for invites too.
import MembersGrid from './MembersGrid'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function MembersPage(props: { searchParams: Promise<{ page?: string; search?: string }> }) {
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
        redirect('/')
    }

    if (!dbUser.clubName) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500">No club associated with your account.</p>
                </div>
            </main>
        )
    }

    // Fetch pending invites (fast)
    const pendingInvites = await prisma.clubAssistantInvite.findMany({
        where: { clubName: dbUser.clubName },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Mobile Header (Hidden on Desktop) - STATIC, loads instantly */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Members</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{dbUser.clubName}</p>
                    </div>
                    {dbUser.role === 'CLUB_MASTER' && (
                        <InviteActions invites={pendingInvites} />
                    )}
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:pt-4 sm:pb-2">

                {/* Actions & Header - Desktop - STATIC, loads instantly */}
                <div className="hidden sm:flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Club Roster</h2>
                        <p className="text-gray-500 text-sm mt-1">Manage all registered members of {dbUser.clubName}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search Input */}
                        <form className="relative">
                            <input
                                name="search"
                                type="text"
                                placeholder="Search members..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </form>

                        {dbUser.role === 'CLUB_MASTER' && (
                            <InviteActions invites={pendingInvites} />
                        )}
                    </div>
                </div>

                {/* Table Content - Client Fetched */}
                <div className="relative">
                    <MembersGrid
                        clubName={dbUser.clubName}
                        isClubMaster={dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT_CLUB_MASTER'}
                    />
                </div>
            </div>
        </main>
    )
}
