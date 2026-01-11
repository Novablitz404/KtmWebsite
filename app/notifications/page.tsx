import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import NotificationList from './NotificationList'

export default async function NotificationsPage() {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    const user = await prisma.user.findUnique({
        where: { clerkId: userId }
    })

    if (!user) {
        redirect('/onboarding')
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-24">
            {/* Mobile Header */}
            <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-4 py-3 flex items-center justify-between sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
                <div className="w-8" /> {/* Spacer */}
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:block max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-500 mt-1">Updates about your tournaments and events</p>
            </div>

            <div className="max-w-4xl mx-auto sm:px-4">
                <NotificationList userId={user.id} />
            </div>
        </div>
    )
}
