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
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto sm:px-6 lg:px-8 sm:py-4 sm:pt-4 sm:pb-2">
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
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                        <Skeleton className="w-6 h-6 rounded bg-orange-100/50" />
                                    </div>
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
                    <div className="px-4 mt-6 flex-shrink-0 pb-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Actions</h2>
                        <div className="space-y-2">
                            {/* Manage Members */}
                            <div className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                                    <Skeleton className="w-6 h-6 rounded bg-indigo-100/50" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Manage Members</h3>
                                    <p className="text-sm text-gray-500">View registered members</p>
                                </div>
                                <div className="text-gray-400">
                                    <Skeleton className="w-5 h-5 rounded-full" />
                                </div>
                            </div>

                            {/* Register Athletes */}
                            <div className="w-full flex items-center gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-xl">
                                    <Skeleton className="w-6 h-6 rounded bg-orange-100/50" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Register Athletes</h3>
                                    <p className="text-sm text-gray-500">Browse upcoming tournaments</p>
                                </div>
                                <div className="text-gray-400">
                                    <Skeleton className="w-5 h-5 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Skeleton - Updated to match ClubDashboard layout */}
                <div className="hidden sm:block space-y-8 sm:space-y-12">

                    {/* Header */}
                    <div className="hidden sm:flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {clubLogo ? (
                                <div className="w-16 h-16 rounded-xl border border-gray-200 p-1 bg-white shadow-sm">
                                    <img src={clubLogo} alt="Club Logo" className="w-full h-full object-contain rounded-lg" />
                                </div>
                            ) : (
                                <Skeleton className="w-16 h-16 rounded-xl" />
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Club Dashboard</h1>
                                <p className="text-gray-500">Manage your club, tournaments, and athletes</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Members Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Skeleton className="w-6 h-6 bg-indigo-200" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Members</p>
                                <Skeleton className="h-8 w-16 mt-1" />
                            </div>
                        </div>
                        {/* Next Event Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Skeleton className="w-6 h-6 bg-emerald-200" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-500">Next Event</p>
                                <Skeleton className="h-6 w-32 mt-1 mb-1" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                        {/* Pending Card */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Skeleton className="w-6 h-6 bg-orange-200" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                                <Skeleton className="h-8 w-16 mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Main Grid: Tournaments + Sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content Column (2/3 Width) */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Top Actions: Registration & Updates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Registration Quick Action Skeleton */}
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between h-48">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                                        <Skeleton className="w-5 h-5 bg-indigo-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Manage Registration</h3>
                                        <Skeleton className="h-4 w-3/4 mt-2" />
                                    </div>
                                    <Skeleton className="h-5 w-24 mt-6" />
                                </div>

                                {/* Team Updates Widget Skeleton */}
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg h-48 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg mb-2">Team Updates</h3>
                                        <Skeleton className="h-4 w-full bg-indigo-400/30 mb-2" />
                                        <Skeleton className="h-4 w-2/3 bg-indigo-400/30" />
                                    </div>
                                    <Skeleton className="h-8 w-24 bg-white/20 rounded-lg" />
                                </div>
                            </div>

                            {/* My Tournaments Section */}
                            <section>
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Tournaments</h2>
                                        <Skeleton className="w-8 h-6 rounded-full" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-white border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Athletes</th>
                                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-50">
                                                {[1, 2, 3].map((i) => (
                                                    <tr key={i}>
                                                        <td className="px-6 py-4">
                                                            <Skeleton className="h-5 w-48" />
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
                                                        <td className="px-6 py-4 text-right"><Skeleton className="h-6 w-20 rounded-full ml-auto" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Widgets */}
                        <div className="space-y-8">
                            {/* Top Performers Widget Skeleton */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-yellow-50 rounded-lg">
                                        <Skeleton className="w-5 h-5 bg-yellow-200" />
                                    </div>
                                    <h2 className="font-bold text-gray-900 text-lg">Top Performers</h2>
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3">
                                            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <Skeleton className="h-4 w-32 mb-1" />
                                                <div className="flex gap-2">
                                                    <Skeleton className="h-4 w-12 rounded-full" />
                                                    <Skeleton className="h-4 w-12 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                                    <Skeleton className="h-4 w-32 mx-auto" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
