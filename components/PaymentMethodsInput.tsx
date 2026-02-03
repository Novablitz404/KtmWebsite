'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, QrCode, Upload, X, Check, Building2, Wallet, CreditCard } from 'lucide-react'
import ImageCropperModal from '@/components/ImageCropperModal'
import GlobalDropdown from '@/components/GlobalDropdown'

export interface PaymentMethodData {
    id: string
    type: 'BANK' | 'EWALLET' | 'OTHER'
    name: string
    accountName: string
    accountNumber: string
    qrCodeBlob?: Blob | null
    qrCodePreview?: string
    existingQrCodeUrl?: string | null
}

interface PaymentMethodsInputProps {
    initialMethods?: PaymentMethodData[]
    name?: string
    value?: PaymentMethodData[]
    onChange?: (methods: PaymentMethodData[]) => void
}

export default function PaymentMethodsInput({ initialMethods = [], name = 'paymentMethods', value, onChange }: PaymentMethodsInputProps) {
    const [localMethods, setLocalMethods] = useState<PaymentMethodData[]>(initialMethods)

    // Controlled vs Uncontrolled pattern
    const methods = value || localMethods

    const triggerChange = (newMethods: PaymentMethodData[]) => {
        if (onChange) {
            onChange(newMethods)
        } else {
            setLocalMethods(newMethods)
        }
    }

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [activeMethodId, setActiveMethodId] = useState<string | null>(null)

    const addMethod = () => {
        const newMethod: PaymentMethodData = {
            id: `temp-${Date.now()}`,
            type: 'EWALLET',
            name: '',
            accountName: '',
            accountNumber: '',
            qrCodeBlob: null,
            qrCodePreview: undefined
        }
        triggerChange([...methods, newMethod])
    }

    const removeMethod = (id: string) => {
        triggerChange(methods.filter(m => m.id !== id))
    }

    const updateMethod = (id: string, field: keyof PaymentMethodData, value: any) => {
        triggerChange(methods.map(m => m.id === id ? { ...m, [field]: value } : m))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, methodId: string) => {
        const file = e.target.files?.[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setTempImage(objectUrl)
            setActiveMethodId(methodId)
            setShowCropper(true)
            e.target.value = ''
        }

    }

    const handleClearQr = (methodId: string) => {
        triggerChange(methods.map(m =>
            m.id === methodId
                ? { ...m, qrCodeBlob: null, qrCodePreview: undefined, existingQrCodeUrl: null }
                : m
        ))
        // Clear input value to allow re-selecting same file
        const fileInput = document.getElementById(`qr-${methodId}`) as HTMLInputElement
        if (fileInput) fileInput.value = ''
    }

    return (
        <div className="space-y-4">
            {/* Hidden Input for Form Submission to capture the JSON structure */}
            <input
                type="hidden"
                name={name}
                value={JSON.stringify(methods.map(({ qrCodeBlob, qrCodePreview, ...rest }) => rest))}
            />

            {methods.map((method, index) => (
                <div key={method.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative group">
                    <button
                        type="button"
                        onClick={() => removeMethod(method.id)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Type & Name */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>

                                <GlobalDropdown
                                    value={method.type}
                                    onChange={(val) => updateMethod(method.id, 'type', val)}
                                    options={[
                                        { value: 'BANK', label: 'Bank Transfer', icon: <Building2 size={16} /> },
                                        { value: 'EWALLET', label: 'E-Wallet', icon: <Wallet size={16} /> },
                                        { value: 'OTHER', label: 'Other', icon: <CreditCard size={16} /> }
                                    ]}
                                    fullWidth
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Provider Name</label>
                                <input
                                    type="text"
                                    value={method.name}
                                    onChange={(e) => updateMethod(method.id, 'name', e.target.value)}
                                    placeholder={method.type === 'BANK' ? 'e.g. BDO, BPI' : 'e.g. GCash, Maya'}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Account Name</label>
                                <input
                                    type="text"
                                    value={method.accountName}
                                    onChange={(e) => updateMethod(method.id, 'accountName', e.target.value)}
                                    placeholder="Account Holder Name"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Account No. / Mobile</label>
                                <input
                                    type="text"
                                    value={method.accountNumber}
                                    onChange={(e) => updateMethod(method.id, 'accountNumber', e.target.value)}
                                    placeholder="0917..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            QR Code (Optional)
                        </label>

                        <div className="flex items-start gap-4">
                            <div className="relative">
                                <div className={`
                                    w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 
                                    flex flex-col items-center justify-center 
                                    bg-white hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden
                                    ${(method.qrCodePreview || method.existingQrCodeUrl) ? 'border-indigo-500' : ''}
                                `}>
                                    {(method.qrCodePreview || method.existingQrCodeUrl) ? (
                                        <>
                                            <img
                                                src={method.qrCodePreview || method.existingQrCodeUrl!}
                                                alt="QR Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleClearQr(method.id)}
                                                className="absolute top-1 right-1 p-0.5 bg-white/80 rounded-full hover:bg-white text-gray-600 hover:text-red-500 shadow-sm"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <label htmlFor={`qr-${method.id}`} className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-2">
                                            <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-[10px] text-gray-500 text-center">Upload QR</span>
                                        </label>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    id={`qr-${method.id}`}
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, method.id)}
                                    // Make sure this input is NOT captured by normal form submission if we want to handle it manually via state
                                    // BUT createSeminar uses FormData, so we need to match names.
                                    // Strategy: We will append these files manually in the parent form submission handler, 
                                    // or give them unique names like `qr_methodId` and handle in action.
                                    // For simplicity in CreateSeminarModal w/ FormData:
                                    // We'll give it a specific name pattern `qrCode_${method.id}`
                                    name={`qrCode_${method.id}`}
                                    className="hidden"
                                />
                            </div>

                            <div className="text-xs text-gray-500 py-2">
                                <p>Upload a clear image of the QR code.</p>
                                <p>Supported: PNG, JPG (Max 5MB)</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addMethod}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Payment Method
            </button>

            {/* Image Cropper */}
            {showCropper && tempImage && activeMethodId && (
                <ImageCropperModal
                    imageUrl={tempImage}
                    aspectRatio={1} // Square for QR codes
                    onCropComplete={(croppedBlob) => {
                        const updatedMethods = methods.map(m => m.id === activeMethodId ? {
                            ...m,
                            qrCodeBlob: croppedBlob,
                            qrCodePreview: URL.createObjectURL(croppedBlob)
                        } : m)
                        triggerChange(updatedMethods)
                        setShowCropper(false)
                        setTempImage(null)
                        setActiveMethodId(null)
                    }}
                    onClose={() => {
                        setShowCropper(false)
                        setTempImage(null)
                        setActiveMethodId(null)
                    }}
                />
            )}
        </div>
    )
}
