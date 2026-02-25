'use server'

import { prisma } from '@/lib/prisma'
import { getNextBelt } from '@/lib/belt'
import { revalidatePath } from 'next/cache'

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
