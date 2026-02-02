import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'

import RegisterConfirm from './RegisterConfirm'

interface Props {
    params: Promise<{ id: string }>
}

export default async function RegisterPage({ params }: Props) {
    const { id: tournamentId } = await params

    const clerkUser = await currentUser()
    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user profile
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
    })

    if (!dbUser) {
        redirect('/onboarding')
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

    // If registered, we usually show status. But for now, let's allow multiple if they want? 
    // The previous logic blocked it. Let's keep blocking for now unless requested, 
    // BUT we need to handle "Poomsae" users who might have 0 matches in "autoPlace".

    // Auto-place the player (Kyorugi default)
    // We try to find a Kyorugi match first. If none, we might try Poomsae or just return null.
    // The previous logic assumed Kyorugi.

    // Import findCategoryForPlayer from library
    const { findCategoryForPlayer } = await import('@/lib/placement')

    let predictedCategory = await findCategoryForPlayer(
        tournament.id,
        {
            birthDate: dbUser.birthDate!,
            gender: dbUser.gender!,
            weight: dbUser.weight!,
            height: dbUser.height || 0,
            belt: dbUser.belt || undefined,
            type: 'KYORUGI' // Default checking
        }
    )

    // Check available category types for this tournament
    const availableTypes = await prisma.category.findMany({
        where: {
            tournamentId: tournament.id
        },
        select: {
            type: true
        },
        distinct: ['type']
    }).then(types => types.map(t => t.type))

    // If no categories found (e.g. not generated yet), assume strictly what's in the template if we parsed it,
    // or fallback to all or none. For now, if empty, we might defaulting to Kyorugi? 
    // Or better, let's assume if categories exist, we use them. 
    // If NO categories exist, the user can't register anyway (findCategoryForPlayer would fail).

    return (
        <main className="min-h-screen bg-gray-50 pb-2 flex flex-col items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <RegisterConfirm
                    tournament={tournament}
                    user={dbUser}
                    suggestedCategory={predictedCategory}
                    existingRegistrations={existingRegistrations}
                    availableTypes={availableTypes.length > 0 ? availableTypes : ['KYORUGI', 'POOMSAE', 'KYUKPA']} // Fallback
                />
            </div>
        </main>
    )
}
