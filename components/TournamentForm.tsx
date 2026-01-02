'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/app/actions'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface TournamentFormProps {
    isModal?: boolean
    onSuccess?: () => void
}

export default function TournamentForm({ isModal, onSuccess }: TournamentFormProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [pdfFileName, setPdfFileName] = useState<string | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Please upload a PDF file for guidelines')
                e.target.value = ''
                setPdfFileName(null)
                return
            }
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError('PDF file size must be less than 10MB')
                e.target.value = ''
                setPdfFileName(null)
                return
            }
            setError('')
            setPdfFileName(file.name)
        } else {
            setPdfFileName(null)
        }
    }

    const handleBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file')
                e.target.value = ''
                setImagePreview(null)
                return
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Image size must be less than 5MB')
                e.target.value = ''
                setImagePreview(null)
                return
            }
            setError('')
            const objectUrl = URL.createObjectURL(file)
            setImagePreview(objectUrl)
        } else {
            setImagePreview(null)
        }
    }

    const removeImage = () => {
        const input = document.getElementById('headerImage') as HTMLInputElement
        if (input) input.value = ''
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true)
        setError('')

        try {
            const result = await createTournament(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                formRef.current?.reset()
                setPdfFileName(null)
                setImagePreview(null)
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
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (Max 5MB)</p>
                                </label>
                            )}
                        </div>
                        <input
                            type="file"
                            name="headerImage"
                            id="headerImage"
                            accept="image/*"
                            onChange={handleBackdropChange}
                            className="hidden"
                        />
                    </div>
                </div>

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

                {/* Guideline PDF Upload */}
                <div>
                    <label htmlFor="guidelinePdf" className="block text-sm font-medium text-gray-700 mb-1">
                        Guideline PDF
                    </label>
                    <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 transition-colors bg-gray-50/50">
                                <div className="text-center flex flex-col items-center">
                                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                    {pdfFileName ? (
                                        <p className="text-sm text-indigo-600 font-medium">{pdfFileName}</p>
                                    ) : (
                                        <>
                                            <p className="text-sm text-gray-600">Click to upload PDF</p>
                                            <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <input
                                type="file"
                                name="guidelinePdf"
                                id="guidelinePdf"
                                accept=".pdf,application/pdf"
                                onChange={handlePdfChange}
                                className="hidden"
                            />
                        </label>
                        {pdfFileName && (
                            <button
                                type="button"
                                onClick={() => {
                                    const input = document.getElementById('guidelinePdf') as HTMLInputElement
                                    if (input) input.value = ''
                                    setPdfFileName(null)
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove PDF"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
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
