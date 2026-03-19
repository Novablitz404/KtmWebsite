'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email-service'
import RegistrationApprovedEmail from '@/emails/RegistrationApprovedEmail'
import QRCode from 'qrcode'

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

        // Send approval emails (fire-and-forget)
        for (const id of ids) {
            sendSeminarApprovalEmail(id).catch(e => console.error('Seminar email failed:', e))
        }

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
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const seminars = await prisma.seminar.findMany({
            where: {
                participatingClubs: {
                    some: { clubId }
                },
                startDate: { gte: today },
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

export async function verifySeminarQRCode(token: string, seminarId: string) {
    try {
        const registration = await prisma.seminarRegistration.findUnique({
            where: { qrCodeToken: token },
            include: {
                seminar: { select: { name: true } }
            }
        })

        if (!registration) {
            return { found: false, error: 'No registration found for this QR code.' }
        }

        if (registration.seminarId !== seminarId) {
            return {
                found: false,
                error: `This QR code belongs to a different seminar: "${registration.seminar.name}".`
            }
        }

        return {
            found: true,
            registration: {
                id: registration.id,
                playerName: registration.playerName,
                clubName: registration.clubName,
                belt: registration.belt,
                status: registration.status,
                createdAt: registration.createdAt,
            }
        }
    } catch (error) {
        console.error('QR verification error:', error)
        return { found: false, error: 'Failed to verify QR code.' }
    }
}

// ============================================
// SEMINAR CHECK-IN
// ============================================

export async function seminarCheckIn(registrationId: string, seminarId: string) {
    try {
        const registration = await prisma.seminarRegistration.findUnique({
            where: { id: registrationId },
            include: {
                seminar: { select: { id: true, name: true } }
            }
        })

        if (!registration) {
            return { success: false, error: 'Registration not found.', status: 'NOT_FOUND' }
        }

        if (registration.seminarId !== seminarId) {
            return { success: false, error: `This belongs to a different seminar: "${registration.seminar.name}".`, status: 'WRONG_SEMINAR' }
        }

        if (registration.status !== 'APPROVED') {
            return {
                success: false,
                error: 'Registration has not been approved yet.',
                status: 'NOT_APPROVED',
                player: { name: registration.playerName, club: registration.clubName }
            }
        }

        if (registration.checkedIn) {
            return {
                success: true,
                alreadyCheckedIn: true,
                status: 'ALREADY_CHECKED_IN',
                player: {
                    id: registration.id,
                    name: registration.playerName,
                    club: registration.clubName,
                    checkedInAt: registration.checkedInAt
                }
            }
        }

        await prisma.seminarRegistration.update({
            where: { id: registrationId },
            data: { checkedIn: true, checkedInAt: new Date() }
        })

        revalidatePath(`/seminars/${seminarId}`)

        return {
            success: true,
            status: 'CHECKED_IN',
            player: {
                id: registration.id,
                name: registration.playerName,
                club: registration.clubName,
                belt: registration.belt,
                checkedInAt: new Date()
            }
        }
    } catch (error) {
        console.error('Seminar check-in error:', error)
        return { success: false, error: 'Check-in failed.', status: 'ERROR' }
    }
}

export async function saveSeminarWaiverSignature(registrationId: string, seminarId: string) {
    try {
        const registration = await prisma.seminarRegistration.findUnique({
            where: { id: registrationId }
        })

        if (!registration) return { success: false, error: 'Registration not found.' }
        if (registration.seminarId !== seminarId) return { success: false, error: 'Registration not in this seminar.' }

        await prisma.seminarRegistration.update({
            where: { id: registrationId },
            data: { waiverSignedAt: new Date() }
        })

        revalidatePath(`/seminars/${seminarId}`)
        return { success: true }
    } catch (error) {
        console.error('Save seminar waiver signature error:', error)
        return { success: false, error: 'Failed to save waiver.' }
    }
}

export async function getSeminarCheckInStats(seminarId: string) {
    try {
        const [total, checkedIn] = await Promise.all([
            prisma.seminarRegistration.count({
                where: { seminarId, status: 'APPROVED' }
            }),
            prisma.seminarRegistration.count({
                where: { seminarId, status: 'APPROVED', checkedIn: true }
            })
        ])
        return { total, checkedIn }
    } catch (error) {
        console.error('Failed to get seminar check-in stats:', error)
        return { total: 0, checkedIn: 0 }
    }
}

export async function searchSeminarRegistrationsForCheckIn(seminarId: string, query: string) {
    try {
        const registrations = await prisma.seminarRegistration.findMany({
            where: {
                seminarId,
                status: 'APPROVED',
                OR: [
                    { playerName: { contains: query, mode: 'insensitive' } },
                    { id: { contains: query } }
                ]
            },
            take: 10
        })

        return registrations.map(r => ({
            id: r.id,
            name: r.playerName,
            club: r.clubName,
            belt: r.belt,
            checkedIn: r.checkedIn,
            checkedInAt: r.checkedInAt
        }))
    } catch (error) {
        console.error('Seminar check-in search error:', error)
        return []
    }
}

export async function getCheckedInSeminarRegistrations(seminarId: string) {
    try {
        const registrations = await prisma.seminarRegistration.findMany({
            where: { seminarId, checkedIn: true },
            orderBy: { checkedInAt: 'desc' }
        })

        return registrations.map(r => ({
            id: r.id,
            name: r.playerName,
            club: r.clubName || null,
            belt: r.belt || null,
            checkedInAt: r.checkedInAt
        }))
    } catch (error) {
        console.error('Failed to get checked-in seminar registrations:', error)
        return []
    }
}

// ============================================
// SEMINAR APPROVAL EMAIL HELPER
// ============================================

async function sendSeminarApprovalEmail(registrationId: string) {
    const reg = await prisma.seminarRegistration.findUnique({
        where: { id: registrationId },
        include: { seminar: { select: { name: true, organization: { select: { emailBannerUrl: true } } } } }
    })

    if (!reg || !reg.playerId) return

    // Look up the user's email
    const user = await prisma.user.findUnique({
        where: { id: reg.playerId },
        select: { email: true }
    })

    if (!user?.email || user.email.includes('@member.ktm')) return

    const qrCodeDataUrl = await QRCode.toDataURL(reg.id, {
        width: 200,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' }
    })

    const emailBannerUrl = (reg.seminar as any)?.organization?.emailBannerUrl || undefined

    await sendEmail({
        to: user.email,
        subject: `Registration Approved — ${reg.seminar.name}`,
        reactData: RegistrationApprovedEmail({
            athleteName: reg.playerName,
            eventName: reg.seminar.name,
            eventType: 'Seminar',
            registrationId: reg.id,
            qrCodeDataUrl,
            emailBannerUrl
        }) as React.ReactElement
    })
}

export async function resendSeminarRegistrationEmail(registrationId: string) {
    try {
        await sendSeminarApprovalEmail(registrationId)
        return { success: true }
    } catch (error) {
        console.error('Resend seminar email error:', error)
        return { error: 'Failed to resend email.' }
    }
}

export async function generateSeminarQRCode(registrationId: string) {
    try {
        const reg = await prisma.seminarRegistration.findUnique({
            where: { id: registrationId },
            include: { seminar: { select: { name: true } } }
        })

        if (!reg) return { error: 'Registration not found.' }
        if (reg.status !== 'APPROVED') return { error: 'Registration is not approved.' }

        const qrDataUrl = await QRCode.toDataURL(reg.id, {
            width: 300,
            margin: 2,
            color: { dark: '#1e1b4b', light: '#ffffff' }
        })

        return {
            success: true,
            qrDataUrl,
            player: {
                name: reg.playerName,
                belt: reg.belt || null,
                event: reg.seminar?.name || null,
                club: reg.clubName || null,
                id: reg.id
            }
        }
    } catch (error) {
        console.error('Generate seminar QR error:', error)
        return { error: 'Failed to generate QR code.' }
    }
}
