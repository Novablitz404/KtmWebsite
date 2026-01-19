import Link from 'next/link'
import { Suspense } from 'react'
import TournamentsTable from '@/components/TournamentsTable'
import { TournamentsTableSkeleton } from '@/components/Skeletons'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function EventsPage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Link href="/organizer-tournaments" className="hover:text-gray-900 transition-colors">Dashboard</Link>
                            <span>/</span>
                            <span className="text-gray-900 font-medium">Events</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Events & Tournaments
                        </h1>
                        <p className="mt-1 text-gray-600">
                            Manage all your upcoming and past events.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items- center">
                        <h2 className="text-lg font-bold text-gray-900">Your Tournaments</h2>
                        {/* We could add create button here if we want redundant access */}
                    </div>
                    <div className="p-0">
                        <Suspense fallback={<TournamentsTableSkeleton />}>
                            <TournamentsTable />
                        </Suspense>
                    </div>
                </div>
            </div>
        </main>
    )
}
