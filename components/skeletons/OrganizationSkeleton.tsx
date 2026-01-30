import { Users, Building2, Globe, Calendar, Settings } from 'lucide-react'
import Link from 'next/link'

interface OrganizationSkeletonProps {
    activeView?: 'home' | 'clubs' | 'events' | 'team' | 'settings'
}

export default function OrganizationSkeleton({ activeView = 'home' }: OrganizationSkeletonProps) {
    // Render specific skeleton based on view
    if (activeView === 'clubs' || activeView === 'events') {
        return (
            <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                <div className="flex flex-col h-full space-y-4">
                    {/* Header Skeleton */}
                    <div className="flex-shrink-0 flex justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-32 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-9 w-24 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-9 w-24 bg-gray-200 rounded-xl animate-pulse" />
                        </div>
                    </div>

                    {/* Content List Skeleton */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                                            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (activeView === 'settings') {
        return (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Profile Header Skeleton */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 flex flex-col sm:flex-row gap-6">
                        <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-4 pt-2">
                            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="flex gap-4 pt-2">
                                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Form Skeleton */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Default Home View Skeleton
    // Default Home View Skeleton (Identical Structure)
    return (
        <div className="p-6 h-[calc(100vh-80px)] overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 h-full">
                {/* Left Column - Main Content */}
                <div className="flex flex-col gap-6 h-full overflow-hidden">
                    {/* Stats Row */}
                    <div className="flex-shrink-0">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Total Members */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Members</p>
                                            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                        <span>Across all affiliates</span>
                                        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                                    </div>
                                </div>

                                {/* Club Affiliates */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Club Affiliates</p>
                                            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* Org Affiliates */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Org. Affiliates</p>
                                            <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Calendar Widget */}
                    <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Tournament Schedule</h3>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 w-full bg-gray-50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Skeleton */}
                <div className="hidden xl:flex flex-col gap-6 h-full overflow-hidden">
                    {/* Smart Suggestions Skeleton */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0 min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900">Smart Suggestions</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                                        <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Announcements Skeleton */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 min-h-0 flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white">
                            <div className="flex items-center gap-2">
                                {/* Using placeholder icon for simplicity or import Megaphone */}
                                <div className="w-4 h-4 bg-red-100 rounded animate-pulse" />
                                <h3 className="font-bold text-gray-900 text-sm">Announcements</h3>
                            </div>
                        </div>
                        <div className="p-3 space-y-2 overflow-y-auto flex-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 w-full bg-gray-50 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
