'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function approveSeminarRegistration(ids: string[]) {
    try {
        // Generate unique QR tokens for each registration
        for (const id of ids) {
            await prisma.seminarRegistration.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    qrCodeToken: crypto.randomUUID()
                }
            })
        }

        revalidatePath('/club')
        return { success: true, count: ids.length }
    } catch (error) {
        console.error('Failed to approve seminar registrations:', error)
        return { error: 'Failed to approve registrations' }
    }
}

export async function unapproveSeminarRegistration(ids: string[]) {
    try {
        await prisma.seminarRegistration.updateMany({
            where: { id: { in: ids } },
            data: { status: 'PENDING', qrCodeToken: null }
        })

        revalidatePath('/club')
        return { success: true, count: ids.length }
    } catch (error) {
        console.error('Failed to unapprove seminar registrations:', error)
        return { error: 'Failed to unapprove registrations' }
    }
}

export async function deleteSeminarRegistration(ids: string[]) {
    try {
        await prisma.seminarRegistration.deleteMany({
            where: { id: { in: ids } }
        })

        revalidatePath('/club')
        return { success: true, count: ids.length }
    } catch (error) {
        console.error('Failed to delete seminar registrations:', error)
        return { error: 'Failed to delete registrations' }
    }
}

export async function updateSeminarRegistrationStatus(id: string, status: string) {
    try {
        const data: any = { status }

        // Auto-generate QR token on approval, clear on un-approve
        if (status === 'APPROVED') {
            data.qrCodeToken = crypto.randomUUID()
        } else {
            data.qrCodeToken = null
        }

        await prisma.seminarRegistration.update({
            where: { id },
            data
        })

        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Failed to update seminar registration status:', error)
        return { error: 'Failed to update status' }
    }
}

export async function updateSeminarParticipantDetails(id: string, data: { name: string, belt: string }) {
    try {
        await prisma.seminarRegistration.update({
            where: { id },
            data: {
                playerName: data.name,
                belt: data.belt
            }
        })

        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Failed to update seminar participant details:', error)
        return { error: 'Failed to update participant details' }
    }
}

export async function getUpcomingSeminars(clubId: string) {
    try {
        const seminars = await prisma.seminar.findMany({
            where: {
                participatingClubs: {
                    some: { clubId }
                },
                startDate: { gte: new Date() },
                status: 'UPCOMING'
            },
            orderBy: { startDate: 'asc' }
        })
        return seminars
    } catch (error) {
        console.error('Failed to fetch upcoming seminars:', error)
        return []
    }
}

export async function registerForSeminar(formData: FormData) {
    const seminarId = formData.get('seminarId') as string
    const playerId = formData.get('playerId') as string
    const playerName = formData.get('playerName') as string
    const clubName = formData.get('clubName') as string
    const belt = formData.get('belt') as string

    if (!seminarId || !playerId || !playerName) {
        return { error: 'Missing required fields' }
    }

    try {
        const registration = await prisma.seminarRegistration.create({
            data: {
                seminarId,
                playerId,
                playerName,
                clubName,
                belt,
                status: 'PENDING'
            }
        })

        revalidatePath('/club')
        return { success: true, registrationId: registration.id }
    } catch (error) {
        console.error('Seminar registration error:', error)
        return { error: 'Failed to register for seminar' }
    }
}
