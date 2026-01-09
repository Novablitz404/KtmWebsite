import { Skeleton } from '@/components/ui/Skeleton'

export default function MembersLoading() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <Skeleton className="h-8 w-12 mb-2" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <Skeleton className="h-8 w-12 mb-2" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <Skeleton className="h-8 w-12 mb-2" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-800 flex flex-col items-center justify-center">
                        <Skeleton className="h-8 w-12 mb-2 bg-gray-700" />
                        <Skeleton className="h-3 w-20 bg-gray-700" />
                    </div>
                </div>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <Skeleton className="h-7 w-32 mb-2" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-10 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>

                {/* Member Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col items-center text-center">
                            {/* Avatar */}
                            <Skeleton className="w-14 h-14 rounded-full mb-3" />
                            {/* Name */}
                            <Skeleton className="h-4 w-24 mb-2" />
                            {/* Email */}
                            <Skeleton className="h-3 w-32 mb-2" />
                            {/* Details */}
                            <div className="flex gap-2 mt-2">
                                <Skeleton className="h-5 w-12 rounded" />
                                <Skeleton className="h-5 w-10 rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-2 mt-8">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>
        </main>
    )
}
