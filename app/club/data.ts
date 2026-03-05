import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export const getClubMembersData = cache(async (clubName: string, currentPage: number, pageSize: number, searchQuery?: string) => {
    const skip = (currentPage - 1) * pageSize

    const whereClause: any = {
        clubName: clubName,
        role: 'ATHLETE'
    }

    if (searchQuery) {
        whereClause.name = {
            contains: searchQuery,
            mode: 'insensitive'
        }
    }

    const [paginatedMembers, totalMembers, genderStats, beltStats, pendingInvites] = await Promise.all([
        prisma.user.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: whereClause
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

export const getClubEventsData = cache(async (clubId: string, clubName: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [pendingPlayers, approvedPlayers, participatingTournaments, participatingPromotions, participatingSeminars, promotionRegistrations, seminarRegistrations] = await Promise.all([
        // 1. Pending players
        prisma.player.findMany({
            where: {
                clubId: clubId,
                registrationStatus: 'PENDING',
                category: {
                    tournament: {
                        startDate: {
                            gte: today
                        }
                    }
                }
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
                paymentStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: { select: { name: true, startDate: true } }
                    }
                },
                user: { select: { name: true, email: true, clerkId: true } },
                teamId: true,
                poomsaeType: true
            },
            orderBy: { category: { tournament: { startDate: 'asc' } } }
        }),
        // 2. Approved players
        prisma.player.findMany({
            where: {
                clubId: clubId,
                registrationStatus: 'APPROVED',
                category: {
                    tournament: {
                        startDate: {
                            gte: today
                        }
                    }
                }
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
                paymentStatus: true,
                category: {
                    select: {
                        name: true,
                        tournament: { select: { name: true, startDate: true } }
                    }
                },
                user: { select: { name: true, email: true, clerkId: true } },
                teamId: true,
                poomsaeType: true
            },
            orderBy: { category: { tournament: { startDate: 'desc' } } },
            take: 500
        }),
        // 3. Participating Tournaments
        prisma.tournament.findMany({
            where: {
                participatingClubs: { some: { clubId: clubId } },
                startDate: { gte: today },
                status: { not: 'CANCELLED' }
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
            take: 50
        }),
        // 3.1 Participating Promotions
        prisma.promotionTest.findMany({
            where: {
                participatingClubs: { some: { clubId: clubId } },
                testDate: { gte: today },
                status: { not: 'CANCELLED' }
            },
            select: {
                id: true,
                name: true,
                testDate: true,
                venue: true,
                _count: {
                    select: {
                        registrations: { where: { clubName: clubName } }
                    }
                }
            },
            orderBy: { testDate: 'asc' }
        }),
        // 3.2 Participating Seminars
        prisma.seminar.findMany({
            where: {
                participatingClubs: { some: { clubId: clubId } },
                startDate: { gte: today },
                status: { not: 'CANCELLED' }
            },
            select: {
                id: true,
                name: true,
                startDate: true,
                venue: true,
                _count: {
                    select: {
                        registrations: { where: { clubName: clubName } }
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        }),
        // 4. Promotion Registrations (Pending & Approved)
        prisma.promotionTestRegistration.findMany({
            where: {
                clubName: clubName,
                status: { in: ['PENDING', 'APPROVED'] },
                promotionTest: {
                    testDate: { gte: today }
                }
            },
            select: {
                id: true,
                playerName: true,
                status: true,
                paymentStatus: true,
                currentBelt: true,
                targetBelt: true,
                playerId: true,
                promotionTest: {
                    select: {
                        name: true,
                        testDate: true
                    }
                }
            },
            orderBy: { promotionTest: { testDate: 'asc' } }
        }),
        // 5. Seminar Registrations
        prisma.seminarRegistration.findMany({
            where: {
                clubName: clubName,
                status: { in: ['PENDING', 'APPROVED'] },
                seminar: {
                    startDate: { gte: today }
                }
            },
            select: {
                id: true,
                playerName: true,
                playerId: true,
                status: true,
                paymentStatus: true,
                belt: true,
                seminar: {
                    select: {
                        name: true,
                        startDate: true
                    }
                }
            },
            orderBy: { seminar: { startDate: 'asc' } }
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

    // Create unified upcomingEvents list
    const upcomingEvents = [
        ...clubTournaments.map(t => ({
            id: t.id,
            name: t.name,
            startDate: t.startDate,
            type: 'TOURNAMENT' as const,
            athleteCount: t.athleteCount
        })),
        ...participatingPromotions.map(p => ({
            id: p.id,
            name: p.name,
            startDate: p.testDate,
            type: 'PROMOTION' as const,
            athleteCount: p._count.registrations
        })),
        ...participatingSeminars.map(s => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate,
            type: 'SEMINAR' as const,
            athleteCount: s._count.registrations
        }))
    ].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    // Calculate Top Performers across all fetched tournaments
    const athleteStats = new Map<string, { name: string, gold: number, silver: number, bronze: number }>()

    participatingTournaments.forEach(tournament => {
        tournament.categories.forEach(category => {
            // Finals: matches with no nextMatchId
            const finals = category.matches.filter(m => !m.nextMatchId)

            finals.forEach(finalMatch => {
                const winner = finalMatch.winner
                if (winner) {
                    // Check if winner is from our club (by checking if they are in the players list effectively)
                    // Using name matching for now as per existing logic, but ideally use IDs.
                    // The existing logic creates a set of clubAthleteNames. We should re-use that logic per tournament.
                    // Re-deriving efficiently:
                    const clubPlayersInCat = new Set(category.players.map(p => p.name))

                    if (clubPlayersInCat.has(winner)) {
                        const stats = athleteStats.get(winner) || { name: winner, gold: 0, silver: 0, bronze: 0 }
                        stats.gold++
                        athleteStats.set(winner, stats)
                    }

                    const loser = winner === finalMatch.player1 ? finalMatch.player2 : finalMatch.player1
                    if (clubPlayersInCat.has(loser)) {
                        const stats = athleteStats.get(loser) || { name: loser, gold: 0, silver: 0, bronze: 0 }
                        stats.silver++
                        athleteStats.set(loser, stats)
                    }
                }
            })

            // Semi-finals
            const semiFinals = category.matches.filter(m =>
                m.nextMatchId && finals.some(f => f.id === m.nextMatchId)
            )

            semiFinals.forEach(semi => {
                const winner = semi.winner
                if (winner) {
                    const loser = winner === semi.player1 ? semi.player2 : semi.player1
                    // Only care about loser getting bronze
                    const clubPlayersInCat = new Set(category.players.map(p => p.name))
                    if (clubPlayersInCat.has(loser)) {
                        const stats = athleteStats.get(loser) || { name: loser, gold: 0, silver: 0, bronze: 0 }
                        stats.bronze++
                        athleteStats.set(loser, stats)
                    }
                }
            })
        })
    })

    const topPerformers = Array.from(athleteStats.values())
        .map(stat => ({
            ...stat,
            total: stat.gold + stat.silver + stat.bronze
        }))
        .sort((a, b) => {
            if (a.gold !== b.gold) return b.gold - a.gold
            if (a.silver !== b.silver) return b.silver - a.silver
            return b.bronze - a.bronze
        })
        .slice(0, 5) // Top 5

    // Fetch images for seminar registrations
    const seminarPlayerIds = seminarRegistrations
        .map(r => r.playerId)
        .filter((id): id is string => !!id)

    const seminarPlayers = await prisma.player.findMany({
        where: { id: { in: seminarPlayerIds } },
        select: { id: true, user: { select: { imageUrl: true } } }
    })

    const playerImageMap = new Map(seminarPlayers.map(p => [p.id, p.user?.imageUrl || null]))

    return {
        pendingPlayers,
        approvedPlayers,
        clubTournaments,
        upcomingEvents,
        topPerformers,
        promotionRegistrations: promotionRegistrations.map(reg => ({
            id: reg.id,
            name: reg.playerName,
            clerkId: reg.playerId || '',
            email: null,
            status: reg.status,
            paymentStatus: reg.paymentStatus,
            currentBelt: reg.currentBelt,
            targetBelt: reg.targetBelt,
            eventName: reg.promotionTest.name,
            eventDate: reg.promotionTest.testDate,
        })),
        seminarRegistrations: seminarRegistrations.map(reg => ({
            id: reg.id,
            name: reg.playerName,
            status: reg.status,
            paymentStatus: reg.paymentStatus,
            belt: reg.belt,
            imageUrl: reg.playerId ? playerImageMap.get(reg.playerId) : null,
            eventName: reg.seminar.name,
            eventDate: reg.seminar.startDate
        }))
    }
})

export const getClubMemberCount = cache(async (clubName: string) => {
    return prisma.user.count({
        where: { clubName: clubName, role: 'ATHLETE' }
    })
})

export const getClubHomeData = cache(async (clubId: string, clubName: string) => {
    const { pendingPlayers, approvedPlayers, clubTournaments, upcomingEvents, topPerformers, promotionRegistrations, seminarRegistrations } = await getClubEventsData(clubId, clubName)
    const totalMembers = await getClubMemberCount(clubName)

    return {
        pendingPlayers,
        approvedPlayers,
        clubTournaments,
        upcomingEvents,
        totalMembers,
        topPerformers,
        promotionRegistrations,
        seminarRegistrations
    }
})
