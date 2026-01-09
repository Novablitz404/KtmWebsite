import { Skeleton, SkeletonPageHeader } from '@/components/ui/Skeleton'

export default function AboutLoading() {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section Skeleton */}
            <SkeletonPageHeader />

            {/* Content Skeleton */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Mission Section */}
                <section className="mb-16">
                    <Skeleton className="h-7 w-36 mb-6" />
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                        <Skeleton className="h-5 w-full mb-3" />
                        <Skeleton className="h-5 w-full mb-3" />
                        <Skeleton className="h-5 w-3/4" />
                    </div>
                </section>

                {/* Features Grid */}
                <section className="mb-16">
                    <Skeleton className="h-7 w-40 mb-6" />
                    <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                                <Skeleton className="w-12 h-12 rounded-xl mb-4" />
                                <Skeleton className="h-5 w-40 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact Section */}
                <section>
                    <Skeleton className="h-7 w-36 mb-6" />
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                        <Skeleton className="h-5 w-72 mx-auto mb-6" />
                        <Skeleton className="h-12 w-36 mx-auto rounded-xl" />
                    </div>
                </section>
            </div>
        </main>
    )
}
