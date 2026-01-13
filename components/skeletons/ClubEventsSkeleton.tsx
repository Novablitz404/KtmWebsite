import { Skeleton } from "@/components/ui/Skeleton"

export default function ClubEventsSkeleton() {
    return (
        <div className="bg-gray-50 min-h-full pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <Skeleton className="h-7 w-40 mb-1" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-12 rounded-lg" />
                        <Skeleton className="h-6 w-12 rounded-lg" />
                    </div>
                </div>
                <div className="flex gap-1">
                    <Skeleton className="h-9 flex-1 rounded-xl" />
                    <Skeleton className="h-9 w-16 rounded-xl" />
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-200 bg-white">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-[60%]" />
                            <Skeleton className="h-3 w-[40%]" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}
