'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextBelt, canManagePromotion } from '@/lib/belt'
import { sendEmail } from '@/lib/email-service'
import PromotionPassedEmail from '@/emails/PromotionPassedEmail'
import React from 'react'

export async function updateRegistrationStatus(registrationId: string, status: string) {
    const user = await getAuthUser()
    if (!user || !user.clerkId) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: {
                include: {
                    organization: { select: { name: true, emailBannerUrl: true } }
                }
            }
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.clerkId, registration.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    // Idempotency guard — skip side-effects if already in target status
    if (registration.status === status) {
        return { success: true }
    }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: {
            status,
            // Auto-set payment to PAID for manual (non-Xendit) events
            ...(status === 'APPROVED' && !registration.promotionTest.xenditEnabled && { paymentStatus: 'PAID' })
        }
    })

    // Auto-advance belt + send email when PASSED
    if (status === 'PASSED' && registration.playerId) {
        const nextBelt = getNextBelt(registration.currentBelt, registration.isJump)
        if (nextBelt) {
            const user = await prisma.user.findUnique({
                where: { id: registration.playerId },
                select: { id: true, name: true, email: true, clubName: true }
            })

            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { belt: nextBelt }
                })

                // Cascade all profile changes (name, belt, placement)
                const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
                cascadeUserProfile(user.id).catch(console.error)

                // Send promotion passed email
                if (user.email) {
                    const orgName = registration.promotionTest.organization?.name || 'World Olympic Taekwondo Federation'
                    const orgBannerUrl = registration.promotionTest.organization?.emailBannerUrl || null
                    sendEmail({
                        to: user.email,
                        subject: `Official Certification: Results of the ${registration.promotionTest.name}`,
                        reactData: React.createElement(PromotionPassedEmail, {
                            athleteName: user.name || 'Athlete',
                            beltName: nextBelt,
                            clubName: user.clubName || '',
                            organizationName: orgName,
                            promotionTestName: registration.promotionTest.name,
                            emailBannerUrl: orgBannerUrl,
                            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ktmsports.com'}/athlete?tab=achievements`
                        })
                    }).catch((err: any) => console.error('[updateRegistrationStatus] Email error:', err))
                }
            }
        }
    }

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function updateRegistrationPaymentStatus(registrationId: string, paymentStatus: string) {
    const user = await getAuthUser()
    if (!user || !user.clerkId) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: true
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.clerkId, registration.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { paymentStatus }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function bulkUpdateRegistrations(registrationIds: string[], status: string) {
    const user = await getAuthUser()
    if (!user || !user.clerkId) return { error: 'Unauthorized' }

    if (registrationIds.length === 0) return { success: true }

    const firstReg = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationIds[0] },
        include: {
            promotionTest: {
                include: {
                    organization: { select: { name: true, emailBannerUrl: true } }
                }
            }
        }
    })

    if (!firstReg) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.clerkId, firstReg.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    // Idempotency guard — fetch current statuses before bulk update
    // so we only trigger side-effects for records that are actually changing
    const existingStatuses = await prisma.promotionTestRegistration.findMany({
        where: { id: { in: registrationIds } },
        select: { id: true, status: true }
    })
    const alreadyInStatus = new Set(
        existingStatuses.filter(r => r.status === status).map(r => r.id)
    )
    // Only update records that aren't already in the target status
    const idsToUpdate = registrationIds.filter(id => !alreadyInStatus.has(id))
    if (idsToUpdate.length === 0) return { success: true }

    await prisma.promotionTestRegistration.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { status }
    })

    // Auto-advance belts + send emails when bulk-marking as PASSED
    if (status === 'PASSED') {
        const registrations = await prisma.promotionTestRegistration.findMany({
            where: { id: { in: idsToUpdate }, playerId: { not: null } },
            select: { playerId: true, currentBelt: true, isJump: true }
        })

        const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
        const orgName = firstReg.promotionTest.organization?.name || 'World Olympic Taekwondo Federation'
        const orgBannerUrl = firstReg.promotionTest.organization?.emailBannerUrl || null

        for (const reg of registrations) {
            if (reg.playerId) {
                const nextBelt = getNextBelt(reg.currentBelt, reg.isJump)
                if (nextBelt) {
                    const user = await prisma.user.findUnique({
                        where: { id: reg.playerId },
                        select: { id: true, name: true, email: true, clubName: true }
                    })

                    if (user) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { belt: nextBelt }
                        })

                        cascadeUserProfile(user.id).catch(console.error)

                        // Send promotion passed email
                        if (user.email) {
                            sendEmail({
                                to: user.email,
                                subject: `Official Certification: Results of the ${firstReg.promotionTest.name}`,
                                reactData: React.createElement(PromotionPassedEmail, {
                                    athleteName: user.name || 'Athlete',
                                    beltName: nextBelt,
                                    clubName: user.clubName || '',
                                    organizationName: orgName,
                                    promotionTestName: firstReg.promotionTest.name,
                                    emailBannerUrl: orgBannerUrl,
                                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ktmsports.com'}/athlete?tab=achievements`
                                })
                            }).catch((err: any) => console.error('[bulkUpdateRegistrations] Email error:', err))
                        }
                    }
                }
            }
        }
    }

    revalidatePath(`/promotions/${firstReg.promotionTestId}`)
    return { success: true }
}

export async function toggleJump(registrationId: string) {
    const user = await getAuthUser()
    if (!user || !user.clerkId) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: true
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.clerkId, registration.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    const updated = await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { isJump: !registration.isJump }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true, isJump: updated.isJump }
}

export async function deletePromotionRegistration(registrationId: string) {
    const user = await getAuthUser()
    if (!user || !user.clerkId) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: { promotionTest: true }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.clerkId, registration.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    await prisma.promotionTestRegistration.delete({
        where: { id: registrationId }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function getPromotionTests() {
    const user = await getAuthUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) {
        return null
    }

    const promotionTests = await prisma.promotionTest.findMany({
        where: { organizationId: dbUser.organization.id },
        orderBy: { testDate: 'desc' },
        include: {
            _count: { select: { registrations: true } }
        }
    })

    return promotionTests
}

export async function getUpcomingPromotions(clubId: string) {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const tests = await prisma.promotionTest.findMany({
            where: {
                participatingClubs: {
                    some: { clubId }
                },
                testDate: { gte: today },
                status: 'UPCOMING'
            },
            orderBy: { testDate: 'asc' }
        })
        return tests
    } catch (error) {
        console.error('Failed to fetch upcoming promotions:', error)
        return []
    }
}

export async function registerForPromotion(input: {
    promotionTestId: string
    playerId: string
    playerName: string
    clubName: string
    currentBelt: string
    targetBelt?: string
    age?: number
}) {
    const { promotionTestId, playerId, playerName, clubName, currentBelt, targetBelt, age } = input

    try {
        const registration = await prisma.promotionTestRegistration.create({
            data: {
                promotionTestId,
                playerId,
                playerName,
                clubName: clubName || null,
                currentBelt,
                targetBelt: targetBelt || null,
                age: age || null,
                status: 'PENDING',
                paymentStatus: 'UNPAID'
            }
        })

        revalidatePath('/club')
        return { success: true, registrationId: registration.id }
    } catch (error) {
        console.error('Promotion registration error:', error)
        return { error: 'Failed to register for promotion test' }
    }
}
