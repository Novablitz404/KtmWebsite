
export function HeaderSkeleton() {
    return (
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 pt-8 pb-16 px-4 animate-pulse">
            <div className="flex flex-col items-center text-center">
                {/* Avatar Skeleton */}
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 mb-3 shadow-lg" />

                {/* Name Skeleton */}
                <div className="h-6 w-48 bg-white/30 rounded-lg mb-2" />

                {/* Club Skeleton */}
                <div className="h-4 w-32 bg-white/20 rounded-lg mb-3" />

                {/* Belt Skeleton */}
                <div className="h-6 w-24 bg-white/20 rounded-full" />
            </div>
        </div>
    )
}

export function StatsSkeleton() {
    return (
        <div className="px-4 -mt-8 relative z-10">
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                        <div className="h-8 w-8 bg-gray-100 rounded-lg mx-auto mb-1 animate-pulse" />
                        <div className="h-3 w-12 bg-gray-50 rounded mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    )
}
