import { Skeleton } from '@/components/ui/Skeleton'

interface ClubHomeSkeletonProps {
    clubName?: string
    clubMasterName?: string
    clubLogo?: string | null
    clubAddress?: string | null
}

export default function ClubHomeSkeleton({
    clubName,
    clubMasterName,
    clubLogo,
    clubAddress
}: ClubHomeSkeletonProps) {
    return (
        <div className="bg-gray-50 flex flex-col h-full">
            {/* Mobile Skeleton */}
            <div className="sm:hidden flex-1 overflow-y-auto bg-gray-50 flex flex-col pb-20">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 pt-6 pb-14 px-4 flex-shrink-0">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mb-3 shadow-lg">
                            {clubLogo ? (
                                <img
                                    src={clubLogo}
                                    alt={clubName || 'Club'}
                                    className="w-full h-full rounded-full object-contain bg-white p-1"
                                />
                            ) : (
                                <Skeleton className="w-full h-full rounded-full bg-white/50" />
                            )}
                        </div>
                        {clubName ? (
                            <h1 className="text-2xl font-bold text-white shadow-sm">{clubName}</h1>
                        ) : (
                            <Skeleton className="h-8 w-48 bg-white/20 mb-1 rounded-lg" />
                        )}
                        {clubMasterName ? (
                            <p className="text-white/80 text-base mt-1 font-medium">{clubMasterName}</p>
                        ) : (
                            <Skeleton className="h-5 w-32 mt-1 bg-white/20 rounded-md" />
                        )}
                        {clubAddress ? (
                            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white shadow-sm truncate max-w-[250px]">
                                📍 {clubAddress}
                            </span>
                        ) : (
                            <Skeleton className="h-6 w-32 mt-2 rounded-full bg-white/20" />
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="px-4 -mt-8 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <Skeleton className="h-8 w-12 mx-auto mb-1 rounded-md" />
                            <div className="text-xs text-gray-500 mt-0.5">Members</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <Skeleton className="h-8 w-12 mx-auto mb-1 rounded-md" />
                            <div className="text-xs text-gray-500 mt-0.5">Medals</div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                            <Skeleton className="h-8 w-12 mx-auto mb-1 rounded-md" />
                            <div className="text-xs text-gray-500 mt-0.5">Pending</div>
                        </div>
                    </div>
                </div>

                {/* Pending Approval Section */}
                <div className="px-4 mt-6 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Approval</h2>
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <Skeleton className="h-4 w-24 mb-1.5" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                                <Skeleton className="h-7 w-16 rounded-lg flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Tournament Section */}
                <div className="px-4 mt-6 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming Tournament</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-4 mt-6 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h2>
                    <div className="space-y-2">
                        {/* Manage Members */}
                        <div className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                                👥
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">Manage Members</h3>
                                <p className="text-sm text-gray-500">View registered members</p>
                            </div>
                            <div className="text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>

                        {/* Register Athletes */}
                        <div className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl">
                                🏆
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">Register Athletes</h3>
                                <p className="text-sm text-gray-500">Browse upcoming tournaments</p>
                            </div>
                            <div className="text-gray-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Skeleton */}
            <div className="hidden sm:block max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-pulse">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {/* Club Logo */}
                        {clubLogo ? (
                            <div className="w-16 h-16 rounded-xl border border-gray-200 p-1 bg-white shadow-sm">
                                <img src={clubLogo} alt="Club Logo" className="w-full h-full object-contain rounded-lg" />
                            </div>
                        ) : (
                            <Skeleton className="w-16 h-16 rounded-xl" />
                        )}
                        <div>
                            {clubName ? (
                                <h1 className="text-3xl font-bold text-gray-900">{clubName}</h1>
                            ) : (
                                <Skeleton className="h-8 w-48 mb-2" />
                            )}
                            <p className="text-gray-500">Manage your club, tournaments, and athletes</p>
                        </div>
                    </div>
                    {/* Settings Button Placeholder */}
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* My Tournaments Section */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-7 w-40 bg-gray-200 rounded-md"></div>
                        <div className="h-5 w-8 rounded-full bg-gray-200"></div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-24" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-12" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-24 mx-auto" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-16 mx-auto" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {[1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-5 w-48 mb-2" />
                                                <Skeleton className="h-4 w-20" />
                                            </td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-3">
                                                    <Skeleton className="h-6 w-8" />
                                                    <Skeleton className="h-6 w-8" />
                                                    <Skeleton className="h-6 w-8" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-8 mx-auto rounded-full" /></td>
                                            <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Registrations Section */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="h-7 w-36 mb-2 bg-gray-200 rounded-md"></div>
                            <div className="h-4 w-72 bg-gray-200 rounded-md"></div>
                        </div>
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <Skeleton className="h-9 w-16 rounded-lg" />
                            <Skeleton className="h-9 w-20 rounded-lg ml-1" />
                            <Skeleton className="h-9 w-24 rounded-lg ml-1" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4"><Skeleton className="h-4 w-4" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-24" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-16 mx-auto" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-4" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-9 w-9 rounded-full" />
                                                    <div>
                                                        <Skeleton className="h-4 w-32 mb-1" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-4 w-36 mb-1" />
                                                <Skeleton className="h-3 w-24" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-3 w-20 mb-1" />
                                                <Skeleton className="h-3 w-24" />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-7 w-20 rounded-lg" />
                                                    <Skeleton className="h-7 w-16 rounded-lg" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
