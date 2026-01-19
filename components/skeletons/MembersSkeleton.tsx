import { Skeleton } from "@/components/ui/Skeleton"

export default function MembersSkeleton() {
    return (
        <div className="bg-gray-50 min-h-full pb-24">
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="divide-y divide-gray-200 bg-white">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
