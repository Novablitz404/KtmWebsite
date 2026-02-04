'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Calendar, MapPin, DollarSign, Image as ImageIcon, Check, Save, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { updateSeminar, deleteSeminar } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalCalendar from '@/components/GlobalCalendar'
import { Seminar, PaymentMethod } from '@prisma/client'
import PaymentMethodsInput, { PaymentMethodData } from '@/components/PaymentMethodsInput'

interface SeminarSettingsProps {
    seminar: Seminar & { paymentMethods?: PaymentMethod[] }
}

export default function SeminarSettings({ seminar }: SeminarSettingsProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(seminar.bannerUrl)

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null)

    // Date State
    const [startDate, setStartDate] = useState<Date | undefined>(seminar.startDate ? new Date(seminar.startDate) : undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(seminar.endDate ? new Date(seminar.endDate) : undefined)
    const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(seminar.registrationDeadline ? new Date(seminar.registrationDeadline) : undefined)

    // Payment Methods State
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>(
        seminar.paymentMethods?.map(pm => ({
            id: pm.id,
            type: pm.type as any,
            name: pm.name,
            accountName: pm.accountName,
            accountNumber: pm.accountNumber,
            qrCodeBlob: null,
            existingQrCodeUrl: pm.qrCodeUrl
        })) || []
    )

    // Sync state with props when router moves or data refreshes
    useEffect(() => {
        setPaymentMethods(
            seminar.paymentMethods?.map(pm => ({
                id: pm.id,
                type: pm.type as any,
                name: pm.name,
                accountName: pm.accountName,
                accountNumber: pm.accountNumber,
                qrCodeBlob: null,
                existingQrCodeUrl: pm.qrCodeUrl
            })) || []
        )
    }, [seminar.paymentMethods])

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
        if (imagePreview && imagePreview !== seminar.bannerUrl) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSaving(true)

        const formData = new FormData(e.currentTarget)
        formData.append('seminarId', seminar.id)

        // Append cropped image if exists
        if (croppedImageBlob) {
            formData.delete('banner')
            formData.append('banner', croppedImageBlob, 'banner.jpg')
        }

        // Append QR Code Blobs manually
        paymentMethods.forEach(pm => {
            // Remove potential empty key from file input
            formData.delete(`qrCode_${pm.id}`)

            if (pm.qrCodeBlob) {
                formData.append(`qrCode_${pm.id}`, pm.qrCodeBlob, 'qr-code.png')
            }
        })

        const result = await updateSeminar(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Seminar updated successfully!')
            setCroppedImageBlob(null)
            router.refresh()
        }
        setIsSaving(false)
    }

    async function handleDelete() {
        if (!confirm('Are you strictly sure you want to delete this seminar? This action cannot be undone.')) return

        setIsDeleting(true)
        const result = await deleteSeminar(seminar.id)

        if (result.error) {
            toast.error(result.error)
            setIsDeleting(false)
        } else {
            toast.success('Seminar deleted')
            router.push('/organization?tab=events')
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 font-medium pt-1">Manage seminar details and configuration.</p>
            </div>

            <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">General Information</p>

                    {/* Banner Image Upload */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                            Seminar Banner Image
                        </label>
                        <div className="relative group">
                            <div className={`
                                w-full h-48 rounded-2xl border-2 border-dashed border-gray-100 
                                flex flex-col items-center justify-center 
                                bg-gray-50/50 hover:bg-gray-100/50 transition-colors cursor-pointer overflow-hidden
                                ${imagePreview ? 'border-sky-500' : ''}
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
                                            className="absolute top-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white text-gray-600 hover:text-red-500 transition-all shadow-lg backdrop-blur-sm"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <label htmlFor="settings-banner" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                                        <ImageIcon className="w-10 h-10 text-gray-300 mb-3 group-hover:text-sky-500 transition-colors" />
                                        <p className="text-sm font-bold text-gray-600">Click to upload banner</p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest">Recommended: 1200x400 (Max 10MB)</p>
                                    </label>
                                )}
                            </div>
                            <input
                                type="file"
                                id="settings-banner"
                                accept="image/*"
                                onChange={handleBackdropChange}
                                className="hidden"
                            />
                        </div>
                        {croppedImageBlob && (
                            <p className="text-[10px] text-green-600 mt-3 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> New image ready to upload
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Name */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Seminar Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={seminar.name}
                                required
                                className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium text-gray-900"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea
                                name="description"
                                defaultValue={seminar.description || ''}
                                rows={4}
                                className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all resize-none font-medium text-gray-900"
                            />
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <GlobalCalendar
                                    label="Start Date"
                                    value={startDate}
                                    onChange={(date) => {
                                        setStartDate(date)
                                        const input = document.getElementById('settings-startDate') as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Start date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" id="settings-startDate" name="startDate" defaultValue={startDate ? format(startDate, 'yyyy-MM-dd') : ''} required />
                            </div>
                            <div>
                                <GlobalCalendar
                                    label="End Date"
                                    value={endDate}
                                    onChange={(date) => {
                                        setEndDate(date)
                                        const input = document.getElementById('settings-endDate') as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="End date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" id="settings-endDate" name="endDate" defaultValue={endDate ? format(endDate, 'yyyy-MM-dd') : ''} />
                            </div>
                            <div>
                                <GlobalCalendar
                                    label="Reg. Deadline"
                                    value={registrationDeadline}
                                    onChange={(date) => {
                                        setRegistrationDeadline(date)
                                        const input = document.getElementById('settings-registrationDeadline') as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Deadline..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" id="settings-registrationDeadline" name="registrationDeadline" defaultValue={registrationDeadline ? format(registrationDeadline, 'yyyy-MM-dd') : ''} />
                            </div>
                        </div>

                        {/* Venue & Fee */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Venue
                                </label>
                                <input
                                    name="venue"
                                    type="text"
                                    defaultValue={seminar.venue || ''}
                                    className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Fee (₱)
                                </label>
                                <input
                                    name="fee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    defaultValue={seminar.fee || ''}
                                    className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Visibility */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Visibility</label>
                            <div className="flex bg-gray-50 p-1.5 rounded-2xl w-full md:w-1/2 border border-gray-100">
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" name="visibility" value="PRIVATE" className="sr-only peer" defaultChecked={seminar.visibility === 'PRIVATE'} />
                                    <span className="flex items-center justify-center py-2.5 text-xs font-black uppercase tracking-widest rounded-xl text-gray-400 peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm transition-all">
                                        Private
                                    </span>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" name="visibility" value="PUBLIC" className="sr-only peer" defaultChecked={seminar.visibility === 'PUBLIC'} />
                                    <span className="flex items-center justify-center py-2.5 text-xs font-black uppercase tracking-widest rounded-xl text-gray-400 peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm transition-all">
                                        Public
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                Payment Methods
                            </label>
                            <div className="p-1 rounded-3xl border border-gray-50 bg-gray-50/30">
                                <PaymentMethodsInput
                                    value={paymentMethods}
                                    onChange={setPaymentMethods}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-gray-50">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center px-8 py-4 border border-transparent rounded-full shadow-xl text-sm font-black uppercase tracking-widest text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-900/10 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-3" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="bg-white p-8 rounded-3xl border border-red-50 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-50/50 rounded-full blur-3xl" />

                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Danger Zone
                </p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">Delete Seminar</h4>
                        <p className="text-sm font-medium text-gray-500 mt-1max-w-md">Permanently remove this seminar and all associated registrations. This action is irreversible.</p>
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center px-8 py-4 border-2 border-red-100 rounded-full text-sm font-black uppercase tracking-widest text-red-600 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 transition-all"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5 mr-3" />
                                Delete Seminar
                            </>
                        )}
                    </button>
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
