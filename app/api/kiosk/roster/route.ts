import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import { kioskFromRequest } from '@/lib/kiosk'
import { kioskRoster } from '@/lib/kiosk-checkin'

// The kiosk's regular call (every few minutes): who can check in, the club's kiosk settings and the license state.
// It also tells the website the kiosk is alive.
export async function GET(request: NextRequest) {
    try {
        const device = await kioskFromRequest(request)
        if (!device) return NextResponse.json({ error: 'This kiosk is not signed in' }, { status: 401 })

        const limit = checkRateLimit(`kiosk-roster:${device.id}`, 60, 10 * 60 * 1000)
        if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

        const version = request.headers.get('x-app-version')?.slice(0, 30) || null
        const [roster] = await Promise.all([
            kioskRoster(device.club),
            prisma.kioskDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), ...(version ? { appVersion: version } : {}) } }),
        ])
        return NextResponse.json({ ...roster, device: { id: device.id, name: device.name } })
    } catch (error) {
        console.error('Kiosk roster error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
