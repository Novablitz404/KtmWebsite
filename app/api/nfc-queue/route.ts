import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/nfc-queue?tournamentId=xxx&status=pending
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const tournamentId = searchParams.get('tournamentId')
    const status = searchParams.get('status') ?? 'pending'

    if (!tournamentId) {
        return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
    }

    const entries = await prisma.nfcQueue.findMany({
        where: { tournamentId, status },
        orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(entries)
}

// POST /api/nfc-queue  { tournamentId, playerId, playerName }
export async function POST(req: NextRequest) {
    try {
        const { tournamentId, playerId, playerName } = await req.json()

        if (!tournamentId || !playerId || !playerName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Avoid duplicate pending entries for the same player in the same tournament
        const existing = await prisma.nfcQueue.findFirst({
            where: { tournamentId, playerId, status: 'pending' },
        })
        if (existing) {
            return NextResponse.json(existing)
        }

        const entry = await prisma.nfcQueue.create({
            data: { tournamentId, playerId, playerName },
        })

        return NextResponse.json(entry, { status: 201 })
    } catch (err) {
        console.error('[nfc-queue POST]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
