import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tournament/[id]/categories
 *
 * Returns the list of categories for a tournament, for manual category
 * selection in public/guest registration forms.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const categories = await prisma.category.findMany({
        where: { tournamentId: id },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' }
    })

    return NextResponse.json({ categories })
}
