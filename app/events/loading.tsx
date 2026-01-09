import { Skeleton, SkeletonTournamentCard, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function EventsLoading() {
    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section Skeleton */}
            <SkeletonPageHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Upcoming Section */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-7 w-40" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                    </div>
                </section>

                {/* Finished Section */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-7 w-36" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                    </div>
                </section>
            </div>
        </main>
    )
}
