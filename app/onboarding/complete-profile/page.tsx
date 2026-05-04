'use client'

import { compressImage } from '@/lib/compress-image'

import { completeOnboarding, checkEmailAvailability, getExistingProfile } from '@/app/actions'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useTenant } from '@/app/providers/TenantProvider'
import { toast } from 'sonner'
import { Camera, ArrowRight, ArrowLeft, CheckCircle, Loader2, Ruler, Weight, Users, Building2, Award, Calendar, ImageIcon, Globe, MapPin, Phone, CreditCard, Upload, Download, QrCode, Banknote, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { COUNTRIES } from '@/lib/countries'
import WOTFGlobalOnboarding from '@/components/landing/wotf-global/pages/WOTFGlobalOnboarding'

type OnboardingStep = 'profile' | 'details' | 'payment'

const BELT_OPTIONS = [
    'White', 'Yellow', 'Orange', 'Green', 'Purple',
    'Blue', 'Red', 'Maroon', 'Brown', 'Black'
]

const DAN_BELT_OPTIONS = [
    '1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan',
    '6th Dan', '7th Dan', '8th Dan', '9th Dan'
]

const GENDER_OPTIONS = ['Male', 'Female']

export default function CompleteProfilePage() {
    const supabase = createBrowserClient()
    const router = useRouter()
    const tenant = useTenant()
    const isKtm = tenant.slug === 'ktm'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<OnboardingStep>('profile')
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

    // User data from DB (fetched via /api/me)
    const [dbUser, setDbUser] = useState<any>(null)
    const [authUser, setAuthUser] = useState<any>(null)
    // Role from DB if available, otherwise from Supabase auth metadata (new sign-ups)
    const role = (dbUser?.role || authUser?.user_metadata?.role) as string | null

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

    // Common profile data
    const [name, setName] = useState('')
    const [imgPreview, setImgPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const profileInputRef = useRef<HTMLInputElement>(null)

    // Athlete-specific
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('Male')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [belt, setBelt] = useState('White')
    const [clubName, setClubName] = useState('')
    const [country, setCountry] = useState('')
    const [clubSearch, setClubSearch] = useState('')
    const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])

    // Club Master-specific
    const [newClubName, setNewClubName] = useState('')
    const [clubLogoFile, setClubLogoFile] = useState<File | null>(null)
    const [clubLogoPreview, setClubLogoPreview] = useState<string | null>(null)
    const [organizationId, setOrganizationId] = useState(isKtm ? '' : (tenant.id || ''))
    const [orgSearch, setOrgSearch] = useState('')
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([])
    const [clubAddress, setClubAddress] = useState('')
    const [clubPhone, setClubPhone] = useState('')
    const clubLogoInputRef = useRef<HTMLInputElement>(null)

    // Payment step state
    const [paymentConfig, setPaymentConfig] = useState<any>(null)
    const [paymentFee, setPaymentFee] = useState(0)
    const [paymentOrgName, setPaymentOrgName] = useState('')
    const [isLoadingPaymentConfig, setIsLoadingPaymentConfig] = useState(false)
    const [paymentSelectedMethod, setPaymentSelectedMethod] = useState<any>(null)
    const [paymentStep, setPaymentStep] = useState<1 | 2 | 3>(1)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const proofInputRef = useRef<HTMLInputElement>(null)

    // Organizer-specific
    const [orgName, setOrgName] = useState('')
    const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null)
    const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
    const [establishedDate, setEstablishedDate] = useState('')
    const orgLogoInputRef = useRef<HTMLInputElement>(null)

    // Pre-fill existing data from DB user
    useEffect(() => {
        if (!isLoaded || !dbUser) return
        const userName = dbUser.name || ''
        const email = dbUser.email || ''
        setName(userName)
        if (dbUser.imageUrl) setImgPreview(dbUser.imageUrl)

        // Fetch existing DB profile (e.g. pre-registered by clubmaster)
        if (email) {
            getExistingProfile(email).then((profile) => {
                if (!profile) return
                if (profile.name) setName(profile.name)
                if (profile.birthDate) setBirthDate(format(new Date(profile.birthDate), 'yyyy-MM-dd'))
                if (profile.gender) setGender(profile.gender)
                if (profile.weight) setWeight(String(profile.weight))
                if (profile.height) setHeight(String(profile.height))
                if (profile.belt) setBelt(profile.belt)
                if (profile.clubName) setClubName(profile.clubName)
                if (profile.country) setCountry(profile.country)
            })
        }
    }, [isLoaded, dbUser])

    // Fetch clubs for athlete dropdown (scoped to tenant org)
    useEffect(() => {
        if (role === 'ATHLETE') {
            const url = !isKtm && tenant.id ? `/api/clubs?orgId=${tenant.id}` : '/api/clubs'
            fetch(url)
                .then(res => res.json())
                .then(data => setClubs(data))
                .catch(() => { })
        }
    }, [role, isKtm, tenant.id])

    // Fetch organizations for club master dropdown (only for KTM tenant)
    useEffect(() => {
        if (role === 'CLUB_MASTER' && isKtm) {
            fetch('/api/organizations')
                .then(res => res.json())
                .then(data => setOrganizations(data))
                .catch(() => { })
        }
    }, [role, isKtm])

    // Fetch payment config when organization is selected
    useEffect(() => {
        if (role === 'CLUB_MASTER' && organizationId) {
            setIsLoadingPaymentConfig(true)
            fetch(`/api/organizations/${organizationId}/payment-config`)
                .then(res => res.json())
                .then(data => {
                    if (data.hasFee) {
                        setPaymentConfig(data.paymentConfig)
                        setPaymentFee(data.fee)
                        setPaymentOrgName(data.organizationName)
                    } else {
                        setPaymentConfig(null)
                        setPaymentFee(0)
                    }
                })
                .catch(() => { })
                .finally(() => setIsLoadingPaymentConfig(false))
        }
    }, [role, organizationId])

    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(clubSearch.toLowerCase())
    )

    const filteredOrgs = organizations.filter(o =>
        o.name.toLowerCase().includes(orgSearch.toLowerCase())
    )

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

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'club' | 'org') => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const compressed = await compressImage(file, { maxDimension: 800, quality: 0.8 })
                const reader = new FileReader()
                reader.onloadend = () => {
                    if (type === 'club') {
                        setClubLogoFile(compressed)
                        setClubLogoPreview(reader.result as string)
                    } else {
                        setOrgLogoFile(compressed)
                        setOrgLogoPreview(reader.result as string)
                    }
                }
                reader.readAsDataURL(compressed)
            } catch {
                const reader = new FileReader()
                reader.onloadend = () => {
                    if (type === 'club') {
                        setClubLogoFile(file)
                        setClubLogoPreview(reader.result as string)
                    } else {
                        setOrgLogoFile(file)
                        setOrgLogoPreview(reader.result as string)
                    }
                }
                reader.readAsDataURL(file)
            }
        }
    }

    const hasTwoSteps = role === 'CLUB_MASTER' || role === 'ORGANIZER'

    const handleProfileNext = () => {
        setError('')
        const errors: Record<string, boolean> = {}
        if (!imgPreview && !selectedFile) errors.profilePic = true
        if (!name.trim()) errors.name = true
        if (role === 'CLUB_MASTER') {
            if (!belt) errors.belt = true
            if (!gender) errors.gender = true
            if (!country) errors.country = true
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(prev => ({ ...prev, ...errors }))
            return
        }
        setStep('details')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dbUser && !authUser) return
        setError('')

        const errors: Record<string, boolean> = {}

        if (!imgPreview && !selectedFile) errors.profilePic = true
        if (!name.trim()) errors.name = true

        if (role === 'ATHLETE') {
            if (!birthDate) errors.birthDate = true
            if (!gender) errors.gender = true
            if (!weight) errors.weight = true
            if (!height) errors.height = true
            if (!belt) errors.belt = true
            if (!country) errors.country = true
            if (!clubName) errors.clubName = true
        } else if (role === 'CLUB_MASTER') {
            if (!newClubName) errors.clubName = true
            if (isKtm && !organizationId) errors.organizationId = true
            if (!clubLogoFile) errors.clubLogo = true
            if (!clubAddress.trim()) errors.clubAddress = true
            if (!clubPhone.trim()) errors.clubPhone = true
        } else if (role === 'ORGANIZER') {
            if (!orgName) errors.orgName = true
            if (!establishedDate) errors.establishedDate = true
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            return
        }
        setFieldErrors({})

        setIsSubmitting(true)

        try {
            const submitData = new FormData()
            submitData.append('name', name)
            submitData.append('role', role || '')

            if (selectedFile) {
                submitData.append('image', selectedFile)
            }

            if (role === 'ATHLETE') {
                submitData.append('weight', weight)
                submitData.append('height', height)
                submitData.append('belt', belt)
                submitData.append('birthDate', birthDate)
                submitData.append('gender', gender)
                submitData.append('clubName', clubName)
                if (country.trim()) submitData.append('country', country.trim())
            } else if (role === 'CLUB_MASTER') {
                submitData.append('clubName', newClubName)
                submitData.append('organizationId', organizationId)
                submitData.append('clubAddress', clubAddress)
                submitData.append('clubPhone', clubPhone)
                if (belt) submitData.append('belt', belt)
                if (gender) submitData.append('gender', gender)
                if (country.trim()) submitData.append('country', country.trim())
                if (clubLogoFile) submitData.append('clubLogo', clubLogoFile)
                if (proofFile) submitData.append('proofImage', proofFile)
            } else if (role === 'ORGANIZER') {
                submitData.append('orgName', orgName)
                submitData.append('establishedDate', establishedDate)
                if (orgLogoFile) submitData.append('orgLogo', orgLogoFile)
            }

            const res = await fetch('/api/v1/onboarding/complete', {
                method: 'POST',
                body: submitData
            })

            if (!res.ok) {
                let errorMessage = 'Failed to complete profile'
                const text = await res.text().catch(() => '')
                try {
                    const err = JSON.parse(text)
                    errorMessage = err.error || err.message || errorMessage
                } catch {
                    if (res.status === 413 || text.toLowerCase().includes('too large')) {
                        errorMessage = 'Image file is too large. Please use an image under 4MB.'
                    } else {
                        errorMessage = text || `Server error (${res.status})`
                    }
                }
                throw new Error(errorMessage)
            }

            toast.success('Profile completed successfully!')
            const tenantQs = new URLSearchParams(window.location.search).get('tenant')
            window.location.href = tenantQs ? `/?tenant=${tenantQs}` : '/'

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Something went wrong')
            setIsSubmitting(false)
        }
    }

    // ─── LOADING STATE ───
    if (!isLoaded) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: isKtm ? '#DC2626' : tenant.primaryColor }} />
            <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
    )

    // ─── WOTF GLOBAL ATHLETES → Custom Onboarding ───
    if (tenant.slug === 'wotf-global' && role === 'ATHLETE') {
        return <WOTFGlobalOnboarding />
    }

    // ─── SIDEBAR ───
    const renderSidebar = () => {
        const isClubMaster = role === 'CLUB_MASTER'
        const isOrganizer = role === 'ORGANIZER'

        const hasPayment = isClubMaster && paymentConfig && paymentFee > 0
        const steps = isClubMaster
            ? [
                { label: 'Account Created', done: true },
                { label: 'Your Profile', done: step === 'details' || step === 'payment', active: step === 'profile' },
                { label: 'Club Details', done: step === 'payment', active: step === 'details' },
                ...(hasPayment ? [{ label: 'Affiliation Payment', done: false, active: step === 'payment' }] : []),
                { label: 'Dashboard Access', done: false },
            ]
            : isOrganizer
                ? [
                    { label: 'Account Created', done: true },
                    { label: 'Your Profile', done: step === 'details', active: step === 'profile' },
                    { label: 'Organization Details', done: false, active: step === 'details' },
                    { label: 'Dashboard Access', done: false },
                ]
                : [
                    { label: 'Account Created', done: true },
                    { label: 'Athlete Profile', done: false, active: true },
                    { label: 'Dashboard Access', done: false },
                ]

        const sidebarMessage = () => {
            if (isClubMaster && step === 'details') return "Now set up your club so your athletes can find you."
            if (isClubMaster) return "Let's start with your personal profile."
            if (isOrganizer && step === 'details') return "Set up your organization to start hosting events."
            if (isOrganizer) return "Let's start with your personal profile."
            return "Complete your athlete profile to register for events and track your journey."
        }

        return (
            <div className={`md:w-5/12 relative text-white flex flex-col justify-between p-10 ${isKtm ? 'bg-red-600' : ''}`} style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}>
                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl font-black mb-4">Welcome!</h1>
                        <p className={`font-medium leading-relaxed ${isKtm ? 'text-red-100' : 'text-white/80'}`}>
                            {sidebarMessage()}
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="relative z-10 space-y-4 mt-8"
                >
                    {steps.map((s, i) => (
                        <div key={i} className={`flex items-center gap-3 text-sm ${s.done ? `font-medium ${isKtm ? 'text-red-100' : 'text-white/80'}` : s.active ? 'font-bold text-white' : `font-medium ${isKtm ? 'text-red-100' : 'text-white/80'} opacity-60`
                            }`}>
                            {s.done ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                                <div className={`w-5 h-5 rounded-full border-2 ${s.active ? 'border-white' : isKtm ? 'border-red-200' : 'border-white/40'} flex items-center justify-center text-[10px]`}>
                                    {i + 1}
                                </div>
                            )}
                            <span>{s.label}</span>
                        </div>
                    ))}
                </motion.div>

                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white opacity-5 blur-[80px] rounded-full translate-y-1/2 translate-x-1/2"></div>
            </div>
        )
    }

    // ─── PROFILE PICTURE UPLOAD ───
    const renderProfilePicture = () => (
        <div>
            <div className="flex items-center gap-6">
                <div
                    onClick={() => { profileInputRef.current?.click(); setFieldErrors(prev => ({ ...prev, profilePic: false })) }}
                    className={`relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed cursor-pointer transition-all overflow-hidden flex items-center justify-center group flex-shrink-0 ${fieldErrors.profilePic ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} ${isKtm ? 'hover:border-red-500' : ''}`}
                    style={!isKtm ? { ['--hover-color' as any]: tenant.primaryColor } : undefined}
                >
                    {imgPreview ? (
                        <Image src={imgPreview} alt="Profile" fill className="object-cover" />
                    ) : (
                        <Camera className={`w-6 h-6 ${fieldErrors.profilePic ? 'text-red-400' : 'text-gray-400'} group-hover:text-red-500 transition-colors`} />
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
                    <p className={`text-sm font-semibold ${fieldErrors.profilePic ? 'text-red-600' : 'text-gray-700'}`}>Profile Picture <span className="text-red-500">*</span></p>
                    <p className={`text-xs ${fieldErrors.profilePic ? 'text-red-500' : 'text-gray-400'}`}>{fieldErrors.profilePic ? 'Profile picture is required' : 'Click to upload your photo'}</p>
                </div>
            </div>
        </div>
    )

    // ─── INPUT COMPONENT ───
    const inputClass = "w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
    const inputErrorClass = "w-full h-11 px-4 rounded-lg bg-red-50 border border-red-400 text-sm text-gray-900 placeholder-red-300 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
    const fieldError = (field: string) => fieldErrors[field] ? <p className="text-xs text-red-500 mt-1 font-medium">Required</p> : null

    // ======================================
    // CLUB MASTER — Step 1: Owner Profile
    // ======================================
    if (role === 'CLUB_MASTER' && step === 'profile') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] mb-8 mt-8 md:my-0">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start md:justify-center">
                        <motion.div
                            key="cm-step-1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h2>

                            <div className="space-y-6">
                                {renderProfilePicture()}

                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold ${fieldErrors.name ? 'text-red-600' : 'text-gray-700'}`}>Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })) }}
                                        placeholder="Enter your full name"
                                        className={fieldErrors.name ? inputErrorClass : inputClass}
                                    />
                                    {fieldError('name')}
                                </div>

                                {/* Belt Rank & Gender - Side by Side */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.belt ? 'text-red-600' : 'text-gray-700'}`}>
                                            <Award className={`w-4 h-4 ${fieldErrors.belt ? 'text-red-500' : 'text-red-600'}`} /> Belt Rank <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalDropdown
                                            value={belt}
                                            onChange={(val: string) => { setBelt(val); setFieldErrors(prev => ({ ...prev, belt: false })) }}
                                            options={DAN_BELT_OPTIONS}
                                            label="Select Dan rank"
                                            fullWidth
                                        />
                                        {fieldError('belt')}
                                    </div>

                                    <div className="space-y-2">
                                        <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.gender ? 'text-red-600' : 'text-gray-700'}`}>
                                            <Users className={`w-4 h-4 ${fieldErrors.gender ? 'text-red-500' : 'text-red-600'}`} /> Gender <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalDropdown
                                            value={gender}
                                            onChange={(val: string) => { setGender(val); setFieldErrors(prev => ({ ...prev, gender: false })) }}
                                            options={GENDER_OPTIONS}
                                            label="Select gender"
                                            fullWidth
                                        />
                                        {fieldError('gender')}
                                    </div>
                                </div>

                                {/* Country */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.country ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Globe className={`w-4 h-4 ${fieldErrors.country ? 'text-red-500' : 'text-red-600'}`} /> Country <span className="text-red-500">*</span>
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

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={handleProfileNext}
                                        className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                        style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                    >
                                        Next: Club Details <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // ======================================
    // CLUB MASTER — Step 2: Club Details
    // ======================================
    if (role === 'CLUB_MASTER' && step === 'details') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] mb-8 mt-8 md:my-0">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start md:justify-center overflow-y-auto max-h-[85vh] md:max-h-none">
                        <motion.div
                            key="cm-step-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <button
                                type="button"
                                onClick={() => setStep('profile')}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Profile
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Club Details</h2>

                            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                                <div className="flex gap-6 items-start">
                                    {/* Club Logo */}
                                    <div className="flex-shrink-0">
                                        <label className={`text-sm font-semibold flex items-center gap-2 mb-2 ${fieldErrors.clubLogo ? 'text-red-600' : 'text-gray-700'}`}>
                                            <ImageIcon className={`w-4 h-4 ${fieldErrors.clubLogo ? 'text-red-500' : 'text-red-600'}`} /> Logo <span className="text-red-500">*</span>
                                        </label>
                                        <div
                                            onClick={() => { clubLogoInputRef.current?.click(); setFieldErrors(prev => ({ ...prev, clubLogo: false })) }}
                                            className={`relative w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed cursor-pointer transition-all overflow-hidden flex items-center justify-center group ${fieldErrors.clubLogo ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 hover:border-red-500'}`}
                                        >
                                            {clubLogoPreview ? (
                                                <Image src={clubLogoPreview} alt="Club Logo" fill className="object-contain p-3" />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className={`w-7 h-7 mx-auto mb-1 group-hover:text-red-500 transition-colors ${fieldErrors.clubLogo ? 'text-red-400' : 'text-gray-300'}`} />
                                                    <p className={`text-[10px] ${fieldErrors.clubLogo ? 'text-red-500' : 'text-gray-400'}`}>{fieldErrors.clubLogo ? 'Required' : 'Upload logo'}</p>
                                                </div>
                                            )}
                                            {clubLogoPreview && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            <input
                                                ref={clubLogoInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => { handleLogoChange(e, 'club'); setFieldErrors(prev => ({ ...prev, clubLogo: false })) }}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Club Name & Phone */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.clubName ? 'text-red-600' : 'text-gray-700'}`}>
                                                <Users className="w-4 h-4" style={{ color: fieldErrors.clubName ? '#EF4444' : (isKtm ? '#DC2626' : tenant.primaryColor) }} /> Club Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                value={newClubName}
                                                onChange={(e) => { setNewClubName(e.target.value); setFieldErrors(prev => ({ ...prev, clubName: false })) }}
                                                placeholder="e.g. Manila Taekwondo Center"
                                                className={fieldErrors.clubName ? inputErrorClass : inputClass}
                                            />
                                            {fieldError('clubName')}
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.clubPhone ? 'text-red-600' : 'text-gray-700'}`}>
                                                <Phone className={`w-4 h-4 ${fieldErrors.clubPhone ? 'text-red-500' : 'text-red-600'}`} /> Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                value={clubPhone}
                                                onChange={(e) => { setClubPhone(e.target.value); setFieldErrors(prev => ({ ...prev, clubPhone: false })) }}
                                                placeholder="e.g. 09171234567"
                                                className={fieldErrors.clubPhone ? inputErrorClass : inputClass}
                                            />
                                            {fieldError('clubPhone')}
                                        </div>
                                        {isKtm && (
                                            <div className="space-y-2">
                                                <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.organizationId ? 'text-red-600' : 'text-gray-700'}`}>
                                                    <Building2 className={`w-4 h-4 ${fieldErrors.organizationId ? 'text-red-500' : 'text-red-600'}`} /> Affiliated Organization <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        value={orgSearch}
                                                        onChange={(e) => { setOrgSearch(e.target.value); setFieldErrors(prev => ({ ...prev, organizationId: false })) }}
                                                        onFocus={() => { }}
                                                        placeholder="Search organizations..."
                                                        className={fieldErrors.organizationId ? inputErrorClass : inputClass}
                                                    />
                                                    {orgSearch && filteredOrgs.length > 0 && (
                                                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                            {filteredOrgs.map(org => (
                                                                <button
                                                                    key={org.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOrganizationId(org.id)
                                                                        setOrgSearch(org.name)
                                                                        setFieldErrors(prev => ({ ...prev, organizationId: false }))
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 transition-colors"
                                                                >
                                                                    {org.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {fieldError('organizationId')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Club Address - Full Width */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.clubAddress ? 'text-red-600' : 'text-gray-700'}`}>
                                        <MapPin className={`w-4 h-4 ${fieldErrors.clubAddress ? 'text-red-500' : 'text-red-600'}`} /> Club Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        value={clubAddress}
                                        onChange={(e) => { setClubAddress(e.target.value); setFieldErrors(prev => ({ ...prev, clubAddress: false })) }}
                                        placeholder="e.g. 123 Main St, Manila"
                                        className={fieldErrors.clubAddress ? inputErrorClass : inputClass}
                                    />
                                    {fieldError('clubAddress')}
                                </div>


                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    {paymentConfig && paymentFee > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const errors: Record<string, boolean> = {}
                                                if (!newClubName) errors.clubName = true
                                                if (isKtm && !organizationId) errors.organizationId = true
                                                if (!clubLogoFile && !clubLogoPreview) errors.clubLogo = true
                                                if (!clubAddress.trim()) errors.clubAddress = true
                                                if (!clubPhone.trim()) errors.clubPhone = true
                                                if (Object.keys(errors).length > 0) {
                                                    setFieldErrors(errors)
                                                    return
                                                }
                                                setPaymentStep(paymentConfig.paymentMethods?.length > 1 ? 1 : 2)
                                                setPaymentSelectedMethod(paymentConfig.paymentMethods?.length === 1 ? paymentConfig.paymentMethods[0] : null)
                                                setStep('payment')
                                            }}
                                            className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                            style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                        >
                                            Next: Affiliation Payment <ArrowRight className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                            style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>Complete Profile <ArrowRight className="w-5 h-5" /></>
                                            )}
                                        </button>
                                    )}
                                    <p className="text-center text-xs text-gray-400 mt-4">
                                        By clicking complete, you agree to our Terms of Service and Privacy Policy.
                                    </p>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // ======================================
    // CLUB MASTER — Step 3: Affiliation Payment
    // ======================================
    if (role === 'CLUB_MASTER' && step === 'payment') {
        const methods = paymentConfig?.paymentMethods || []
        const activeMethod = paymentSelectedMethod || (methods.length === 1 ? methods[0] : null)

        const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) {
                setProofFile(file)
                const reader = new FileReader()
                reader.onloadend = () => setProofPreview(reader.result as string)
                reader.readAsDataURL(file)
            }
        }

        const handleDownloadQR = async (url: string, label: string) => {
            try {
                const response = await fetch(url)
                const blob = await response.blob()
                const blobUrl = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = blobUrl
                a.download = `${label.replace(/\s+/g, '_')}_QR.png`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(blobUrl)
                toast.success('QR code downloaded!')
            } catch {
                toast.error('Failed to download QR code')
            }
        }

        const paymentStepLabels = ['Payment Method', 'Payment Details', 'Upload Proof']

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] mb-8 mt-8 md:my-0">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start overflow-y-auto max-h-[85vh] md:max-h-none">
                        <motion.div
                            key="cm-step-3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <button
                                type="button"
                                onClick={() => setStep('details')}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Club Details
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Affiliation Payment</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                ₱{paymentFee.toLocaleString()} annual fee to {paymentOrgName}
                            </p>

                            {/* Payment Step Indicator */}
                            <div className="flex items-center gap-1 mb-6">
                                {paymentStepLabels.map((label, i) => {
                                    const sNum = (i + 1) as 1 | 2 | 3
                                    const isCurrent = paymentStep === sNum
                                    const isDone = paymentStep > sNum
                                    return (
                                        <div key={i} className="flex items-center gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${isCurrent ? (isKtm ? 'bg-red-600' : '') + ' text-white' :
                                                        isDone ? 'bg-green-500 text-white' :
                                                            'bg-gray-100 text-gray-400'
                                                    }`} style={isCurrent && !isKtm ? { backgroundColor: tenant.primaryColor } : undefined}>
                                                    {isDone ? '✓' : sNum}
                                                </div>
                                                <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {label}
                                                </span>
                                            </div>
                                            {i < paymentStepLabels.length - 1 && (
                                                <div className={`h-px flex-1 mx-1 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Sub-step 1: Choose Payment Method */}
                            {paymentStep === 1 && (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">Select a payment method</p>
                                    {methods.map((pm: any) => (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => {
                                                setPaymentSelectedMethod(pm)
                                                setPaymentStep(2)
                                            }}
                                            className="w-full p-4 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50/30 transition-all text-left flex items-center gap-4 group"
                                        >
                                            {pm.qrCodeUrl ? (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 border flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                                                    <Image src={pm.qrCodeUrl} alt="" fill className="object-contain" unoptimized />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <Banknote className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900">{pm.label || pm.bankName}</p>
                                                {pm.accountName && <p className="text-xs text-gray-500">{pm.accountName}</p>}
                                                {pm.accountNo && <p className="text-xs text-gray-400 font-mono">{pm.accountNo}</p>}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 transition-colors" />
                                        </button>
                                    ))}

                                    {paymentConfig?.instructions && (
                                        <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                            <p className="font-medium mb-1">Instructions:</p>
                                            <p className="whitespace-pre-wrap">{paymentConfig.instructions}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Sub-step 2: Payment Details + QR */}
                            {paymentStep === 2 && activeMethod && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                                            {activeMethod.qrCodeUrl ? (
                                                <QrCode className="w-5 h-5 text-red-600" />
                                            ) : (
                                                <Banknote className="w-5 h-5 text-red-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{activeMethod.label || activeMethod.bankName}</p>
                                            <p className="text-xs text-gray-500">Send ₱{paymentFee.toLocaleString()} to this account</p>
                                        </div>
                                    </div>

                                    {activeMethod.qrCodeUrl && (
                                        <div className="text-center space-y-3">
                                            <p className="text-sm font-medium text-gray-700">Scan QR Code to Pay</p>
                                            <div className="relative mx-auto w-56 h-56 rounded-xl overflow-hidden border border-gray-200 bg-white">
                                                <Image src={activeMethod.qrCodeUrl} alt="Payment QR Code" fill className="object-contain p-2" unoptimized />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadQR(activeMethod.qrCodeUrl!, activeMethod.label || activeMethod.bankName)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download QR Code
                                            </button>
                                        </div>
                                    )}

                                    {activeMethod.bankName && (
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                                            <p className="font-medium text-gray-700">Bank Transfer Details</p>
                                            <div className="space-y-2 text-gray-600">
                                                <div className="flex justify-between">
                                                    <span>Bank</span>
                                                    <span className="font-medium text-gray-900">{activeMethod.bankName}</span>
                                                </div>
                                                {activeMethod.accountNo && (
                                                    <div className="flex justify-between">
                                                        <span>Account No.</span>
                                                        <span className="font-mono font-medium text-gray-900">{activeMethod.accountNo}</span>
                                                    </div>
                                                )}
                                                {activeMethod.accountName && (
                                                    <div className="flex justify-between">
                                                        <span>Account Name</span>
                                                        <span className="font-medium text-gray-900">{activeMethod.accountName}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                                    <span className="font-medium">Amount</span>
                                                    <span className="font-bold" style={{ color: isKtm ? '#DC2626' : tenant.primaryColor }}>₱{paymentFee.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {paymentConfig?.instructions && (
                                        <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                            <p className="font-medium mb-1">Instructions:</p>
                                            <p className="whitespace-pre-wrap">{paymentConfig.instructions}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {methods.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setPaymentStep(1)}
                                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setPaymentStep(3)}
                                            className={`flex-1 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${isKtm ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                            style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                        >
                                            I&apos;ve Paid <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sub-step 3: Upload Proof */}
                            {paymentStep === 3 && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Upload className="w-7 h-7 text-green-600" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">Upload Proof of Payment</p>
                                        <p className="text-xs text-gray-500 mt-1">Upload a screenshot or photo of your payment receipt</p>
                                    </div>

                                    {proofPreview ? (
                                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                            <div className="relative w-full h-48">
                                                <Image src={proofPreview} alt="Proof of payment" fill className="object-contain" unoptimized />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => proofInputRef.current?.click()}
                                                className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-lg shadow text-xs text-gray-600 hover:bg-white"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => proofInputRef.current?.click()}
                                            className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-red-400 hover:bg-red-50/30 transition-all cursor-pointer group"
                                        >
                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
                                            <span className="text-sm text-gray-500">Click to upload receipt</span>
                                            <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                                        </button>
                                    )}

                                    <input
                                        ref={proofInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProofChange}
                                        className="hidden"
                                    />

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentStep(2)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                if (!proofFile) {
                                                    toast.error('Please upload proof of payment')
                                                    return
                                                }
                                                handleSubmit(e as any)
                                            }}
                                            disabled={!proofFile || isSubmitting}
                                            className={`flex-1 px-4 py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${isKtm ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}`}
                                        >
                                            {isSubmitting ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                            ) : (
                                                <><CheckCircle className="w-4 h-4" /> Complete Profile</>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-center text-xs text-gray-400">
                                        Your proof will be reviewed by {paymentOrgName}. Your club will be activated once approved.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // ======================================
    // ORGANIZER — Step 1: Owner Profile
    // ======================================
    if (role === 'ORGANIZER' && step === 'profile') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] mb-8 mt-8 md:my-0">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start md:justify-center">
                        <motion.div
                            key="org-step-1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h2>

                            <div className="space-y-6">
                                {renderProfilePicture()}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={handleProfileNext}
                                        className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                        style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                    >
                                        Next: Organization Details <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // ======================================
    // ORGANIZER — Step 2: Org Details
    // ======================================
    if (role === 'ORGANIZER' && step === 'details') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] mb-8 mt-8 md:my-0">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start md:justify-center overflow-y-auto max-h-[85vh] md:max-h-none">
                        <motion.div
                            key="org-step-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <button
                                type="button"
                                onClick={() => setStep('profile')}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Profile
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Organization Details</h2>

                            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                                <div className="flex gap-6 items-start">
                                    {/* Org Logo */}
                                    <div className="flex-shrink-0">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-4 h-4 text-red-600" /> Logo
                                        </label>
                                        <div
                                            onClick={() => orgLogoInputRef.current?.click()}
                                            className="relative w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-red-500 cursor-pointer transition-all overflow-hidden flex items-center justify-center group"
                                        >
                                            {orgLogoPreview ? (
                                                <Image src={orgLogoPreview} alt="Org Logo" fill className="object-contain p-3" />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="w-7 h-7 text-gray-300 mx-auto mb-1 group-hover:text-red-500 transition-colors" />
                                                    <p className="text-[10px] text-gray-400">Upload logo</p>
                                                </div>
                                            )}
                                            {orgLogoPreview && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            <input
                                                ref={orgLogoInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleLogoChange(e, 'org')}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Org Name & Established Date */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-red-600" /> Organization Name
                                            </label>
                                            <input
                                                value={orgName}
                                                onChange={(e) => setOrgName(e.target.value)}
                                                placeholder="e.g. Philippine Taekwondo Association"
                                                required
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-red-600" /> Established Date
                                            </label>
                                            <GlobalCalendar
                                                label=""
                                                value={establishedDate ? new Date(establishedDate) : undefined}
                                                onChange={(date: Date) => setEstablishedDate(format(date, 'yyyy-MM-dd'))}
                                                placeholder="Select date"
                                                fullWidth
                                                maxDate={new Date()}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                        style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Complete Profile <ArrowRight className="w-5 h-5" /></>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-4">
                                        By clicking complete, you agree to our Terms of Service and Privacy Policy.
                                    </p>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        )
    }

    // ======================================
    // ATHLETE — Single Page
    // ======================================
    return (
        <div className="min-h-screen flex items-start md:items-center justify-center bg-gray-50 p-4 overflow-y-auto">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] my-8 md:my-0">
                {renderSidebar()}

                <div className="md:w-7/12 p-6 md:p-10 flex flex-col justify-start md:justify-center overflow-y-auto max-h-[85vh] md:max-h-[90vh]">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Athlete Details</h2>

                        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                            {renderProfilePicture()}

                            <div className="grid md:grid-cols-2 gap-5">
                                {/* Full Name */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className={`text-sm font-semibold ${fieldErrors.name ? 'text-red-600' : 'text-gray-700'}`}>Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: false })) }}
                                        placeholder="Enter your full name"
                                        className={fieldErrors.name ? inputErrorClass : inputClass}
                                    />
                                    {fieldError('name')}
                                </div>

                                {/* Date of Birth */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.birthDate ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Calendar className={`w-4 h-4 ${fieldErrors.birthDate ? 'text-red-500' : 'text-red-600'}`} /> Date of Birth <span className="text-red-500">*</span>
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

                                {/* Gender */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold ${fieldErrors.gender ? 'text-red-600' : 'text-gray-700'}`}>Gender <span className="text-red-500">*</span></label>
                                    <GlobalDropdown
                                        options={GENDER_OPTIONS}
                                        value={gender}
                                        onChange={(val: string) => { setGender(val); setFieldErrors(prev => ({ ...prev, gender: false })) }}
                                        fullWidth
                                    />
                                    {fieldError('gender')}
                                </div>

                                {/* Weight */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.weight ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Weight className={`w-4 h-4 ${fieldErrors.weight ? 'text-red-500' : 'text-red-600'}`} /> Weight (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={weight}
                                        onChange={(e) => { setWeight(e.target.value); setFieldErrors(prev => ({ ...prev, weight: false })) }}
                                        placeholder="e.g. 60"
                                        className={fieldErrors.weight ? inputErrorClass : inputClass}
                                    />
                                    {fieldError('weight')}
                                </div>

                                {/* Height */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.height ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Ruler className={`w-4 h-4 ${fieldErrors.height ? 'text-red-500' : 'text-red-600'}`} /> Height (cm) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => { setHeight(e.target.value); setFieldErrors(prev => ({ ...prev, height: false })) }}
                                        placeholder="e.g. 170"
                                        className={fieldErrors.height ? inputErrorClass : inputClass}
                                    />
                                    {fieldError('height')}
                                </div>

                                {/* Belt Rank */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.belt ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Award className={`w-4 h-4 ${fieldErrors.belt ? 'text-red-500' : 'text-red-600'}`} /> Belt Rank <span className="text-red-500">*</span>
                                    </label>
                                    <GlobalDropdown
                                        options={BELT_OPTIONS}
                                        value={belt}
                                        onChange={(val: string) => { setBelt(val); setFieldErrors(prev => ({ ...prev, belt: false })) }}
                                        fullWidth
                                        searchable
                                    />
                                    {fieldError('belt')}
                                </div>

                                {/* Country */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.country ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Globe className={`w-4 h-4 ${fieldErrors.country ? 'text-red-500' : 'text-red-600'}`} /> Country <span className="text-red-500">*</span>
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

                                {/* Affiliated Club */}
                                <div className="space-y-2">
                                    <label className={`text-sm font-semibold flex items-center gap-2 ${fieldErrors.clubName ? 'text-red-600' : 'text-gray-700'}`}>
                                        <Users className={`w-4 h-4 ${fieldErrors.clubName ? 'text-red-500' : 'text-red-600'}`} /> Affiliated Club <span className="text-red-500">*</span>
                                    </label>
                                    <GlobalDropdown
                                        options={(() => {
                                            const clubOptions = clubs.map(c => ({ value: c.name, label: c.name }))
                                            if (clubName && !clubOptions.some(o => o.value === clubName)) {
                                                clubOptions.unshift({ value: clubName, label: clubName })
                                            }
                                            return clubOptions
                                        })()}
                                        value={clubName}
                                        onChange={(val: string) => { setClubName(val); setFieldErrors(prev => ({ ...prev, clubName: false })) }}
                                        fullWidth
                                        searchable
                                    />
                                    {fieldError('clubName')}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className={`w-full h-12 text-white font-bold text-lg rounded-lg shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isKtm ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : ''}`}
                                    style={!isKtm ? { backgroundColor: tenant.primaryColor } : undefined}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>Complete Profile <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    By clicking complete, you agree to our Terms of Service and Privacy Policy.
                                </p>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
