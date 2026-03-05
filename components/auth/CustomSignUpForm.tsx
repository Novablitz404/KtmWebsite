'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import { checkEmailAvailability } from '@/app/actions'
import { useTenant } from '@/app/providers/TenantProvider'

interface CustomSignUpFormProps {
    headerMode?: 'mobile' | 'desktop'
}

type Step = 'role-selection' | 'account' | 'check-email'

export default function CustomSignUpForm({ headerMode = 'mobile' }: CustomSignUpFormProps) {
    const supabase = createBrowserClient()
    const router = useRouter()
    const tenant = useTenant()

    const [step, setStep] = useState<Step>('role-selection')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const [role, setRole] = useState<'ATHLETE' | 'CLUB_MASTER' | 'ORGANIZER' | 'MANAGER' | 'CO_ORGANIZER'>('ATHLETE')
    const [isEmailLocked, setIsEmailLocked] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const isManager = role === 'MANAGER'
    const isCoOrganizer = role === 'CO_ORGANIZER'
    const isOrganization = role === 'ORGANIZER'

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const roleParam = searchParams.get('role')
        const emailParam = searchParams.get('email')

        if (roleParam === 'MANAGER') {
            setRole('MANAGER')
            setStep('account')
        } else if (roleParam === 'CO_ORGANIZER') {
            setRole('CO_ORGANIZER')
            setStep('account')
        }

        if (emailParam) {
            setEmail(emailParam)
            setIsEmailLocked(true)
        }
    }, [])

    const handleEmailBlur = async () => {
        if (!email) return
        const { available } = await checkEmailAvailability(email)
        if (!available) {
            setEmailError('This email is already registered')
        } else {
            setEmailError(null)
        }
    }

    const handleAccountSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!email || !password) {
            setError("All fields are required")
            return
        }

        if (emailError) return

        const { available } = await checkEmailAvailability(email)
        if (!available) {
            setEmailError('This email is already registered')
            return
        }

        setLoading(true)

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: role,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
                }
            })

            if (signUpError) {
                setError(signUpError.message)
                setLoading(false)
                return
            }

            if (data.session) {
                // Auto-confirmed (e.g., in dev mode) — redirect to onboarding
                if (isManager || isCoOrganizer) {
                    router.push('/')
                } else {
                    router.push('/onboarding/complete-profile')
                }
            } else {
                // Email confirmation required — show check email screen
                setStep('check-email')
                setLoading(false)
            }
        } catch (err: any) {
            setLoading(false)
            console.error('Sign up error', err)
            setError('Something went wrong. Please try again.')
        }
    }

    // CHECK EMAIL STEP
    if (step === 'check-email') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${headerMode === 'desktop' ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                    <p className="text-gray-500 mb-4">
                        We sent a confirmation link to<br />
                        <span className="font-bold text-gray-900">{email}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-6">
                        Click the link in the email to verify your account. After verification, you'll be redirected to complete your profile.
                    </p>
                    <button
                        onClick={() => { setStep('account'); }}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                        ← Back to Sign Up
                    </button>
                </div>
            </div>
        )
    }

    // ROLE SELECTION STEP
    if (step === 'role-selection') {
        return (
            <div className={`w-full max-w-4xl mx-auto flex flex-col justify-center ${headerMode === 'desktop' ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className={`text-center mb-10 ${headerMode === 'desktop' ? 'md:text-center' : ''}`}>
                    {headerMode !== 'desktop' && (
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <Image src={tenant.logoUrl} alt={`${tenant.name} Logo`} fill className="object-contain" priority />
                        </div>
                    )}
                    <h1 className={`${headerMode === 'desktop' ? 'text-4xl' : 'text-3xl'} font-black text-gray-900 tracking-tight`}>
                        Join {tenant.name}
                    </h1>
                    <p className="text-gray-500 mt-3 text-lg">
                        Choose how you want to participate
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-center max-w-4xl mx-auto">
                    <button
                        onClick={() => { setRole('ATHLETE'); setStep('account'); }}
                        className="flex-1 py-4 px-8 rounded-full border border-gray-100 shadow-sm bg-white text-gray-600 font-bold text-sm md:text-base transition-all duration-300 transform hover:-translate-y-1 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:shadow-red-600/20 text-center uppercase tracking-wide"
                    >
                        Athlete
                    </button>
                    <button
                        onClick={() => { setRole('CLUB_MASTER'); setStep('account'); }}
                        className="flex-1 py-4 px-8 rounded-full border border-gray-100 shadow-sm bg-white text-gray-600 font-bold text-sm md:text-base transition-all duration-300 transform hover:-translate-y-1 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:shadow-red-600/20 text-center uppercase tracking-wide"
                    >
                        Club
                    </button>
                    <button
                        onClick={() => { setRole('ORGANIZER'); setStep('account'); }}
                        className="flex-1 py-4 px-8 rounded-full border border-gray-100 shadow-sm bg-white text-gray-600 font-bold text-sm md:text-base transition-all duration-300 transform hover:-translate-y-1 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-lg hover:shadow-red-600/20 text-center uppercase tracking-wide"
                    >
                        Organization
                    </button>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link href="/sign-in" className="font-bold text-red-600 hover:text-red-700">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        )
    }

    // ACCOUNT STEP (Email + Password)
    if (step === 'account') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${headerMode === 'desktop' ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className={`text-center mb-8 ${headerMode === 'desktop' ? 'text-left md:text-center' : ''}`}>
                    {headerMode !== 'desktop' && (
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <Image src={tenant.logoUrl} alt={`${tenant.name} Logo`} fill className="object-contain" priority />
                        </div>
                    )}
                    <h1 className={`${headerMode === 'desktop' ? 'text-3xl lg:text-4xl' : 'text-2xl'} font-black text-gray-900 tracking-tight`}>
                        {role === 'ATHLETE' ? 'Create Account' :
                            role === 'CLUB_MASTER' ? 'Club Master Sign Up' :
                                role === 'ORGANIZER' ? 'Organizer Sign Up' : 'Create Account'}
                    </h1>
                    <p className={`${headerMode === 'desktop' ? 'text-lg mt-3' : 'text-sm mt-2'} text-gray-500`}>
                        {headerMode === 'desktop' ? "Join us to manage or participate in upcoming tournaments" : "Account Details"}
                    </p>
                </div>

                <button
                    onClick={() => { setStep('role-selection'); setError(null); }}
                    className="absolute top-6 left-6 z-10 flex items-center text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                            onBlur={handleEmailBlur}
                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${emailError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500'}`}
                            placeholder="athlete@example.com"
                            required
                            disabled={isEmailLocked}
                        />
                        {emailError && (
                            <p className="text-red-500 text-xs mt-1 font-bold ml-1">{emailError}</p>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[34px] text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            <span className="text-xs text-red-600 font-bold">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-70"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Creating Account...</>
                        ) : (
                            <>Sign Up <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-gray-100 flex-1" />
                    <span className="text-gray-400 text-xs font-bold uppercase">Or join with</span>
                    <div className="h-px bg-gray-100 flex-1" />
                </div>

                <div className="relative">
                    <button
                        type="button"
                        disabled
                        className="w-full py-3 bg-gray-50 border-2 border-gray-100 text-gray-400 font-bold rounded-xl flex items-center justify-center gap-3 text-sm cursor-not-allowed opacity-75"
                    >
                        <svg className="w-5 h-5 grayscale opacity-50" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                    <div className="absolute -top-3 -right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm border border-white">
                        COMING SOON
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href="/sign-in" className="font-bold text-red-600 hover:text-red-700">
                        Sign In
                    </Link>
                </p>
            </div>
        )
    }

    return null
}
