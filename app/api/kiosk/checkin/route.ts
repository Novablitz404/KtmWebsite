import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { kioskFromRequest } from '@/lib/kiosk'
import { EVENT_PATTERN, recordKioskScan } from '@/lib/kiosk-checkin'

// One recognised face from a kiosk: { eventId, memberId, at, method }. Safe to send again: the same eventId is recorded once.
export async function POST(request: NextRequest) {
    try {
        const device = await kioskFromRequest(request)
        if (!device) return NextResponse.json({ error: 'This kiosk is not signed in' }, { status: 401 })

        // Generous, because a kiosk that was offline sends its queue in one go.
        const limit = checkRateLimit(`kiosk-checkin:${device.id}`, 600, 10 * 60 * 1000)
        if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

        const body = await request.json().catch(() => null)
        const eventId = String(body?.eventId ?? '')
        const memberId = String(body?.memberId ?? '')
        const at = new Date(body?.at)
        if (!EVENT_PATTERN.test(eventId) || !memberId || memberId.length > 60 || Number.isNaN(at.getTime())) {
            return NextResponse.json({ error: 'Invalid scan' }, { status: 400 })
        }

        const result = await recordKioskScan(device, { eventId, memberId, at, method: String(body?.method ?? 'face') })
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
        await prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
        return NextResponse.json({ result: result.result, name: result.name, time: result.time })
    } catch (error) {
        console.error('Kiosk check-in error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
