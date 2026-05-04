import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const orgId = request.nextUrl.searchParams.get('orgId')
        const orgSlug = request.nextUrl.searchParams.get('orgSlug')

        // Resolve orgId from slug if provided
        let resolvedOrgId = orgId
        if (!resolvedOrgId && orgSlug) {
            const org = await prisma.organization.findUnique({
                where: { slug: orgSlug },
                select: { id: true },
            })
            resolvedOrgId = org?.id ?? null
        }

        const clubs = await prisma.club.findMany({
            where: {
                status: 'APPROVED',
                ...(resolvedOrgId ? { organizationId: resolvedOrgId } : {}),
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
