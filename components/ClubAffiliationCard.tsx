'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { uploadProofOfPayment } from '@/lib/supabase-storage'
import { toast } from 'sonner'
import {
    Shield, ShieldCheck, ShieldAlert, ShieldX,
    Upload, Loader2, CheckCircle, Clock, AlertTriangle,
    Calendar, CreditCard, ImageIcon, Building2
} from 'lucide-react'

interface AffiliationStatus {
    hasOrganization: boolean
    organizationName: string | null
    organizationId: string | null
    affiliationFee: number
    status: string // UNPAID | ACTIVE | EXPIRED
    paidAt: Date | string | null
    expiresAt: Date | string | null
    affiliationId: string | null
}

interface PaymentConfig {
    paymentMethod: string // 'manual' | 'xendit'
    qrCodeUrl: string | null
    bankName: string | null
    bankAccountNo: string | null
    bankAccountName: string | null
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

    if (!affiliationStatus || !affiliationStatus.hasOrganization) return null

    // If no fee is set, affiliation isn't required
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

        // Preview
        const reader = new FileReader()
        reader.onload = (ev) => setProofPreview(ev.target?.result as string)
        reader.readAsDataURL(file)

        if (!affiliationStatus.affiliationId) {
            toast.error('No affiliation record found. Please contact the organization.')
            return
        }

        setIsUploading(true)
        try {
            const url = await uploadProofOfPayment(affiliationStatus.affiliationId, file)
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
        if (!proofUrl || !affiliationStatus.affiliationId) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/affiliation/submit-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    affiliationId: affiliationStatus.affiliationId,
                    proofImageUrl: proofUrl,
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Proof of payment submitted! Waiting for review.')
                setShowPaymentModal(false)
                // Reload page to reflect updated status
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
            // 1. Create affiliation record
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

            // 2. Create Xendit invoice
            const checkoutRes = await fetch('/api/checkout/xendit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'affiliation',
                    eventId: affiliationStatus.organizationId,
                    registrationId: initData.affiliationId,
                    payerEmail: '', // Will be filled by Xendit
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

    return (
        <>
            <div className={`p-5 rounded-xl border ${statusConfig?.bg || 'bg-gray-50 border-gray-200'} transition-all`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <StatusIcon className={`w-6 h-6 mt-0.5 ${statusConfig?.color || 'text-gray-500'}`} />
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Organization Affiliation</h3>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" />
                                {affiliationStatus.organizationName}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig?.badge || 'bg-gray-100 text-gray-600'}`}>
                        {statusConfig?.label || affiliationStatus.status}
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
                                onClick={() => setShowPaymentModal(true)}
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

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
                    <div
                        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Pay Affiliation Fee</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                ₱{affiliationStatus.affiliationFee.toLocaleString()} annual fee to {affiliationStatus.organizationName}
                            </p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Manual Payment */}
                            {paymentConfig?.paymentMethod === 'manual' && (
                                <div className="space-y-4">
                                    {/* QR Code */}
                                    {paymentConfig.qrCodeUrl && (
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-gray-700 mb-3">Scan QR Code to Pay</p>
                                            <div className="relative mx-auto w-48 h-48 rounded-xl overflow-hidden border border-gray-200">
                                                <Image
                                                    src={paymentConfig.qrCodeUrl}
                                                    alt="Payment QR Code"
                                                    fill
                                                    className="object-contain"
                                                    unoptimized
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bank Details */}
                                    {paymentConfig.bankName && (
                                        <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                                            <p className="font-medium text-gray-700">Bank Transfer Details</p>
                                            <div className="space-y-1.5 text-gray-600">
                                                <div className="flex justify-between">
                                                    <span>Bank</span>
                                                    <span className="font-medium text-gray-900">{paymentConfig.bankName}</span>
                                                </div>
                                                {paymentConfig.bankAccountNo && (
                                                    <div className="flex justify-between">
                                                        <span>Account No.</span>
                                                        <span className="font-mono font-medium text-gray-900">{paymentConfig.bankAccountNo}</span>
                                                    </div>
                                                )}
                                                {paymentConfig.bankAccountName && (
                                                    <div className="flex justify-between">
                                                        <span>Account Name</span>
                                                        <span className="font-medium text-gray-900">{paymentConfig.bankAccountName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Instructions */}
                                    {paymentConfig.instructions && (
                                        <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                            <p className="font-medium mb-1">Instructions:</p>
                                            <p className="whitespace-pre-wrap">{paymentConfig.instructions}</p>
                                        </div>
                                    )}

                                    {/* Upload Proof */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-700">Upload Proof of Payment</p>

                                        {proofPreview ? (
                                            <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                                <div className="relative w-full h-40">
                                                    <Image
                                                        src={proofPreview}
                                                        alt="Proof of payment"
                                                        fill
                                                        className="object-contain"
                                                        unoptimized
                                                    />
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
                                                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                                                        <span className="text-xs text-gray-500">Upload screenshot or receipt</span>
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
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmitProof}
                                        disabled={!proofUrl || isSubmitting}
                                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                        ) : (
                                            <><CheckCircle className="w-4 h-4" /> Submit Proof of Payment</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Xendit Payment */}
                            {paymentConfig?.paymentMethod === 'xendit' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        You will be redirected to our secure payment gateway to complete the payment.
                                    </p>
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
