'use client'

import { useState, useTransition } from 'react'
import { registerForPromotionTest, registerForSeminar } from '@/app/organization/actions'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner' // Assuming sonner is used based on previous context

interface EventRegistrationButtonProps {
    eventId: string
    eventType: 'promotion' | 'seminar'
    isRegistered: boolean
    status?: string
    paymentStatus?: string
    disabled?: boolean
    xenditEnabled?: boolean
    fee?: number | null
    onBeforeRegister?: () => boolean
}

export default function EventRegistrationButton({
    eventId,
    eventType,
    isRegistered,
    status,
    paymentStatus,
    disabled = false,
    xenditEnabled = false,
    fee,
    onBeforeRegister
}: EventRegistrationButtonProps) {
    const [isPending, startTransition] = useTransition()

    const handleRegister = () => {
        if (onBeforeRegister && !onBeforeRegister()) return
        startTransition(async () => {
            try {
                let result
                if (eventType === 'promotion') {
                    result = await registerForPromotionTest(eventId)
                } else {
                    result = await registerForSeminar(eventId)
                }

                if (result.error) {
                    toast.error(result.error)
                } else if (xenditEnabled && result.registrationId) {
                    // Redirect to Xendit checkout — will come back with ?payment=success
                    try {
                        const currentUrl = window.location.origin + window.location.pathname
                        const checkoutRes = await fetch('/api/checkout/xendit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                eventType: eventType === 'promotion' ? 'promotionTest' : 'seminar',
                                eventId,
                                registrationId: result.registrationId,
                                payerEmail: '',
                                payerName: '',
                                amount: fee || 0,
                                redirectUrl: currentUrl,
                            })
                        })
                        const checkoutData = await checkoutRes.json()
                        if (checkoutData.invoiceUrl) {
                            window.location.href = checkoutData.invoiceUrl
                            return
                        } else {
                            toast.error(checkoutData.error || 'Failed to create payment link')
                        }
                    } catch {
                        toast.error('Failed to redirect to payment.')
                    }
                } else {
                    toast.success('Successfully registered!')
                }
            } catch (error) {
                toast.error('Failed to register')
                console.error(error)
            }
        })
    }

    if (isRegistered) {
        const isPaid = paymentStatus === 'PAID'
        const isApproved = status === 'APPROVED' || status === 'PASSED'

        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    disabled
                    className={`px-6 py-2 rounded-xl font-medium flex items-center gap-2 cursor-default ${isPaid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}
                >
                    {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {isPaid ? 'Registered & Paid' : 'Registered (Unpaid)'}
                </button>
                {!isPaid && (
                    <p className="text-xs text-gray-500">
                        Please settle payment to confirm your slot.
                    </p>
                )}
            </div>
        )
    }

    return (
        <button
            onClick={handleRegister}
            disabled={isPending || disabled}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
        >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Registering...' : 'Register'}
        </button>
    )
}
