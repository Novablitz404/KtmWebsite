import { StatsCardsSkeleton } from "@/components/Skeletons"

export default function AdminLoading() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div className="space-y-3">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <StatsCardsSkeleton />

            {/* Table/Content Skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-96">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                                <div className="h-3 w-1/4 bg-gray-100 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
