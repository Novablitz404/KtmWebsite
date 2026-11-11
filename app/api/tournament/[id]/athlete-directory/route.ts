import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canManageTournament } from '@/lib/api-auth'

/**
 * The athletes of the clubs taking part in this tournament, for the Central Server to keep offline.
 *
 * On the event day the operator can add a player by typing the athlete number; Central looks it up here (no internet needed
 * at the venue) and keeps the athlete's hidden user id, which is what links the player to the account at upload.
 * Only what the lookup needs is sent: no birth dates, e-mails or phone numbers.
 *
 * "Clubs taking part" = clubs of the registered players + clubs that joined the event (ClubEventParticipation).
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!(await canManageTournament(request, id))) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        const [players, participations] = await Promise.all([
            prisma.player.findMany({
                where: { category: { tournamentId: id } },
                select: { userId: true, club: { select: { id: true, name: true } } },
            }),
            prisma.clubEventParticipation.findMany({
                where: { tournamentId: id },
                select: { club: { select: { id: true, name: true } } },
            }),
        ])

        const clubNames = new Map<string, string>()   // lower-case -> display name
        for (const c of [...players.map(p => p.club), ...participations.map(p => p.club)]) {
            if (c?.name) clubNames.set(c.name.trim().toLowerCase(), c.name.trim())
        }
        const registeredUserIds = players.map(p => p.userId).filter((u): u is string => !!u)

        const users = await prisma.user.findMany({
            where: {
                role: 'ATHLETE',
                AND: [{ athleteNumber: { not: null } }, { athleteNumber: { not: '' } }],
                OR: [
                    { id: { in: registeredUserIds } },
                    { clubName: { in: Array.from(clubNames.values()), mode: 'insensitive' } },
                ],
            },
            select: {
                id: true, name: true, clubName: true, athleteNumber: true,
                isVerified: true, licenseExpiresAt: true, belt: true, gender: true,
            },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({
            success: true,
            generatedAt: new Date().toISOString(),
            clubs: Array.from(clubNames.values()).sort(),
            athletes: users.map(u => ({
                userId: u.id,
                name: u.name || '',
                club: u.clubName || '',
                athleteNumber: u.athleteNumber,
                licenseActive: !!u.isVerified,
                licenseExpiresAt: u.licenseExpiresAt,
                belt: u.belt,
                gender: u.gender,
            })),
        })
    } catch (error) {
        console.error('Athlete directory error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
