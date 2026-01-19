'use client'

import React, { useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check, Building2, User } from 'lucide-react'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { completeOnboarding } from '@/app/actions'
import { toast } from 'sonner'

interface Club {
    id: string
    name: string
}

interface CustomSignUpFormProps {
    clubs: Club[]
    hideBranding?: boolean
}

type Step = 'account' | 'profile' | 'verification'

export default function CustomSignUpForm({ clubs, hideBranding = false }: CustomSignUpFormProps) {
    const { isLoaded, signUp, setActive } = useSignUp()
    const router = useRouter()

    // Steps State
    const [step, setStep] = useState<Step>('account')

    // Account Data
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')

    // Profile Data
    const [isOrganization, setIsOrganization] = useState(false)
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('Male')
    const [belt, setBelt] = useState('White')
    const [clubName, setClubName] = useState('')
    const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false)
    const [clubSearch, setClubSearch] = useState('')
    const [isCreatingClub, setIsCreatingClub] = useState(false) // Track if user explicitly selected "Create New Club"

    // Verification Data
    const [code, setCode] = useState('')
    const [resending, setResending] = useState(false)
    const [resendCountdown, setResendCountdown] = useState(0)

    // Countdown timer
    React.useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCountdown])

    // UI State
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Filter clubs based on search
    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(clubSearch.toLowerCase())
    )

    if (!isLoaded) return null

    // ----------------------------------------------------
    // HANDLERS
    // ----------------------------------------------------

    // Step 1: Account -> Profile (Validation only)
    const handleAccountNext = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!firstName || !lastName || !email || !password) {
            setError("All fields are required")
            return
        }

        setStep('profile')
    }

    // Step 2: Profile -> Submit to Clerk (Create Account)
    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setError(null)

        // Validation based on Mode
        if (isOrganization) {
            // Organization Validation
            if (!clubName || !birthDate) {
                setError("Organization Name and Established Date are required")
                return
            }
        } else {
            // Individual Validation (Athlete/Club Master)
            if (!birthDate || !gender || !belt || !clubName) {
                setError("All profile fields are required")
                return
            }
        }

        setLoading(true)

        try {
            // 1. Create Clerk User
            await signUp.create({
                emailAddress: email,
                password,
            })

            // 2. Prepare Verification
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

            // 3. Move to Verify Step
            setStep('verification')
            setLoading(false)

        } catch (err: any) {
            setLoading(false)
            console.error('Sign up error', err)
            if (err.errors && err.errors.length > 0) {
                setError(err.errors[0].longMessage || err.errors[0].message)
            } else {
                setError('Something went wrong. Please try again.')
            }
        }
    }

    // Step 3: Verify OTP -> Complete Onboarding
    const handleVerification = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isLoaded) return

        setLoading(true)
        setError(null)

        try {
            // 1. Attempt Verification
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            })

            if (completeSignUp.status !== 'complete') {
                console.error(JSON.stringify(completeSignUp, null, 2))
                setLoading(false)
                setError('Verification invalid.')
                return
            }

            // 2. Set Active Session (Login)
            if (completeSignUp.createdSessionId) {
                await setActive({ session: completeSignUp.createdSessionId })
            }

            // 3. Create Database Record (Onboarding)
            // Note: We are now logged in as the user
            const formData = new FormData()

            // Determine Role
            let role = 'ATHLETE'
            if (isOrganization) {
                role = 'ORGANIZER'
            } else if (isCreatingClub) {
                role = 'CLUB_MASTER'
            }

            formData.append('role', role)
            formData.append('firstName', firstName)
            formData.append('lastName', lastName)
            formData.append('clubName', clubName) // Reused as Organization Name if role=ORGANIZER
            formData.append('birthDate', birthDate) // Reused as Est. Date if role=ORGANIZER

            if (!isOrganization) {
                formData.append('gender', gender)
                formData.append('belt', belt)
            }

            await completeOnboarding(formData)

            // 4. Redirect
            router.push('/')

        } catch (err: any) {
            setLoading(false)
            console.error('Verification error', err)
            if (err.errors && err.errors.length > 0) {
                setError(err.errors[0].longMessage || err.errors[0].message)
            } else {
                setError('Invalid code. Please try again.')
            }
        }
    }

    const handleGoogleSignUp = async () => {
        if (!isLoaded) return
        try {
            await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/'
            })
        } catch (err) {
            console.error('OAuth error', err)
        }
    }

    // ----------------------------------------------------
    // VERIFICATION HANDLERS
    // ----------------------------------------------------

    const handleDigitChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return

        const newCode = code.split('')
        newCode[index] = value.slice(-1)
        const updatedCode = newCode.join('').slice(0, 6)
        setCode(updatedCode)

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
        const focusIndex = Math.min(pastedData.length, 5)
        const input = document.getElementById(`otp-${focusIndex}`)
        input?.focus()
    }

    const handleResendCode = async () => {
        if (!isLoaded) return
        setError(null)
        setResending(true)
        try {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
            setResendCountdown(60)
            toast.success('Code resent successfully')
        } catch (err: any) {
            console.error('Resend error', err)
            setError('Failed to resend code. Please try again.')
        } finally {
            setResending(false)
        }
    }

    // ----------------------------------------------------
    // RENDER STEPS
    // ----------------------------------------------------

    // STEP 1: ACCOUNT
    if (step === 'account') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>

                {!hideBranding && (
                    <div className="text-center mb-8">
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <Image src="/KTMLogo.png" alt="KTM Logo" fill className="object-contain" priority />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h1>
                        <p className="text-gray-500 mt-2 text-sm">Step 1 of 3: Account Details</p>
                    </div>
                )}

                <form onSubmit={handleAccountNext} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                placeholder="Juan"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                placeholder="Dela Cruz"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="athlete@example.com"
                            required
                        />
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
                        className="w-full py-4 mt-2 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
                    >
                        Next <ArrowRight size={20} />
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-gray-100 flex-1" />
                    <span className="text-gray-400 text-xs font-bold uppercase">Or join with</span>
                    <div className="h-px bg-gray-100 flex-1" />
                </div>

                {/* Social Login */}
                <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    className="w-full py-3 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href="/sign-in" className="font-bold text-red-600 hover:text-red-700">
                        Sign In
                    </Link>
                </p>
            </div>
        )
    }

    // STEP 2: PROFILE
    if (step === 'profile') {
        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <div className={`text-center mb-6 relative ${hideBranding ? 'md:static' : ''}`}>
                    <button
                        onClick={() => {
                            setStep('account')
                            setError(null)
                        }}
                        className={`${hideBranding ? '' : 'absolute left-6 top-8 md:static md:mb-4'} flex items-center text-gray-400 hover:text-gray-900 group`}
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    {!hideBranding && (
                        <>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Complete Profile</h1>
                            <p className="text-gray-500 mt-2 text-sm">Step 2 of 3: Your Info</p>
                        </>
                    )}
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">

                    {/* Organization Toggle */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isOrganization ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                                {isOrganization ? <Building2 size={20} /> : <User size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900">Register as Organization</p>
                                <p className="text-xs text-gray-500">Manage tournaments & events</p>
                            </div>
                        </div>
                        {/* Simple Toggle Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsOrganization(!isOrganization)
                                setIsCreatingClub(false)
                                setClubName('')
                                setBelt('White') // Reset
                                setError(null)
                            }}
                            className={`w-12 h-7 rounded-full transition-colors relative ${isOrganization ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all ${isOrganization ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    {isOrganization ? (
                        <>
                            {/* ORGANIZATION FIELDS */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Organization Name</label>
                                <input
                                    type="text"
                                    value={clubName} // Reuse clubName state
                                    onChange={(e) => setClubName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="e.g. National Taekwondo Alliance"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Date Established</label>
                                <input
                                    type="date"
                                    value={birthDate} // Reuse birthDate state
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* INDIVIDUAL FIELDS */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase ml-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <CustomSelect
                                    label="GENDER"
                                    value={gender}
                                    onChange={setGender}
                                    options={['Male', 'Female']}
                                    required
                                />
                                <CustomSelect
                                    label="BELT"
                                    value={belt}
                                    onChange={setBelt}
                                    options={['White', 'Yellow', 'Green', 'Blue', 'Red', 'Brown', 'Black']}
                                    required
                                />
                            </div>

                            {/* Club Search with Combobox Style */}
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Club</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all font-medium ${isCreatingClub ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500'}`}
                                        placeholder={isCreatingClub ? "Enter new club name..." : "Search for your club..."}
                                        value={clubSearch}
                                        onChange={(e) => {
                                            setClubSearch(e.target.value)
                                            setIsClubDropdownOpen(true)
                                            // Only reset if we are NOT in create mode or user is typing freshly
                                            if (!isCreatingClub) {
                                                setClubName('')
                                            } else {
                                                setClubName(e.target.value)
                                            }
                                        }}
                                        onFocus={() => setIsClubDropdownOpen(true)}
                                    />
                                    {/* Valid Selection Checkmark */}
                                    {clubName && (clubName === clubSearch || isCreatingClub) && (
                                        <div className={`absolute right-4 top-3.5 ${isCreatingClub ? 'text-green-600' : 'text-green-500'}`}>
                                            {isCreatingClub ? <span className="text-xs font-bold bg-green-100 px-2 py-0.5 rounded">NEW</span> : <Check size={18} />}
                                        </div>
                                    )}
                                </div>

                                {isClubDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsClubDropdownOpen(false)} />
                                        <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl py-2 overflow-auto border border-gray-100">
                                            {filteredClubs.length === 0 && clubSearch.trim().length > 0 ? (
                                                <div
                                                    className="cursor-pointer px-4 py-3 hover:bg-green-50 text-green-700 flex items-center gap-2"
                                                    onClick={() => {
                                                        setIsCreatingClub(true)
                                                        setClubName(clubSearch)
                                                        setIsClubDropdownOpen(false)
                                                    }}
                                                >
                                                    <span className="font-bold">+ Create new club "{clubSearch}"</span>
                                                </div>
                                            ) : filteredClubs.length > 0 ? (
                                                <>
                                                    {filteredClubs.map((club) => (
                                                        <div
                                                            key={club.id}
                                                            className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${clubName === club.name && !isCreatingClub ? 'bg-red-50 text-red-700' : 'text-gray-900'}`}
                                                            onClick={() => {
                                                                setIsCreatingClub(false)
                                                                setClubName(club.name)
                                                                setClubSearch(club.name)
                                                                setIsClubDropdownOpen(false)
                                                            }}
                                                        >
                                                            <span className="font-medium">{club.name}</span>
                                                        </div>
                                                    ))}
                                                    {/* Always show create option at bottom if searching */}
                                                    {clubSearch && (
                                                        <div
                                                            className="cursor-pointer px-4 py-3 border-t border-gray-100 hover:bg-green-50 text-green-700 flex items-center gap-2 mt-1"
                                                            onClick={() => {
                                                                setIsCreatingClub(true)
                                                                setClubName(clubSearch)
                                                                setIsClubDropdownOpen(false)
                                                            }}
                                                        >
                                                            <span className="font-bold text-sm">+ Can't find it? Create "{clubSearch}"</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-gray-400 px-4 py-2 text-sm">Type to search or create a club.</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            <span className="text-xs text-red-600 font-bold">{error}</span>
                        </div>
                    )}

                    <div id="clerk-captcha"></div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 mt-4 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-lg ${isOrganization ? 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700' : isCreatingClub ? 'bg-green-600 shadow-green-600/20 hover:bg-green-700' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'}`}
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Creating Account...</>
                        ) : (
                            isOrganization ? 'Sign Up as Organization' : isCreatingClub ? 'Sign Up as Club Master' : 'Sign Up'
                        )}
                    </button>
                </form>
            </div>
        )
    }



    // STEP 3: VERIFICATION
    if (step === 'verification') {
        const codeDigits = code.split('').concat(Array(6 - code.length).fill(''))

        return (
            <div className={`w-full max-w-md mx-auto flex flex-col justify-center ${hideBranding ? '' : 'min-h-[80vh] md:min-h-0 p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100'}`}>
                <button
                    onClick={() => { setStep('profile'); setCode(''); }}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4 self-start"
                >
                    <ArrowLeft size={20} className="mr-1" /> Back
                </button>

                <div className="mb-8 text-center">
                    {!hideBranding && (
                        <>
                            <div className="relative w-16 h-16 mx-auto mb-4">
                                <Image src="/KTMLogo.png" alt="KTM Logo" fill className="object-contain" priority />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Verify Email</h1>
                        </>
                    )}
                    <p className="text-gray-500 mt-2 text-sm">
                        Enter the 6-digit code sent to
                    </p>
                    <p className="font-bold text-gray-900 text-base">{email}</p>
                </div>

                <form onSubmit={handleVerification} className="space-y-6">
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
                                className={`w-12 h-14 sm:w-14 sm:h-16 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 text-center text-2xl font-black focus:outline-none focus:ring-2 transition-all ${isOrganization ? 'focus:ring-indigo-500/30 focus:border-indigo-500' : 'focus:ring-red-500/30 focus:border-red-500'}`}
                                autoComplete={index === 0 ? "one-time-code" : "off"}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                            <span className="text-lg">⚠️</span>
                            <span className="text-xs text-red-600 font-bold">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-lg ${isOrganization ? 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'}`}
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Verifying...</>
                        ) : 'Verify & Complete'}
                    </button>
                </form>

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
                                className={`font-bold hover:underline disabled:opacity-50 ${isOrganization ? 'text-indigo-600' : 'text-red-600'}`}
                            >
                                {resending ? 'Sending...' : 'Resend Code'}
                            </button>
                        )}
                    </p>
                </div>
            </div>
        )
    }

    return null
}
