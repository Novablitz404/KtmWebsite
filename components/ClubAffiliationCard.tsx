'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadProofOfPayment } from '@/lib/supabase-storage'
import { toast } from 'sonner'
import {
    Shield, ShieldCheck, ShieldAlert, ShieldX,
    Upload, Loader2, CheckCircle, Clock, AlertTriangle,
    Calendar, CreditCard, ImageIcon, Building2, QrCode, Banknote,
    ArrowRight, ArrowLeft, Download, ChevronRight
} from 'lucide-react'

interface AffiliationStatus {
    hasOrganization: boolean
    organizationName: string | null
    organizationId: string | null
    affiliationFee: number
    status: string // UNPAID | ACTIVE | EXPIRED | PENDING_REVIEW
    paidAt: Date | string | null
    expiresAt: Date | string | null
    affiliationId: string | null
}

interface PaymentMethodItem {
    id: string
    label: string
    bankName: string
    accountNo: string
    accountName: string
    qrCodeUrl: string | null
}

interface PaymentConfig {
    paymentMethod: string // 'manual' | 'xendit'
    paymentMethods: PaymentMethodItem[]
    instructions: string | null
}

interface ClubAffiliationCardProps {
    clubId: string
    affiliationStatus: AffiliationStatus | null
    paymentConfig: PaymentConfig | null
}

