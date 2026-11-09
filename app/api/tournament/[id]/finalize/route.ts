import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { processTournamentCompletion } from '@/lib/gss-ranking'

/**
 * Called by the Central Server after it has uploaded ALL results and medals of a tournament.
 *
 * Gives the placement bonuses to the medalists, exactly once. The bonus is normally given when the tournament is marked
 * Completed, but that can happen (it is automatic, the day after the event) before the results arrive, in which case
 * there were no medals to reward. This is the late trigger. It does nothing if the bonus was already given, and it
 * waits (without recording anything) if the tournament is not Completed yet — the normal completion will then give it.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')

        let isAuthorized = false

        // 1. API key (same rules as the other upload routes)
        if (apiKey) {
            const validKey = await prisma.apiKey.findUnique({
                where: { key: apiKey, isActive: true },
                include: { owner: true }
            })
            if (validKey) {
                const t = await prisma.tournament.findUnique({ where: { id }, include: { managers: true } })
                if (t) {
                    const isOwner = t.organizerId === validKey.ownerId
                    const isManager = t.managers.some(m => m.id === validKey.ownerId)
                    if (isOwner || isManager || validKey.owner.role === 'ADMIN') isAuthorized = true
                }
            }
        }

        // 2. Signed-in organizer / manager / admin
        if (!isAuthorized) {
            const user = await getAuthUser()
            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
                const t = dbUser ? await prisma.tournament.findUnique({ where: { id }, include: { managers: true } }) : null
                if (dbUser && t) {
                    const isOwner = t.organizerId === dbUser.id
                    const isManager = t.managers.some(m => m.id === dbUser.id)
                    if (isOwner || isManager || dbUser.role === 'ADMIN') isAuthorized = true
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            select: { status: true, gssBonusProcessedAt: true },
        })
        if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

        if (tournament.gssBonusProcessedAt) {
            return NextResponse.json({ success: true, started: false, reason: 'The placement bonus of this tournament was already given' })
        }
        if (tournament.status !== 'COMPLETED') {
            return NextResponse.json({
                success: true, started: false,
                reason: 'The tournament is not marked Completed yet. The placement bonus will be given when it is, now that the results are uploaded.',
            })
        }

        // The bonus touches every medalist, which can take a while: answer now and finish in the background
        after(async () => {
            try {
                const result = await processTournamentCompletion(id)
                console.log(`[GSS] finalize ${id}:`, result)
            } catch (err) {
                console.error(`[GSS] finalize failed for ${id}:`, err)
            }
        })
        return NextResponse.json({ success: true, started: true })
    } catch (error) {
        console.error('Finalize Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
