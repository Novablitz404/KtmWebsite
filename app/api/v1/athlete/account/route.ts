import { createClient } from '@supabase/supabase-js'
import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { refreshGlobalRanking } from '@/lib/gss-ranking'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/v1/athlete/account  { "confirm": "DELETE" }
 *
 * Immediate, athlete-initiated account deletion (required by the App Store and Google Play).
 * The User row is anonymized in place instead of deleted: club attendance and payment records, and tournament
 * results, belong to the club's / organizer's books, and deleting the row would cascade-delete them.
 * Personal data, the login, photos, and rankings are removed. Safe to retry: every step is idempotent.
 */
export async function DELETE(request: Request) {
    try {
        const auth = await authenticateApi()
        if (!auth) return apiError('Unauthorized', 401)

        const body = await request.json().catch(() => null)
        if (body?.confirm !== 'DELETE') return apiError('Confirmation required', 400)

        const user = await prisma.user.findUnique({
            where: { id: auth.id },
            select: {
                id: true, clerkId: true, role: true, imageUrl: true,
                licensePaymentProofUrl: true, cardPaymentProofUrl: true,
                club: { select: { id: true } },
                organization: { select: { id: true } },
                createdTournaments: { select: { id: true }, take: 1 },
            },
        })
        if (!user) return apiError('Unauthorized', 401)

        // Club masters, organizers and managers run clubs/events for other people; they must contact support.
        if (user.role !== 'ATHLETE' || user.club || user.organization || user.createdTournaments.length) {
            return apiError('This account manages a club or events. Please contact KTM support to close it.', 403)
        }

        const userId = user.id
        const enrollments = await prisma.kioskFaceEnrollment.findMany({ where: { userId }, select: { clubId: true } })
        const kioskClubIds = [...new Set(enrollments.map(e => e.clubId))]

        await prisma.$transaction([
            // Tournament entries stay (brackets and results must remain correct) but lose the name.
            prisma.player.updateMany({ where: { userId }, data: { name: 'Deleted athlete' } }),
            prisma.athleteEloRating.deleteMany({ where: { userId } }),
            prisma.notification.deleteMany({ where: { userId } }),
            prisma.pushSubscription.deleteMany({ where: { userId } }),
            prisma.clubClassMember.deleteMany({ where: { userId } }),
            prisma.clubDueOverride.deleteMany({ where: { userId } }),
            prisma.clubMembership.deleteMany({ where: { userId } }),
            // Face data lives on the club's kiosk: ask it to delete the face, then drop our enrollment records.
            ...(kioskClubIds.length ? [prisma.kioskFaceClear.createMany({ data: kioskClubIds.map(clubId => ({ clubId, userId })) })] : []),
            prisma.kioskFaceEnrollment.deleteMany({ where: { userId } }),
            prisma.supportTicket.updateMany({ where: { userId }, data: { userId: null } }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    email: `deleted-${userId}@deleted.invalid`,
                    name: 'Deleted athlete',
                    imageUrl: null, birthDate: null, belt: null, gender: null, weight: null, height: null,
                    clubName: null, athleteNumber: null, country: null, isVerified: false,
                    licensePaymentProofUrl: null, cardPaymentProofUrl: null,
                    licensePaymentStatus: null, cardPaymentStatus: null,
                    organizationMemberId: null, onboardingStatus: null,
                },
            }),
        ])

        // Photos and payment proofs (best effort: public Supabase Storage URLs).
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } })
        const files = [user.imageUrl, user.licensePaymentProofUrl, user.cardPaymentProofUrl]
            .map(url => url?.match(/\/storage\/v1\/object\/public\/([^/]+)\/([^?]+)/))
            .filter((m): m is RegExpMatchArray => !!m)
        for (const [, bucket, path] of files) {
            await admin.storage.from(bucket).remove([decodeURIComponent(path)]).catch(err => console.error('[DeleteAccount] storage cleanup failed:', err))
        }

        // Last: the login. If this fails the request errors and the athlete can retry (the DB link is still intact).
        if (user.clerkId) {
            const { error } = await admin.auth.admin.deleteUser(user.clerkId)
            if (error && !/not found/i.test(error.message)) {
                console.error('[DeleteAccount] auth delete failed:', error)
                return apiError('Could not finish deleting your login. Please try again.', 500)
            }
            await prisma.user.update({ where: { id: userId }, data: { clerkId: null } })
        }

        refreshGlobalRanking().catch(err => console.error('[DeleteAccount] ranking refresh failed:', err))
        return apiResponse({ deleted: true })
    } catch (error) {
        console.error('[DeleteAccount] failed:', error)
        return apiError('Could not delete your account. Please try again.', 500)
    }
}
