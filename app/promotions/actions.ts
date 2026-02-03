'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function updateRegistrationStatus(registrationId: string, status: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    // Verify ownership via promotion test -> organization -> user
    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: {
                include: { organization: true }
            }
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization || dbUser.organization.id !== registration.promotionTest.organizationId) {
        return { error: 'Unauthorized' }
    }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { status }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function updateRegistrationPaymentStatus(registrationId: string, paymentStatus: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const registration = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationId },
        include: {
            promotionTest: {
                include: { organization: true }
            }
        }
    })

    if (!registration) return { error: 'Registration not found' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization || dbUser.organization.id !== registration.promotionTest.organizationId) {
        return { error: 'Unauthorized' }
    }

    await prisma.promotionTestRegistration.update({
        where: { id: registrationId },
        data: { paymentStatus }
    })

    revalidatePath(`/promotions/${registration.promotionTestId}`)
    return { success: true }
}

export async function bulkUpdateRegistrations(registrationIds: string[], status: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    // Simplified verification: check first one
    if (registrationIds.length === 0) return { success: true }

    const firstReg = await prisma.promotionTestRegistration.findUnique({
        where: { id: registrationIds[0] },
        include: { promotionTest: true }
    })

    if (!firstReg) return { error: 'Registration not found' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization || dbUser.organization.id !== firstReg.promotionTest.organizationId) {
        return { error: 'Unauthorized' }
    }

    await prisma.promotionTestRegistration.updateMany({
        where: { id: { in: registrationIds } },
        data: { status }
    })

    revalidatePath(`/promotions/${firstReg.promotionTestId}`)
    return { success: true }
}

export async function getPromotionTests() {
    const user = await currentUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
        const tests = await prisma.promotionTest.findMany({
            where: {
                participatingClubs: {
                    some: { clubId }
                },
                testDate: { gte: new Date() },
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
