'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useTenant } from '@/app/providers/TenantProvider'
import { compressImage } from '@/lib/compress-image'
import { getExistingProfile } from '@/app/actions'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, ArrowRight, Loader2, Globe, Users, Calendar as CalendarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { COUNTRIES } from '@/lib/countries'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { format } from 'date-fns'
import { toast } from 'sonner'

const GENDER_OPTIONS = ['Male', 'Female']

export default function WOTFGlobalOnboarding() {
    const supabase = createBrowserClient()
    const router = useRouter()
    const tenant = useTenant()

    const [isLoaded, setIsLoaded] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

    // User data
    const [dbUser, setDbUser] = useState<any>(null)
    const [authUser, setAuthUser] = useState<any>(null)

    // Form fields
    const [name, setName] = useState('')
    const [imgPreview, setImgPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('Male')
    const [country, setCountry] = useState('')
    const [clubName, setClubName] = useState('')
    const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
    const profileInputRef = useRef<HTMLInputElement>(null)

    // Fetch user data on mount
    useEffect(() => {
        async function loadUser() {
            try {
                const { data: { user: supaUser } } = await supabase.auth.getUser()
                if (!supaUser) {
                    router.push('/sign-in')
                    return
                }
                setAuthUser(supaUser)
                const res = await fetch('/api/me')
                if (res.ok) {
                    const meData = await res.json()
                    setDbUser(meData.data)
                }
            } catch (err) {
                console.error('Failed to load user:', err)
            } finally {
                setIsLoaded(true)
            }
        }
        loadUser()
    }, [supabase, router])

    // Pre-fill — auth metadata is primary (DB user may not exist yet at this step)
    useEffect(() => {
        if (!isLoaded) return
        // Primary: name from Supabase auth metadata (set during sign-up Step 2)
        const authName = authUser?.user_metadata?.full_name
        setName(authName || dbUser?.name || '')
        if (dbUser?.imageUrl) setImgPreview(dbUser.imageUrl)
        if (dbUser?.email) {
            getExistingProfile(dbUser.email).then((profile) => {
                if (!profile) return
                if (profile.name) setName(profile.name)
                if (profile.birthDate) setBirthDate(format(new Date(profile.birthDate), 'yyyy-MM-dd'))
                if (profile.gender) setGender(profile.gender)
                if (profile.country) setCountry(profile.country)
                if (profile.clubName) setClubName(profile.clubName)
            })
        }
    }, [isLoaded, authUser, dbUser])

    // Fetch clubs scoped to WOTF Global org by slug (works in any env)
    useEffect(() => {
        fetch('/api/clubs?orgSlug=wotf-global')
            .then(res => res.json())
            .then(data => setClubs(data))
            .catch(() => {})
    }, [])

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const compressed = await compressImage(file, { maxDimension: 800, quality: 0.8 })
                setSelectedFile(compressed)
                const reader = new FileReader()
                reader.onloadend = () => setImgPreview(reader.result as string)
                reader.readAsDataURL(compressed)
            } catch {
                setSelectedFile(file)
                const reader = new FileReader()
                reader.onloadend = () => setImgPreview(reader.result as string)
                reader.readAsDataURL(file)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dbUser && !authUser) return
        setError('')

        const errors: Record<string, boolean> = {}
        if (!imgPreview && !selectedFile) errors.profilePic = true
        if (!name.trim()) errors.name = true
        if (!birthDate) errors.birthDate = true
        if (!gender) errors.gender = true
        if (!country) errors.country = true
        if (!clubName) errors.clubName = true

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            return
        }
        setFieldErrors({})
        setIsSubmitting(true)

        try {
            const submitData = new FormData()
            submitData.append('name', name)
            submitData.append('role', 'ATHLETE')
            submitData.append('birthDate', birthDate)
            submitData.append('gender', gender)
            submitData.append('clubName', clubName)
            if (country.trim()) submitData.append('country', country.trim())
            if (selectedFile) submitData.append('image', selectedFile)
            // Signal this is WOTF Global onboarding (reduced fields)
            submitData.append('wotfGlobal', 'true')

            const res = await fetch('/api/v1/onboarding/complete', {
                method: 'POST',
                body: submitData,
            })

            if (!res.ok) {
                let errorMessage = 'Failed to complete profile'
                const text = await res.text().catch(() => '')
                try {
                    const err = JSON.parse(text)
                    errorMessage = err.error || err.message || errorMessage
                } catch {
                    errorMessage = text || `Server error (${res.status})`
                }
                throw new Error(errorMessage)
            }

            toast.success('Profile submitted for approval!')
            const tenantQs = new URLSearchParams(window.location.search).get('tenant')
            window.location.href = tenantQs ? `/athlete?tenant=${tenantQs}` : '/athlete'
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Something went wrong')
            setIsSubmitting(false)
        }
    }

    const fieldError = (field: string) =>
        fieldErrors[field] ? <p className="text-xs text-red-400 mt-1 font-medium">Required</p> : null

    // Loading
    if (!isLoaded) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0085C7]" />
            </main>
        )
    }

    const clubOptions = clubs.map(c => ({ value: c.name, label: c.name }))
    if (clubName && !clubOptions.some(o => o.value === clubName)) {
        clubOptions.unshift({ value: clubName, label: clubName })
    }

    return (
        <main className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#0085C7]/8 rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#DF0024]/5 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 w-full max-w-5xl bg-[#080808] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] my-4"
            >
                {/* ── LEFT PANEL ── */}
                <div className="md:w-5/12 relative flex flex-col justify-between p-8 md:p-10 bg-gradient-to-br from-[#0085C7]/20 via-black to-black border-b md:border-b-0 md:border-r border-white/5 overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#0085C7]/10 rounded-full blur-[100px]" />
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/3 rounded-full blur-[80px]" />
                    </div>

                    {/* Top: Logo + Title */}
                    <div className="relative z-10">
                        <Link href="/" className="inline-block mb-6">
                            <Image src="/wotf-global/Wotf_logo_Final.png" alt="WOTF Global" width={96} height={96} />
                        </Link>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider leading-tight mb-3">
                                Athlete<br />Profile Setup
                            </h1>
                            <p className="text-white/50 text-sm leading-relaxed">
                                Complete your details to register as a WOTF Global athlete and compete internationally.
                            </p>
                        </motion.div>
                    </div>

                    {/* Middle: Step indicators */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="relative z-10 space-y-3 my-8"
                    >
                        {[
                            { label: 'Account Created', done: true },
                            { label: 'Athlete Profile', done: false, active: true },
                            { label: 'Pending Approval', done: false },
                            { label: 'Dashboard Access', done: false },
                        ].map((s, i) => (
                            <div key={i} className={`flex items-center gap-3 text-sm ${s.done ? 'text-white/60' : s.active ? 'text-white font-bold' : 'text-white/30'}`}>
                                {s.done ? (
                                    <div className="w-5 h-5 rounded-full bg-[#0085C7] flex items-center justify-center flex-shrink-0">
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                ) : (
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${s.active ? 'border-[#0085C7] text-[#0085C7]' : 'border-white/20 text-white/30'}`}>
                                        {i + 1}
                                    </div>
                                )}
                                <span>{s.label}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* Bottom: Olympic accent bar */}
                    <div className="relative z-10">
                        <div className="flex gap-1.5 mb-4">
                            <span className="w-6 h-1.5 rounded-full bg-[#0085C7]" />
                            <span className="w-6 h-1.5 rounded-full bg-[#F4C300]" />
                            <span className="w-6 h-1.5 rounded-full bg-white/80" />
                            <span className="w-6 h-1.5 rounded-full bg-[#009F3D]" />
                            <span className="w-6 h-1.5 rounded-full bg-[#DF0024]" />
                        </div>
                        <p className="text-white/25 text-xs">World Olympics Taekwondo Federation</p>
                    </div>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="md:w-7/12 flex flex-col justify-center p-6 md:p-10 overflow-y-auto max-h-[85vh] md:max-h-none">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                    >
                        <h2 className="text-xl font-bold text-white mb-6">Complete Your Profile</h2>

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            {/* Profile Picture */}
                            <div className="flex items-center gap-5">
                                <div
                                    onClick={() => { profileInputRef.current?.click(); setFieldErrors(prev => ({ ...prev, profilePic: false })) }}
                                    className={`relative w-20 h-20 rounded-full bg-black border-2 border-dashed cursor-pointer transition-all overflow-hidden flex items-center justify-center group flex-shrink-0 ${
                                        fieldErrors.profilePic ? 'border-red-500' : 'border-white/20 hover:border-[#0085C7]'
                                    }`}
                                >
                                    {imgPreview ? (
                                        <Image src={imgPreview} alt="Profile" fill className="object-cover" />
                                    ) : (
                                        <Camera className={`w-6 h-6 ${fieldErrors.profilePic ? 'text-red-400' : 'text-gray-600'} group-hover:text-[#0085C7] transition-colors`} />
                                    )}
                                    {imgPreview && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <input
                                        ref={profileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => { handleImageChange(e); setFieldErrors(prev => ({ ...prev, profilePic: false })) }}
                                        className="hidden"
                                    />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${fieldErrors.profilePic ? 'text-red-400' : 'text-gray-300'}`}>
                                        Profile Picture <span className="text-red-500">*</span>
                                    </p>
                                    <p className={`text-xs mt-0.5 ${fieldErrors.profilePic ? 'text-red-500' : 'text-gray-600'}`}>
                                        {fieldErrors.profilePic ? 'Required' : 'Click to upload your photo'}
                                    </p>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${fieldErrors.name ? 'text-red-400' : 'text-gray-500'}`}>
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })) }}
                                    placeholder="Enter your full name"
                                    className={`w-full bg-white/5 border text-white rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700 ${
                                        fieldErrors.name ? 'border-red-500' : 'border-white/10 focus:border-[#0085C7]'
                                    }`}
                                />
                                {fieldError('name')}
                            </div>

                            {/* Birth Date & Gender */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.birthDate ? 'text-red-400' : 'text-gray-500'}`}>
                                        <CalendarIcon size={13} /> Date of Birth <span className="text-red-500">*</span>
                                    </label>
                                    <GlobalCalendar
                                        label=""
                                        value={birthDate ? new Date(birthDate) : undefined}
                                        onChange={(date: Date) => { setBirthDate(format(date, 'yyyy-MM-dd')); setFieldErrors(prev => ({ ...prev, birthDate: false })) }}
                                        placeholder="Select date"
                                        fullWidth
                                        maxDate={new Date()}
                                    />
                                    {fieldError('birthDate')}
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${fieldErrors.gender ? 'text-red-400' : 'text-gray-500'}`}>
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <GlobalDropdown
                                        options={GENDER_OPTIONS}
                                        value={gender}
                                        onChange={(val: string) => { setGender(val); setFieldErrors(prev => ({ ...prev, gender: false })) }}
                                        fullWidth
                                    />
                                    {fieldError('gender')}
                                </div>
                            </div>

                            {/* Country */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.country ? 'text-red-400' : 'text-gray-500'}`}>
                                    <Globe size={13} /> Country <span className="text-red-500">*</span>
                                </label>
                                <GlobalDropdown
                                    options={COUNTRIES}
                                    value={country}
                                    onChange={(val: string) => { setCountry(val); setFieldErrors(prev => ({ ...prev, country: false })) }}
                                    fullWidth
                                    searchable
                                />
                                {fieldError('country')}
                            </div>

                            {/* Club */}
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.clubName ? 'text-red-400' : 'text-gray-500'}`}>
                                    <Users size={13} /> Affiliated Club <span className="text-red-500">*</span>
                                </label>
                                <GlobalDropdown
                                    options={clubOptions}
                                    value={clubName}
                                    onChange={(val: string) => { setClubName(val); setFieldErrors(prev => ({ ...prev, clubName: false })) }}
                                    fullWidth
                                    searchable
                                />
                                {fieldError('clubName')}
                            </div>

                            {/* Info note */}
                            <div className="bg-[#0085C7]/5 border border-[#0085C7]/10 rounded-lg p-3">
                                <p className="text-xs text-[#0085C7]/80 leading-relaxed">
                                    <strong className="text-[#0085C7]">Note:</strong> Your belt rank, weight, and height will be verified and assigned by your clubmaster after submission.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        Submit for Approval
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </motion.div>
        </main>
    )
}
