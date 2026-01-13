export function EventsSkeleton() {
    return (
        <div className="pb-20">
            {/* Header Skeleton */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            </div>

            {/* List Skeleton */}
            <div className="divide-y divide-gray-200">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="px-4 py-4">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                            </div>
                            <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                            <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
                            <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
