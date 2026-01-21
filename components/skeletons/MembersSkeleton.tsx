import { Skeleton } from "@/components/ui/Skeleton"

export default function MembersSkeleton() {
    return (
        <div className="h-full flex flex-col min-h-0 bg-gray-50">
            {/* Mobile List Skeleton */}
            <div className="sm:hidden overflow-y-auto flex-1 divide-y divide-gray-200">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden sm:flex flex-col flex-1 min-h-0 bg-white shadow-sm overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 relative">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {[...Array(10)].map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <Skeleton className="h-4 w-32 rounded" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <Skeleton className="h-8 w-8 rounded" />
                                            <div className="w-px h-6 bg-gray-200"></div>
                                            <Skeleton className="h-8 w-8 rounded" />
                                            <div className="w-px h-6 bg-gray-200"></div>
                                            <Skeleton className="h-8 w-8 rounded" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Skeleton className="h-4 w-40 rounded" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
