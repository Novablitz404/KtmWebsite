import { Skeleton, SkeletonTournamentCard, SkeletonHero } from '@/components/ui/Skeleton'

export default function Loading() {
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

            {/* Features Section Skeleton */}
            <div className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Skeleton className="h-8 w-72 mx-auto mb-4" />
                        <Skeleton className="h-5 w-80 mx-auto" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-8">
                                <Skeleton className="w-14 h-14 rounded-xl mb-6" />
                                <Skeleton className="h-6 w-40 mb-3" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}
