import { Skeleton } from '@/components/ui/Skeleton'

export default function AttendanceLoading() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-7 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-lg" />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                            <Skeleton className="h-8 w-12 mx-auto mb-2" />
                            <Skeleton className="h-3 w-24 mx-auto" />
                        </div>
                    ))}
                </div>

                {/* Today's Attendance */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="divide-y divide-gray-50">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-32 mb-1" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}
