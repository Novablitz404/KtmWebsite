import { getAuthUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'

import RegisterConfirm from './RegisterConfirm'

interface Props {
    params: Promise<{ id: string }>
    searchParams: Promise<{ payment?: string; registrationId?: string }>
}

export default async function RegisterPage({ params, searchParams }: Props) {
    const { id: tournamentId } = await params
    const resolvedSearchParams = await searchParams
    const paymentConfirmed = resolvedSearchParams.payment === 'success'

    const dbUser = await getAuthUser()
    if (!dbUser) {
        redirect('/sign-in')
    }

    if (dbUser.role === 'ATHLETE') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ask Your Club Master</h2>
                        <p className="text-gray-600">
                            Athletes can no longer self-register for tournaments. Please ask your club master to register you.
                        </p>
                    </div>
                </div>
            </main>
        )
    }

    // Check if profile is complete (now including birthDate)
    const profileComplete = dbUser.name && dbUser.clubName && dbUser.gender && dbUser.belt && dbUser.weight && dbUser.birthDate
    if (!profileComplete) {
        redirect(`/profile?message=complete-profile&returnTo=/tournament/${tournamentId}/register`)
    }

    // Get tournament with guideline template
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            guidelineTemplate: true
        }
    })

    if (!tournament) {
        notFound()
    }

    // Check if tournament has a guideline template
    if (!tournament.guidelineTemplateId) {
        return (
            <main className="min-h-screen bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-lg font-semibold text-red-800 mb-2">Registration Not Available</p>
                        <p className="text-red-700">This tournament does not have a guideline template configured.</p>
                    </div>
                </div>
            </main>
        )
    }

    // Check Registration Dates
    const now = new Date()
    const { registrationStart, registrationEnd } = tournament

    if (registrationStart && now < new Date(registrationStart)) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-blue-900 mb-2">Opening Soon</h2>
                        <p className="text-blue-700 mb-4">Registration for this tournament has not started yet.</p>
                        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-blue-100 text-blue-800 font-medium">
                            Opens: {new Date(registrationStart).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    if (registrationEnd && now > new Date(registrationEnd)) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-red-900 mb-2">Registration Closed</h2>
                        <p className="text-red-700 mb-4">The deadline for this tournament has passed.</p>
                        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-red-100 text-red-800 font-medium">
                            Closed: {new Date(registrationEnd).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // Check if user already registered
    const existingRegistrations = await prisma.player.findMany({
        where: {
            userId: dbUser.id,
            category: {
                tournamentId: tournament.id
            }
        },
        include: {
            category: true
        }
    })

    // Fetch all categories for this tournament so the athlete/club master can pick manually
    const categories = await prisma.category.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, name: true, type: true, court: true },
        orderBy: { name: 'asc' }
    })

    const availableTypes = Array.from(new Set(categories.map(c => c.type)))

    return (
        <main className="min-h-screen bg-gray-50 pb-2 flex flex-col items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <RegisterConfirm
                    tournament={tournament}
                    user={dbUser}
                    categories={categories}
                    existingRegistrations={existingRegistrations as any}
                    availableTypes={availableTypes.length > 0 ? availableTypes : ['KYORUGI', 'POOMSAE', 'KYUKPA']}
                    paymentConfirmed={paymentConfirmed}
                />
            </div>
        </main>
    )
}
