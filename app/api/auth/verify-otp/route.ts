import { NextRequest, NextResponse } from 'next/server'

// Import the shared OTP store from the send-otp route
// Since Next.js API routes share the same process in dev, we use a global store
const getOtpStore = (): Map<string, { code: string; expiresAt: number; attempts: number }> => {
    if (!(globalThis as any).__otpStore) {
        (globalThis as any).__otpStore = new Map()
    }
    return (globalThis as any).__otpStore
}

export async function POST(request: NextRequest) {
    try {
        const { email, code } = await request.json()

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        const otpStore = getOtpStore()
        const stored = otpStore.get(email.toLowerCase())

        if (!stored) {
            return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
        }

        // Check expiry
        if (stored.expiresAt < Date.now()) {
            otpStore.delete(email.toLowerCase())
            return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 })
        }

        // Check max attempts (5)
        if (stored.attempts >= 5) {
            otpStore.delete(email.toLowerCase())
            return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 })
        }

        // Verify code
        if (stored.code !== code.trim()) {
            stored.attempts += 1
            return NextResponse.json({
                error: 'Invalid verification code',
                attemptsRemaining: 5 - stored.attempts,
            }, { status: 400 })
        }

        // Success — remove the OTP
        otpStore.delete(email.toLowerCase())

        return NextResponse.json({ verified: true })
    } catch (error) {
        console.error('[verify-otp] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
