'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { updateAthleteMetrics } from '@/app/athlete/actions'
import { Ruler, Weight } from 'lucide-react'

export default function CompleteProfileModal() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const handleSubmit = (formData: FormData) => {
        setError(null)
        startTransition(async () => {
            try {
                await updateAthleteMetrics(formData)
            } catch (e) {
                setError('Failed to update profile. Please try again.')
            }
        })
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
                    <p className="text-blue-100">Please provide your metrics to match you with the correct division.</p>
                </div>

                <form action={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-blue-600" />
                                Height (cm)
                            </label>
                            <input
                                type="number"
                                name="height"
                                step="0.1"
                                required
                                placeholder="e.g 175"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Weight className="w-4 h-4 text-blue-600" />
                                Weight (kg)
                            </label>
                            <input
                                type="number"
                                name="weight"
                                step="0.1"
                                required
                                placeholder="e.g 65.5"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {isPending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Save & Continue'
                        )}
                    </button>

                    <p className="text-xs text-center text-gray-400">
                        These details are strictly used for tournament categorization.
                    </p>
                </form>
            </div>
        </div>,
        document.body
    )
}
