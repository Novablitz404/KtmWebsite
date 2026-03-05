'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNextBelt, canManagePromotion } from '@/lib/belt'

export async function updateRegistrationStatus(registrationId: string, status: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: true
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.id, registration.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: {
            status,
            ...(status === 'APPROVED' && { paymentStatus: 'PAID' })
        }
    })

    // Auto-advance belt when PASSED
    if (status === 'PASSED' && registration.playerId) {
        const nextBelt = getNextBelt(registration.currentBelt, registration.isJump)
        if (nextBelt) {
            await prisma.user.update({
                where: { id: registration.playerId },
                data: { belt: nextBelt }
            })
        }
    }

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function updateRegistrationPaymentStatus(registrationId: string, paymentStatus: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: true
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.id, registration.promotionTest.organizationId)
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
    if (!user) return { error: 'Unauthorized' }

    if (registrationIds.length === 0) return { success: true }

    const firstReg = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationIds[0] },
        include: { promotionTest: true }
    })

    if (!firstReg) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.id, firstReg.promotionTest.organizationId)
    if (!authorized) return { error: 'Unauthorized' }

    await prisma.promotionTestRegistration.updateMany({
        where: { id: { in: registrationIds } },
        data: { status }
    })

    // Auto-advance belts when bulk-marking as PASSED
    if (status === 'PASSED') {
        const registrations = await prisma.promotionTestRegistration.findMany({
            where: { id: { in: registrationIds }, playerId: { not: null } },
            select: { playerId: true, currentBelt: true, isJump: true }
        })

        for (const reg of registrations) {
            if (reg.playerId) {
                const nextBelt = getNextBelt(reg.currentBelt, reg.isJump)
                if (nextBelt) {
                    await prisma.user.update({
                        where: { id: reg.playerId },
                        data: { belt: nextBelt }
                    })
                }
            }
        }
    }

    revalidatePath(`/promotions/${firstReg.promotionTestId}`)
    return { success: true }
}

export async function toggleJump(registrationId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: true
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.id, registration.promotionTest.organizationId)
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
    if (!user) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: { promotionTest: true }
    })

    if (!registration) return { error: 'Registration not found' }

    const authorized = await canManagePromotion(user.id, registration.promotionTest.organizationId)
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
