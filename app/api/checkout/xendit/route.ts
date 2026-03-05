import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

/**
 * POST /api/checkout/xendit
 * 
 * Creates a Xendit Invoice for a registration (tournament, seminar, or promotion test).
 * 
 * Body:
 *   - eventType: 'tournament' | 'seminar' | 'promotion'
 *   - eventId: string (tournament/seminar/promotionTest ID)
 *   - registrationId: string (player/seminarRegistration/promotionTestRegistration ID)
 *   - payerEmail: string (email for receipt)
 *   - payerName: string
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { eventType, eventId, registrationId, payerEmail, payerName, redirectUrl } = body

        if (!eventType || !eventId || !registrationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Look up event and get Xendit config
        let xenditEnabled = false
        let xenditSecretKeyEncrypted: string | null = null
        let amount: number | null = null
        let eventName = ''

        if (eventType === 'tournament') {
            const tournament = await prisma.tournament.findUnique({ where: { id: eventId } })
            if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
            xenditEnabled = tournament.xenditEnabled
            xenditSecretKeyEncrypted = tournament.xenditSecretKey
            amount = tournament.regularPrice
            eventName = tournament.name
        } else if (eventType === 'seminar') {
            const seminar = await prisma.seminar.findUnique({ where: { id: eventId } })
            if (!seminar) return NextResponse.json({ error: 'Seminar not found' }, { status: 404 })
            xenditEnabled = seminar.xenditEnabled
            xenditSecretKeyEncrypted = seminar.xenditSecretKey
            amount = seminar.fee
            eventName = seminar.name
        } else if (eventType === 'promotion') {
            const promotionTest = await prisma.promotionTest.findUnique({ where: { id: eventId } })
            if (!promotionTest) return NextResponse.json({ error: 'Promotion test not found' }, { status: 404 })
            xenditEnabled = promotionTest.xenditEnabled
            xenditSecretKeyEncrypted = promotionTest.xenditSecretKey
            amount = promotionTest.fee
            eventName = promotionTest.name
        } else {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
        }

        if (!xenditEnabled || !xenditSecretKeyEncrypted) {
            return NextResponse.json({ error: 'Xendit payments are not enabled for this event' }, { status: 400 })
        }

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'No valid price set for this event' }, { status: 400 })
        }

        // 2. Decrypt the API key
        const xenditSecretKey = decrypt(xenditSecretKeyEncrypted)

        // 3. Build redirect URLs — redirect back to the registration page
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ktmsports.com'
        const successUrl = redirectUrl
            ? `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}payment=success&registrationId=${registrationId}`
            : `${baseUrl}/payment/success?registrationId=${registrationId}&eventType=${eventType}`
        const failureUrl = redirectUrl
            ? `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}payment=failed`
            : `${baseUrl}/payment/failed?registrationId=${registrationId}&eventType=${eventType}`

        // 4. Create Xendit Invoice
        const externalId = `${eventType}_${eventId}_${registrationId}_${Date.now()}`

        const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(xenditSecretKey + ':').toString('base64')}`,
            },
            body: JSON.stringify({
                external_id: externalId,
                amount,
                currency: 'PHP',
                description: `Registration for ${eventName}`,
                payer_email: payerEmail || undefined,
                customer: payerName ? { given_names: payerName } : undefined,
                success_redirect_url: successUrl,
                failure_redirect_url: failureUrl,
                metadata: {
                    eventType,
                    eventId,
                    registrationId,
                },
            }),
        })

        if (!xenditResponse.ok) {
            const errorData = await xenditResponse.json()
            console.error('Xendit API error:', errorData)
            return NextResponse.json({ error: 'Failed to create payment invoice' }, { status: 500 })
        }

        const invoice = await xenditResponse.json()

        // 4. Save invoice ID and URL to the registration record
        if (eventType === 'tournament') {
            await prisma.player.update({
                where: { id: registrationId },
                data: {
                    xenditInvoiceId: invoice.id,
                    xenditPaymentUrl: invoice.invoice_url,
                    paymentStatus: 'PENDING',
                },
            })
        } else if (eventType === 'seminar') {
            await prisma.seminarRegistration.update({
                where: { id: registrationId },
                data: {
                    xenditInvoiceId: invoice.id,
                    xenditPaymentUrl: invoice.invoice_url,
                    paymentStatus: 'PENDING',
                },
            })
        } else if (eventType === 'promotion') {
            await prisma.promotionTestRegistration.update({
                where: { id: registrationId },
                data: {
                    xenditInvoiceId: invoice.id,
                    xenditPaymentUrl: invoice.invoice_url,
                    paymentStatus: 'PENDING',
                },
            })
        }

        return NextResponse.json({
            success: true,
            invoiceUrl: invoice.invoice_url,
            invoiceId: invoice.id,
        })
    } catch (error) {
        console.error('Xendit checkout error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
