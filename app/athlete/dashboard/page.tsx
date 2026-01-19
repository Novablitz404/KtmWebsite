import { Suspense } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getUnreadCount } from '@/app/actions/notifications'
import UnifiedAthleteView from '@/components/athlete/UnifiedAthleteView'
import UserProfileHeader from '@/components/pwa/UserProfileHeader'
import UserStats from '@/components/pwa/UserStats'
import { QuickActionsAndRanking } from '@/components/pwa/HomeStaticContent'
import { HeaderSkeleton, StatsSkeleton } from '@/components/skeletons/HomeSkeletons'
import EventsTabContent from '@/components/pwa/EventsTabContent'
import { EventsSkeleton } from '@/components/skeletons/EventsSkeleton'
import { RegisterSkeleton } from '@/components/skeletons/RegisterSkeleton'
import RegisterTabContent from '@/components/pwa/RegisterTabContent'

export const revalidate = 30

export default async function AthleteDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const clerkUser = await currentUser()
    const { tab } = await searchParams

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Fetch user data needed for both views
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
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    if (dbUser.role !== 'ATHLETE') {
        redirect('/settings')
    }

    // Fetch unread count for mobile view badge
    const unreadCount = await getUnreadCount(dbUser.id)

    // Serialize Clerk user for mobile view
    const serializedClerkUser = {
        id: clerkUser.id,
        imageUrl: clerkUser.imageUrl,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        emailAddresses: []
    }

    // Construct mobile tab content with Suspense boundaries
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

    const eventsContent = (
        <Suspense fallback={<EventsSkeleton />}>
            <EventsTabContent userId={dbUser.id} />
        </Suspense>
    )

    const registerContent = (
        <Suspense fallback={<RegisterSkeleton />}>
            <RegisterTabContent userId={dbUser.id} />
        </Suspense>
    )

    return (
        <UnifiedAthleteView
            // Desktop view props
            clerkId={clerkUser.id}
            imageUrl={clerkUser.imageUrl}
            // Mobile view props
            dbUser={dbUser}
            clerkUser={serializedClerkUser}
            unreadCount={unreadCount}
            initialTab={tab}
            homeContent={homeContent}
            eventsContent={eventsContent}
            registerContent={registerContent}
        />
    )
}
