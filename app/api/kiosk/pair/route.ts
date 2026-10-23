import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { isValidCode, normalizeCode, pairKiosk } from '@/lib/kiosk'

// Called by the kiosk helper app with the code the club master generated. No login: the one-time code is the credential.
export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        const limit = checkRateLimit(`kiosk-pair:ip:${ip}`, 10, 10 * 60 * 1000)
        if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

        const body = await request.json().catch(() => null)
        const code = normalizeCode(body?.code)
        if (!isValidCode(code)) return NextResponse.json({ error: 'That code is not valid' }, { status: 400 })
        const version = typeof body?.version === 'string' ? body.version.slice(0, 30) : null

        const paired = await pairKiosk(code, version)
        if (!paired) return NextResponse.json({ error: 'That code is wrong, already used, or has expired' }, { status: 400 })
        return NextResponse.json(paired)
    } catch (error) {
        console.error('Kiosk pair error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
