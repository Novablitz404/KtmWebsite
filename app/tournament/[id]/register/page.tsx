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
    const existingRegistration = await prisma.player.findFirst({
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

    if (existingRegistration) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">

                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-green-800 mb-2">Already Registered</h2>
                        <p className="text-green-700 mb-2">
                            You have already registered for this tournament.
                        </p>
                        <div className="bg-white rounded-lg p-4 mt-4 border border-green-100">
                            <p className="text-sm text-gray-500">Division & Category</p>
                            <p className="font-medium text-gray-900">{existingRegistration.division} - {existingRegistration.category.name.split(' ').slice(-2).join(' ')}</p>
                            <p className="text-sm text-gray-500 mt-2">Status</p>
                            <p className={`font-medium ${existingRegistration.registrationStatus === 'PENDING' ? 'text-yellow-600' : 'text-green-600'}`}>
                                {existingRegistration.registrationStatus}
                            </p>
                        </div>
                        <a
                            href="/tournaments"
                            className="mt-4 inline-block text-green-800 underline hover:text-green-900"
                        >
                            ← Back to Tournaments
                        </a>
                    </div>
                </div>
            </main>
        )
    }

    // Auto-place the player
    const placement = await autoPlacePlayer(
        tournament.guidelineTemplateId,
        {
            birthDate: dbUser.birthDate!,
            gender: dbUser.gender!,
            weight: dbUser.weight!
        }
    )

    if (!placement) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Matching Category</h2>
                        <p className="text-yellow-700">
                            We couldn't find a matching division or weight category for your profile.
                        </p>
                        <div className="mt-4 text-sm text-yellow-700">
                            <p>Your profile: Age {calculateAge(dbUser.birthDate!)}, {dbUser.gender}, {dbUser.weight}kg</p>
                        </div>
                        <a
                            href="/profile"
                            className="mt-4 inline-block text-yellow-800 underline hover:text-yellow-900"
                        >
                            Update Profile →
                        </a>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">


                <RegisterConfirm
                    tournament={tournament}
                    user={dbUser}
                    placement={placement}
                />
            </div>
        </main>
    )
}
