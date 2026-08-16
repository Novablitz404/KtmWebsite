import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email-service'
import SupportAdminAlertEmail from '@/emails/SupportAdminAlertEmail'

const ADMIN_PANEL_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.tap-elite.com'}/admin?tab=support`

// Resend sends inbound email webhooks via Svix. Reply address is
// support+<ticketId>@tap-elite.com — the ticket id is parsed straight
// out of the `to` field, no separate lookup table needed.
function extractTicketId(to: string): string | null {
    const match = to.match(/support\+([^@]+)@/)
    return match ? match[1] : null
}

export async function POST(request: NextRequest) {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) {
        console.error('[resend-inbound] RESEND_WEBHOOK_SECRET is not configured')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const rawBody = await request.text()
    const svixHeaders = {
        'svix-id': request.headers.get('svix-id') || '',
        'svix-timestamp': request.headers.get('svix-timestamp') || '',
        'svix-signature': request.headers.get('svix-signature') || '',
    }

    let payload: any
    try {
        const wh = new Webhook(secret)
        payload = wh.verify(rawBody, svixHeaders)
    } catch (err) {
        console.error('[resend-inbound] Signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Defensive parsing — Resend's inbound payload shape hasn't been
    // verified against a live payload yet. Log unrecognized shapes so
    // the field mapping can be corrected from real traffic if needed.
    const data = payload?.data
    if (!data) {
        console.error('[resend-inbound] Unrecognized payload shape:', JSON.stringify(payload))
        return NextResponse.json({ received: true })
    }

    const toRaw: string = Array.isArray(data.to) ? data.to[0] : data.to
    const fromRaw: string = typeof data.from === 'string' ? data.from : data.from?.email
    const text: string = data.text || data.html || ''
    const subject: string = data.subject || ''

    if (!toRaw || !fromRaw) {
        console.error('[resend-inbound] Missing to/from in payload:', JSON.stringify(data))
        return NextResponse.json({ received: true })
    }

    const ticketId = extractTicketId(toRaw)
    if (!ticketId) {
        console.warn(`[resend-inbound] No ticket id found in "to" address: ${toRaw}`)
        return NextResponse.json({ received: true })
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
        console.warn(`[resend-inbound] Ticket not found: ${ticketId}`)
        return NextResponse.json({ received: true })
    }

    const senderEmailMatch = fromRaw.match(/<([^>]+)>/)
    const senderEmail = senderEmailMatch ? senderEmailMatch[1] : fromRaw
    const senderNameMatch = fromRaw.match(/^([^<]+)</)
    const senderName = senderNameMatch ? senderNameMatch[1].trim() : (ticket.userId ? undefined : ticket.guestName || undefined)

    await prisma.supportMessage.create({
        data: {
            ticketId: ticket.id,
            authorType: ticket.userId ? 'USER' : 'GUEST',
            authorId: ticket.userId,
            authorName: senderName || ticket.guestName,
            body: text,
        },
    })

    await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: ['RESOLVED', 'CLOSED'].includes(ticket.status) ? 'OPEN' : ticket.status },
    })

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
    await Promise.all(admins.map(admin => sendEmail({
        to: admin.email,
        subject: `New reply via email on ticket: ${ticket.subject}`,
        reactData: SupportAdminAlertEmail({
            heading: 'New Reply via Email',
            fromName: senderName || ticket.guestName || 'Unknown',
            fromEmail: senderEmail,
            subject: ticket.subject,
            body: text,
            ticketUrl: ADMIN_PANEL_URL,
        }),
    })))

    return NextResponse.json({ received: true })
}
