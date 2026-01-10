'use client'

import React, { useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { completeOnboarding } from '@/app/actions'
import { toast } from 'sonner'

interface Club {
    id: string
    name: string
}

interface CustomSignUpFormProps {
    clubs: Club[]
}

type Step = 'account' | 'profile' | 'verification'

export default function CustomSignUpForm({ clubs }: CustomSignUpFormProps) {
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
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('Male')
    const [belt, setBelt] = useState('White')
    const [clubName, setClubName] = useState('')
    const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false)
    const [clubSearch, setClubSearch] = useState('')

    // Verification Data
    const [code, setCode] = useState('')

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

        if (!birthDate || !gender || !belt || !clubName) {
            setError("All profile fields are required")
            return
        }

        setLoading(true)

        try {
            // 1. Create Clerk User
            await signUp.create({
                firstName,
                lastName,
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
            formData.append('role', 'ATHLETE') // Defaults to Athlete
            formData.append('firstName', firstName)
            formData.append('lastName', lastName)
            formData.append('clubName', clubName)
            formData.append('birthDate', birthDate)
            formData.append('gender', gender)
            formData.append('belt', belt)

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
                // Note: Google Sign Up bypasses our custom form, so they will hit the regular /onboarding check in page.tsx
                // This is acceptable as a fallback for OAuth users.
            })
        } catch (err) {
            console.error('OAuth error', err)
        }
    }

    // ----------------------------------------------------
    // RENDER STEPS
    // ----------------------------------------------------

    // STEP 1: ACCOUNT
    if (step === 'account') {
        return (
            <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100 flex flex-col justify-center min-h-[80vh] md:min-h-0">
                <div className="text-center mb-8">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <Image src="/KTMLogo.png" alt="KTM Logo" fill className="object-contain" priority />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h1>
                    <p className="text-gray-500 mt-2 text-sm">Step 1 of 3: Account Details</p>
                </div>

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
            <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100 flex flex-col justify-center min-h-[80vh] md:min-h-0">
                <div className="text-center mb-6">
                    <button
                        onClick={() => setStep('account')}
                        className="absolute left-6 top-8 md:static md:mb-4 flex items-center text-gray-400 hover:text-gray-900"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Complete Profile</h1>
                    <p className="text-gray-500 mt-2 text-sm">Step 2 of 3: Your Info</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
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
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                                placeholder="Select your club..."
                                value={clubSearch}
                                onChange={(e) => {
                                    setClubSearch(e.target.value)
                                    setIsClubDropdownOpen(true)
                                    setClubName('')
                                }}
                                onFocus={() => setIsClubDropdownOpen(true)}
                            />
                            {/* Valid Selection Checkmark */}
                            {clubName && clubName === clubSearch && (
                                <div className="absolute right-4 top-3.5 text-green-500">
                                    <Check size={18} />
                                </div>
                            )}
                        </div>

                        {isClubDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsClubDropdownOpen(false)} />
                                <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl py-2 overflow-auto border border-gray-100">
                                    {filteredClubs.length === 0 ? (
                                        <div className="text-gray-400 px-4 py-2 text-sm">No clubs found.</div>
                                    ) : (
                                        filteredClubs.map((club) => (
                                            <div
                                                key={club.id}
                                                className={`cursor-pointer px-4 py-3 hover:bg-gray-50 ${clubName === club.name ? 'bg-red-50 text-red-700' : 'text-gray-900'}`}
                                                onClick={() => {
                                                    setClubName(club.name)
                                                    setClubSearch(club.name)
                                                    setIsClubDropdownOpen(false)
                                                }}
                                            >
                                                <span className="font-medium">{club.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
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
                        className="w-full py-4 mt-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-lg"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Creating Account...</>
                        ) : 'Sign Up'}
                    </button>
                </form>
            </div>
        )
    }

    // STEP 3: VERIFICATION
    if (step === 'verification') {
        return (
            <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white md:bg-white rounded-3xl md:shadow-xl md:border md:border-gray-100 flex flex-col justify-center min-h-[80vh] md:min-h-0">
                <div className="mb-8 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <Image src="/KTMLogo.png" alt="KTM Logo" fill className="object-contain" priority />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Verify Email</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Code sent to <span className="font-bold text-gray-900">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleVerification} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-center text-3xl tracking-[1rem] font-black placeholder:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                            placeholder="000000"
                            maxLength={6}
                            required
                        />
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
                        className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-lg"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Finalizing...</>
                        ) : 'Verify & Complete'}
                    </button>
                </form>
            </div>
        )
    }

    return null
}
