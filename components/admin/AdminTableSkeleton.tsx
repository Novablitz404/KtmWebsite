import { Skeleton } from "@/components/ui/Skeleton"
import TableRowsSkeleton from "./TableRowsSkeleton"

export default function AdminTableSkeleton() {
    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-1 flex flex-col min-h-0 sm:p-6 sm:max-w-[1920px] sm:mx-auto w-full">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-6 px-4 sm:px-0">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-200 overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4"><Skeleton className="h-6 w-32" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-6 w-32" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-6 w-32" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-6 w-20 ml-auto" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <TableRowsSkeleton columns={4} />
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
