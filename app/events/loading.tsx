'use client'

import { Skeleton, SkeletonTournamentCard, SkeletonPageHeader } from '@/components/ui/Skeleton'
import { useTenant } from '@/app/providers/TenantProvider'
import { Loader2 } from 'lucide-react'

export default function EventsLoading() {
    const tenant = useTenant()

    // Non-KTM tenants: show filter placeholder + spinner (Navbar is in layout)
    if (tenant.slug !== 'ktm') {
        return (
            <section className="pt-24 md:pt-32 pb-12">
                <div className="container mx-auto px-6">
                    {/* Filter bar placeholder */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 mb-12 flex flex-col md:flex-row items-center gap-4 justify-between">
                        <div className="flex p-1 bg-gray-100/80 rounded-xl w-full md:w-auto">
                            {['All Events', 'Competitions', 'Camps'].map((tab) => (
                                <div key={tab} className={`flex-shrink-0 md:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold capitalize ${tab === 'All Events' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                                    {tab}
                                </div>
                            ))}
                        </div>
                        <div className="relative w-full md:w-80">
                            <div className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 font-medium">
                                Search events or locations...
                            </div>
                        </div>
                    </div>

                    {/* Loading spinner */}
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-10 h-10 text-gray-400 animate-spin mb-4" />
                        <p className="text-gray-500 font-medium text-sm">Loading events...</p>
                    </div>
                </div>
            </section>
        )
    }

    // KTM tenant: show KTM-branded skeleton
    return (
        <main className="min-h-screen bg-gray-50">
            <SkeletonPageHeader />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-7 w-40" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                    </div>
                </section>

                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-7 w-36" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <SkeletonTournamentCard />
                        <SkeletonTournamentCard />
                    </div>
                </section>
            </div>
        </main>
    )
}
