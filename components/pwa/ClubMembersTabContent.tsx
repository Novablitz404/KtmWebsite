import { getClubMembersData } from '@/app/club/data'
import { clerkClient } from '@clerk/nextjs/server'
import MembersGrid from '@/app/members/MembersGrid'

interface ClubMembersTabContentProps {
    clubName: string
    currentPage: number
    pageSize: number
}

// Data fetching logic moved to app/club/data.ts for reuse/caching

export default async function ClubMembersTabContent({ clubName, currentPage, pageSize }: ClubMembersTabContentProps) {
    const data = await getClubMembersData(clubName, currentPage, pageSize)

    // Fetch avatars
    const allClerkIds = [
        ...new Set([
            ...data.paginatedMembers.map(m => m.clerkId).filter(Boolean)
        ])
    ] as string[]

    let avatars: Record<string, string> = {}
    if (allClerkIds.length > 0 && allClerkIds.length <= 100) {
        try {
            const users = await (await clerkClient()).users.getUserList({
                userId: allClerkIds,
                limit: 100
            })
            users.data.forEach(user => {
                avatars[user.id] = user.imageUrl
            })
        } catch (error) {
            console.error('Failed to fetch Clerk users:', error)
        }
    }

    return (
        <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Club Members</h1>
                <p className="text-sm text-gray-500 mt-0.5">{data.totalMembers || 0} registered members</p>
            </div>

            {/* Members List */}
            <MembersGrid
                members={data.paginatedMembers}
                avatars={avatars}
                currentPage={currentPage}
                totalPages={Math.ceil(data.totalMembers / pageSize)}
                isClubMaster={true}
                baseUrl="/club"
            />
        </>
    )
}
