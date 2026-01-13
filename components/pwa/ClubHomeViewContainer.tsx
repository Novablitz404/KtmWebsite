'use client'

import { use } from 'react'
import ClubHomeView from './ClubHomeView'

interface ClubHomeData {
    pendingPlayers: any[]
    clubTournaments: any[]
    totalMembers: number
}

interface ClubHomeViewContainerProps {
    dataPromise: Promise<ClubHomeData>
    clubName?: string
    clubMasterName?: string
    clubLogo?: string | null
    clubAddress?: string | null
    onNavigateToMembers: () => void
    onNavigateToTournaments: () => void
    onApprove: (playerId: string) => void
}

export default function ClubHomeViewContainer({
    dataPromise,
    clubName,
    clubMasterName,
    clubLogo,
    clubAddress,
    onNavigateToMembers,
    onNavigateToTournaments,
    onApprove
}: ClubHomeViewContainerProps) {
    const { pendingPlayers, clubTournaments, totalMembers } = use(dataPromise)

    return (
        <ClubHomeView
            clubName={clubName}
            clubMasterName={clubMasterName}
            clubLogo={clubLogo}
            clubAddress={clubAddress}
            totalMembers={totalMembers}
            totalMedals={{
                gold: clubTournaments.reduce((sum, t) => sum + t.gold, 0),
                silver: clubTournaments.reduce((sum, t) => sum + t.silver, 0),
                bronze: clubTournaments.reduce((sum, t) => sum + t.bronze, 0)
            }}
            pendingPlayers={pendingPlayers}
            upcomingTournaments={clubTournaments.filter(t => new Date(t.startDate) > new Date())}
            onNavigateToMembers={onNavigateToMembers}
            onNavigateToTournaments={onNavigateToTournaments}
            onApprove={onApprove}
        />
    )
}
