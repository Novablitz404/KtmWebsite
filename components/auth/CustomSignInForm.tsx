'use client'

import React, { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'

type Step = 'credentials' | 'reset-sent'

interface CustomSignInFormProps {
    hideBranding?: boolean
}

export default function CustomSignInForm({ hideBranding = false }: CustomSignInFormProps) {
    const supabase = createBrowserClient()
    const [step, setStep] = useState<Step>('credentials')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [firstLogin, setFirstLogin] = useState(false)
    const router = useRouter()
    const tenant = useTenant()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    // Check if this is a migrated user who hasn't set a password yet
                    try {
                        const checkRes = await fetch('/api/auth/check-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email }),
                        })
                        const checkData = await checkRes.json()

                        if (checkData.exists) {
                            // Migrated user — show inline password form
                            setFirstLogin(true)
                            setLoading(false)
                            return
                        }
                    } catch {
                        // Fall through to generic error
                    }
                    setError('Invalid email or password. Please try again.')
                } else {
                    setError(signInError.message)
                }
                setLoading(false)
                return
            }

            if (data.session) {
                // Wait for session to propagate, then redirect
                window.location.replace('/')
            }
        } catch (err: any) {
            console.error('Sign in error', err)
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.')
            return
        }
        setLoading(true)
        setError(null)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/sign-in/reset-password`,
            })

            if (resetError) {
                setError(resetError.message)
                setLoading(false)
                return
            }

            setStep('reset-sent')
            setLoading(false)
        } catch (err) {
            console.error('Password reset error', err)
            setError('Failed to send reset email. Please try again.')
            setLoading(false)
        }
    }

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: newPassword }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Failed to set password.')
                setLoading(false)
                return
            }

            // Password set — now sign them in automatically
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: newPassword,
            })

            if (signInError) {
                setError('Password set! Please sign in with your new password.')
                setFirstLogin(false)
                setLoading(false)
                return
            }

            // Redirect to homepage (server will route by role)
            window.location.replace('/')
        } catch {
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    // FIRST LOGIN (migrated user) — inline set password
    if (firstLogin) {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'px-4 py-6 sm:p-8 bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className="text-center mb-6">
                    {!hideBranding && (
                        <div className="relative w-16 h-16 mx-auto mb-3">
                            <Image
                                src={tenant.logoUrl}
                                alt={`${tenant.name} Logo`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back! 🎉</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We&apos;ve upgraded our system. Please set a new password for <span className="font-semibold text-gray-900">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                    <div className="relative">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 ml-1">New Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-sm sm:text-base"
                            placeholder="Minimum 6 characters"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[32px] sm:top-[38px] text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
                        </button>
                    </div>

                    <div className="relative">
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 ml-1">Confirm Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-sm sm:text-base"
                            placeholder="Re-enter your password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[32px] sm:top-[38px] text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                                <span className="text-lg">⚠️</span> {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 sm:py-4 bg-red-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-red-700/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> Setting Password...</>
                        ) : (
                            'Set Password & Sign In'
                        )}
                    </button>
                </form>

                <p className="mt-5 text-center text-sm">
                    <button
                        onClick={() => { setFirstLogin(false); setPassword(''); setNewPassword(''); setConfirmPassword(''); setError(null); }}
                        className="font-semibold text-red-600 hover:text-red-700"
                    >
                        ← Back to Sign In
                    </button>
                </p>
            </div>
        )
    }

    // RESET EMAIL SENT UI
    if (step === 'reset-sent') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'px-4 py-6 sm:p-8 bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                    <p className="text-gray-500 mb-6">
                        We sent a password reset link to<br />
                        <span className="font-bold text-gray-900">{email}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Click the link in the email to set your password, then come back and sign in.
                    </p>
                    <button
                        onClick={() => { setStep('credentials'); setPassword(''); }}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                        ← Back to Sign In
                    </button>
                </div>
            </div>
        )
    }

    // CREDENTIALS STEP UI
    return (
        <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'px-4 py-6 sm:p-8 bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>

            {!hideBranding && (
                <div className="text-center mb-6 sm:mb-8">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4">
                        <Image
                            src={tenant.logoUrl}
                            alt={`${tenant.name} Logo`}
                            fill
                            sizes="(max-width: 640px) 64px, 80px"
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Welcome Back!</h1>
                    <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Sign in to manage your tournaments</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

                {/* Email Input */}
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 ml-1">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-sm sm:text-base"
                        placeholder="coach@example.com"
                        required
                    />
                </div>

                {/* Password Input */}
                <div className="relative">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 ml-1">Password</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium text-sm sm:text-base"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-[32px] sm:top-[38px] text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                            <span className="text-lg">⚠️</span> {error}
                        </p>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                        Forgot Password?
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 sm:py-4 bg-red-600 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-red-700/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> Signing In...
                        </>
                    ) : (
                        'Sign In'
                    )}
                </button>
            </form>

            <div className="my-5 sm:my-8 flex items-center gap-4">
                <div className="h-px bg-gray-100 flex-1" />
                <span className="text-gray-400 text-xs sm:text-sm font-medium">OR</span>
                <div className="h-px bg-gray-100 flex-1" />
            </div>

            {/* Social Login */}
            <div className="relative">
                <button
                    type="button"
                    disabled
                    className="w-full py-3 sm:py-4 bg-gray-50 border-2 border-gray-100 text-gray-400 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base cursor-not-allowed opacity-75"
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 grayscale opacity-50" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>
                <div className="absolute -top-3 -right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border border-white">
                    COMING SOON
                </div>
            </div>

            <p className="mt-5 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href="/sign-up" className="font-bold text-red-600 hover:text-red-700">
                    Sign Up
                </Link>
            </p>
        </div>
    )
}
