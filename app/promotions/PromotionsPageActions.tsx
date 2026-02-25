'use client'

import { useState } from 'react'
import { Plus, X, Calendar, MapPin, DollarSign, Image as ImageIcon, Check } from 'lucide-react'
import { createPromotionTest } from '@/app/organization/actions'
import { toast } from 'sonner'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalCalendar from '@/components/GlobalCalendar'

export default function PromotionsPageActions() {
    const [showModal, setShowModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)

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
            setShowModal(false)
            setImagePreview(null)
            setCroppedImageBlob(null)
            window.location.reload()
        }
        setIsSubmitting(false)
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Promotion Test</span>
                <span className="sm:hidden">New</span>
            </button>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
                            <h3 className="text-lg font-bold text-gray-900">Schedule New Promotion Test</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Name *</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="e.g., January 2026 Belt Promotion"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                    placeholder="Details about the promotion test..."
                                />
                            </div>




                            <div>
                                {/* Promotions are always internal/private */}
                                <input type="hidden" name="visibility" value="PRIVATE" />
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Test Date *
                                    </label>
                                    <GlobalCalendar
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementsByName('testDate')[0] as HTMLInputElement
                                            if (input) input.value = date.toISOString().split('T')[0]
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="testDate" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Deadline</label>
                                    <GlobalCalendar
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementsByName('registrationDeadline')[0] as HTMLInputElement
                                            if (input) input.value = date.toISOString().split('T')[0]
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="registrationDeadline" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Venue
                                    </label>
                                    <input
                                        name="venue"
                                        type="text"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Location"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                        Fee (₱)
                                    </label>
                                    <input
                                        name="fee"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Promotion Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
