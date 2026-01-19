'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function getOrganizationStats() {
    const user = await currentUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: {
            organization: {
                include: {
                    clubs: {
                        include: { students: true }
                    },
                    affiliatedOrganizations: {
                        include: {
                            clubs: {
                                include: { students: true }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!dbUser || !dbUser.organization) return null

    const org = dbUser.organization

    // Direct Clubs
    const directClubsCount = org.clubs.length
    const directMembersCount = org.clubs.reduce((acc: number, club: any) => acc + club.students.length, 0)

    // Affiliated Orgs
    const affiliatedOrgsCount = org.affiliatedOrganizations.length

    // Members from Affiliated Orgs (assuming 1 level depth for now)
    const affiliatedMembersCount = org.affiliatedOrganizations.reduce((acc: number, affOrg: any) => {
        return acc + affOrg.clubs.reduce((cAcc: number, club: any) => cAcc + club.students.length, 0)
    }, 0)

    return {
        totalMembers: directMembersCount + affiliatedMembersCount,
        directClubs: directClubsCount,
        affiliatedOrgs: affiliatedOrgsCount,
        directMembers: directMembersCount,
        affiliatedMembers: affiliatedMembersCount
    }
}

export async function getOrganizerTournaments() {
    const user = await currentUser()
    const dbUser = user ? await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true, role: true }
    }) : null

    // If no user or not an organizer, return null
    if (!dbUser || (dbUser.role !== 'ORGANIZER' && dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
        return null
    }

    // Optimized: Use _count instead of fetching all players
    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
            status: true,
            headerImageUrl: true,
            _count: {
                select: {
                    categories: true
                }
            },
            categories: {
                select: {
                    _count: {
                        select: { players: true }
                    }
                }
            }
        }
    })

    return tournaments
}
