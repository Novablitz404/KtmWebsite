import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Called by the Central Server right after it has downloaded the draft brackets. From then on Central is the source of
 * truth and the brackets/players here are locked (see lib/tournament-lock.ts). Only an API key of the tournament's
 * organizer, manager or an admin may do this. It does nothing if the tournament is already locked.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')
        if (!apiKey) return NextResponse.json({ error: 'Unauthorized: API key required' }, { status: 401 })

        const validKey = await prisma.apiKey.findUnique({
            where: { key: apiKey, isActive: true },
            include: { owner: true }
        })
        const t = validKey ? await prisma.tournament.findUnique({ where: { id }, include: { managers: true } }) : null
        const allowed = !!validKey && !!t && (
            t.organizerId === validKey.ownerId ||
            t.managers.some(m => m.id === validKey.ownerId) ||
            validKey.owner.role === 'ADMIN'
        )
        if (!allowed || !t) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (t.centralTakeoverAt) {
            return NextResponse.json({ success: true, alreadyLocked: true, lockedAt: t.centralTakeoverAt })
        }
        const updated = await prisma.tournament.update({ where: { id }, data: { centralTakeoverAt: new Date() }, select: { centralTakeoverAt: true } })
        return NextResponse.json({ success: true, alreadyLocked: false, lockedAt: updated.centralTakeoverAt })
    } catch (error) {
        console.error('Central takeover error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
