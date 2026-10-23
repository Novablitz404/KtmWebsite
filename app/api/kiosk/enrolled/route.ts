import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { kioskFromRequest } from '@/lib/kiosk'
import { reportEnrolled } from '@/lib/kiosk-checkin'

// The kiosk reports which members have a face enrolled on it: { memberIds: string[] }. Ids only, never face data.
export async function POST(request: NextRequest) {
    try {
        const device = await kioskFromRequest(request)
        if (!device) return NextResponse.json({ error: 'This kiosk is not signed in' }, { status: 401 })

        const limit = checkRateLimit(`kiosk-enrolled:${device.id}`, 60, 10 * 60 * 1000)
        if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

        const body = await request.json().catch(() => null)
        const ids: unknown = body?.memberIds
        if (!Array.isArray(ids) || ids.length > 5000 || !ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 60)) {
            return NextResponse.json({ error: 'Invalid list' }, { status: 400 })
        }
        return NextResponse.json({ count: await reportEnrolled(device, ids as string[]) })
    } catch (error) {
        console.error('Kiosk enrolled error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
