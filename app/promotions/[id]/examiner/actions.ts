'use server'

import { prisma } from '@/lib/prisma'
import { getNextBelt } from '@/lib/belt'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email-service'
import PromotionPassedEmail from '@/emails/PromotionPassedEmail'
import React from 'react'

// Examiner actions — no auth required, secured by UUID knowledge

// One-shot grading: an examiner can grade a registration exactly once. The
// result can't be changed from the examiner link (organizers can correct it).
// `jump` only applies to PASSED — it promotes the athlete two ranks in the same action.
export async function examinerUpdateStatus(registrationId: string, status: string, jump: boolean = false) {
    if (!['PASSED', 'FAILED'].includes(status)) {
        return { error: 'Invalid status' }
    }
    const isJump = status === 'PASSED' && jump

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId }
    })

    if (!registration) return { error: 'Registration not found' }

    if (['PASSED', 'FAILED'].includes(registration.status)) {
        return { error: 'This result has already been recorded and can no longer be changed here.' }
    }

    // Atomic claim — if two requests race (double-click, two examiners), only one wins
    const claimed = await prisma.promotionTestRegistration.updateMany({
        where: { id: registrationId, status: { notIn: ['PASSED', 'FAILED'] } },
        data: { status, isJump }
    })
    if (claimed.count === 0) {
        return { error: 'This result has already been recorded and can no longer be changed here.' }
    }

    // Auto-advance belt & Send Email when PASSED
    if (status === 'PASSED' && registration.playerId) {
        const nextBelt = getNextBelt(registration.currentBelt, isJump)

        const user = await prisma.user.findUnique({
            where: { id: registration.playerId },
            select: { id: true, name: true, email: true, belt: true, clubName: true }
        })

        if (nextBelt && user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { belt: nextBelt }
            })

            // Cascade all profile changes (name, belt, placement)
            const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
            cascadeUserProfile(user.id).catch(console.error)

            // Send Email Notification
            if (user.email) {
                const promotionTest = await prisma.promotionTest.findUnique({
                    where: { id: registration.promotionTestId },
                    select: {
                        name: true,
                        organization: {
                            select: {
                                name: true,
                                emailBannerUrl: true
                            }
                        }
                    }
                })

                const orgName = promotionTest?.organization?.name || 'World Olympic Taekwondo Federation - Philippines (WOTF)'
                const orgBannerUrl = promotionTest?.organization?.emailBannerUrl || null

                await sendEmail({
                    to: user.email,
                    subject: `Official Certification: Results of the ${promotionTest?.name || 'Promotion Test'}`,
                    reactData: React.createElement(PromotionPassedEmail, {
                        athleteName: user.name || 'Athlete',
                        beltName: nextBelt,
                        clubName: user.clubName || 'Your Club',
                        organizationName: orgName,
                        promotionTestName: promotionTest?.name || 'Promotion Test',
                        emailBannerUrl: orgBannerUrl,
                        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ktmsports.com'}/athlete?tab=achievements`
                    })
                })
            }
        }
    }

    revalidatePath(`/promotions/${registration.promotionTestId}/examiner`)
    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}
