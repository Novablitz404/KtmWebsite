'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant'
import { sendEmail } from '@/lib/email-service'
import { notifyUser } from '@/app/actions/notifications'
import SupportTicketReceivedEmail from '@/emails/SupportTicketReceivedEmail'
import SupportTicketReplyEmail from '@/emails/SupportTicketReplyEmail'
import SupportAdminAlertEmail from '@/emails/SupportAdminAlertEmail'

const SUPPORT_FROM = 'Tap Elite Support <support@tap-elite.com>'
const ADMIN_PANEL_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.tap-elite.com'}/admin?tab=support`

function replyToFor(ticketId: string) {
    return `support+${ticketId}@tap-elite.com`
}

async function alertAdmins(payload: { heading: string; fromName: string; fromEmail: string; subject: string; body: string; emailSubject: string }) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
    await Promise.all(admins.map(admin => sendEmail({
        to: admin.email,
        subject: payload.emailSubject,
        reactData: SupportAdminAlertEmail({
            heading: payload.heading,
            fromName: payload.fromName,
            fromEmail: payload.fromEmail,
            subject: payload.subject,
            body: payload.body,
            ticketUrl: ADMIN_PANEL_URL,
        }),
    })))
}

export async function createSupportTicket(input: {
    subject: string
    category?: string
    message: string
    guestName?: string
    guestEmail?: string
}) {
    if (!input.subject.trim() || !input.message.trim()) {
        throw new Error('Subject and message are required')
    }

    const authUser = await getAuthUser()
    const tenant = await getTenant()

    let guestName: string | null
    let guestEmail: string

    if (authUser) {
        guestName = authUser.name
        guestEmail = authUser.email
    } else {
        if (!input.guestName?.trim() || !input.guestEmail?.trim()) {
            throw new Error('Name and email are required')
        }
        guestName = input.guestName.trim()
        guestEmail = input.guestEmail.trim()
    }

    const ticket = await prisma.supportTicket.create({
        data: {
            organizationId: tenant.id,
            userId: authUser?.id,
            guestName: authUser ? undefined : guestName,
            guestEmail,
            subject: input.subject.trim(),
            category: input.category,
            status: 'OPEN',
            messages: {
                create: {
                    authorType: authUser ? 'USER' : 'GUEST',
                    authorId: authUser?.id,
                    authorName: guestName,
                    body: input.message.trim(),
                },
            },
        },
    })

    await sendEmail({
        to: guestEmail,
        subject: `We've received your request: ${input.subject}`,
        reactData: SupportTicketReceivedEmail({ name: guestName || 'there', subject: input.subject, message: input.message }),
        from: SUPPORT_FROM,
        replyTo: replyToFor(ticket.id),
    })

    await alertAdmins({
        heading: 'New Support Ticket',
        fromName: guestName || 'Unknown',
        fromEmail: guestEmail,
        subject: input.subject,
        body: input.message,
        emailSubject: `New support ticket: ${input.subject}`,
    })

    return { success: true, ticketId: ticket.id }
}

export async function replyToTicket(ticketId: string, body: string) {
    if (!body.trim()) throw new Error('Message cannot be empty')

    const authUser = await getAuthUser()
    if (!authUser) throw new Error('Not authenticated')

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error('Ticket not found')

    const isAdmin = authUser.role === 'ADMIN'
    const isOwner = ticket.userId === authUser.id
    if (!isAdmin && !isOwner) throw new Error('Unauthorized')

    await prisma.supportMessage.create({
        data: {
            ticketId,
            authorType: isAdmin ? 'ADMIN' : 'USER',
            authorId: authUser.id,
            authorName: authUser.name,
            body: body.trim(),
        },
    })

    await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: isAdmin ? (ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status) : 'OPEN' },
    })

    if (isAdmin) {
        await sendEmail({
            to: ticket.guestEmail,
            subject: `Re: ${ticket.subject}`,
            reactData: SupportTicketReplyEmail({ name: ticket.guestName || 'there', subject: ticket.subject, replyBody: body }),
            from: SUPPORT_FROM,
            replyTo: replyToFor(ticketId),
        })
        if (ticket.userId) {
            await notifyUser(ticket.userId, {
                title: 'New reply to your support ticket',
                body: body.length > 140 ? `${body.slice(0, 140)}...` : body,
                url: '/support',
            })
        }
    } else {
        await alertAdmins({
            heading: 'New Reply from User',
            fromName: authUser.name || 'User',
            fromEmail: authUser.email,
            subject: ticket.subject,
            body,
            emailSubject: `New reply on ticket: ${ticket.subject}`,
        })
    }

    return { success: true }
}

export async function getMyTickets() {
    const authUser = await getAuthUser()
    if (!authUser) return []

    return prisma.supportTicket.findMany({
        where: { userId: authUser.id },
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    })
}

export async function getTicketThread(ticketId: string) {
    const authUser = await getAuthUser()

    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!ticket) throw new Error('Ticket not found')

    const isAdmin = authUser?.role === 'ADMIN'
    const isOwner = authUser && ticket.userId === authUser.id
    if (!isAdmin && !isOwner) throw new Error('Unauthorized')

    return ticket
}

export async function updateTicketStatus(ticketId: string, status: string) {
    const authUser = await getAuthUser()
    if (authUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } })
    return { success: true }
}

export async function getAllTickets(filters?: { status?: string; organizationId?: string; search?: string }) {
    const authUser = await getAuthUser()
    if (authUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const where: Record<string, unknown> = {}
    if (filters?.status) where.status = filters.status
    if (filters?.organizationId) where.organizationId = filters.organizationId
    if (filters?.search) {
        where.OR = [
            { subject: { contains: filters.search, mode: 'insensitive' } },
            { guestEmail: { contains: filters.search, mode: 'insensitive' } },
            { guestName: { contains: filters.search, mode: 'insensitive' } },
        ]
    }

    return prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
            organization: { select: { name: true, slug: true } },
            user: { select: { name: true, email: true, role: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    })
}
