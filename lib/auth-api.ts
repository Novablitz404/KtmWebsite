import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function authenticateApi() {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    // Fetch user from database using clerkId (which now stores Supabase Auth UUID)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
            clubName: true,
            organizationMemberId: true,
            mustChangePassword: true,
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
