'use client'

import { useState } from 'react'
import EventRegistrationButton from '@/components/EventRegistrationButton'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

interface WaiverRegistrationProps {
    eventId: string
    isRegistered: boolean
    status?: string
    paymentStatus?: string
    disabled: boolean
    isOpen: boolean
    registrationDeadline?: string
    deadlinePassed?: boolean
}

export default function WaiverRegistration({
    eventId,
    isRegistered,
    status,
    paymentStatus,
    disabled,
    isOpen,
    registrationDeadline,
    deadlinePassed
}: WaiverRegistrationProps) {
    const [waiverAccepted, setWaiverAccepted] = useState(false)

    return (
        <div className="space-y-5">
            {/* Deadline Notice */}
            {registrationDeadline && (
                <div className={`rounded-xl border p-4 flex items-center gap-3 ${deadlinePassed
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${deadlinePassed ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                        <span className="text-lg">{deadlinePassed ? '⏰' : '📅'}</span>
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${deadlinePassed ? 'text-red-800' : 'text-amber-800'}`}>
                            {deadlinePassed ? 'Registration Deadline Passed' : 'Registration Deadline'}
                        </p>
                        <p className={`text-xs ${deadlinePassed ? 'text-red-600' : 'text-amber-600'}`}>
                            {new Date(registrationDeadline).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* How it works */}
            {!isRegistered && isOpen && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">How it works</p>
                            <ol className="list-decimal pl-4 space-y-0.5 text-xs text-amber-700">
                                <li>Submit your registration below</li>
                                <li>Pay the registration fee to your club master</li>
                                <li>Your club master will approve your registration once payment is confirmed</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Waiver Agreement */}
            {!isRegistered && isOpen && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📋</span> Waiver & Agreement
                    </h3>
                    <div className="text-xs text-gray-600 leading-relaxed space-y-2 max-h-32 overflow-y-auto pr-2 mb-4">
                        <p>
                            By registering for this promotion test, I acknowledge and agree to the following:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>I am physically fit and have trained adequately for this belt examination.</li>
                            <li>I understand that participation involves inherent physical risks, and I assume full responsibility for any injuries sustained during the test.</li>
                            <li>I agree to abide by all rules and instructions set by the examining panel and the organizing body.</li>
                            <li>I understand that the results of the examination are final and at the discretion of the examining panel.</li>
                            <li>I authorize the use of photographs and videos taken during the event for promotional purposes.</li>
                        </ul>
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

            {/* Registration Button */}
            <div className="flex justify-center pt-2">
                <EventRegistrationButton
                    eventId={eventId}
                    eventType="promotion"
                    isRegistered={isRegistered}
                    status={status}
                    paymentStatus={paymentStatus}
                    disabled={disabled}
                    onBeforeRegister={() => {
                        if (!isRegistered && isOpen && !waiverAccepted) {
                            toast.error('Please accept the waiver before registering.')
                            return false
                        }
                        return true
                    }}
                />
            </div>

            {!isRegistered && !isOpen && (
                <p className="text-center text-xs text-gray-400">
                    Registration is currently closed for this promotion test.
                </p>
            )}
        </div>
    )
}
