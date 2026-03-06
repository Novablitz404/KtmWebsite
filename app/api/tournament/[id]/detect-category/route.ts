import { NextRequest, NextResponse } from 'next/server'
import { findCategoryForPlayer } from '@/lib/placement'

/**
 * POST /api/tournament/[id]/detect-category
 * 
 * Detects the best matching category for a player profile.
 * Used by the guest registration form for category auto-detection.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: tournamentId } = await params
        const body = await req.json()

        const { birthDate, gender, weight, height, belt, type, poomsaeType } = body

        if (!birthDate || !gender || !weight) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const category = await findCategoryForPlayer(tournamentId, {
            birthDate: new Date(birthDate),
            gender,
            weight: parseFloat(weight),
            height: height ? parseFloat(height) : undefined,
            belt,
            type: type || 'KYORUGI',
            poomsaeType,
        })

        if (!category) {
            return NextResponse.json({ name: null, message: 'No matching category found' })
        }

        return NextResponse.json({
            id: category.id,
            name: category.name,
            type: category.type,
        })
    } catch (error) {
        console.error('Category detection error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
