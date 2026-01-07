import { Suspense } from 'react'
import ManagePageActions from './ManagePageActions'
import DashboardStats from '@/components/DashboardStats'
import TournamentsTable from '@/components/TournamentsTable'
import { StatsCardsSkeleton, TournamentsTableSkeleton } from '@/components/Skeletons'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function ManagePage() {
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true, role: true }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Role verification - Allow Organizers, Managers, and Admins
    if (dbUser.role !== 'ORGANIZER' && dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <p className="text-4xl mb-4">👮‍♂️</p>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                        <p className="text-gray-600">
                            This page is only accessible to Organizers.
                        </p>
                        <a href="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                            Go Home →
                        </a>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-8">
                {/* Header & Actions */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Organizer Dashboard
                        </h1>
                        <p className="mt-1 text-lg text-gray-600">
                            Overview of your tournaments and performance stats.
                        </p>
                    </div>
                    <div>
                        <ManagePageActions />
                    </div>
                </header>

                {/* Stats Section - Wrapped in Suspense for streaming */}
                <section>
                    <Suspense fallback={<StatsCardsSkeleton />}>
                        <DashboardStats />
                    </Suspense>
                </section>

                {/* Active Tournaments Table - Wrapped in Suspense for streaming */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">Active Tournaments</h2>
                    <Suspense fallback={<TournamentsTableSkeleton />}>
                        <TournamentsTable />
                    </Suspense>
                </section>
            </div>
        </main>
    )
}
