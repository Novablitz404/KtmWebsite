import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/webhooks/xendit
 * 
 * Webhook handler for Xendit invoice status updates.
 * Called by Xendit when an invoice is paid, expired, etc.
 * 
 * Xendit sends:
 *   - id: invoice ID
 *   - external_id: our external reference
 *   - status: 'PAID' | 'EXPIRED' | 'PENDING'
 *   - metadata: { eventType, eventId, registrationId }
 */
export async function POST(req: NextRequest) {
    try {
        // Verify webhook signature (x-callback-token from Xendit)
        const callbackToken = req.headers.get('x-callback-token')
        const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN

        if (expectedToken && callbackToken !== expectedToken) {
            console.warn('Xendit webhook: Invalid callback token')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { id: invoiceId, status, metadata } = body

        if (!invoiceId || !status) {
            return NextResponse.json({ error: 'Missing invoice data' }, { status: 400 })
        }

        // Map Xendit status to our payment status
        let paymentStatus: string
        if (status === 'PAID' || status === 'SETTLED') {
            paymentStatus = 'PAID'
        } else if (status === 'EXPIRED') {
            paymentStatus = 'EXPIRED'
        } else {
            paymentStatus = 'PENDING'
        }

        // Try to find and update the registration using metadata first 
        const eventType = metadata?.eventType
        const registrationId = metadata?.registrationId

        if (eventType && registrationId) {
            if (eventType === 'tournament') {
                await prisma.player.update({
                    where: { id: registrationId },
                    data: { paymentStatus },
                })
            } else if (eventType === 'seminar') {
                await prisma.seminarRegistration.update({
                    where: { id: registrationId },
                    data: { paymentStatus },
                })
            } else if (eventType === 'promotion') {
                await prisma.promotionTestRegistration.update({
                    where: { id: registrationId },
                    data: { paymentStatus },
                })
            }

            return NextResponse.json({ success: true })
        }

        // Fallback: look up by xenditInvoiceId across all registration tables
        const player = await prisma.player.findUnique({ where: { xenditInvoiceId: invoiceId } })
        if (player) {
            await prisma.player.update({
                where: { id: player.id },
                data: { paymentStatus },
            })
            return NextResponse.json({ success: true })
        }

        const seminarReg = await prisma.seminarRegistration.findUnique({ where: { xenditInvoiceId: invoiceId } })
        if (seminarReg) {
            await prisma.seminarRegistration.update({
                where: { id: seminarReg.id },
                data: { paymentStatus },
            })
            return NextResponse.json({ success: true })
        }

        const promoReg = await prisma.promotionTestRegistration.findUnique({ where: { xenditInvoiceId: invoiceId } })
        if (promoReg) {
            await prisma.promotionTestRegistration.update({
                where: { id: promoReg.id },
                data: { paymentStatus },
            })
            return NextResponse.json({ success: true })
        }

        console.warn('Xendit webhook: No registration found for invoice', invoiceId)
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    } catch (error) {
        console.error('Xendit webhook error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
