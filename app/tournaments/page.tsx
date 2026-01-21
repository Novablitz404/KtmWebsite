import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import TournamentsView from '@/components/tournaments/TournamentsView'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function TournamentsPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user (only need id for registration check)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: { id: true }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
            {/* Mobile Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Register</h1>
                <p className="text-sm text-gray-500 mt-0.5">Browse upcoming tournaments</p>
            </div>

            <TournamentsView userId={dbUser.id} />
        </main>
    )
}
