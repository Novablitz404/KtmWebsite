'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registerForSeminar } from '@/app/actions'
import LoadingButton from '@/components/ui/LoadingButton'
import { Upload, FileText, CheckCircle, AlertCircle, QrCode, X, Copy } from 'lucide-react'

interface SeminarRegistrationFormProps {
    seminar: {
        id: string
        name: string
        fee: number | null
        paymentInstructions: string | null
        paymentMethods?: {
            id: string
            type: string
            name: string
            accountName: string
            accountNumber: string
            qrCodeUrl: string | null
        }[]
    }
    user: {
        name: string | null
        email: string
    }
}

export default function SeminarRegistrationForm({ seminar, user }: SeminarRegistrationFormProps) {
    const router = useRouter()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [waiverAccepted, setWaiverAccepted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedQrUrl, setSelectedQrUrl] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProofFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async () => {
        if (!proofFile || !waiverAccepted) return

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('seminarId', seminar.id)
            formData.append('proofOfPayment', proofFile)
            formData.append('waiverSigned', 'true')

            const result = await registerForSeminar(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Registration submitted successfully!')
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
            {/* Steps Indicator */}
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>1</div>
                    Payment
                </div>
                <div className={`h-px w-8 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>2</div>
                    Proof
                </div>
                <div className={`h-px w-8 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>3</div>
                    Waiver
                </div>
            </div>

            <div className="p-6">
                {/* STEP 1: PAYMENT INSTRUCTIONS */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">Registration Fee</h2>
                            <div className="text-3xl font-black text-indigo-600 mt-2">
                                {seminar.fee ? `₱${seminar.fee.toLocaleString()}` : 'Free'}
                            </div>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                            <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} />
                                How to Pay
                            </h3>
                            {/* Structured Payment Methods */}
                            {(seminar.paymentMethods && seminar.paymentMethods.length > 0) ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {seminar.paymentMethods.map((method) => (
                                            <div key={method.id} className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                            {method.type === 'EWALLET' ? 'E-Wallet' : method.type === 'BANK' ? 'Bank Transfer' : 'Other'}
                                                        </span>
                                                        <h4 className="font-bold text-gray-800 mt-1">{method.name}</h4>
                                                    </div>
                                                    {method.qrCodeUrl && (
                                                        <button
                                                            onClick={() => setSelectedQrUrl(method.qrCodeUrl)}
                                                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                                                        >
                                                            <QrCode size={14} />
                                                            View QR
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-400">Account Name</span>
                                                        <span className="font-medium text-gray-900">{method.accountName}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-400">Account No.</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{method.accountNumber}</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(method.accountNumber)
                                                                    toast.success('Copied to clipboard')
                                                                }}
                                                                className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                                title="Copy"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Fallback Text */}
                                    {seminar.paymentInstructions && (
                                        <div className="pt-4 border-t border-indigo-100">
                                            <p className="text-xs font-medium text-indigo-900 mb-1">Additional Instructions:</p>
                                            <div className="prose prose-sm prose-indigo text-indigo-800 whitespace-pre-wrap text-xs">
                                                {seminar.paymentInstructions}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-indigo text-indigo-800 whitespace-pre-wrap">
                                    {seminar.paymentInstructions || 'No specific payment instructions provided. Please contact the organizer.'}
                                </div>
                            )}
                        </div>

                        {/* QR Code Modal */}
                        {selectedQrUrl && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedQrUrl(null)}>
                                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <QrCode className="text-indigo-600" size={18} />
                                            Scan to Pay
                                        </h3>
                                        <button onClick={() => setSelectedQrUrl(null)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
                                            <X size={20} className="text-gray-500" />
                                        </button>
                                    </div>
                                    <div className="p-8 flex justify-center bg-white">
                                        <img src={selectedQrUrl} alt="Payment QR Code" className="max-w-full rounded-lg border border-gray-200 shadow-sm" />
                                    </div>
                                    <div className="p-4 bg-gray-50 text-center text-xs text-gray-500 border-t border-gray-100">
                                        Use your banking app or e-wallet to scan this code.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
                            >
                                I have paid, continue
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: UPLOAD PROOF */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">Upload Proof of Payment</h2>
                            <p className="text-gray-500 text-sm mt-1">Please upload a clear screenshot of your payment receipt.</p>
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${previewUrl ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <div className="space-y-4 text-center">
                                    <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg shadow-sm mx-auto" />
                                    <p className="text-sm font-medium text-indigo-600">Click to change</p>
                                </div>
                            ) : (
                                <div className="space-y-4 text-center">
                                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                                        <Upload size={32} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Click to upload image</p>
                                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!proofFile}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: WAIVER */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">Waiver & Agreement</h2>
                            <p className="text-gray-500 text-sm mt-1">Please read and accept the terms to complete registration.</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 h-64 overflow-y-auto text-sm text-gray-600">
                            <p className="font-bold text-gray-900 mb-2">Participant Waiver and Release of Liability</p>
                            <p className="mb-2">
                                In consideration of being allowed to participate in any way in the seminar, related events and activities, I, the undersigned participant, acknowledge, appreciate, and agree that:
                            </p>
                            <ol className="list-decimal pl-5 space-y-2 mb-2">
                                <li>The risk of injury from the activities involved in this program is significant, including the potential for permanent paralysis and death, and while particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist; and,</li>
                                <li>I KNOWINGLY AND FREELY ASSUME ALL SUCH RISKS, both known and unknown, EVEN IF ARISING FROM THE NEGLIGENCE OF THE RELEASEES or others, and assume full responsibility for my participation; and,</li>
                                <li>I willingly agree to comply with the stated and customary terms and conditions for participation. If, however, I observe any unusual significant hazard during my presence or participation, I will remove myself from participation and bring such to the attention of the nearest official immediately; and,</li>
                                <li>I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, HEREBY RELEASE AND HOLD HARMLESS the organizers, their officers, officials, agents, and/or employees, other participants, sponsoring agencies, sponsors, advertisers, and if applicable, owners and lessors of premises used to conduct the event ("RELEASEES"), WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, or loss or damage to person or property, WHETHER ARISING FROM THE NEGLIGENCE OF THE RELEASEES OR OTHERWISE, to the fullest extent permitted by law.</li>
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
                                I certify that I have read and understand the waiver above, and I agree to be bound by its terms. I also certify that the proof of payment provided is authentic.
                            </span>
                        </label>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Back
                            </button>
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
                )}
            </div>
        </div>
    )
}
