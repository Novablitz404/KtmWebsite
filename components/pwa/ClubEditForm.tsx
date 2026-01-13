'use client'

import { useState, useRef } from 'react'
import { updateClubDetails } from '@/app/actions/club'
import LoadingButton from '@/components/ui/LoadingButton'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ClubEditFormProps {
    club: {
        id: string
        name: string
        logoUrl?: string | null
        address?: string | null
        phone?: string | null
    }
    onCancel?: () => void
    onSuccess?: () => void
}

export default function ClubEditForm({ club, onCancel, onSuccess }: ClubEditFormProps) {
    const [saving, setSaving] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(club.logoUrl || null)
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setPreviewImage(objectUrl)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setSaving(true)

        formData.set('clubId', club.id)
        try {
            await updateClubDetails(formData)
            toast.success('Club details updated successfully!')

            if (onSuccess) onSuccess()
            if (onCancel && !onSuccess) onCancel()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update club details.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {/* Club Logo Upload */}
            <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative bg-white flex items-center justify-center">
                        {previewImage ? (
                            <img src={previewImage} alt="Club Logo" className="w-full h-full object-contain p-1" />
                        ) : (
                            <div className="text-4xl">🥋</div>
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
                    name="logo"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                />
                <p className="text-xs text-gray-400 mt-2">Tap to change logo</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Club Name</label>
                    <input
                        type="text"
                        name="name"
                        defaultValue={club.name}
                        required
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                        placeholder="e.g. Eagle Taekwondo"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</label>
                    <input
                        type="text"
                        name="address"
                        defaultValue={club.address || ''}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                        placeholder="e.g. 123 Dojo St, City"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone / Contact</label>
                    <input
                        type="text"
                        name="phone"
                        defaultValue={club.phone || ''}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                        placeholder="e.g. +1 234 567 890"
                    />
                </div>
            </div>

            <div className="pt-6 pb-8">
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
                        className="w-full mt-3 py-2 text-xs text-gray-500 font-medium hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    )
}
