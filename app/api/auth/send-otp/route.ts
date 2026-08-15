import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import VerifyOTPEmail from '@/emails/VerifyOTPEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

// Global OTP store shared across API routes (same process in Next.js)
function getOtpStore(): Map<string, { code: string; expiresAt: number; attempts: number }> {
    if (!(globalThis as any).__otpStore) {
        (globalThis as any).__otpStore = new Map()
    }
    return (globalThis as any).__otpStore
}

// Cleanup expired entries
function cleanupExpired() {
    const otpStore = getOtpStore()
    const now = Date.now()
    for (const [key, value] of otpStore.entries()) {
        if (value.expiresAt < now) {
            otpStore.delete(key)
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        const { email, name } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const otpStore = getOtpStore()

        // Rate limit: don't send more than 1 OTP per 60 seconds to the same email
        const existing = otpStore.get(email.toLowerCase())
        if (existing && existing.expiresAt > Date.now() && (existing.expiresAt - Date.now()) > 9 * 60 * 1000) {
            return NextResponse.json({ error: 'Please wait before requesting another code' }, { status: 429 })
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString()

        // Store with 10-minute expiry
        otpStore.set(email.toLowerCase(), {
            code,
            expiresAt: Date.now() + 10 * 60 * 1000,
            attempts: 0,
        })

        // Cleanup old entries
        cleanupExpired()

        // Send email via Resend
        const { error } = await resend.emails.send({
            from: 'Tap Elite <noreply@tap-elite.com>',
            to: [email],
            subject: `${code} — Your Tap Elite Verification Code`,
            react: VerifyOTPEmail({ code, name }),
        })

        if (error) {
            console.error('[send-otp] Resend error:', error)
            return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[send-otp] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
