import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canManageTournament } from '@/lib/api-auth'
import { applyCentralSync, type SyncPayload } from '@/lib/central-sync'

/**
 * Step one of the Central Server's final upload: apply the event's final structure (players added / moved / withdrawn,
 * matches added / redrawn / removed). The response maps Central's ids to the website's, so the results that follow (the
 * kyorugi, poomsae and medals routes) can be sent against the right matches. Safe to run again.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        if (!(await canManageTournament(request, id))) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        const body = await request.json().catch(() => null) as SyncPayload | null
        if (!body || !Array.isArray(body.categories)) {
            return NextResponse.json({ error: 'Invalid payload: expected { categories: [...] }' }, { status: 400 })
        }

        // Central is the source of truth now: make sure the website is locked while this goes on
        const t = await prisma.tournament.findUnique({ where: { id }, select: { centralTakeoverAt: true } })
        if (!t) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
        if (!t.centralTakeoverAt) await prisma.tournament.update({ where: { id }, data: { centralTakeoverAt: new Date() } })

        const result = await applyCentralSync(id, body)
        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        console.error('Central sync error:', error)
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
    }
}
