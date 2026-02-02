'use client'

import { Fragment, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/app/actions'
import { X, Image as ImageIcon, Check } from 'lucide-react'
import GlobalDropdown from './GlobalDropdown'
import GlobalCalendar from './GlobalCalendar'
import ImageCropperModal from './ImageCropperModal'
import ActionLoadingOverlay from './ActionLoadingOverlay'
import { useQueryClient } from '@tanstack/react-query'

interface CreateTournamentModalProps {
    isOpen: boolean
    onClose: () => void
    templates: { id: string; name: string }[]
}

export default function CreateTournamentModal({ isOpen, onClose, templates }: CreateTournamentModalProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()
    const queryClient = useQueryClient()

    // Form State
    const [loadingMessage, setLoadingMessage] = useState('Creating tournament...')
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
            if (file.size > 10 * 1024 * 1024) {
                setError('Image size must be less than 10MB')
                e.target.value = ''
                return
            }
            setError('')

            const objectUrl = URL.createObjectURL(file)
            setTempImage(objectUrl)
            setShowCropper(true)
            e.target.value = ''
        }
    }

    const removeImage = () => {
        setCroppedImageBlob(null)
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        setIsSubmitting(true)
        setError('')

        // Cycle through loading messages
        const messages = [
            'Validating inputs...',
            'Setting up tournament structure...',
            'Generating categories from template...',
            'Applying Kyorugi & Poomsae rules...',
            'Finalizing setup...'
        ]
        let msgIndex = 0
        setLoadingMessage(messages[0])

        const interval = setInterval(() => {
            msgIndex = (msgIndex + 1) % messages.length
            setLoadingMessage(messages[msgIndex])
        }, 2000)

        // Append cropped image
        if (croppedImageBlob) {
            formData.delete('headerImage')
            formData.append('headerImage', croppedImageBlob, 'header.jpg')
        }

        try {
            const result = await createTournament(formData)
            clearInterval(interval)

            if (result?.error) {
                setError(result.error)
            } else {
                setLoadingMessage('Tournament created! Redirecting...')
                // No need to reset form or state since we are redirecting
                if (result.id) {
                    // Invalidate queries to ensure fresh data on return
                    queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] })
                    queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })

                    router.push(`/tournament/${result.id}`)
                } else {
                    router.refresh()
                    onClose()
                }
            }
        } catch {
            clearInterval(interval)
            setError('Failed to create tournament. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <ActionLoadingOverlay
                isLoading={isSubmitting}
                title="Creating Tournament"
                message={loadingMessage}
            />

            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">Create New Tournament</h2>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[85vh] overflow-y-auto">
                        <form
                            ref={formRef}
                            onSubmit={handleSubmit}
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
                                {croppedImageBlob && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Image cropped and ready to upload
                                    </p>
                                )}
                            </div>

                            {/* Cropper Modal (Nested) */}
                            {showCropper && tempImage && (
                                <ImageCropperModal
                                    imageUrl={tempImage}
                                    aspectRatio={3 / 1}
                                    onClose={() => {
                                        setShowCropper(false)
                                        setTempImage(null)
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
                                    <GlobalCalendar
                                        label="Tournament Date"
                                        value={undefined} // Controlled input needing state if not using form, detailed below
                                        onChange={(date) => {
                                            const input = document.getElementById('startDate') as HTMLInputElement
                                            if (input) input.value = date.toISOString().split('T')[0]
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="startDate" id="startDate" required />
                                </div>
                                <div>
                                    <GlobalCalendar
                                        label="Registration Opens"
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementById('registrationStart') as HTMLInputElement
                                            if (input) input.value = date.toISOString().split('T')[0]
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="registrationStart" id="registrationStart" />
                                </div>
                                <div>
                                    <GlobalCalendar
                                        label="Registration Closes"
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementById('registrationEnd') as HTMLInputElement
                                            if (input) input.value = date.toISOString().split('T')[0]
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="registrationEnd" id="registrationEnd" />
                                </div>
                            </div>

                            {/* Guideline Template Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Guideline Template
                                </label>
                                {templates.length === 0 ? (
                                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                        ⚠️ No guideline templates found. Please contact an administrator.
                                    </div>
                                ) : (
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
                                )}
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
                </div>
            </div>
        </div>
    )
}
