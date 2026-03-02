import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const orgId = request.nextUrl.searchParams.get('orgId')

        const clubs = await prisma.club.findMany({
            where: {
                status: 'APPROVED',
                ...(orgId ? { organizationId: orgId } : {}),
            },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })
        return NextResponse.json(clubs)
    } catch (error) {
        console.error('Failed to fetch clubs:', error)
        return NextResponse.json([])
    }
}
