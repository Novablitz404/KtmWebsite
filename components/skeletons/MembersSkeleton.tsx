import { Skeleton } from "@/components/ui/Skeleton"

export default function MembersSkeleton() {
    return (
        <div className="bg-gray-50 min-h-full pb-24">
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <Skeleton className="h-7 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="p-4 space-y-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-gray-100">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[150px]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
