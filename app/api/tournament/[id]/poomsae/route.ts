import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const apiKey = request.headers.get('x-api-key')

        let isAuthorized = false

        // 1. Check API Key
        if (apiKey) {
            const validKey = await prisma.apiKey.findUnique({
                where: { key: apiKey, isActive: true },
                include: { owner: true } // Fetch owner to verify tournament ownership
            })

            if (validKey) {
                // Verify this key's owner manages this tournament
                const tournamentCheck = await prisma.tournament.findUnique({
                    where: { id },
                    include: { managers: true }
                })

                if (tournamentCheck) {
                    const isOwner = tournamentCheck.organizerId === validKey.ownerId
                    const isManager = tournamentCheck.managers.some(m => m.id === validKey.ownerId)
                    if (isOwner || isManager || validKey.owner.role === 'ADMIN') {
                        isAuthorized = true
                    }
                }
            }
        }

        // 2. Fallback to User Session
        if (!isAuthorized) {
            const user = await getAuthUser()

            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
                if (dbUser) {
                    const tournamentCheck = await prisma.tournament.findUnique({
                        where: { id },
                        include: { managers: true }
                    })
                    if (tournamentCheck) {
                        const isOwner = tournamentCheck.organizerId === dbUser.id
                        const isManager = tournamentCheck.managers.some(m => m.id === dbUser.id)
                        if (isOwner || isManager || dbUser.role === 'ADMIN') {
                            isAuthorized = true
                        }
                    }
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized: Valid User Session or API Key required' }, { status: 401 })
        }

        // Parse Body
        const body = await request.json()
        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Invalid payload: Expected array' }, { status: 400 })
        }

        let updatedCount = 0

        // Process Poomsae Results
        for (const result of body) {
            const { id } = result

            if (!id) {
                console.warn('Skipping result without ID')
                continue
            }

            const match = await prisma.poomsaeMatch.findUnique({
                where: { id }
            })

            if (!match) continue

            await prisma.poomsaeMatch.update({
                where: { id },
                data: {
                    accuracy: result.accuracy ?? match.accuracy,
                    presentation: result.presentation ?? match.presentation,
                    totalScore: result.totalScore ?? match.totalScore,
                    rank: result.rank ?? match.rank,
                    status: result.status || 'Completed' // Can explicitly set status or default to Completed
                }
            })
            updatedCount++
        }

        return NextResponse.json({ success: true, updated: updatedCount })

    } catch (error) {
        console.error('Upload Results Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
