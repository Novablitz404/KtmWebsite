'use client'

import { useState, useEffect } from 'react'
import { X, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { updatePromotionTestFees } from '@/app/organization/actions'

interface PromotionFeesManagerProps {
    organizationId: string
    defaultBeltFees?: any
}

export default function PromotionFeesManager({
    organizationId,
    defaultBeltFees
}: PromotionFeesManagerProps) {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Scroll lock for all modals
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showModal])

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="group flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all text-xs font-medium border border-gray-200"
            >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Promotion Test Fees</h3>
                                <p className="text-gray-500 text-sm mt-1">Set default fees for promotion tests</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setSubmitting(true)
                                const formData = new FormData(e.currentTarget)

                                try {
                                    const result = await updatePromotionTestFees(formData)
                                    if (result?.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success('Fees updated successfully')
                                        setShowModal(false)
                                        router.refresh()
                                    }
                                } catch {
                                    toast.error('Failed to update fees')
                                } finally {
                                    setSubmitting(false)
                                }
                            }}
                            className="space-y-6"
                        >
                            <input type="hidden" name="organizationId" value={organizationId} />

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">White to Purple (₱)</label>
                                    <input
                                        type="number"
                                        name="whiteToPurpleFee"
                                        defaultValue={defaultBeltFees?.whiteToPurple || ''}
                                        placeholder="e.g. 600"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Blue to Maroon (₱)</label>
                                    <input
                                        type="number"
                                        name="blueToMaroonFee"
                                        defaultValue={defaultBeltFees?.blueToMaroon || ''}
                                        placeholder="e.g. 700"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Brown (₱)</label>
                                    <input
                                        type="number"
                                        name="brownFee"
                                        defaultValue={defaultBeltFees?.brown || ''}
                                        placeholder="e.g. 800"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 text-center">These fees will be applied automatically as the base rates when creating new promotion tests.</p>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
