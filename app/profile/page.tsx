import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import ClubMasterProfileView from './ClubMasterProfileView'
import AthleteProfileView from './AthleteProfileView'
import OrganizerProfileView from './OrganizerProfileView'

export default async function ProfilePage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Find user in our database
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        include: {
            players: {
                include: {
                    category: {
                        include: {
                            tournament: true
                        }
                    }
                },
                orderBy: {
                    category: {
                        tournament: {
                            startDate: 'desc'
                        }
                    }
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Attempt to find Club Logo if clubName exists
    let clubLogoUrl: string | undefined = undefined
    if (dbUser.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
            select: { logoUrl: true }
        })
        if (club?.logoUrl) clubLogoUrl = club.logoUrl
    }

    // Admin View
    if (dbUser.role === 'ADMIN') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <header className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            Admin Profile
                        </h1>
                    </header>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-purple-700 h-32"></div>
                        <div className="px-8 pb-8">
                            <div className="relative -mt-16 mb-6">
                                {clerkUser.imageUrl ? (
                                    <img
                                        src={clerkUser.imageUrl}
                                        alt={dbUser.name || 'Admin'}
                                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-6xl">
                                        🛡️
                                    </div>
                                )}
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{dbUser.name}</h2>
                                <p className="text-gray-500">{dbUser.email}</p>
                                <div className="mt-4">
                                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                                        Super Admin
                                    </span>
                                </div>
                                <div className="mt-8 pt-8 border-t border-gray-100">
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                                        Admin Controls
                                    </h3>
                                    <a
                                        href="/admin"
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        Go to Admin Dashboard
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // Club Master View - Rich Dashboard
    if (dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT_CLUB_MASTER') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                    <ClubMasterProfileView
                        dbUser={dbUser}
                        clerkImageUrl={clerkUser.imageUrl}
                    />
                </div>
            </main>
        )
    }

    // Organizer View - Custom Dashboard
    if (dbUser.role === 'ORGANIZER' || dbUser.role === 'MANAGER') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                    <OrganizerProfileView
                        dbUser={dbUser}
                        clerkImageUrl={clerkUser.imageUrl}
                    />
                </div>
            </main>
        )
    }

    // Athlete View - Standard Profile
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                <AthleteProfileView
                    dbUser={dbUser}
                    clerkImageUrl={clerkUser.imageUrl}
                    clubLogoUrl={clubLogoUrl}
                />
            </div>
        </main>
    )
}
