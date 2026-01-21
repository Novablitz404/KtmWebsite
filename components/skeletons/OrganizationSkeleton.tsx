import { Users, Building2, Globe, ChevronRight, Trophy, Medal, Megaphone, Plus } from 'lucide-react'
import Link from 'next/link'

export default function OrganizationSkeleton() {
    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column (Main Content) */}
                <div className="xl:col-span-3 space-y-8">
                    {/* Stats Section */}
                    <section>
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
                                            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                        <span>Across all affiliates</span>
                                        <div className="h-5 w-16 bg-indigo-50 rounded-full animate-pulse" />
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
                                            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                </div>

                                {/* Organization Affiliates */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Org. Affiliates</p>
                                            <div className="h-7 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-200 rounded-2xl p-6 h-32 animate-pulse" />
                                <div className="bg-gray-200 rounded-2xl p-6 h-32 animate-pulse" />
                            </div>
                        </div>
                    </section>

                    {/* Top Performers */}
                    <section>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
                        </div>
                    </section>

                    {/* Affiliates Table */}
                    <section className="space-y-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
                    </section>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="hidden xl:block space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-64 animate-pulse" />
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-64 animate-pulse" />
                </div>
            </div>
        </div>
    )
}
