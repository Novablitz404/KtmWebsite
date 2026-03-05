import { Suspense } from 'react'
import { getAuthUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { fetchAthleteDashboardData } from '@/app/actions'
import AthleteDashboardView from '@/components/athlete/AthleteDashboardView'
import { getTenant } from '@/lib/tenant'

export const revalidate = 30

import CompleteProfileModal from '@/components/athlete/CompleteProfileModal'

export default async function AthleteDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const dbUser = await getAuthUser()
    await searchParams // Consume promise

    if (!dbUser) {
        redirect('/sign-in')
    }

    // Get tenant for data scoping
    const tenant = await getTenant()

    if (dbUser.role !== 'ATHLETE') {
        redirect('/')
    }

    // Check if profile is complete
    const isProfileComplete = dbUser.height && dbUser.weight

    // Fetch initial dashboard data server-side (scoped by tenant org)
    const initialDashboardData = await fetchAthleteDashboardData(dbUser.clerkId!, tenant.id)

    return (
        <main className="min-h-screen bg-gray-50">
            {!isProfileComplete && <CompleteProfileModal />}
            <AthleteDashboardView
                clerkId={dbUser.clerkId!}
                imageUrl={dbUser.imageUrl}
                initialData={initialDashboardData}
            />
        </main>
    )
}
