'use client'

import { useQuery } from '@tanstack/react-query'
import { getOrganizerTournaments } from './actions'
import TournamentsList from '@/components/TournamentsList'
import { TournamentsTableSkeleton } from '@/components/Skeletons'

export default function OrganizerTournamentsClient() {

    // We fetch data on client side so page transition is instant
    const { data: tournaments, isLoading } = useQuery({
        queryKey: ['organizer-tournaments'],
        queryFn: () => getOrganizerTournaments(),
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (isLoading) {
        return <TournamentsTableSkeleton />
    }

    if (!tournaments) {
        // Handle error or null state if user isn't authorized (though page.tsx checks this too)
        return null
    }

    return (
        <TournamentsList tournaments={tournaments} />
    )
}
