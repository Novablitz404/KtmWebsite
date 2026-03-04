'use client'

import { completeOnboarding, checkEmailAvailability, getExistingProfile } from '@/app/actions'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useTenant } from '@/app/providers/TenantProvider'
import { toast } from 'sonner'
import { Camera, ArrowRight, ArrowLeft, CheckCircle, Loader2, Ruler, Weight, Users, Building2, Award, Calendar, ImageIcon, Globe, MapPin, Phone } from 'lucide-react'
import Image from 'next/image'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { COUNTRIES } from '@/lib/countries'

type OnboardingStep = 'profile' | 'details'

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
    const { user, isLoaded } = useUser()
    const router = useRouter()
    const tenant = useTenant()
    const isKtm = tenant.slug === 'ktm'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<OnboardingStep>('profile')
    const [roleLoaded, setRoleLoaded] = useState(false)
    const [error, setError] = useState('')

    // Role from Clerk metadata
    const role = (user?.publicMetadata as any)?.role as string | null

    // Force-refresh Clerk session if role metadata hasn't propagated yet
    useEffect(() => {
        if (!isLoaded || !user) return

        if (role) {
            setRoleLoaded(true)
            return
        }

        let attempts = 0
        const maxAttempts = 10
        const interval = setInterval(async () => {
            attempts++
            try {
                await user.reload()
                const refreshedRole = (user.publicMetadata as any)?.role
                if (refreshedRole) {
                    setRoleLoaded(true)
                    clearInterval(interval)
                }
            } catch (e) {
                console.error('Failed to reload user:', e)
            }
            if (attempts >= maxAttempts) {
                clearInterval(interval)
                setRoleLoaded(true)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [isLoaded, user, role])

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

    // Organizer-specific
    const [orgName, setOrgName] = useState('')
    const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null)
    const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
    const [establishedDate, setEstablishedDate] = useState('')
    const orgLogoInputRef = useRef<HTMLInputElement>(null)

    // Pre-fill existing data from Clerk + DB
    useEffect(() => {
        if (!isLoaded || !user) return
        // Only pre-fill name if Clerk has a real name (not auto-derived from email)
        const clerkName = user.fullName || user.firstName || ''
        const email = user.emailAddresses?.[0]?.emailAddress || ''
        const emailPrefix = email.split('@')[0] || ''
        // Skip if the name looks like an email prefix (contains + or @ or matches email prefix)
        const isEmailDerived = clerkName && (
            clerkName.includes('+') ||
            clerkName.includes('@') ||
            clerkName.toLowerCase() === emailPrefix.toLowerCase()
        )
        setName(isEmailDerived ? '' : clerkName)
        if (user.imageUrl) setImgPreview(user.imageUrl)

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
    }, [isLoaded, user])

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

    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(clubSearch.toLowerCase())
    )

    const filteredOrgs = organizations.filter(o =>
        o.name.toLowerCase().includes(orgSearch.toLowerCase())
    )

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImgPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'club' | 'org') => {
        const file = e.target.files?.[0]
        if (file) {
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

    const hasTwoSteps = role === 'CLUB_MASTER' || role === 'ORGANIZER'

    const handleProfileNext = () => {
        setError('')
        if (!user?.hasImage && !selectedFile) {
            setError('Please upload a profile picture')
            return
        }
        if (!name.trim()) {
            setError('Please enter your full name')
            return
        }
        setStep('details')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setError('')

        if (!user.hasImage && !selectedFile) {
            setError('Please upload a profile picture')
            return
        }
        if (!name.trim()) {
            setError('Please enter your full name')
            return
        }

        if (role === 'ATHLETE') {
            if (!weight || !height || !belt || !birthDate || !gender || !clubName) {
                setError('Please fill in all required fields')
                return
            }
        } else if (role === 'CLUB_MASTER') {
            if (!newClubName || (!organizationId && isKtm)) {
                setError('Please fill in club name' + (isKtm ? ' and select an organization' : ''))
                return
            }
            if (!clubLogoFile) {
                setError('Please upload a club logo')
                return
            }
            if (!clubAddress.trim()) {
                setError('Please enter the club address')
                return
            }
            if (!clubPhone.trim()) {
                setError('Please enter a contact phone number')
                return
            }
        } else if (role === 'ORGANIZER') {
            if (!orgName || !establishedDate) {
                setError('Please fill in organization name and established date')
                return
            }
        }

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
            window.location.href = '/'

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Something went wrong')
            setIsSubmitting(false)
        }
    }

    // ─── LOADING STATE ───
    if (!isLoaded || !roleLoaded) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: isKtm ? '#DC2626' : tenant.primaryColor }} />
            <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
    )

    // ─── SIDEBAR ───
    const renderSidebar = () => {
        const isClubMaster = role === 'CLUB_MASTER'
        const isOrganizer = role === 'ORGANIZER'

        const steps = isClubMaster
            ? [
                { label: 'Account Created', done: true },
                { label: 'Your Profile', done: step === 'details', active: step === 'profile' },
                { label: 'Club Details', done: false, active: step === 'details' },
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
        <div className="flex items-center gap-6">
            <div
                onClick={() => profileInputRef.current?.click()}
                className={`relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 cursor-pointer transition-all overflow-hidden flex items-center justify-center group flex-shrink-0 ${isKtm ? 'hover:border-red-500' : ''}`}
                style={!isKtm ? { ['--hover-color' as any]: tenant.primaryColor } : undefined}
            >
                {imgPreview ? (
                    <Image src={imgPreview} alt="Profile" fill className="object-cover" />
                ) : (
                    <Camera className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
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
                    onChange={handleImageChange}
                    className="hidden"
                />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-700">Profile Picture</p>
                <p className="text-xs text-gray-400">Click to upload your photo</p>
            </div>
        </div>
    )

    // ─── INPUT COMPONENT ───
    const inputClass = "w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"

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
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {/* Belt Rank & Gender - Side by Side */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Award className="w-4 h-4 text-red-600" /> Belt Rank
                                        </label>
                                        <GlobalDropdown
                                            value={belt}
                                            onChange={setBelt}
                                            options={DAN_BELT_OPTIONS}
                                            label="Select Dan rank"
                                            fullWidth
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-red-600" /> Gender
                                        </label>
                                        <GlobalDropdown
                                            value={gender}
                                            onChange={setGender}
                                            options={GENDER_OPTIONS}
                                            label="Select gender"
                                            fullWidth
                                        />
                                    </div>
                                </div>

                                {/* Country */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-red-600" /> Country
                                    </label>
                                    <GlobalDropdown
                                        options={COUNTRIES}
                                        value={country}
                                        onChange={(val: string) => setCountry(val)}
                                        fullWidth
                                        searchable
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

                            <form className="space-y-6" onSubmit={handleSubmit}>
                                <div className="flex gap-6 items-start">
                                    {/* Club Logo */}
                                    <div className="flex-shrink-0">
                                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                            <ImageIcon className="w-4 h-4 text-red-600" /> Logo
                                        </label>
                                        <div
                                            onClick={() => clubLogoInputRef.current?.click()}
                                            className="relative w-32 h-32 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-red-500 cursor-pointer transition-all overflow-hidden flex items-center justify-center group"
                                        >
                                            {clubLogoPreview ? (
                                                <Image src={clubLogoPreview} alt="Club Logo" fill className="object-contain p-3" />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className="w-7 h-7 text-gray-300 mx-auto mb-1 group-hover:text-red-500 transition-colors" />
                                                    <p className="text-[10px] text-gray-400">Upload logo</p>
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
                                                onChange={(e) => handleLogoChange(e, 'club')}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Club Name & Phone */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Users className="w-4 h-4" style={{ color: isKtm ? '#DC2626' : tenant.primaryColor }} /> Club Name
                                            </label>
                                            <input
                                                value={newClubName}
                                                onChange={(e) => setNewClubName(e.target.value)}
                                                placeholder="e.g. Manila Taekwondo Center"
                                                required
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-red-600" /> Phone Number
                                            </label>
                                            <input
                                                value={clubPhone}
                                                onChange={(e) => setClubPhone(e.target.value)}
                                                placeholder="e.g. 09171234567"
                                                required
                                                className={inputClass}
                                            />
                                        </div>
                                        {isKtm && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-red-600" /> Affiliated Organization
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        value={orgSearch}
                                                        onChange={(e) => setOrgSearch(e.target.value)}
                                                        onFocus={() => { }}
                                                        placeholder="Search organizations..."
                                                        className={inputClass}
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
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 transition-colors"
                                                                >
                                                                    {org.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Club Address - Full Width */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-red-600" /> Club Address
                                    </label>
                                    <input
                                        value={clubAddress}
                                        onChange={(e) => setClubAddress(e.target.value)}
                                        placeholder="e.g. 123 Main St, Manila"
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

                            <form className="space-y-6" onSubmit={handleSubmit}>
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

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {renderProfilePicture()}

                            <div className="grid md:grid-cols-2 gap-5">
                                {/* Full Name */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {/* Date of Birth */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-red-600" /> Date of Birth
                                    </label>
                                    <GlobalCalendar
                                        label=""
                                        value={birthDate ? new Date(birthDate) : undefined}
                                        onChange={(date: Date) => setBirthDate(format(date, 'yyyy-MM-dd'))}
                                        placeholder="Select date"
                                        fullWidth
                                        maxDate={new Date()}
                                    />
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Gender</label>
                                    <GlobalDropdown
                                        options={GENDER_OPTIONS}
                                        value={gender}
                                        onChange={(val: string) => setGender(val)}
                                        fullWidth
                                    />
                                </div>

                                {/* Weight */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Weight className="w-4 h-4 text-red-600" /> Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="e.g. 60"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {/* Height */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Ruler className="w-4 h-4 text-red-600" /> Height (cm)
                                    </label>
                                    <input
                                        type="number"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder="e.g. 170"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                {/* Belt Rank */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Award className="w-4 h-4 text-red-600" /> Belt Rank
                                    </label>
                                    <GlobalDropdown
                                        options={BELT_OPTIONS}
                                        value={belt}
                                        onChange={(val: string) => setBelt(val)}
                                        fullWidth
                                        searchable
                                    />
                                </div>

                                {/* Country */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-red-600" /> Country
                                    </label>
                                    <GlobalDropdown
                                        options={COUNTRIES}
                                        value={country}
                                        onChange={(val: string) => setCountry(val)}
                                        fullWidth
                                        searchable
                                    />
                                </div>

                                {/* Affiliated Club */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-red-600" /> Affiliated Club
                                    </label>
                                    <GlobalDropdown
                                        options={(() => {
                                            const clubOptions = clubs.map(c => ({ value: c.name, label: c.name }))
                                            // Ensure pre-filled club is always available as an option
                                            if (clubName && !clubOptions.some(o => o.value === clubName)) {
                                                clubOptions.unshift({ value: clubName, label: clubName })
                                            }
                                            return clubOptions
                                        })()}
                                        value={clubName}
                                        onChange={(val: string) => setClubName(val)}
                                        fullWidth
                                        searchable
                                    />
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
