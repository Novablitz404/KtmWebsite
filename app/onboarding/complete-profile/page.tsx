'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Camera, ArrowRight, ArrowLeft, CheckCircle, Loader2, Ruler, Weight, Users, Building2, Award, Calendar, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

type OnboardingStep = 'profile' | 'details'

const BELT_OPTIONS = [
    'White', 'Low Yellow', 'High Yellow', 'Low Blue', 'High Blue',
    'Low Red', 'High Red', 'Low Brown', 'High Brown', 'Black'
]

const GENDER_OPTIONS = ['Male', 'Female']

export default function CompleteProfilePage() {
    const { user, isLoaded } = useUser()
    const router = useRouter()
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
    const [clubSearch, setClubSearch] = useState('')
    const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])

    // Club Master-specific
    const [newClubName, setNewClubName] = useState('')
    const [clubLogoFile, setClubLogoFile] = useState<File | null>(null)
    const [clubLogoPreview, setClubLogoPreview] = useState<string | null>(null)
    const [organizationId, setOrganizationId] = useState('')
    const [orgSearch, setOrgSearch] = useState('')
    const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([])
    const clubLogoInputRef = useRef<HTMLInputElement>(null)

    // Organizer-specific
    const [orgName, setOrgName] = useState('')
    const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null)
    const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null)
    const [establishedDate, setEstablishedDate] = useState('')
    const orgLogoInputRef = useRef<HTMLInputElement>(null)

    // Pre-fill existing data
    useEffect(() => {
        if (!isLoaded || !user) return
        setName(user.fullName || user.firstName || '')
        if (user.imageUrl) setImgPreview(user.imageUrl)
    }, [isLoaded, user])

    // Fetch clubs for athlete dropdown
    useEffect(() => {
        if (role === 'ATHLETE') {
            fetch('/api/clubs')
                .then(res => res.json())
                .then(data => setClubs(data))
                .catch(() => { })
        }
    }, [role])

    // Fetch organizations for club master dropdown
    useEffect(() => {
        if (role === 'CLUB_MASTER') {
            fetch('/api/organizations')
                .then(res => res.json())
                .then(data => setOrganizations(data))
                .catch(() => { })
        }
    }, [role])

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
            if (!newClubName || !organizationId) {
                setError('Please fill in club name and select an organization')
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
            } else if (role === 'CLUB_MASTER') {
                submitData.append('clubName', newClubName)
                submitData.append('organizationId', organizationId)
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
                const err = await res.json()
                throw new Error(err.message || 'Failed to complete profile')
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
            <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
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
            <div className="md:w-5/12 relative bg-red-600 text-white flex flex-col justify-between p-10">
                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-3xl font-black mb-4">Welcome!</h1>
                        <p className="text-red-100 font-medium leading-relaxed">
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
                        <div key={i} className={`flex items-center gap-3 text-sm ${s.done ? 'font-medium text-red-100' : s.active ? 'font-bold text-white' : 'font-medium text-red-100 opacity-60'
                            }`}>
                            {s.done ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                                <div className={`w-5 h-5 rounded-full border-2 ${s.active ? 'border-white' : 'border-red-200'} flex items-center justify-center text-[10px]`}>
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
                className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-red-500 cursor-pointer transition-all overflow-hidden flex items-center justify-center group flex-shrink-0"
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
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-10 flex flex-col justify-center">
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

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={handleProfileNext}
                                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-10 flex flex-col justify-center">
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

                                    {/* Club Name & Organization */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-red-600" /> Club Name
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
                                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-10 flex flex-col justify-center">
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
                                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
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
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    {renderSidebar()}

                    <div className="md:w-7/12 p-10 flex flex-col justify-center">
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
                                        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {renderSidebar()}

                <div className="md:w-7/12 p-10 flex flex-col justify-center overflow-y-auto max-h-[90vh]">
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

                                {/* Affiliated Club */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-red-600" /> Affiliated Club
                                    </label>
                                    <GlobalDropdown
                                        options={clubs.map(c => ({ value: c.name, label: c.name }))}
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
                                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
