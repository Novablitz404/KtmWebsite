'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/app/actions'
import { X, Image as ImageIcon, Check } from 'lucide-react'
import GlobalDropdown from './GlobalDropdown'
import ImageCropperModal from './ImageCropperModal'
import ActionLoadingOverlay from './ActionLoadingOverlay'

interface TournamentFormProps {
    isModal?: boolean
    onSuccess?: () => void
    templates?: { id: string; name: string }[]
}

export default function TournamentForm({ isModal, onSuccess, templates = [] }: TournamentFormProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState('')

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null) // Original uploaded image to crop
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null) // Final cropped blob

    const handleBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file')
                e.target.value = ''
                return
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit (increased to allow high res upload for cropping)
                setError('Image size must be less than 10MB')
                e.target.value = ''
                return
            }
            setError('')

            // Instead of setting preview immediately, open cropper
            const objectUrl = URL.createObjectURL(file)
            setTempImage(objectUrl)
            setShowCropper(true)

            // Clear input so same file can be selected again
            e.target.value = ''
        }
    }

    const removeImage = () => {
        setCroppedImageBlob(null)
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true)
        setError('')

        // Manually append the cropped blob if it exists
        if (croppedImageBlob) {
            formData.delete('headerImage') // Remove the empty/original field if present (though we clear input)
            formData.append('headerImage', croppedImageBlob, 'header.jpg')
        }

        try {
            const result = await createTournament(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                formRef.current?.reset()
                setImagePreview(null)
                setCroppedImageBlob(null)
                setSelectedTemplate('') // Reset template
                router.refresh()
                if (onSuccess) onSuccess()
            }
        } catch {
            setError('Failed to create tournament. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className={isModal ? '' : "bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8"}>
            <ActionLoadingOverlay
                isLoading={isSubmitting}
                title="Creating tournament..."
                message="Please wait, do not refresh or close. Setting up brackets and logic."
            />
            {!isModal && (
                <h2 className="text-xl font-bold mb-6">Create New Tournament</h2>
            )}
            <form
                ref={formRef}
                action={handleSubmit}
                className="space-y-6"
            >
                {/* Header Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Header Image
                    </label>
                    <div className="relative group">
                        <div className={`
                            w-full h-48 rounded-xl border-2 border-dashed border-gray-300 
                            flex flex-col items-center justify-center 
                            bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden
                            ${imagePreview ? 'border-indigo-500' : ''}
                        `}>
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Header Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            removeImage()
                                        }}
                                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-gray-600 hover:text-red-500 transition-colors shadow-sm"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <label htmlFor="headerImage" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                                    <ImageIcon className="w-10 h-10 text-gray-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-sm font-medium text-gray-600">Click to upload header image</p>
                                    <p className="text-xs text-gray-500 mt-1">Recommended: 1200x400</p>
                                    <p className="text-xs text-gray-400">PNG, JPG, GIF (Max 10MB)</p>
                                </label>
                            )}
                        </div>
                        <input
                            type="file"
                            id="headerImage"
                            accept="image/*"
                            onChange={handleBackdropChange}
                            className="hidden"
                        />
                    </div>
                    {/* Hidden input to store the cropped file for form submission */}
                    {croppedImageBlob && (
                        // Note: We can't set file input value programmatically for security.
                        // Instead, we will append it to formData in handleSubmit manually.
                        // But for simplicity if we want to use form action directly, we'd need to use fetch.
                        // Since we are already using a custom handleSubmit that calls createTournament(formData),
                        // we can append the blob there.
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Image cropped and ready to upload
                        </p>
                    )}
                </div>

                {/* Cropper Modal */}
                {showCropper && tempImage && (
                    <ImageCropperModal
                        imageUrl={tempImage}
                        aspectRatio={3 / 1}
                        onClose={() => {
                            setShowCropper(false)
                            setTempImage(null)
                            // Reset file input if cancelled so they can re-select same file
                            const input = document.getElementById('headerImage') as HTMLInputElement
                            if (input) input.value = ''
                        }}
                        onCropComplete={(croppedBlob) => {
                            const objectUrl = URL.createObjectURL(croppedBlob)
                            setImagePreview(objectUrl)
                            setCroppedImageBlob(croppedBlob)
                            setShowCropper(false)
                        }}
                    />
                )}

                {/* Tournament Name */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Tournament Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        id="name"
                        placeholder="e.g. KTM Winter Championship 2025"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Venue */}
                <div>
                    <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-1">
                        Venue
                    </label>
                    <input
                        type="text"
                        name="venue"
                        id="venue"
                        placeholder="e.g. Mall of Asia Arena, Pasay City"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                </div>

                {/* Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                            Tournament Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            id="startDate"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="registrationStart" className="block text-sm font-medium text-gray-700 mb-1">
                            Registration Opens
                        </label>
                        <input
                            type="date"
                            name="registrationStart"
                            id="registrationStart"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="registrationEnd" className="block text-sm font-medium text-gray-700 mb-1">
                            Registration Closes
                        </label>
                        <input
                            type="date"
                            name="registrationEnd"
                            id="registrationEnd"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Guideline Template Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guideline Template
                    </label>
                    <div className="relative">
                        <GlobalDropdown
                            name="guidelineTemplateId"
                            fullWidth
                            label="Select a template (Optional)"
                            options={templates.map(t => ({
                                value: t.id,
                                label: t.name
                            }))}
                            value={selectedTemplate}
                            onChange={setSelectedTemplate}
                            align="left"
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Select a template to automatically populate categories.
                        </p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Tournament'}
                    </button>
                </div>
            </form>
        </div>
    )
}
