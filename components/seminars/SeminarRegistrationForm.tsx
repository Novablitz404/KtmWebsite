'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registerForSeminar } from '@/app/actions'
import LoadingButton from '@/components/ui/LoadingButton'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface SeminarRegistrationFormProps {
    seminar: {
        id: string
        name: string
        fee: number | null
        xenditEnabled: boolean
    }
    user: {
        name: string | null
        email: string
    }
    disabled?: boolean
    paymentConfirmed?: boolean
}

export default function SeminarRegistrationForm({ seminar, user, disabled = false, paymentConfirmed = false }: SeminarRegistrationFormProps) {
    const router = useRouter()
    const [waiverAccepted, setWaiverAccepted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        // For non-Xendit flow, waiver is required before registration
        if (!seminar.xenditEnabled && !waiverAccepted) {
            toast.error('Please accept the waiver before registering.')
            return
        }

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('seminarId', seminar.id)

            const result = await registerForSeminar(formData)

            if (result.error) {
                toast.error(result.error)
            } else if (seminar.xenditEnabled && result.registrationId) {
                // Redirect to Xendit checkout — will come back with ?payment=success
                try {
                    const currentUrl = window.location.origin + window.location.pathname
                    const checkoutRes = await fetch('/api/checkout/xendit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'seminar',
                            eventId: seminar.id,
                            registrationId: result.registrationId,
                            payerEmail: user.email,
                            payerName: user.name,
                            amount: seminar.fee || 0,
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
                    toast.error('Failed to redirect to payment. Please contact your club master.')
                }
            } else {
                toast.success('Registration submitted successfully! Waiting for approval.')
                router.push('/athlete')
            }
        } catch (error) {
            console.error(error)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // If returning from Xendit payment, show payment confirmed + waiver
    if (paymentConfirmed) {
        return (
            <div className="space-y-5">
                {/* Payment Confirmed Banner */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-900 mb-1">✅ Payment Confirmed!</h3>
                    <p className="text-sm text-green-700">
                        💰 Your payment for <span className="font-semibold">{seminar.name}</span> has been received.
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                        Please accept the waiver below to complete your registration.
                    </p>
                </div>

                {/* Waiver (required after payment) */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📋</span> Waiver & Agreement
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed space-y-2 max-h-32 overflow-y-auto pr-2 mb-4">
                        <p className="font-semibold text-gray-800">Participant Waiver and Release of Liability</p>
                        <p>In consideration of being allowed to participate in any way in the seminar, related events and activities, I, the undersigned participant, acknowledge, appreciate, and agree that:</p>
                        <ol className="list-decimal pl-4 space-y-1.5">
                            <li>The risk of injury from the activities involved in this program is significant, and while particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist.</li>
                            <li>I KNOWINGLY AND FREELY ASSUME ALL SUCH RISKS and assume full responsibility for my participation.</li>
                            <li>I willingly agree to comply with the stated and customary terms and conditions for participation.</li>
                            <li>I HEREBY RELEASE AND HOLD HARMLESS the organizers, their officers, officials, agents, and/or employees WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, or loss or damage to person or property.</li>
                        </ol>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer select-none group">
                        <input
                            type="checkbox"
                            checked={waiverAccepted}
                            onChange={(e) => setWaiverAccepted(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                            I have read and agree to the waiver and terms above.
                        </span>
                    </label>
                </div>

                <div className="flex justify-center pt-2">
                    <button
                        onClick={() => {
                            if (!waiverAccepted) {
                                toast.error('Please accept the waiver.')
                                return
                            }
                            toast.success('Registration complete! Waiting for club master approval.')
                            router.push('/athlete')
                        }}
                        className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        ✅ Complete Registration
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* How it works */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">How it works</p>
                        <ol className="list-decimal pl-4 space-y-0.5 text-xs text-amber-700">
                            {seminar.xenditEnabled ? (
                                <>
                                    <li>Submit your registration below</li>
                                    <li>Complete payment via Xendit</li>
                                    <li>Sign the waiver after payment</li>
                                    <li>Your club master will approve your registration</li>
                                </>
                            ) : (
                                <>
                                    <li>Accept the waiver below</li>
                                    <li>Submit your registration</li>
                                    <li>Pay the registration fee to your club master</li>
                                    <li>Your club master will approve your registration once payment is confirmed</li>
                                </>
                            )}
                        </ol>
                    </div>
                </div>
            </div>

            {/* Registrant Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Registrant</h3>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Name</span>
                        <span className="text-sm font-semibold text-gray-900">{user.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-700">{user.email}</span>
                    </div>
                </div>
            </div>

            {/* Waiver — only shown for non-Xendit flow */}
            {!seminar.xenditEnabled && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📋</span> Waiver & Agreement
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed space-y-2 max-h-32 overflow-y-auto pr-2 mb-4">
                        <p className="font-semibold text-gray-800">Participant Waiver and Release of Liability</p>
                        <p>
                            In consideration of being allowed to participate in any way in the seminar, related events and activities, I, the undersigned participant, acknowledge, appreciate, and agree that:
                        </p>
                        <ol className="list-decimal pl-4 space-y-1.5">
                            <li>The risk of injury from the activities involved in this program is significant, including the potential for permanent paralysis and death, and while particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist.</li>
                            <li>I KNOWINGLY AND FREELY ASSUME ALL SUCH RISKS, both known and unknown, EVEN IF ARISING FROM THE NEGLIGENCE OF THE RELEASEES or others, and assume full responsibility for my participation.</li>
                            <li>I willingly agree to comply with the stated and customary terms and conditions for participation.</li>
                            <li>I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, HEREBY RELEASE AND HOLD HARMLESS the organizers, their officers, officials, agents, and/or employees, other participants, sponsoring agencies, sponsors, advertisers, and owners and lessors of premises used to conduct the event, WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, or loss or damage to person or property.</li>
                        </ol>
                        <p className="font-semibold text-gray-800">
                            I HAVE READ THIS RELEASE OF LIABILITY AND ASSUMPTION OF RISK AGREEMENT, FULLY UNDERSTAND ITS TERMS, AND SIGN IT FREELY AND VOLUNTARILY.
                        </p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer select-none group">
                        <input
                            type="checkbox"
                            checked={waiverAccepted}
                            onChange={(e) => setWaiverAccepted(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="text-xs text-gray-700 group-hover:text-gray-900 transition-colors">
                            I have read and agree to the waiver and terms above.
                        </span>
                    </label>
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-center pt-2">
                <LoadingButton
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    loadingText={seminar.xenditEnabled ? 'Proceeding to Payment...' : 'Registering...'}
                    disabled={disabled}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                    {seminar.xenditEnabled ? 'Register & Pay' : 'Submit Registration'}
                </LoadingButton>
            </div>
        </div>
    )
}
