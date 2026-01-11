import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import PwaDashboard from '@/components/pwa/PwaDashboard'

export const revalidate = 30

export default async function AthleteHomePage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            role: true,
            players: {
                select: {
                    id: true,
                    belt: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                            tournament: {
                                select: {
                                    id: true,
                                    name: true,
                                    startDate: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    category: {
                        tournament: {
                            startDate: 'desc'
                        }
                    }
                },
                take: 50 // Limit to recent tournaments
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // If not an athlete, redirect to appropriate page
    if (dbUser.role !== 'ATHLETE') {
        if (dbUser.role === 'CLUB_MASTER' || dbUser.role === 'ASSISTANT_CLUB_MASTER') {
            redirect('/club')
        } else if (dbUser.role === 'ORGANIZER' || dbUser.role === 'MANAGER' || dbUser.role === 'ADMIN') {
            redirect('/manage')
        }
    }

    // Calculate stats
    const tournamentsJoined = new Set(dbUser.players.map(p => p.category.tournament.id)).size

    // Fetch club logo if needed
    let clubLogoUrl: string | undefined = undefined
    if (dbUser.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
            select: { logoUrl: true }
        })
        if (club?.logoUrl) clubLogoUrl = club.logoUrl
    }

    return (
        <PwaDashboard
            dbUser={dbUser}
            clerkUser={JSON.parse(JSON.stringify(clerkUser))}
            tournamentsJoined={tournamentsJoined}
            clubLogoUrl={clubLogoUrl}
        />
    )
}
