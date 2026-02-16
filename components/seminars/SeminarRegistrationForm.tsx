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
    }
    user: {
        name: string | null
        email: string
    }
}

export default function SeminarRegistrationForm({ seminar, user }: SeminarRegistrationFormProps) {
    const router = useRouter()
    const [waiverAccepted, setWaiverAccepted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!waiverAccepted) return

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('seminarId', seminar.id)

            const result = await registerForSeminar(formData)

            if (result.error) {
                toast.error(result.error)
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

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-6">
                {/* Registration Info */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Confirm Registration</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        You are registering for <span className="font-semibold text-gray-900">{seminar.name}</span>
                    </p>
                    {seminar.fee && (
                        <div className="text-2xl font-black text-indigo-600 mt-3">
                            ₱{seminar.fee.toLocaleString()}
                        </div>
                    )}
                </div>

                {/* How it works notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">How it works</p>
                            <ol className="list-decimal pl-4 space-y-1 text-amber-700">
                                <li>Submit your registration below</li>
                                <li>Pay the registration fee to your club master</li>
                                <li>Your club master will approve your registration once payment is confirmed</li>
                                <li>You&apos;ll receive a QR code to present at the event</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Registrant Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Registrant</h3>
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

                {/* Waiver */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Waiver & Agreement</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 h-48 overflow-y-auto text-sm text-gray-600 mb-4">
                        <p className="font-bold text-gray-900 mb-2">Participant Waiver and Release of Liability</p>
                        <p className="mb-2">
                            In consideration of being allowed to participate in any way in the seminar, related events and activities, I, the undersigned participant, acknowledge, appreciate, and agree that:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 mb-2">
                            <li>The risk of injury from the activities involved in this program is significant, including the potential for permanent paralysis and death, and while particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist; and,</li>
                            <li>I KNOWINGLY AND FREELY ASSUME ALL SUCH RISKS, both known and unknown, EVEN IF ARISING FROM THE NEGLIGENCE OF THE RELEASEES or others, and assume full responsibility for my participation; and,</li>
                            <li>I willingly agree to comply with the stated and customary terms and conditions for participation. If, however, I observe any unusual significant hazard during my presence or participation, I will remove myself from participation and bring such to the attention of the nearest official immediately; and,</li>
                            <li>I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, HEREBY RELEASE AND HOLD HARMLESS the organizers, their officers, officials, agents, and/or employees, other participants, sponsoring agencies, sponsors, advertisers, and if applicable, owners and lessors of premises used to conduct the event (&quot;RELEASEES&quot;), WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, or loss or damage to person or property, WHETHER ARISING FROM THE NEGLIGENCE OF THE RELEASEES OR OTHERWISE, to the fullest extent permitted by law.</li>
                        </ol>
                        <p>
                            I HAVE READ THIS RELEASE OF LIABILITY AND ASSUMPTION OF RISK AGREEMENT, FULLY UNDERSTAND ITS TERMS, UNDERSTAND THAT I HAVE GIVEN UP SUBSTANTIAL RIGHTS BY SIGNING IT, AND SIGN IT FREELY AND VOLUNTARILY WITHOUT ANY INDUCEMENT.
                        </p>
                    </div>

                    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="relative flex items-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={waiverAccepted}
                                onChange={(e) => setWaiverAccepted(e.target.checked)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-500"
                            />
                            <CheckCircle className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" size={14} />
                        </div>
                        <span className="text-sm text-gray-700">
                            I certify that I have read and understand the waiver above, and I agree to be bound by its terms.
                        </span>
                    </label>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                    <LoadingButton
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        loadingText="Registering..."
                        disabled={!waiverAccepted}
                        className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        Submit Registration
                    </LoadingButton>
                </div>
            </div>
        </div>
    )
}
