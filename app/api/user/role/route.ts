import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({ role: null, userName: null })
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { role: true, name: true, id: true, weight: true, height: true }
        })

        return NextResponse.json({
            id: dbUser?.id || null,
            role: dbUser?.role || null,
            userName: dbUser?.name || null,
            weight: dbUser?.weight || null,
            height: dbUser?.height || null
        }, {
            headers: {
                'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
            }
        })
    } catch (error) {
        console.error('Failed to fetch user role:', error)
        return NextResponse.json({ role: null, userName: null })
    }
}
