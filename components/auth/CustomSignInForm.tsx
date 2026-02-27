'use client'

import React, { useState, useEffect } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'

type Step = 'credentials' | 'verification' | '2fa'

interface CustomSignInFormProps {
    hideBranding?: boolean
}

export default function CustomSignInForm({ hideBranding = false }: CustomSignInFormProps) {
    const { isLoaded, signIn, setActive } = useSignIn()
    const [step, setStep] = useState<Step>('credentials')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendCountdown, setResendCountdown] = useState(0)
    // Removed success state to transition directly to skeleton loading
    const router = useRouter()

    // Countdown timer for resend
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCountdown])

    if (!isLoaded) {
        return null
    }

    if (!isLoaded) {
        return null
    }

    // Removed "Authenticating..." intermediate screen to allow immediate transition to 
    // the destination page's skeleton loading state.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError(null)

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            })

            console.log('Sign in result:', {
                status: result.status,
                supportedFirstFactors: result.supportedFirstFactors,
                supportedSecondFactors: result.supportedSecondFactors,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                // Wait for session to propagate to the server before redirecting
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Redirect to root, where app/page.tsx will handle role-based redirection
                // Force full reload to clear client router cache and ensure correct role-based redirect
                window.location.replace('/')
            } else if (result.status === 'needs_first_factor') {
                // User needs to verify via email code - prepare and send the code
                const emailFactor = result.supportedFirstFactors?.find(
                    (factor) => factor.strategy === 'email_code'
                )

                console.log('Email factor found:', emailFactor)

                if (emailFactor && 'emailAddressId' in emailFactor) {
                    await signIn.prepareFirstFactor({
                        strategy: 'email_code',
                        emailAddressId: emailFactor.emailAddressId,
                    })
                    setStep('verification')
                    setLoading(false) // Stop loading when switching steps to allow user input
                } else {
                    // Maybe password is the first factor and we need to check other strategies
                    console.log('Available first factors:', result.supportedFirstFactors)
                    setError(`Email verification not available. Available methods: ${result.supportedFirstFactors?.map(f => f.strategy).join(', ') || 'none'}`)
                    setLoading(false)
                }
            } else if (result.status === 'needs_second_factor') {
                // Second factor required - could be email_code (new device) or TOTP (2FA)
                console.log('Second factors available:', result.supportedSecondFactors)

                // Check if email_code is available as second factor (new device verification)
                const emailSecondFactor = result.supportedSecondFactors?.find(
                    (factor: any) => factor.strategy === 'email_code'
                )

                if (emailSecondFactor && 'emailAddressId' in emailSecondFactor) {
                    // Prepare email code verification
                    await signIn.prepareSecondFactor({
                        strategy: 'email_code',
                        emailAddressId: emailSecondFactor.emailAddressId,
                    })
                    setStep('verification') // Reuse the email verification UI
                    setLoading(false)
                } else {
                    // Fall back to TOTP 2FA
                    setStep('2fa')
                    setLoading(false)
                }
            } else {
                console.error('Sign in process incomplete', result)
                setError(`Sign in incomplete. Status: ${result.status}. Please try again or contact support.`)
            }
        } catch (err: any) {
            console.error('Sign in error', err)
            if (err.errors && err.errors.length > 0) {
                setError(err.errors[0].longMessage || err.errors[0].message)
            } else {
                setError('Something went wrong. Please try again.')
            }
            setLoading(false) // Only stop loading on error
        }
    }

    const handleVerification = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError(null)

        try {
            // conditionally call based on status to avoid 400 errors
            let result;
            if (signIn.status === 'needs_first_factor') {
                result = await signIn.attemptFirstFactor({
                    strategy: 'email_code',
                    code,
                })
            } else if (signIn.status === 'needs_second_factor') {
                result = await signIn.attemptSecondFactor({
                    strategy: 'email_code',
                    code,
                })
            } else {
                throw new Error(`Unexpected status during verification: ${signIn.status}`)
            }

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                // Wait for session to propagate to the server before redirecting
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Force full reload to clear client router cache and ensure correct role-based redirect
                window.location.replace('/')
            } else if (result.status === 'needs_second_factor') {
                // After first factor, 2FA is also required
                setCode('')
                setStep('2fa')
            } else {
                console.error('Verification incomplete', result)
                setError('Verification failed. Please try again.')
            }
        } catch (err: any) {
            console.error('Verification error', err)
            if (err.errors && err.errors.length > 0) {
                setError(err.errors[0].longMessage || err.errors[0].message)
            } else {
                setError('Invalid code. Please try again.')
            }
            setLoading(false)
        }
    }

    const handle2FA = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError(null)

        try {
            // Try TOTP first (authenticator app)
            const result = await signIn.attemptSecondFactor({
                strategy: 'totp',
                code,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                // Wait for session to propagate to the server before redirecting
                await new Promise(resolve => setTimeout(resolve, 1000))
                // Force full reload to clear client router cache and ensure correct role-based redirect
                window.location.replace('/')
            } else {
                console.error('2FA incomplete', result)
                setError('2FA verification failed. Please try again.')
            }
        } catch (err: any) {
            console.error('2FA error', err)
            if (err.errors && err.errors.length > 0) {
                setError(err.errors[0].longMessage || err.errors[0].message)
            } else {
                setError('Invalid authenticator code. Please try again.')
            }
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        if (!isLoaded) return
        try {
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/'
            })
        } catch (err) {
            console.error('OAuth error', err)
        }
    }

    // 2FA STEP UI
    if (step === '2fa') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : ' px-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100 min-h-[80vh] md:min-h-0'}`}>
                <div className="mb-8 text-center">
                    <button
                        onClick={() => { setStep('credentials'); setCode(''); }}
                        className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 self-start"
                    >
                        <ArrowLeft size={20} className="mr-1" /> Back
                    </button>
                    {!hideBranding && (
                        <>
                            <div className="relative w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <ShieldCheck size={32} className="text-green-600" />
                            </div>
                            <h1 className="text-2xl font-black text-center text-gray-900 tracking-tight">Two-Factor Authentication</h1>
                        </>
                    )}
                    <p className="text-gray-500 text-center mt-2">
                        Enter the 6-digit code from your authenticator app
                    </p>
                </div>

                <form onSubmit={handle2FA} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-center text-2xl tracking-widest font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            placeholder="000000"
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                        />
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
                        disabled={loading || code.length !== 6}
                        className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-600/20 hover:bg-green-700 hover:shadow-green-700/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" /> Verifying...
                            </>
                        ) : (
                            'Verify & Sign In'
                        )}
                    </button>
                </form>
            </div>
        )
    }

    // VERIFICATION STEP UI (Email Code)
    if (step === 'verification') {
        // Split code into array for individual boxes
        const codeDigits = code.split('').concat(Array(6 - code.length).fill(''))

        const handleDigitChange = (index: number, value: string) => {
            if (!/^\d*$/.test(value)) return // Only allow digits

            const newCode = code.split('')
            newCode[index] = value.slice(-1) // Take only last character
            const updatedCode = newCode.join('').slice(0, 6)
            setCode(updatedCode)

            // Auto-focus next input
            if (value && index < 5) {
                const nextInput = document.getElementById(`otp-${index + 1}`)
                nextInput?.focus()
            }
        }

        const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && !code[index] && index > 0) {
                const prevInput = document.getElementById(`otp-${index - 1}`)
                prevInput?.focus()
            }
        }

        const handlePaste = (e: React.ClipboardEvent) => {
            e.preventDefault()
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
            setCode(pastedData)
            // Focus the last filled input or the next empty one
            const focusIndex = Math.min(pastedData.length, 5)
            const input = document.getElementById(`otp-${focusIndex}`)
            input?.focus()
        }

        const handleResendCode = async () => {
            setError(null)
            setResending(true)
            try {
                // Re-prepare the verification (sends new code)
                if (signIn.supportedSecondFactors?.some((f: any) => f.strategy === 'email_code')) {
                    const emailFactor = signIn.supportedSecondFactors?.find((f: any) => f.strategy === 'email_code')
                    if (emailFactor && 'emailAddressId' in emailFactor) {
                        await signIn.prepareSecondFactor({
                            strategy: 'email_code',
                            emailAddressId: (emailFactor as any).emailAddressId,
                        })
                    }
                } else if (signIn.supportedFirstFactors?.some((f: any) => f.strategy === 'email_code')) {
                    const emailFactor = signIn.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code')
                    if (emailFactor && 'emailAddressId' in emailFactor) {
                        await signIn.prepareFirstFactor({
                            strategy: 'email_code',
                            emailAddressId: (emailFactor as any).emailAddressId,
                        })
                    }
                }
                setResendCountdown(60)
            } catch (err: any) {
                console.error('Resend error', err)
                setError('Failed to resend code. Please try again.')
            } finally {
                setResending(false)
            }
        }

        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'px-4 py-6 sm:p-8 bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                {/* Back button at top */}
                <button
                    onClick={() => { setStep('credentials'); setCode(''); }}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4 self-start"
                >
                    <ArrowLeft size={20} className="mr-1" /> Back
                </button>

                {/* Centered content */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="mb-6 sm:mb-8 text-center">
                        {!hideBranding && (
                            <>
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4">
                                    <Image
                                        src="/KTMLogo.png"
                                        alt="KTM Logo"
                                        fill
                                        sizes="80px"
                                        className="object-contain"
                                    />
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Verify Your Email</h1>
                            </>
                        )}
                        <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-sm">
                            Enter the 6-digit code sent to
                        </p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">{email}</p>
                    </div>

                    <form onSubmit={handleVerification} className="space-y-6">
                        {/* OTP Input Boxes */}
                        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                            {codeDigits.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleDigitChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 sm:w-14 sm:h-16 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all"
                                    autoComplete={index === 0 ? "one-time-code" : "off"}
                                />
                            ))}
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
                            disabled={loading || code.length !== 6}
                            className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 hover:shadow-red-700/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" /> Verifying...
                                </>
                            ) : (
                                'Verify & Sign In'
                            )}
                        </button>
                    </form>

                    {/* Resend Code */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Didn't receive the code?{' '}
                            {resendCountdown > 0 ? (
                                <span className="text-gray-400">Resend in {resendCountdown}s</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resending}
                                    className="font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                    {resending ? 'Sending...' : 'Resend Code'}
                                </button>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // CREDENTIALS STEP UI
    return (
        <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'px-4 py-6 sm:p-8 bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>

            {/* Mobile-style Header - Hide if hideBranding is true (for split layout) */}
            {!hideBranding && (
                <div className="text-center mb-6 sm:mb-8">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4">
                        <Image
                            src="/KTMLogo.png"
                            alt="KTM Logo"
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
                    <Link href="/sign-in/forgot-password" className="text-sm font-semibold text-red-600 hover:text-red-700">
                        Forgot Password?
                    </Link>
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
            {/* Social Login */}
            <div className="relative">
                <button
                    type="button"
                    disabled
                    className="w-full py-3 sm:py-4 bg-gray-50 border-2 border-gray-100 text-gray-400 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base cursor-not-allowed opacity-75"
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 grayscale opacity-50" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
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
