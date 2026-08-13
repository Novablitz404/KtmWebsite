'use client'

import { useState, useEffect } from 'react'
import { createImplicitClient } from '@/lib/supabase/implicit-client'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'

export default function TapEliteResetPasswordPage() {
    const tenant = useTenant()
    const qs = tenant.isMappedDomain ? '' : '?tenant=tap-elite'
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)

    useEffect(() => {
        const supabase = createImplicitClient()

        // Listen for the PASSWORD_RECOVERY event from the implicit flow
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                setSessionReady(true)
                setCheckingSession(false)
            } else if (event === 'SIGNED_IN' && session) {
                // Fallback: also handle if it comes through as SIGNED_IN
                setSessionReady(true)
                setCheckingSession(false)
            }
        })

        // Also check if there's already a session (e.g. came via auth callback)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true)
                setCheckingSession(false)
            }
        })

        // Timeout: if no session after 5 seconds, show error
        const timeout = setTimeout(() => {
            setCheckingSession(false)
        }, 5000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const supabase = createImplicitClient()
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            })

            if (updateError) {
                setError(updateError.message)
                setLoading(false)
                return
            }

            setSuccess(true)
            // Redirect to home after a short delay
            setTimeout(() => {
                window.location.replace('/')
            }, 2000)
        } catch (err: any) {
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    const Logo = () => (
        <Link href={`/${qs}`}>
            <Image
                src="/tap-elite/tap_elite_horizontal_transparent.png"
                alt="Tap Elite"
                width={240}
                height={96}
                className="mx-auto mb-5 h-auto"
            />
        </Link>
    )

    if (success) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md text-center">
                    <Logo />
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-[#E10600]/10 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-[#E10600]" />
                        </div>
                        <h2 className="text-white font-bold text-lg mb-2">Password Updated!</h2>
                        <p className="text-gray-500 text-sm">Redirecting you to the dashboard...</p>
                    </div>
                </div>
            </main>
        )
    }

    // Still checking for recovery session
    if (checkingSession) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md text-center">
                    <Logo />
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8">
                        <Loader2 className="w-8 h-8 text-gray-500 animate-spin mx-auto mb-4" />
                        <p className="text-sm font-medium text-gray-500">Verifying your reset link...</p>
                    </div>
                </div>
            </main>
        )
    }

    // No session found — link is invalid or expired
    if (!sessionReady) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md text-center">
                    <Logo />
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-white font-bold text-lg mb-2">Link Expired</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            This password reset link has expired or is invalid.<br />
                            Please request a new one from the sign-in page.
                        </p>
                        <Link
                            href={`/sign-in${qs}`}
                            className="inline-flex items-center justify-center gap-2 bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 px-6 rounded-full hover:bg-[#FF2A21] transition-colors"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <Logo />
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Set Your Password</h1>
                    <p className="text-gray-500 text-sm mt-2">Choose a new password for your account</p>
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                                    placeholder="Minimum 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                                placeholder="Re-enter your password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? 'Updating...' : 'Set Password'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-500 font-medium">Powered by</span>
                    <Image src="/ktmnav_white.png" alt="KTM Sports" width={54} height={18} className="opacity-60" />
                </div>
            </div>
        </main>
    )
}
