import { Suspense } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PwaDashboard from '@/components/pwa/PwaDashboard'
import { getUnreadCount } from '@/app/actions/notifications'
import UserProfileHeader from '@/components/pwa/UserProfileHeader'
import UserStats from '@/components/pwa/UserStats'
import { QuickActionsAndRanking } from '@/components/pwa/HomeStaticContent'
import { HeaderSkeleton, StatsSkeleton } from '@/components/skeletons/HomeSkeletons'
import EventsTabContent from '@/components/pwa/EventsTabContent'
import { EventsSkeleton } from '@/components/skeletons/EventsSkeleton'

import { RegisterSkeleton } from '@/components/skeletons/RegisterSkeleton'
import RegisterTabContent from '@/components/pwa/RegisterTabContent'

export default async function AthleteHomePage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const user = await currentUser()
    const { tab } = await searchParams

    if (!user) {
        redirect('/')
    }

    // Minimized blocking data fetc (only what's needed for layout/auth)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    if (dbUser.role !== 'ATHLETE') {
        const target = (dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT') ? '/club' : '/manage'
        redirect(target)
    }

    // Only fetch unread count here, as it's needed for the shell (badge)
    const unreadCount = await getUnreadCount(dbUser.id)

    // Construct the Home Tab Content with Skeletons
    const homeContent = (
        <main className="min-h-[calc(100vh-80px)] bg-gray-50 pb-27">
            <Suspense fallback={<HeaderSkeleton />}>
                <UserProfileHeader userId={dbUser.id} />
            </Suspense>

            <Suspense fallback={<StatsSkeleton />}>
                <UserStats userId={dbUser.id} />
            </Suspense>

            <QuickActionsAndRanking />
        </main>
    )

    // Serialize Clerk user (minimal)
    const serializedClerkUser = {
        id: user.id,
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddresses: []
    }

    // Construct the Events Tab Content with Skeletons
    const eventsContent = (
        <Suspense fallback={<EventsSkeleton />}>
            <EventsTabContent userId={dbUser.id} />
        </Suspense>
    )

    // Construct the Register Tab Content with Skeletons
    const registerContent = (
        <Suspense fallback={<RegisterSkeleton />}>
            <RegisterTabContent userId={dbUser.id} />
        </Suspense>
    )

    return (
        <PwaDashboard
            dbUser={dbUser}
            clerkUser={serializedClerkUser}
            tournamentsJoined={0}
            initialTab={tab}
            unreadCount={unreadCount}
            homeContent={homeContent}
            eventsContent={eventsContent}
            registerContent={registerContent}
        />
    )
}
