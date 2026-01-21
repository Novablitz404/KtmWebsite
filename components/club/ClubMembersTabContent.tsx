import { getClubMembersData } from '@/app/club/data'
import { clerkClient } from '@clerk/nextjs/server'
import MembersGrid from '@/app/members/MembersGrid'

interface ClubMembersTabContentProps {
    clubName: string
    currentPage: number
    pageSize: number
    search?: string
}

// Data fetching logic moved to app/club/data.ts for reuse/caching

export default async function ClubMembersTabContent({ clubName, currentPage, pageSize, search }: ClubMembersTabContentProps) {
    const data = await getClubMembersData(clubName, currentPage, pageSize, search)

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
        <div className="pt-0">
            <MembersGrid
                members={data.paginatedMembers}
                avatars={avatars}
                currentPage={currentPage}
                totalPages={Math.ceil(data.totalMembers / pageSize)}
                isClubMaster={true}
                baseUrl="/club"
                clubName={clubName}
            />
        </div>
    )
}
