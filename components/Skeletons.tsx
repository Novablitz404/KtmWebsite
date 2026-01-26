'use client'

// Skeleton component for tournament table loading state
export function TournamentsTableSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left">
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            </th>
                            <th className="px-6 py-4 text-left">
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            </th>
                            <th className="px-6 py-4 text-left">
                                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            </th>
                            <th className="px-6 py-4 text-left">
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            </th>
                            <th className="px-6 py-4 text-right">
                                <div className="h-4 w-16 bg-gray-200 rounded ml-auto"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[...Array(10)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                            <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="h-8 w-20 bg-gray-200 rounded ml-auto"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Skeleton for stats cards
export function StatsCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            <div className="h-6 w-12 bg-gray-300 rounded"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Skeleton for member cards
export function MemberCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center">
                    <div className="w-14 h-14 bg-gray-200 rounded-full mb-2"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded mb-2"></div>
                    <div className="grid grid-cols-3 gap-1 w-full pt-2 border-t border-gray-100">
                        <div className="h-8 bg-gray-100 rounded"></div>
                        <div className="h-8 bg-gray-100 rounded"></div>
                        <div className="h-8 bg-gray-100 rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Skeleton for promotions table
export function PromotionsTableSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            {[...Array(6)].map((_, i) => (
                                <th key={i} className="px-6 py-4 text-left">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                </th>
                            ))}
                            <th className="px-6 py-4 text-right">
                                <div className="h-4 w-16 bg-gray-200 rounded ml-auto"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[...Array(10)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-6 py-4">
                                    <div className="space-y-2">
                                        <div className="h-4 w-40 bg-gray-200 rounded"></div>
                                        <div className="h-3 w-64 bg-gray-100 rounded"></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-28 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-16 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-4 w-12 bg-gray-200 rounded"></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="h-8 w-20 bg-gray-200 rounded ml-auto"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

