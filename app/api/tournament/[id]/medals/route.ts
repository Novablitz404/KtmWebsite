import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')

        let isAuthorized = false

        // 1. Check API Key
        if (apiKey) {
            const validKey = await prisma.apiKey.findUnique({
                where: { key: apiKey, isActive: true },
                include: { owner: true } // Fetch owner to verify tournament ownership
            })

            if (validKey) {
                // Verify this key's owner manages this tournament
                const tournamentCheck = await prisma.tournament.findUnique({
                    where: { id },
                    include: { managers: true }
                })

                if (tournamentCheck) {
                    const isOwner = tournamentCheck.organizerId === validKey.ownerId
                    const isManager = tournamentCheck.managers.some(m => m.id === validKey.ownerId)
                    if (isOwner || isManager || validKey.owner.role === 'ADMIN') {
                        isAuthorized = true
                    }
                }
            }
        }

        // 2. Fallback to User Session
        if (!isAuthorized) {
            const user = await getAuthUser()

            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
                if (dbUser) {
                    const tournamentCheck = await prisma.tournament.findUnique({
                        where: { id },
                        include: { managers: true }
                    })
                    if (tournamentCheck) {
                        const isOwner = tournamentCheck.organizerId === dbUser.id
                        const isManager = tournamentCheck.managers.some(m => m.id === dbUser.id)
                        if (isOwner || isManager || dbUser.role === 'ADMIN') {
                            isAuthorized = true
                        }
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        // Parse Body
        const body = await request.json()
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid payload: Expected array' }, { status: 400 })
        }

        let updatedCount = 0

        // Process Medal Results
        let hasChanges = false

        for (const result of body) {
            const { id } = result

            if (!id) {
                console.warn('Skipping result without ID')
                continue
            }

            const player = await prisma.player.findUnique({
                where: { id }
            })

            if (!player) continue

            // Only update fields explicitly allowed to be changed by the scoring app (e.g. medals)
            if (result.medal !== undefined) {
                await prisma.player.update({
                    where: { id },
                    data: {
                        medal: result.medal
                    }
                })
                hasChanges = true
            }
            updatedCount++
        }

        // Trigger Global Ranking refresh if we received any Player updates (implying medals were awarded/changed)
        if (hasChanges) {
            prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY "GlobalAthleteRanking"')
                .catch(e => {
                    console.error("Concurrent ranking refresh failed in batch upload, attempting standard refresh:", e);
                    return prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "GlobalAthleteRanking"');
                })
                .catch(e => console.error("Failed to refresh GlobalAthleteRanking materialized view in batch:", e));
        }

        return NextResponse.json({ success: true, updated: updatedCount })

    } catch (error) {
        console.error('Upload Results Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
