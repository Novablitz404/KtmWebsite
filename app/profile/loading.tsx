import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
                    {/* Cover Image */}
                    <div className="h-48 relative rounded-t-2xl overflow-hidden">
                        <Skeleton className="absolute inset-0 rounded-none" />
                    </div>

                    {/* Profile Info */}
                    <div className="px-4 sm:px-6 pb-6">
                        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
                            {/* Avatar */}
                            <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl border-4 border-white" />

                            {/* Name & Role */}
                            <div className="flex-1 pt-2 sm:pt-0 sm:pb-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <Skeleton className="h-7 w-48" />
                                    <Skeleton className="h-6 w-28 rounded-lg" />
                                </div>
                                <Skeleton className="h-4 w-56 mt-2" />
                            </div>

                            {/* Edit Button */}
                            <Skeleton className="h-10 w-28 rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-8 w-12 mx-auto mb-2" />
                            <Skeleton className="h-3 w-20 mx-auto" />
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-8 w-12 mx-auto mb-2" />
                            <Skeleton className="h-3 w-24 mx-auto" />
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-8 w-20 mx-auto mb-2" />
                            <Skeleton className="h-3 w-16 mx-auto" />
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-8 w-16 mx-auto mb-2" />
                            <Skeleton className="h-3 w-20 mx-auto" />
                        </div>
                    </div>
                </div>

                {/* Club Details Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <Skeleton className="h-6 w-28 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-3 w-16 mb-2" />
                            <Skeleton className="h-5 w-48" />
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-3 w-12 mb-2" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <div className="p-4 rounded-xl bg-gray-50">
                            <Skeleton className="h-3 w-20 mb-2" />
                            <Skeleton className="h-5 w-56" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
