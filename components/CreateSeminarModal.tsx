'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X, Calendar, MapPin, DollarSign, Image as ImageIcon, Check } from 'lucide-react'
import { createSeminar } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalCalendar from '@/components/GlobalCalendar'
import GlobalTimePicker from '@/components/GlobalTimePicker'


interface CreateSeminarModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreateSeminarModal({ isOpen, onClose }: CreateSeminarModalProps) {
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)

    // Payment Methods State


    // Date State
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(undefined)

    // Time State
    const [startTime, setStartTime] = useState('08:00')
    const [endTime, setEndTime] = useState('17:00')
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

        // Append QR Code Blobs manually


        const result = await createSeminar(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Seminar created!')
            queryClient.invalidateQueries({ queryKey: ['organization-events-data'] })
            onClose()
            setImagePreview(null)
            setCroppedImageBlob(null)
            setStartDate(undefined)
            setEndDate(undefined)
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
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
                        <h2 className="text-lg font-bold text-white">Create New Seminar</h2>
                        <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[85vh] overflow-y-auto">
                        {/* ─── SECTION 1: Seminar Information ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">1</span>
                                Seminar Information
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Seminar Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="e.g., International Poomsae Seminar 2026"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                                        placeholder="Details about the seminar (topics, speakers, schedule)..."
                                    />
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        {/* ─── SECTION 2: Banner Image ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">2</span>
                                Banner Image
                            </h3>

                            <div className="relative group">
                                <div className={`
                                    w-full h-44 rounded-xl border-2 border-dashed 
                                    flex flex-col items-center justify-center 
                                    bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden
                                    ${imagePreview ? 'border-red-400' : 'border-gray-300'}
                                `}>
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Banner Preview" className="w-full h-full object-cover" />
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
                                        <label htmlFor="banner" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2 group-hover:text-red-500 transition-colors" />
                                            <p className="text-sm font-medium text-gray-600">Click to upload banner image</p>
                                            <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400 · PNG, JPG (Max 10MB)</p>
                                        </label>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id="banner"
                                    accept="image/*"
                                    onChange={handleBackdropChange}
                                    className="hidden"
                                />
                            </div>
                            {croppedImageBlob && (
                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Image cropped and ready
                                </p>
                            )}
                        </section>

                        <hr className="border-gray-100" />

                        {/* ─── SECTION 3: Schedule ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">3</span>
                                Schedule
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <GlobalCalendar
                                            label="Start Date *"
                                            value={startDate}
                                            onChange={(date) => {
                                                setStartDate(date)
                                                const input = document.getElementsByName('startDate')[0] as HTMLInputElement
                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                            }}
                                            placeholder="Start date..."
                                            className="w-full"
                                            fullWidth
                                        />
                                        <input type="hidden" name="startDate" required />
                                    </div>
                                    <div className="w-[140px]">
                                        <GlobalTimePicker
                                            label="Time"
                                            name="startTime"
                                            value={startTime}
                                            onChange={setStartTime}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <GlobalCalendar
                                            label="End Date (Optional)"
                                            value={endDate}
                                            onChange={(date) => {
                                                setEndDate(date)
                                                const input = document.getElementsByName('endDate')[0] as HTMLInputElement
                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                            }}
                                            placeholder="End date..."
                                            className="w-full"
                                            fullWidth
                                        />
                                        <input type="hidden" name="endDate" />
                                    </div>
                                    <div className="w-[140px]">
                                        <GlobalTimePicker
                                            label="Time"
                                            name="endTime"
                                            value={endTime}
                                            onChange={setEndTime}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <GlobalCalendar
                                            label="Reg. Deadline"
                                            value={registrationDeadline}
                                            onChange={(date) => {
                                                setRegistrationDeadline(date)
                                                const input = document.getElementsByName('registrationDeadline')[0] as HTMLInputElement
                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                            }}
                                            placeholder="Deadline..."
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
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Visibility</label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <label className="flex-1 cursor-pointer">
                                            <input type="radio" name="visibility" value="PRIVATE" className="sr-only peer" defaultChecked />
                                            <span className="flex items-center justify-center py-1.5 text-sm font-medium rounded-lg text-gray-500 peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow-sm transition-all">
                                                Private
                                            </span>
                                        </label>
                                        <label className="flex-1 cursor-pointer">
                                            <input type="radio" name="visibility" value="PUBLIC" className="sr-only peer" />
                                            <span className="flex items-center justify-center py-1.5 text-sm font-medium rounded-lg text-gray-500 peer-checked:bg-white peer-checked:text-gray-900 peer-checked:shadow-sm transition-all">
                                                Public
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        {/* ─── SECTION 4: Venue & Pricing ─── */}
                        <section>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">4</span>
                                Venue & Pricing
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
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Fee (₱)
                                    </label>
                                    <input
                                        name="fee"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="0.00"
                                    />
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
                                {isSubmitting ? 'Creating...' : 'Create Seminar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Image Cropper */}
            {showCropper && tempImage && (
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
            )}
        </div>
    )
}
