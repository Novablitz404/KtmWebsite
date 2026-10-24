import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * The Supabase Auth user for this request (no DB lookup). Mobile clients send
 * "Authorization: Bearer <access token>"; the web uses cookies.
 */
export async function getApiAuthUser() {
    const supabase = await createServerClient()
    const bearer = (await headers()).get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    const { data: { user } } = bearer
        ? await supabase.auth.getUser(bearer)
        : await supabase.auth.getUser()
    return user
}

export async function authenticateApi() {
    const user = await getApiAuthUser()

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
