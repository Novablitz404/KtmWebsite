import { getClubEventsData } from '@/app/club/data'
import { clerkClient } from '@clerk/nextjs/server'

import ClubEventsView from './ClubEventsView'

interface ClubEventsContentProps {
    clubId: string
    clubName: string
}

// Data fetching logic moved to app/club/data.ts for reuse/caching

export default async function ClubEventsContent({ clubId, clubName }: ClubEventsContentProps) {
    const { pendingPlayers, approvedPlayers, clubTournaments } = await getClubEventsData(clubId)

    // We need the avatars for these players
    const allClerkIds = [
        ...new Set([
            ...pendingPlayers.map(p => p.user?.clerkId).filter(Boolean),
            ...approvedPlayers.map(p => p.user?.clerkId).filter(Boolean)
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

    // Filter for upcoming tournaments only
    const isUpcoming = (p: any) => {
        const date = p.category?.tournament?.startDate
        if (!date) return true
        return new Date(date) > new Date()
    }

    const filteredPending = pendingPlayers.filter(isUpcoming)
    const filteredApproved = approvedPlayers.filter(isUpcoming)

    return (
        <ClubEventsView
            pendingPlayers={filteredPending as any}
            approvedPlayers={filteredApproved as any}
            clubTournaments={clubTournaments}
            avatars={avatars}
        />
    )
}
