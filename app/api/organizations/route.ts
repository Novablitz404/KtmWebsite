import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const organizations = await prisma.organization.findMany({
            where: { status: 'APPROVED' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true }
        })
        return NextResponse.json(organizations)
    } catch (error) {
        console.error('Failed to fetch organizations:', error)
        return NextResponse.json([])
    }
}
