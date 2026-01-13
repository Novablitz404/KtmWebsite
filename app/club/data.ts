import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export const getClubMembersData = cache(async (clubName: string, currentPage: number, pageSize: number) => {
    const skip = (currentPage - 1) * pageSize

    const [paginatedMembers, totalMembers, genderStats, beltStats, pendingInvites] = await Promise.all([
        prisma.user.findMany({
            where: { clubName: clubName, role: 'ATHLETE' },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: { clubName: clubName, role: 'ATHLETE' }
        }),
        prisma.user.groupBy({
            by: ['gender'],
            where: { clubName: clubName, role: 'ATHLETE' },
            _count: true
        }),
        prisma.user.groupBy({
            by: ['belt'],
            where: { clubName: clubName, role: 'ATHLETE' },
            _count: true
        }),
        prisma.clubAssistantInvite.findMany({
            where: { clubName: clubName },
            orderBy: { createdAt: 'desc' }
        })
    ])

    return {
        paginatedMembers,
        totalMembers,
        genderStats,
        beltStats,
        pendingInvites
    }
})

export const getClubEventsData = cache(async (clubId: string) => {
    const [pendingPlayers, approvedPlayers, participatingTournaments] = await Promise.all([
        // 1. Pending players
        prisma.player.findMany({
            where: {
                clubId: clubId,
                registrationStatus: 'PENDING'
            },
            select: {
                id: true,
                name: true,
                gender: true,
                belt: true,
                weight: true,
                height: true,
                skillLevel: true,
                registrationStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: { select: { name: true, startDate: true } }
                    }
                },
                user: { select: { name: true, email: true, clerkId: true } }
            },
            orderBy: { category: { tournament: { startDate: 'asc' } } }
        }),
        // 2. Approved players
        prisma.player.findMany({
            where: {
                clubId: clubId,
                registrationStatus: 'APPROVED'
            },
            select: {
                id: true,
                name: true,
                gender: true,
                belt: true,
                weight: true,
                height: true,
                skillLevel: true,
                registrationStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: { select: { name: true, startDate: true } }
                    }
                },
                user: { select: { name: true, email: true, clerkId: true } }
            },
            orderBy: { category: { tournament: { startDate: 'desc' } } },
            take: 20
        }),
        // 3. Tournament stats (Raw)
        prisma.tournament.findMany({
            where: {
                categories: {
                    some: {
                        players: {
                            some: { clubId: clubId, registrationStatus: 'APPROVED' }
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                startDate: true,
                categories: {
                    select: {
                        players: {
                            where: { clubId: clubId, registrationStatus: 'APPROVED' },
                            select: { id: true, name: true }
                        },
                        matches: {
                            where: { winner: { not: null } },
                            select: {
                                player1: true,
                                player2: true,
                                winner: true,
                                nextMatchId: true,
                                id: true
                            }
                        }
                    }
                }
            },
            orderBy: { startDate: 'desc' },
            take: 10
        })
    ])

    // Calculate stats for each tournament
    const clubTournaments = participatingTournaments.map(tournament => {
        let gold = 0
        let silver = 0
        let bronze = 0
        let athleteCount = 0

        const clubAthleteNames = new Set<string>()

        tournament.categories.forEach(category => {
            athleteCount += category.players.length
            category.players.forEach(p => clubAthleteNames.add(p.name))

            // Finals: matches with no nextMatchId
            const finals = category.matches.filter(m => !m.nextMatchId)

            finals.forEach(finalMatch => {
                const winner = finalMatch.winner
                if (winner && clubAthleteNames.has(winner)) {
                    gold++
                }
                if (winner) {
                    const loser = winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1
                    if (clubAthleteNames.has(loser)) {
                        silver++
                    }
                }
            })

            // Semi-finals: matches whose nextMatch is a final
            const semiFinals = category.matches.filter(m =>
                m.nextMatchId && finals.some(f => f.id === m.nextMatchId)
            )

            semiFinals.forEach(semi => {
                const winner = semi.winner
                if (winner) {
                    const loser = winner === semi.player1 ? semi.player2 : semi.player1
                    if (clubAthleteNames.has(loser)) {
                        bronze++
                    }
                }
            })
        })

        return {
            id: tournament.id,
            name: tournament.name,
            startDate: tournament.startDate,
            athleteCount,
            gold,
            silver,
            bronze
        }
    })

    return {
        pendingPlayers,
        approvedPlayers,
        clubTournaments
    }
})

export const getClubMemberCount = cache(async (clubName: string) => {
    return prisma.user.count({
        where: { clubName: clubName, role: 'ATHLETE' }
    })
})

export const getClubHomeData = cache(async (clubId: string, clubName: string) => {
    const { pendingPlayers, clubTournaments } = await getClubEventsData(clubId)
    const totalMembers = await getClubMemberCount(clubName)

    return {
        pendingPlayers,
        clubTournaments,
        totalMembers
    }
})
