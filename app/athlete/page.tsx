import { Suspense } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { fetchAthleteDashboardData } from '@/app/actions'
import AthleteDashboardView from '@/components/athlete/AthleteDashboardView'

export const revalidate = 30

import CompleteProfileModal from '@/components/athlete/CompleteProfileModal'

export default async function AthleteDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const clerkUser = await currentUser()
    await searchParams // Consume promise

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Fetch user data
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            imageUrl: true,
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    if (dbUser.role !== 'ATHLETE') {
        redirect('/')
    }

    // Check if profile is complete
    const isProfileComplete = dbUser.height && dbUser.weight

    // Fetch initial dashboard data server-side
    const initialDashboardData = await fetchAthleteDashboardData(clerkUser.id)

    return (
        <main className="min-h-screen bg-gray-50">
            {!isProfileComplete && <CompleteProfileModal />}
            <AthleteDashboardView
                clerkId={clerkUser.id}
                imageUrl={dbUser.imageUrl}
                initialData={initialDashboardData}
            />
        </main>
    )
}
