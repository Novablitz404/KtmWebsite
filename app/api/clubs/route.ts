import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const clubs = await prisma.club.findMany({
            where: { status: 'APPROVED' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })
        return NextResponse.json(clubs)
    } catch (error) {
        console.error('Failed to fetch clubs:', error)
        return NextResponse.json([])
    }
}
