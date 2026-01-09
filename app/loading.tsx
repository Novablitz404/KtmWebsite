'use client'

import { usePathname } from 'next/navigation'
import { Skeleton, SkeletonTournamentCard, SkeletonHero } from '@/components/ui/Skeleton'

export default function Loading() {
    const pathname = usePathname()

    // If on homepage, show homepage skeleton
    if (pathname === '/') {
        return (
            <main className="min-h-screen bg-white">
                {/* Hero Skeleton */}
                <SkeletonHero />

                {/* Wave shape placeholder */}
                <div className="h-8 bg-white" />

                {/* Tournaments Section Skeleton */}
                <div className="bg-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
                            <div>
                                <Skeleton className="h-8 w-48 mb-2" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-5 w-32" />
                        </div>

                        {/* Tournament Cards Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <SkeletonTournamentCard />
                            <SkeletonTournamentCard />
                            <SkeletonTournamentCard />
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // For all other routes, show a minimal neutral loading indicator
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="relative mx-auto w-16 h-16 mb-4">
                    <img
                        src="/KTMLogo.png"
                        alt="Loading"
                        className="w-16 h-16 object-contain animate-pulse"
                    />
                </div>
                <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-red-600 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
            </div>
        </div>
    )
}
