'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/actions'
import CustomSelect from '@/app/components/ui/CustomSelect'
import LoadingButton from '@/components/ui/LoadingButton'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProfileEditFormProps {
    user: {
        id: string
        name: string | null
        email: string
        clubName: string | null
        belt: string | null
        gender: string | null
        weight: number | null
        height: number | null
        birthDate: Date | null
        role: string
    }
    initialImageUrl?: string
    onCancel?: () => void
    redirectOnSuccess?: string
    onSuccess?: () => void
}

export default function ProfileEditForm({ user, initialImageUrl, onCancel, redirectOnSuccess, onSuccess }: ProfileEditFormProps) {
    const [saving, setSaving] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(initialImageUrl || null)
    const router = useRouter()

    // Controlled state for custom selects
    const [belt, setBelt] = useState(user.belt || 'Black')
    const [gender, setGender] = useState(user.gender || 'Male')

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Format date for input field
    const formatDateForInput = (date: Date | null) => {
        if (!date) return ''
        return new Date(date).toISOString().split('T')[0]
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setPreviewImage(objectUrl)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setSaving(true)

        formData.set('userId', user.id)
        try {
            await updateProfile(formData)
            toast.success('Profile updated successfully!')

            if (redirectOnSuccess) {
                router.push(redirectOnSuccess)
            }
            if (onSuccess) {
                onSuccess()
            }
            if (onCancel && !onSuccess && !redirectOnSuccess) {
                // Only auto-cancel if no other success handler is present
                onCancel()
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update profile.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
                        {previewImage ? (
                            <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-4xl">👤</div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">Change</span>
                        </div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-white rounded-full p-1.5 shadow-md text-orange-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </div>
                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                />
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={user.name || ''}
                        required
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Birth Date</label>
                    <input
                        type="date"
                        name="birthDate"
                        defaultValue={formatDateForInput(user.birthDate)}
                        required
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Club</label>
                    <input
                        type="text"
                        name="clubName"
                        defaultValue={user.clubName || ''}
                        required
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <CustomSelect
                            label="Belt"
                            name="belt"
                            value={belt}
                            onChange={setBelt}
                            options={['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black']}
                        />
                    </div>
                    <div>
                        <CustomSelect
                            label="Gender"
                            name="gender"
                            value={gender}
                            onChange={setGender}
                            options={['Male', 'Female']}
                        />
                    </div>
                </div>

                {user.role === 'ATHLETE' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                            <input
                                type="number"
                                name="weight"
                                step="0.1"
                                defaultValue={user.weight || ''}
                                placeholder="58.5"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Height (cm)</label>
                            <input
                                type="number"
                                name="height"
                                step="0.1"
                                defaultValue={user.height || ''}
                                placeholder="175"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 pb-8">
                <LoadingButton
                    type="submit"
                    isLoading={saving}
                    loadingText="Saving..."
                    variant="warning"
                    className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-600 border-0 hover:opacity-90 shadow-lg shadow-orange-500/20 rounded-xl"
                >
                    Save Changes
                </LoadingButton>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full mt-2 py-2 text-xs text-gray-500 font-medium hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    )
}
