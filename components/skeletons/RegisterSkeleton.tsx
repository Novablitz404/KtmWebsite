export function RegisterSkeleton() {
    return (
        <div className="space-y-4 pt-2 animate-pulse">
            {/* Header skeleton */}
            <div className="flex flex-col gap-2 mb-4 px-4 bg-white py-4 border-b border-gray-100">
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-100 rounded"></div>
            </div>

            {/* List Items */}
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white mx-4 rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                            <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
                            <div className="flex gap-2 pt-1">
                                <div className="h-4 w-12 bg-gray-100 rounded"></div>
                                <div className="h-4 w-16 bg-gray-100 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
