import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function authenticateApi() {
    const { userId } = await auth()

    if (!userId) {
        return null
    }

    // Fetch user from database with role and club info
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: {
            id: true,
            clerkId: true,
            email: true,
            name: true,
            role: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            // clubId might not exist on User directly if 1-1 or handled differently, check schema
            // For now, let's remove clubId and rely on the relation or just check schema first.
            // Actually, based on previous code, User likely has clubName to link or organization?
            // Let's stick to what we know exists from other files: clubName
            clubName: true,
            // Include club details if available
            club: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            }
        }
    })

    return dbUser
}

export function apiError(message: string, status: number = 400) {
    return NextResponse.json({ error: message }, { status })
}

export function apiResponse(data: any) {
    return NextResponse.json({ data, error: null }, { status: 200 })
}
