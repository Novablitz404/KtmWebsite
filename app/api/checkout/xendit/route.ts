import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

/**
 * Convert an amount from a source currency to PHP.
 * Tries two free exchange-rate APIs in sequence.
 * Throws if both fail — never silently passes an unconverted amount to Xendit.
 */
async function convertToPhp(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'PHP') return amount

    // Try API 1: exchangerate-api.com (free, no key required)
    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`, {
            signal: AbortSignal.timeout(4000),
        })
        if (res.ok) {
            const data = await res.json()
            const rate: number = data?.rates?.PHP
            if (rate && rate > 1) {
                console.log(`[convertToPhp] ${fromCurrency}→PHP rate (API1): ${rate}`)
                return Math.round(amount * rate * 100) / 100
            }
        }
    } catch { /* fall through to API 2 */ }

    // Try API 2: open.er-api.com
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency}`, {
            signal: AbortSignal.timeout(4000),
        })
        if (res.ok) {
            const data = await res.json()
            const rate: number = data?.rates?.PHP
            if (rate && rate > 1) {
                console.log(`[convertToPhp] ${fromCurrency}→PHP rate (API2): ${rate}`)
                return Math.round(amount * rate * 100) / 100
            }
        }
    } catch { /* fall through */ }

    // Both APIs failed — block the payment rather than charge a wrong amount
    throw new Error(`Unable to fetch live exchange rate for ${fromCurrency}→PHP. Please try again shortly.`)
}

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
        const { eventType, eventId, registrationId, payerEmail, payerName, redirectUrl, amount: customAmount, currency: customCurrency } = body

        // Resolved currency — may be overridden per event type below
        let resolvedCurrency: string = customCurrency ?? 'PHP'

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
        } else if (eventType === 'guest-tournament') {
            // Guest registration — uses same tournament Xendit config
            const tournament = await prisma.tournament.findUnique({ where: { id: eventId } })
            if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
            xenditEnabled = tournament.xenditEnabled
            xenditSecretKeyEncrypted = tournament.xenditSecretKey
            eventName = tournament.name

            // Source currency (what the price was set in, e.g. 'USD')
            const sourceCurrency = customCurrency ?? tournament.currency ?? 'PHP'
            const rawAmount = customAmount || tournament.regularPrice || 0

            // Currency is always PHP for Xendit — convert if the source price is in another currency
            resolvedCurrency = 'PHP'
            amount = sourceCurrency !== 'PHP'
                ? await convertToPhp(rawAmount, sourceCurrency)
                : rawAmount
        } else if (eventType === 'bulk-registration') {
            // Bulk registration — uses same tournament Xendit config
            const bulkReg = await prisma.bulkRegistration.findUnique({
                where: { id: registrationId },
                include: { tournament: true }
            })
            if (!bulkReg) return NextResponse.json({ error: 'Bulk registration not found' }, { status: 404 })
            xenditEnabled = bulkReg.tournament.xenditEnabled
            xenditSecretKeyEncrypted = bulkReg.tournament.xenditSecretKey
            amount = bulkReg.totalAmount
            eventName = bulkReg.tournament.name
        } else if (eventType === 'affiliation') {
            // Affiliation payment — uses organization's Xendit config
            const org = await prisma.organization.findUnique({ where: { id: eventId } })
            if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
            xenditEnabled = org.affiliationXenditEnabled
            xenditSecretKeyEncrypted = org.affiliationXenditSecretKey
            amount = customAmount || org.affiliationFee
            eventName = `${org.name} - Club Affiliation`
        } else {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
        }

        if (!xenditEnabled) {
            return NextResponse.json({ error: 'Xendit payments are not enabled for this event' }, { status: 400 })
        }

        if (!xenditSecretKeyEncrypted) {
            return NextResponse.json({ error: 'Xendit API key is not configured for this event. Please contact the organizer.' }, { status: 400 })
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
                currency: resolvedCurrency,
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
            console.error('Xendit API error:', xenditResponse.status, errorData)
            return NextResponse.json({
                error: `Xendit error: ${errorData.error_code || errorData.message || 'Unknown error'}`,
                details: errorData,
            }, { status: 500 })
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
        } else if (eventType === 'guest-tournament') {
            // Save invoice to the Player record (registrationId = playerId)
            await prisma.player.update({
                where: { id: registrationId },
                data: {
                    xenditInvoiceId: invoice.id,
                    xenditPaymentUrl: invoice.invoice_url,
                    paymentStatus: 'PENDING',
                },
            })
        } else if (eventType === 'bulk-registration') {
            // Save invoice to the BulkRegistration record
            await prisma.bulkRegistration.update({
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
