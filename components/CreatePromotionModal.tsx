'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X, Calendar, MapPin, DollarSign, Image as ImageIcon, Check } from 'lucide-react'
import { createPromotionTest } from '@/app/organization/actions'
import { toast } from 'sonner'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalCalendar from '@/components/GlobalCalendar'

interface CreatePromotionModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreatePromotionModal({ isOpen, onClose }: CreatePromotionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)

    const [testDate, setTestDate] = useState<Date | undefined>(undefined)
    const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(undefined)

    if (!isOpen) return null

    const handleBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload an image file')
                e.target.value = ''
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Image size must be less than 10MB')
                e.target.value = ''
                return
            }

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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        // Append cropped image if exists
        if (croppedImageBlob) {
            formData.delete('banner')
            formData.append('banner', croppedImageBlob, 'banner.jpg')
        }

        const result = await createPromotionTest(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Promotion test created!')
            onClose()
            setImagePreview(null)
            setCroppedImageBlob(null)
            setTestDate(undefined)
            setRegistrationDeadline(undefined)
        }
        setIsSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
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
                        <h2 className="text-xl font-bold text-gray-900">Schedule New Promotion Test</h2>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Test Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g., January 2026 Belt Promotion"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none"
                                placeholder="Details about the promotion test..."
                            />
                        </div>


                        {/* Grid for Date/Deadline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <GlobalCalendar
                                    label="Test Date"
                                    value={testDate}
                                    onChange={(date) => {
                                        setTestDate(date)
                                        const input = document.getElementsByName('testDate')[0] as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Select date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" name="testDate" required />
                            </div>
                            <div>
                                <GlobalCalendar
                                    label="Registration Deadline"
                                    value={registrationDeadline}
                                    onChange={(date) => {
                                        setRegistrationDeadline(date)
                                        const input = document.getElementsByName('registrationDeadline')[0] as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Select date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" name="registrationDeadline" />
                            </div>
                            {/* Promotions are always internal/private */}
                            <input type="hidden" name="visibility" value="PRIVATE" />
                        </div>

                        {/* Venue & Fee */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Venue
                                </label>
                                <input
                                    name="venue"
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Location"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fee (₱)
                                </label>
                                <input
                                    name="fee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-medium px-8 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-200"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Promotion Test'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Image Cropper */}
            {
                showCropper && tempImage && (
                    <ImageCropperModal
                        imageUrl={tempImage!}
                        aspectRatio={3 / 1}
                        onCropComplete={(croppedBlob) => {
                            setCroppedImageBlob(croppedBlob)
                            setImagePreview(URL.createObjectURL(croppedBlob))
                            setShowCropper(false)
                            setTempImage(null)
                        }}
                        onClose={() => {
                            setShowCropper(false)
                            setTempImage(null)
                        }}
                    />
                )
            }
        </div >
    )
}
