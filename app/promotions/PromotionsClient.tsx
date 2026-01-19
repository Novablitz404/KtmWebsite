'use client'

import { useQuery } from '@tanstack/react-query'
import { getPromotionTests } from './actions'
import PromotionsList from './PromotionsList'
import { PromotionsTableSkeleton } from '@/components/Skeletons'

export default function PromotionsClient() {

    // Fetch data client-side for instant navigation and caching
    const { data: promotionTests, isLoading } = useQuery({
        queryKey: ['promotion-tests'],
        queryFn: () => getPromotionTests(),
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (isLoading) {
        return <PromotionsTableSkeleton />
    }

    if (!promotionTests) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">No organization found.</p>
            </div>
        )
    }

    return (
        <PromotionsList promotionTests={promotionTests} />
    )
}
