'use client'

import { useQuery } from '@tanstack/react-query'
import ClubAffiliationCard from '@/components/ClubAffiliationCard'
import { getClubAffiliationData } from '@/app/actions'

export default function AffiliationCardLoader({ clubId }: { clubId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['club-affiliation-settings', clubId],
        queryFn: () => getClubAffiliationData(clubId),
    })

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-6 w-48 bg-gray-100 rounded" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
                <div className="h-32 w-full bg-gray-100 rounded-xl" />
            </div>
        )
    }

    if (!data?.affiliationStatus) {
        return (
            <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No organization affiliation required for this club.</p>
            </div>
        )
    }

    return (
        <ClubAffiliationCard
            clubId={clubId}
            affiliationStatus={data.affiliationStatus}
            paymentConfig={data.paymentConfig}
        />
    )
}
