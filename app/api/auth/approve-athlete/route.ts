import { apiError, apiResponse } from '@/lib/auth-api'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import WOTFAthleteApprovedEmail from '@/emails/WOTFAthleteApprovedEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * GET /api/auth/approve-athlete?clubName=...
 * 
 * Fetch pending athletes for a club.
 */
export async function GET(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return apiError('Unauthorized', 401)

        const url = new URL(request.url)
        const clubName = url.searchParams.get('clubName')
        if (!clubName) return apiError('clubName is required', 400)

        const pendingAthletes = await prisma.user.findMany({
            where: {
                clubName: { equals: clubName, mode: 'insensitive' },
                onboardingStatus: 'PENDING_APPROVAL',
                role: 'ATHLETE',
            },
            select: {
                id: true,
                name: true,
                email: true,
                gender: true,
                birthDate: true,
                country: true,
                imageUrl: true,
                clubName: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return apiResponse(pendingAthletes)
    } catch (error: any) {
        console.error('Fetch pending athletes error:', error)
        return apiError(error.message || 'Failed to fetch pending athletes', 500)
    }
}

/**
 * POST /api/auth/approve-athlete
 * 
 * Clubmaster approves or rejects a pending athlete.
 * 
 * Body:
 * - athleteId: string (User ID of the athlete)
 * - action: "approve" | "reject"
 * - weight?: number (required for approve)
 * - height?: number (required for approve)
 * - belt?: string (required for approve)
 */
export async function POST(request: Request) {
    try {
        const supabase = await createServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return apiError('Unauthorized', 401)

        // Look up the clubmaster
        const clubmaster = await prisma.user.findUnique({
            where: { clerkId: authUser.id },
            select: { id: true, role: true, clubName: true }
        })

        if (!clubmaster || clubmaster.role !== 'CLUB_MASTER') {
            return apiError('Only club masters can approve athletes', 403)
        }

        // Get the club this master owns
        const club = await prisma.club.findUnique({
            where: { masterId: clubmaster.id },
            select: { id: true, name: true }
        })

        if (!club) {
            return apiError('Club not found for this master', 404)
        }

        const body = await request.json()
        const { athleteId, action, weight, height, belt } = body

        if (!athleteId || !action) {
            return apiError('athleteId and action are required', 400)
        }

        // Find the athlete
        const athlete = await prisma.user.findUnique({
            where: { id: athleteId },
            select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
                clubName: true,
                onboardingStatus: true,
            }
        })

        if (!athlete) {
            return apiError('Athlete not found', 404)
        }

        if (athlete.onboardingStatus !== 'PENDING_APPROVAL') {
            return apiError('Athlete is not pending approval', 400)
        }

        // Verify athlete belongs to this clubmaster's club (case-insensitive)
        if (athlete.clubName?.toLowerCase() !== club.name.toLowerCase()) {
            return apiError('This athlete is not registered under your club', 403)
        }

        if (action === 'approve') {
            if (!weight || !height || !belt) {
                return apiError('Weight, height, and belt rank are required for approval', 400)
            }

            await prisma.user.update({
                where: { id: athlete.id },
                data: {
                    weight: parseFloat(weight),
                    height: parseFloat(height),
                    belt,
                    onboardingStatus: 'APPROVED',
                    approvedBy: clubmaster.id,
                    approvedAt: new Date(),
                }
            })

            // Send approval email to athlete
            if (athlete.email) {
                resend.emails.send({
                    from: 'WOTF Global <noreply@wotf-ph.com>',
                    to: [athlete.email],
                    subject: `🎉 You're approved, ${athlete.name}! — WOTF Global`,
                    react: WOTFAthleteApprovedEmail({
                        athleteName: athlete.name || 'Athlete',
                        clubName: athlete.clubName || club.name,
                        belt,
                        weight: parseFloat(weight),
                        height: parseFloat(height),
                    }),
                }).catch((err: any) => {
                    console.error('[ApproveAthlete] Failed to send approval email:', err)
                })
            }

            console.log(`[ApproveAthlete] ${clubmaster.id} approved athlete ${athlete.id} (${athlete.name})`)
            return apiResponse({ success: true, message: `${athlete.name} has been approved` })

        } else if (action === 'reject') {
            // Full deletion: DB + Supabase Auth
            const athleteClerkId = athlete.clerkId

            // Delete from DB first
            await prisma.user.delete({
                where: { id: athlete.id }
            })

            // Delete from Supabase Auth using admin client
            if (athleteClerkId) {
                try {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!,
                    )
                    await supabaseAdmin.auth.admin.deleteUser(athleteClerkId)
                    console.log(`[ApproveAthlete] Deleted auth user ${athleteClerkId} for rejected athlete ${athlete.name}`)
                } catch (authErr) {
                    console.error('[ApproveAthlete] Failed to delete auth user:', authErr)
                }
            }

            console.log(`[ApproveAthlete] ${clubmaster.id} rejected athlete ${athlete.id} (${athlete.name})`)
            return apiResponse({ success: true, message: `${athlete.name} has been rejected and removed` })

        } else {
            return apiError('Invalid action. Use "approve" or "reject"', 400)
        }

    } catch (error: any) {
        console.error('Approve athlete error:', error)
        return apiError(error.message || 'Failed to process approval', 500)
    }
}
