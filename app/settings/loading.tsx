import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <div className="space-y-4 sm:space-y-6">
                    {/* Profile Header Card - Generic structure */}
                    <div className="bg-white sm:rounded-2xl shadow-sm border-b sm:border border-gray-200">
                        {/* Cover Image - Neutral gradient */}
                        <div className="h-32 sm:h-48 relative sm:rounded-t-2xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                            <div className="absolute inset-0 opacity-5" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }} />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500" />
                        </div>

                        {/* Profile Info - Skeleton for dynamic content */}
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-16">
                                {/* Avatar Skeleton */}
                                <Skeleton className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white flex-shrink-0" />

                                {/* Name & Badge Skeleton */}
                                <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                        <Skeleton className="h-6 sm:h-7 w-48" />
                                        <Skeleton className="h-5 w-20 rounded-lg" />
                                    </div>
                                    <Skeleton className="h-4 w-56 mt-1" />
                                </div>

                                {/* Edit Button Skeleton */}
                                <Skeleton className="h-10 w-28 rounded-lg sm:ml-auto mt-2 sm:mt-0 sm:mb-1" />
                            </div>

                            {/* Stats Badge Skeleton */}
                            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex-1 w-full flex items-center gap-3 sm:gap-4">
                                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                                    <div>
                                        <Skeleton className="h-3 w-10 mb-1" />
                                        <Skeleton className="h-5 sm:h-6 w-32 mt-0.5" />
                                    </div>
                                </div>
                                {/* Stats */}
                                <div className="sm:ml-auto flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-1 sm:mt-0 justify-around sm:justify-start">
                                    <div className="text-center">
                                        <Skeleton className="h-6 sm:h-7 w-8 mx-auto" />
                                        <Skeleton className="h-3 w-16 mx-auto mt-1" />
                                    </div>
                                    <div className="text-center">
                                        <Skeleton className="h-6 sm:h-7 w-8 mx-auto" />
                                        <Skeleton className="h-3 w-12 mx-auto mt-1" />
                                    </div>
                                    <div className="text-center hidden sm:block">
                                        <Skeleton className="h-6 sm:h-7 w-8 mx-auto" />
                                        <Skeleton className="h-3 w-12 mx-auto mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Section - Generic Skeleton */}
                    <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
                            <Skeleton className="h-5 w-28" />
                        </div>
                        <div className="p-4 sm:p-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-12 mb-1" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-14 mb-1" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-12 mb-1" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-12 mb-1" />
                                    <Skeleton className="h-5 w-20" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-16 mb-1" />
                                    <Skeleton className="h-5 w-28" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
