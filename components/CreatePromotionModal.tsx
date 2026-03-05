'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { X, Calendar, MapPin, DollarSign, Image as ImageIcon, Check } from 'lucide-react'
import { createPromotionTest } from '@/app/organization/actions'
import { toast } from 'sonner'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalCalendar from '@/components/GlobalCalendar'
import GlobalTimePicker from '@/components/GlobalTimePicker'

interface CreatePromotionModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreatePromotionModal({ isOpen, onClose }: CreatePromotionModalProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)

    const [testDate, setTestDate] = useState<Date | undefined>(undefined)
    const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(undefined)
    const [testTime, setTestTime] = useState('08:00')
    const [regDeadlineTime, setRegDeadlineTime] = useState('17:00')

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
            if (result.promotionTest?.id) {
                router.push(`/promotions/${result.promotionTest.id}`)
            }
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
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
                        <h2 className="text-lg font-bold text-white">Schedule New Promotion Test</h2>
                        <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[85vh] overflow-y-auto">
                        {/* ─── SECTION 1: Test Information ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">1</span>
                                Test Information
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Test Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="e.g., January 2026 Belt Promotion"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                                        placeholder="Details about the promotion test..."
                                    />
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        {/* ─── SECTION 2: Schedule ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">2</span>
                                Schedule
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <GlobalCalendar
                                            label="Test Date *"
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
                                    <div className="w-[140px]">
                                        <GlobalTimePicker
                                            label="Time"
                                            name="testTime"
                                            value={testTime}
                                            onChange={setTestTime}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
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
                                    <div className="w-[140px]">
                                        <GlobalTimePicker
                                            label="Time"
                                            name="registrationDeadlineTime"
                                            value={regDeadlineTime}
                                            onChange={setRegDeadlineTime}
                                        />
                                    </div>
                                </div>
                                {/* Promotions are always internal/private */}
                                <input type="hidden" name="visibility" value="PRIVATE" />
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        {/* ─── SECTION 3: Venue & Fees ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">3</span>
                                Venue & Fees
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Venue
                                    </label>
                                    <input
                                        name="venue"
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="Location"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2.5 rounded-lg border border-blue-100 flex gap-2 items-start">
                                        <DollarSign className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        <p>Testing fees will be automatically calculated based on the student's belt using your Organization's default pricing.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Submit */}
                        <div className="pt-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-200"
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
