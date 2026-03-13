'use client'

import { compressImage } from '@/lib/compress-image'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { X, UserPlus, Loader2, Check, Camera, Hash } from 'lucide-react'
import { toast } from 'sonner'
import { createClubMember, uploadMemberAvatar } from '@/app/club/actions'
import { useQueryClient } from '@tanstack/react-query'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { useScrollLock } from '@/hooks/useScrollLock'

interface CreateMemberModalProps {
    isOpen: boolean
    onClose: () => void
}

const BELT_OPTIONS = [
    'White',
    'Yellow',
    'Orange',
    'Green',
    'Purple',
    'Blue',
    'Red',
    'Maroon',
    'Brown',
    'Black',
]

const GENDER_OPTIONS = ['Male', 'Female']

export default function CreateMemberModal({ isOpen, onClose }: CreateMemberModalProps) {
    useScrollLock(isOpen)

    const [submitting, setSubmitting] = useState(false)
    const [successData, setSuccessData] = useState<{ email?: string } | null>(null)
    const queryClient = useQueryClient()

    // Form state
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [gender, setGender] = useState('')
    const [belt, setBelt] = useState('')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [athleteNumber, setAthleteNumber] = useState('')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    const resetForm = () => {
        setEmail('')
        setName('')
        setGender('')
        setBelt('')
        setWeight('')
        setHeight('')
        setBirthDate('')
        setAthleteNumber('')
        setAvatarFile(null)
        setAvatarPreview(null)
        setSuccessData(null)
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('File must be an image')
            return
        }
        try {
            const compressed = await compressImage(file, { maxDimension: 800, quality: 0.8 })
            setAvatarFile(compressed)
            setAvatarPreview(URL.createObjectURL(compressed))
        } catch {
            toast.error('Failed to process image')
        }
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) {
            toast.error('Name is required')
            return
        }

        setSubmitting(true)
        try {
            const result = await createClubMember({
                email: email || undefined,
                name,
                gender: gender || undefined,
                belt: belt || undefined,
                weight: weight ? parseFloat(weight) : undefined,
                height: height ? parseFloat(height) : undefined,
                birthDate: birthDate ? new Date(birthDate) : undefined,
                athleteNumber: athleteNumber || undefined,
            })

            if ('error' in result) {
                toast.error(result.error)
            } else if (result.success && result.member) {
                // Upload avatar if provided
                if (avatarFile) {
                    try {
                        const formData = new FormData()
                        formData.append('avatar', avatarFile)
                        formData.append('memberId', result.member.id)
                        await uploadMemberAvatar(formData)
                    } catch (err) {
                        console.error('Avatar upload failed:', err)
                        // Don't fail the whole operation
                    }
                }
                setSuccessData({ email: email || undefined })
                toast.success('Member added successfully!')
                queryClient.invalidateQueries({ queryKey: ['club-members'] })
                queryClient.invalidateQueries({ queryKey: ['club-dashboard'] })
            }
        } catch (error) {
            toast.error('Failed to create member')
        } finally {
            setSubmitting(false)
        }
    }


    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Create Member</h2>
                            <p className="text-xs text-gray-500">Add a new athlete to your club</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {successData ? (
                        // Success State - Ghost account created
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">Member Added!</h3>
                                <p className="text-sm text-gray-500 mt-1">Their profile is now in your club roster</p>
                            </div>

                            {successData.email ? (
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        <strong>{name || successData.email}</strong> can now sign up at the website using the email <strong>{successData.email}</strong> and their account will be automatically linked to your club.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <p className="text-sm text-gray-700">
                                        <strong>{name}</strong> has been added to your roster. You can register them for events directly. If they later create an account, you can update their email to link the profiles.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        // Form State — Two Column Layout
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Profile Picture — Centered */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 hover:border-red-400 flex items-center justify-center transition-all overflow-hidden bg-gray-50 hover:bg-red-50 group"
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
                                        )}
                                    </button>
                                    {avatarPreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    )}
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            <p className="text-[11px] text-center text-gray-400 -mt-3">Tap to add photo</p>

                            {/* Two Column Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Juan Dela Cruz"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Email <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="athlete@example.com"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                    />
                                </div>

                                {/* Gender */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Gender
                                    </label>
                                    <GlobalDropdown
                                        label="Select..."
                                        value={gender}
                                        onChange={setGender}
                                        options={GENDER_OPTIONS.map(g => ({ label: g, value: g }))}
                                        fullWidth
                                        className="w-full"
                                    />
                                </div>

                                {/* Belt */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Belt
                                    </label>
                                    <GlobalDropdown
                                        label="Select..."
                                        value={belt}
                                        onChange={setBelt}
                                        options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                        fullWidth
                                        className="w-full"
                                    />
                                </div>

                                {/* Weight */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="50.0"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                    />
                                </div>

                                {/* Height */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Height (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        placeholder="150.0"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                    />
                                </div>

                                {/* Birth Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Birth Date</label>
                                    <GlobalCalendar
                                        value={birthDate}
                                        onChange={(date: Date) => setBirthDate(format(date, 'yyyy-MM-dd'))}
                                        placeholder="Select birth date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                </div>

                                {/* Athlete Number */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Hash className="w-3.5 h-3.5" /> Athlete No. <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={athleteNumber}
                                        onChange={(e) => setAthleteNumber(e.target.value)}
                                        placeholder="e.g. 12345678"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {/* Submit — Full Width */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5" />
                                        Create Member
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
