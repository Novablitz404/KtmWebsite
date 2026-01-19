import { Skeleton } from "@/components/ui/Skeleton"

export default function ClubRegistrationSkeleton() {
    return (
        <div className="bg-gray-50 min-h-screen pb-20 sm:pb-8">
            <div className="max-w-[1400px] mx-auto sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900">Registration</h1>
                        </div>
                        <p className="text-gray-500">Manage pending approvals and athlete registrations</p>
                    </div>

                    {/* Pending Count Badge & Add Button Skeleton */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-40 rounded-lg hidden sm:block" /> {/* Pending Badge */}
                        <Skeleton className="h-10 w-32 rounded-lg" /> {/* Add Participant Button */}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-0 z-20 mx-4 sm:mx-0">
                        {/* Search Skeleton */}
                        <div className="relative w-full sm:w-96">
                            <Skeleton className="h-11 w-full rounded-lg" />
                        </div>

                        {/* Status Tabs Skeleton */}
                        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto gap-1">
                            <Skeleton className="h-9 w-20 rounded-md bg-white shadow-sm" />
                            <Skeleton className="h-9 w-20 rounded-md" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                        </div>

                        {/* Mobile Bulk Toggle Skeleton */}
                        <div className="sm:hidden w-full">
                            <Skeleton className="h-11 w-full rounded-lg" />
                        </div>
                    </div>


                    {/* --- Content Area --- */}
                    <div className="min-h-[60vh] mx-4 sm:mx-0">

                        {/* Desktop Table View Skeleton */}
                        <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 w-12"><Skeleton className="h-4 w-4 rounded" /></th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Athlete</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Details</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Specs</th>
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                            <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <Skeleton className="h-4 w-4 rounded" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-full" />
                                                        <div>
                                                            <Skeleton className="h-4 w-32 mb-1" />
                                                            <Skeleton className="h-3 w-24" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Skeleton className="h-4 w-48 mb-1" />
                                                    <Skeleton className="h-4 w-20 rounded" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-3 w-24" />
                                                        <Skeleton className="h-3 w-20" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Skeleton className="h-6 w-24 rounded-full mx-auto" />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Skeleton className="h-8 w-16 rounded-lg" />
                                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                                        <Skeleton className="h-8 w-8 rounded-lg" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile List View Skeleton */}
                        <div className="sm:hidden space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="w-8 h-8 rounded-full" />
                                                    <div>
                                                        <Skeleton className="h-4 w-32 mb-1" />
                                                        <Skeleton className="h-3 w-24" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-5 w-16 rounded" />
                                            </div>

                                            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-gray-50/50">
                                                <Skeleton className="h-4 w-full" />
                                            </div>

                                            <div className="mt-3 flex gap-2">
                                                <Skeleton className="h-9 flex-1 rounded-lg" />
                                                <Skeleton className="h-9 w-16 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Skeleton */}
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200 mt-4">
                            <Skeleton className="h-9 w-24 rounded-lg" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-9 w-16 rounded-lg" />
                        </div>

                        <div className="h-12" /> {/* Bottom Spacer */}
                    </div>
                </div>
            </div>
        </div>
    )
}