export default function ClubAffiliationCard({ clubId, affiliationStatus, paymentConfig }: ClubAffiliationCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const [proofUrl, setProofUrl] = useState<string | null>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodItem | null>(null)
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [localAffiliationId, setLocalAffiliationId] = useState<string | null>(affiliationStatus?.affiliationId || null)
    const [isInitializing, setIsInitializing] = useState(false)

    if (!affiliationStatus || !affiliationStatus.hasOrganization) return null
    if (!affiliationStatus.affiliationFee || affiliationStatus.affiliationFee <= 0) return null

    const isActive = affiliationStatus.status === 'ACTIVE'
    const isExpired = affiliationStatus.status === 'EXPIRED'
    const isUnpaid = affiliationStatus.status === 'UNPAID'
    const isPending = affiliationStatus.status === 'PENDING_REVIEW'

    const statusMap: Record<string, { icon: any, color: string, bg: string, badge: string, label: string }> = {
        ACTIVE: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', label: 'Active' },
        EXPIRED: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Expired' },
        UNPAID: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', label: 'Unpaid' },
        PENDING_REVIEW: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', label: 'Pending Review' },
    }
    const statusConfig = statusMap[affiliationStatus.status] || statusMap.UNPAID
    const StatusIcon = statusConfig.icon || ShieldX

    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (ev) => setProofPreview(ev.target?.result as string)
        reader.readAsDataURL(file)

        if (!localAffiliationId) {
            toast.error('Affiliation record not ready. Please close and reopen the payment modal.')
            return
        }

        setIsUploading(true)
        try {
            const url = await uploadProofOfPayment(localAffiliationId, file)
            if (url) {
                setProofUrl(url)
                toast.success('Receipt uploaded!')
            } else {
                toast.error('Failed to upload receipt')
            }
        } catch {
            toast.error('Upload failed')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSubmitProof = async () => {
        if (!proofUrl || !localAffiliationId) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/affiliation/submit-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliationId: localAffiliationId,
                    proofImageUrl: proofUrl,
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Proof of payment submitted! Waiting for review.')
                setShowPaymentModal(false)
                window.location.reload()
            } else {
                toast.error(data.error || 'Failed to submit')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleXenditPay = async () => {
        setIsSubmitting(true)
        try {
            const initRes = await fetch('/api/affiliation/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clubId })
            })
            const initData = await initRes.json()

            if (!initData.success) {
                toast.error(initData.error || 'Failed to initiate payment')
                setIsSubmitting(false)
                return
            }

            const checkoutRes = await fetch('/api/checkout/xendit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'affiliation',
                    eventId: affiliationStatus.organizationId,
                    registrationId: initData.affiliationId,
                    payerEmail: '',
                    payerName: '',
                    amount: initData.amount,
                    redirectUrl: window.location.href,
                })
            })
            const checkoutData = await checkoutRes.json()

            if (checkoutData.checkoutUrl) {
                window.location.href = checkoutData.checkoutUrl
            } else {
                toast.error(checkoutData.error || 'Failed to create payment')
            }
        } catch {
            toast.error('Payment failed')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDownloadQR = async (url: string, label: string) => {
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = `${label.replace(/\s+/g, '_')}_QR.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(blobUrl)
            toast.success('QR code downloaded!')
        } catch {
            toast.error('Failed to download QR code')
        }
    }

    const openModal = async () => {
        setStep(manualMethods.length > 1 ? 1 : 2)
        setSelectedMethod(manualMethods.length === 1 ? manualMethods[0] : null)
        setProofPreview(null)
        setProofUrl(null)
        setShowPaymentModal(true)

        // Auto-create affiliation record if none exists
        if (!localAffiliationId) {
            setIsInitializing(true)
            try {
                const res = await fetch('/api/affiliation/pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clubId })
                })
                const data = await res.json()
                if (data.success && data.affiliationId) {
                    setLocalAffiliationId(data.affiliationId)
                } else {
                    toast.error(data.error || 'Failed to initialize affiliation record')
                }
            } catch {
                toast.error('Failed to initialize. Please try again.')
            } finally {
                setIsInitializing(false)
            }
        }
    }

    const manualMethods = paymentConfig?.paymentMethods || []
    const activeMethod = selectedMethod || (manualMethods.length === 1 ? manualMethods[0] : null)

    const stepLabels = ['Payment Method', 'Payment Details', 'Upload Proof']

    return (
        <>
            <div className={`p-5 rounded-xl border ${statusConfig.bg} transition-all`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <StatusIcon className={`w-6 h-6 mt-0.5 ${statusConfig.color}`} />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Organization Affiliation</h3>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" />
                                {affiliationStatus.organizationName}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                        {statusConfig.label}
                    </span>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Annual Fee</span>
                        <span className="font-medium text-gray-900">₱{affiliationStatus.affiliationFee.toLocaleString()}</span>
                    </div>
                    {affiliationStatus.paidAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Last Paid</span>
                            <span className="text-gray-700">{new Date(affiliationStatus.paidAt).toLocaleDateString()}</span>
                        </div>
                    )}
                    {affiliationStatus.expiresAt && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Expires</span>
                            <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                                {new Date(affiliationStatus.expiresAt).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {(isUnpaid || isExpired) && (
                    <div className="mt-4">
                        {isPending ? (
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                                <Clock className="w-4 h-4" />
                                Proof of payment submitted — awaiting review
                            </div>
                        ) : (
                            <button
                                onClick={openModal}
                                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-4 h-4" />
                                {isExpired ? 'Renew Affiliation' : 'Pay Affiliation Fee'}
                            </button>
                        )}
                    </div>
                )}

                {isActive && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Your club is affiliated. Athletes can register for events.
                    </div>
                )}
            </div>

            {/* Multi-Step Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Pay Affiliation Fee</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                ₱{affiliationStatus.affiliationFee.toLocaleString()} annual fee to {affiliationStatus.organizationName}
                            </p>

                            {/* Step Indicator — manual payment only */}
                            {paymentConfig?.paymentMethod === 'manual' && (
                                <div className="flex items-center gap-1 mt-4">
                                    {stepLabels.map((label, i) => {
                                        const stepNum = (i + 1) as 1 | 2 | 3
                                        const isCurrentStep = step === stepNum
                                        const isCompleted = step > stepNum
                                        return (
                                            <div key={i} className="flex items-center gap-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${isCurrentStep ? 'bg-indigo-600 text-white' :
                                                        isCompleted ? 'bg-green-500 text-white' :
                                                            'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        {isCompleted ? '✓' : stepNum}
                                                    </div>
                                                    <span className={`text-xs font-medium hidden sm:block ${isCurrentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                {i < stepLabels.length - 1 && (
                                                    <div className={`h-px flex-1 mx-1 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {/* Xendit Payment — no steps needed */}
                            {paymentConfig?.paymentMethod === 'xendit' && (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CreditCard className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <p className="text-sm text-gray-600 max-w-sm mx-auto">
                                            You will be redirected to our secure payment gateway to complete the payment.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleXenditPay}
                                        disabled={isSubmitting}
                                        className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                        ) : (
                                            <><CreditCard className="w-4 h-4" /> Pay ₱{affiliationStatus.affiliationFee.toLocaleString()} via Xendit</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Manual Payment — Multi-Step */}
                            {paymentConfig?.paymentMethod === 'manual' && manualMethods.length > 0 && (
                                <>
                                    {/* STEP 1: Choose Payment Method */}
                                    {step === 1 && (
                                        <div className="space-y-4">
                                            <p className="text-sm font-medium text-gray-700">Select a payment method to continue</p>
                                            <div className="space-y-2">
                                                {manualMethods.map((pm) => (
                                                    <button
                                                        key={pm.id}
                                                        onClick={() => {
                                                            setSelectedMethod(pm)
                                                            setStep(2)
                                                        }}
                                                        className="w-full p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left flex items-center gap-4 group"
                                                    >
                                                        {pm.qrCodeUrl ? (
                                                            <div className="w-12 h-12 rounded-lg bg-gray-100 border flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                                                                <Image src={pm.qrCodeUrl} alt="" fill className="object-contain" unoptimized />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                                <Banknote className="w-6 h-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900">{pm.label || pm.bankName}</p>
                                                            {pm.accountName && <p className="text-xs text-gray-500">{pm.accountName}</p>}
                                                            {pm.accountNo && <p className="text-xs text-gray-400 font-mono">{pm.accountNo}</p>}
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Instructions */}
                                            {paymentConfig.instructions && (
                                                <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                                    <p className="font-medium mb-1">Instructions:</p>
                                                    <p className="whitespace-pre-wrap">{paymentConfig.instructions}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* STEP 2: Payment Details + QR Code */}
                                    {step === 2 && activeMethod && (
                                        <div className="space-y-5">
                                            {/* Selected Method Header */}
                                            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center flex-shrink-0">
                                                    {activeMethod.qrCodeUrl ? (
                                                        <QrCode className="w-5 h-5 text-indigo-600" />
                                                    ) : (
                                                        <Banknote className="w-5 h-5 text-indigo-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{activeMethod.label || activeMethod.bankName}</p>
                                                    <p className="text-xs text-gray-500">Send ₱{affiliationStatus.affiliationFee.toLocaleString()} to this account</p>
                                                </div>
                                            </div>

                                            {/* QR Code + Download */}
                                            {activeMethod.qrCodeUrl && (
                                                <div className="text-center space-y-3">
                                                    <p className="text-sm font-medium text-gray-700">Scan QR Code to Pay</p>
                                                    <div className="relative mx-auto w-56 h-56 rounded-xl overflow-hidden border border-gray-200 bg-white">
                                                        <Image src={activeMethod.qrCodeUrl} alt="Payment QR Code" fill className="object-contain p-2" unoptimized />
                                                    </div>
                                                    <button
                                                        onClick={() => handleDownloadQR(activeMethod.qrCodeUrl!, activeMethod.label || activeMethod.bankName)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download QR Code
                                                    </button>
                                                </div>
                                            )}

                                            {/* Bank Details */}
                                            {activeMethod.bankName && (
                                                <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                                                    <p className="font-medium text-gray-700">Bank Transfer Details</p>
                                                    <div className="space-y-2 text-gray-600">
                                                        <div className="flex justify-between">
                                                            <span>Bank</span>
                                                            <span className="font-medium text-gray-900">{activeMethod.bankName}</span>
                                                        </div>
                                                        {activeMethod.accountNo && (
                                                            <div className="flex justify-between">
                                                                <span>Account No.</span>
                                                                <span className="font-mono font-medium text-gray-900">{activeMethod.accountNo}</span>
                                                            </div>
                                                        )}
                                                        {activeMethod.accountName && (
                                                            <div className="flex justify-between">
                                                                <span>Account Name</span>
                                                                <span className="font-medium text-gray-900">{activeMethod.accountName}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between pt-2 border-t border-gray-200">
                                                            <span className="font-medium">Amount</span>
                                                            <span className="font-bold text-indigo-600">₱{affiliationStatus.affiliationFee.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Instructions */}
                                            {paymentConfig?.instructions && (
                                                <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                                    <p className="font-medium mb-1">Instructions:</p>
                                                    <p className="whitespace-pre-wrap">{paymentConfig.instructions}</p>
                                                </div>
                                            )}

                                            {/* Navigation */}
                                            <div className="flex gap-3">
                                                {manualMethods.length > 1 && (
                                                    <button
                                                        onClick={() => setStep(1)}
                                                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <ArrowLeft className="w-4 h-4" /> Back
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setStep(3)}
                                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                                                >
                                                    I&apos;ve Paid <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: Upload Proof */}
                                    {step === 3 && (
                                        <div className="space-y-5">
                                            <div className="text-center">
                                                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <Upload className="w-7 h-7 text-green-600" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-900">Upload Proof of Payment</p>
                                                <p className="text-xs text-gray-500 mt-1">Upload a screenshot or photo of your payment receipt</p>
                                            </div>

                                            {proofPreview ? (
                                                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                                    <div className="relative w-full h-48">
                                                        <Image src={proofPreview} alt="Proof of payment" fill className="object-contain" unoptimized />
                                                    </div>
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-lg shadow text-xs text-gray-600 hover:bg-white"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />
                                                            <span className="text-sm text-gray-500">Click to upload receipt</span>
                                                            <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProofUpload}
                                                className="hidden"
                                            />

                                            {/* Navigation */}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setStep(2)}
                                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Back
                                                </button>
                                                <button
                                                    onClick={handleSubmitProof}
                                                    disabled={!proofUrl || isSubmitting}
                                                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isSubmitting ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                                    ) : (
                                                        <><CheckCircle className="w-4 h-4" /> Submit Proof</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
