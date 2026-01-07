import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { autoPlacePlayer, calculateAge } from '@/lib/placement'
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
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-lg font-semibold text-red-800 mb-2">Registration Not Available</p>
                        <p className="text-red-700">This tournament does not have a guideline template configured.</p>
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

    // Auto-place the player (Kyorugi)
    let placement = await autoPlacePlayer(
        tournament.guidelineTemplateId!,
        {
            birthDate: dbUser.birthDate!,
            gender: dbUser.gender!,
            weight: dbUser.weight!
        }
    )

    // Note: We no longer fetch specific Poomsae categories here because 
    // we use a generic "Poomsae Open" registration flow.

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <RegisterConfirm
                    tournament={tournament}
                    user={dbUser}
                    placement={placement}
                    poomsaeCategories={[]} // No longer used but kept for interface compat if needed (removed from prop type though)
                    existingRegistrations={existingRegistrations}
                />
            </div>
        </main>
    )
}
