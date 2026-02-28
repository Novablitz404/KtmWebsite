'use server'

import { prisma } from '@/lib/prisma'
import { getNextBelt } from '@/lib/belt'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email-service'
import PromotionPassedEmail from '@/emails/PromotionPassedEmail'
import React from 'react'

// Examiner actions — no auth required, secured by UUID knowledge

export async function examinerUpdateStatus(registrationId: string, status: string) {
    if (!['PASSED', 'FAILED', 'APPROVED'].includes(status)) {
        return { error: 'Invalid status' }
    }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId }
    })

    if (!registration) return { error: 'Registration not found' }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { status }
    })

    // Auto-advance belt & Send Email when PASSED
    if (status === 'PASSED' && registration.playerId) {
        const nextBelt = getNextBelt(registration.currentBelt, registration.isJump)

        const user = await prisma.user.findUnique({
            where: { id: registration.playerId },
            select: { id: true, name: true, email: true, belt: true, clubName: true }
        })

        if (nextBelt && user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { belt: nextBelt }
            })

            // Send Email Notification
            if (user.email) {
                const promotionTest = await prisma.promotionTest.findUnique({
                    where: { id: registration.promotionTestId },
                    select: { name: true }
                })

                await sendEmail({
                    to: user.email,
                    subject: 'Congratulations on your new belt! 🥋',
                    reactData: React.createElement(PromotionPassedEmail, {
                        athleteName: user.name || 'Athlete',
                        beltName: nextBelt,
                        clubName: user.clubName || 'Your Club',
                        promotionTestName: promotionTest?.name || 'Promotion Test',
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

export async function examinerToggleJump(registrationId: string) {
    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId }
    })

    if (!registration) return { error: 'Registration not found' }

    const updated = await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { isJump: !registration.isJump }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}/examiner`)
    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true, isJump: updated.isJump }
}
