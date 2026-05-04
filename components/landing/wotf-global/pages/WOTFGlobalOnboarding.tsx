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

    // Pre-fill from DB
    useEffect(() => {
        if (!isLoaded || !dbUser) return
        setName(dbUser.name || '')
        if (dbUser.imageUrl) setImgPreview(dbUser.imageUrl)
        if (dbUser.email) {
            getExistingProfile(dbUser.email).then((profile) => {
                if (!profile) return
                if (profile.name) setName(profile.name)
                if (profile.birthDate) setBirthDate(format(new Date(profile.birthDate), 'yyyy-MM-dd'))
                if (profile.gender) setGender(profile.gender)
                if (profile.country) setCountry(profile.country)
                if (profile.clubName) setClubName(profile.clubName)
            })
        }
    }, [isLoaded, dbUser])

    // Fetch clubs scoped to WOTF Global org
    useEffect(() => {
        if (tenant.id) {
            fetch(`/api/clubs?orgId=${tenant.id}`)
                .then(res => res.json())
                .then(data => setClubs(data))
                .catch(() => {})
        }
    }, [tenant.id])

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
        <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0085C7]/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image src="/wotf/logo_image.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                        Complete Your Profile
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Fill in your details to join WOTF Global
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-5" noValidate>
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
                                <p className={`text-xs ${fieldErrors.profilePic ? 'text-red-500' : 'text-gray-600'}`}>
                                    {fieldErrors.profilePic ? 'Required' : 'Click to upload'}
                                </p>
                            </div>
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${fieldErrors.name ? 'text-red-400' : 'text-gray-400'}`}>
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={name}
                                onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })) }}
                                placeholder="Enter your full name"
                                className={`w-full bg-black border text-white rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700 ${
                                    fieldErrors.name ? 'border-red-500' : 'border-white/10 focus:border-[#0085C7]'
                                }`}
                            />
                            {fieldError('name')}
                        </div>

                        {/* Birth Date & Gender row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.birthDate ? 'text-red-400' : 'text-gray-400'}`}>
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
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${fieldErrors.gender ? 'text-red-400' : 'text-gray-400'}`}>
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
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.country ? 'text-red-400' : 'text-gray-400'}`}>
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
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${fieldErrors.clubName ? 'text-red-400' : 'text-gray-400'}`}>
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

                {/* Accent dots */}
                <div className="flex justify-center gap-1.5 mt-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0085C7]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4C300]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#009F3D]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DF0024]" />
                </div>
            </div>
        </main>
    )
}
