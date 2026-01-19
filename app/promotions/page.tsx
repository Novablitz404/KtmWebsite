import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PromotionsClient from './PromotionsClient'
import PromotionsPageActions from './PromotionsPageActions'

export default async function PromotionsPage() {
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
            <main className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
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
        <main className="min-h-screen bg-gray-50">
            {/* Mobile Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Promotions</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Manage belt tests</p>
                    </div>
                    <PromotionsPageActions />
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {/* Desktop Header & Actions */}
                <header className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            <span className="text-3xl">🥋</span>
                            Promotion Tests
                        </h1>
                        <p className="mt-1 text-gray-500">
                            Schedule and manage belt promotion tests for your members.
                        </p>
                    </div>
                    <div>
                        <PromotionsPageActions />
                    </div>
                </header>

                {/* Promotions List */}
                <section>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <PromotionsClient />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
