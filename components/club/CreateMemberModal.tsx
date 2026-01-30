'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClubMember } from '@/app/club/actions'
import { useQueryClient } from '@tanstack/react-query'
import CustomSelect from '@/app/components/ui/CustomSelect'

interface CreateMemberModalProps {
    isOpen: boolean
    onClose: () => void
}

const BELT_OPTIONS = [
    'White',
    'Yellow',
    'Yellow - Green',
    'Green',
    'Green - Blue',
    'Blue',
    'Blue - Red',
    'Red',
    'Red - Black (Poom)',
    'Black 1st Dan',
    'Black 2nd Dan',
    'Black 3rd Dan',
    'Black 4th Dan',
    'Black 5th Dan',
]

const GENDER_OPTIONS = ['Male', 'Female']

export default function CreateMemberModal({ isOpen, onClose }: CreateMemberModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [successData, setSuccessData] = useState<{ email: string } | null>(null)
    const queryClient = useQueryClient()

    // Form state
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [gender, setGender] = useState('')
    const [belt, setBelt] = useState('')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [birthDate, setBirthDate] = useState('')

    const resetForm = () => {
        setEmail('')
        setName('')
        setGender('')
        setBelt('')
        setWeight('')
        setHeight('')
        setBirthDate('')
        setSuccessData(null)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !name) {
            toast.error('Email and Name are required')
            return
        }

        setSubmitting(true)
        try {
            const result = await createClubMember({
                email,
                name,
                gender: gender || undefined,
                belt: belt || undefined,
                weight: weight ? parseFloat(weight) : undefined,
                height: height ? parseFloat(height) : undefined,
                birthDate: birthDate ? new Date(birthDate) : undefined,
            })

            if ('error' in result) {
                toast.error(result.error)
            } else if (result.success) {
                // Ghost account created - member will claim on sign-up
                setSuccessData({ email })
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <strong>{name || successData.email}</strong> can now sign up at the website using the email <strong>{successData.email}</strong> and their account will be automatically linked to your club.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        // Form State
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="athlete@example.com"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                    required
                                />
                            </div>

                            {/* Name */}
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

                            {/* Gender & Belt Row - Using CustomSelect */}
                            <div className="grid grid-cols-2 gap-3">
                                <CustomSelect
                                    label="Gender"
                                    value={gender}
                                    onChange={setGender}
                                    options={GENDER_OPTIONS}
                                    placeholder="Select..."
                                />
                                <CustomSelect
                                    label="Belt"
                                    value={belt}
                                    onChange={setBelt}
                                    options={BELT_OPTIONS}
                                    placeholder="Select..."
                                />
                            </div>

                            {/* Weight & Height Row */}
                            <div className="grid grid-cols-2 gap-3">
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
                            </div>

                            {/* Birth Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Birth Date</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                />
                            </div>

                            {/* Submit */}
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
