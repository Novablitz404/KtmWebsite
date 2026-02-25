import { getClubMembersData } from '@/app/club/data'
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

    // Build avatars from DB imageUrl (no more Clerk API calls)
    const avatars: Record<string, string> = {}
    data.paginatedMembers.forEach(m => {
        if (m.clerkId && m.imageUrl) {
            avatars[m.clerkId] = m.imageUrl
        }
    })

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
