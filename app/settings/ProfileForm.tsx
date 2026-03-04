'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/actions'
import GlobalDropdown from '@/components/GlobalDropdown'
import LoadingButton from '@/components/ui/LoadingButton'
import GlobalCalendar from '@/components/GlobalCalendar'
import { toast } from 'sonner'

interface ProfileFormProps {
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
    customTrigger?: React.ReactNode
}

export default function ProfileForm({ user, initialImageUrl, customTrigger }: ProfileFormProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(initialImageUrl || null)

    // Controlled state for custom selects
    const [belt, setBelt] = useState(user.belt || 'Black')
    const [gender, setGender] = useState(user.gender || 'Male')
    const [birthDate, setBirthDate] = useState<Date | undefined>(user.birthDate ? new Date(user.birthDate) : undefined)

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
            setIsEditing(false)

            // Clean up old object URL if it exists
            if (previewImage && previewImage !== initialImageUrl && previewImage.startsWith('blob:')) {
                // We keep the preview until page refresh or revalidation, relies on next/cache revalidation
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to update profile.')
        } finally {
            setSaving(false)
        }
    }

    if (!isEditing) {
        if (customTrigger) {
            return (
                <div onClick={() => setIsEditing(true)} className="cursor-pointer">
                    {customTrigger}
                </div>
            )
        }
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all text-sm font-medium border border-gray-200"
            >
                <span>Edit Profile</span>
            </button>
        )
    }

    return (
        <>
            <button
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all text-sm font-medium border border-gray-200"
            >
                <span>Edit Profile</span>
            </button>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-6">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            handleSubmit(formData)
                        }} className="space-y-6">

                            {/* Profile Image Upload */}
                            <div className="flex flex-col items-center">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-sm relative">
                                        {previewImage ? (
                                            <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl">👤</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-semibold">Change</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-gray-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <p className="text-xs text-gray-500 mt-2">Click to upload new photo</p>
                            </div>

                            <div className="space-y-6">
                                {/* Full Name - Always full width */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        defaultValue={user.name || ''}
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {user.role !== 'CLUB_MASTER' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Birth Date</label>
                                            <GlobalCalendar
                                                value={birthDate}
                                                onChange={(date) => {
                                                    setBirthDate(date)
                                                    const input = document.getElementsByName('birthDate')[0] as HTMLInputElement
                                                    if (input) input.value = date.toISOString().split('T')[0]
                                                }}
                                                placeholder="Select birth date..."
                                                className="w-full"
                                                fullWidth
                                            />
                                            <input type="hidden" name="birthDate" value={birthDate ? birthDate.toISOString().split('T')[0] : ''} required />
                                        </div>
                                    )}
                                    {user.role !== 'CLUB_MASTER' && user.role !== 'ASSISTANT_CLUB_MASTER' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Club</label>
                                            <input
                                                type="text"
                                                name="clubName"
                                                defaultValue={user.clubName || ''}
                                                required
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Belt Rank</label>
                                        <GlobalDropdown
                                            name="belt"
                                            value={belt}
                                            onChange={setBelt}
                                            fullWidth
                                            options={
                                                user.role === 'CLUB_MASTER' || user.role === 'ASSISTANT_CLUB_MASTER'
                                                    ? ['1st Dan', '2nd Dan', '3rd Dan', '4th Dan', '5th Dan', '6th Dan', '7th Dan', '8th Dan', '9th Dan']
                                                    : ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Maroon', 'Red', 'Brown', 'Black']
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                                        <GlobalDropdown
                                            name="gender"
                                            value={gender}
                                            onChange={setGender}
                                            fullWidth
                                            options={['Male', 'Female']}
                                        />
                                    </div>
                                    {user.role === 'ATHLETE' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    name="weight"
                                                    step="0.1"
                                                    defaultValue={user.weight || ''}
                                                    placeholder="e.g. 58.5"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    name="height"
                                                    step="0.1"
                                                    defaultValue={user.height || ''}
                                                    placeholder="e.g. 145"
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <LoadingButton
                                    type="submit"
                                    isLoading={saving}
                                    loadingText="Saving..."
                                    variant="warning"
                                    className="px-6 bg-gradient-to-r from-orange-500 to-amber-600 border-0 hover:opacity-90 hover:shadow-lg"
                                >
                                    Save Changes
                                </LoadingButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}
