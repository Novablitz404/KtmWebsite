'use client'

import { useState } from 'react'
import FaceCamera from '@/components/FaceCamera'
import { enrollFace } from '@/app/actions/attendance'

interface FaceEnrollmentModalProps {
    memberId: string
    memberName: string
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function FaceEnrollmentModal({
    memberId,
    memberName,
    isOpen,
    onClose,
    onSuccess
}: FaceEnrollmentModalProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleCapture = async (descriptor: number[]) => {
        setIsSaving(true)
        setError(null)
        try {
            await enrollFace(memberId, descriptor)
            onSuccess()
            onClose()
        } catch (err) {
            console.error(err)
            setError('Failed to save face data. Please try again.')
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Enroll Face</h3>
                        <p className="text-sm text-gray-500">For {memberName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="bg-black relative aspect-[4/3]">
                    {isSaving ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white">
                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                                <p>Saving face data...</p>
                            </div>
                        </div>
                    ) : (
                        <FaceCamera
                            mode="enrollment"
                            onCapture={handleCapture}
                            onCancel={onClose}
                        />
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-center text-sm font-medium border-t border-red-100">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}
