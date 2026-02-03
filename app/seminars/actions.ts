'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function approveSeminarRegistration(ids: string[]) {
    try {
        await prisma.seminarRegistration.updateMany({
            where: { id: { in: ids } },
            data: { status: 'APPROVED' }
        })

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
            data: { status: 'PENDING' }
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
        await prisma.seminarRegistration.update({
            where: { id },
            data: { status }
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
            include: {
                paymentMethods: true
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
    const proofFile = formData.get('proofOfPayment') as File | null

    if (!seminarId || !playerId || !playerName) {
        return { error: 'Missing required fields' }
    }

    let proofOfPaymentUrl: string | null = null

    if (proofFile && proofFile.size > 0) {
        try {
            const bytes = await proofFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const timestamp = Date.now()
            const safeName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `proof-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: proofFile.type,
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            proofOfPaymentUrl = publicUrl
        } catch (error) {
            console.error('Proof upload error:', error)
            return { error: 'Failed to upload proof of payment' }
        }
    }

    try {
        const registration = await prisma.seminarRegistration.create({
            data: {
                seminarId,
                playerId,
                playerName,
                clubName,
                belt,
                proofOfPaymentUrl,
                status: 'PENDING',
                paymentStatus: 'UNPAID'
            }
        })

        revalidatePath('/club')
        return { success: true, registrationId: registration.id }
    } catch (error) {
        console.error('Seminar registration error:', error)
        return { error: 'Failed to register for seminar' }
    }
}
