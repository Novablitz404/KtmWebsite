'use client'

import { useState } from 'react'
import { Star, Plus, X, Calendar, MapPin, DollarSign, Trash2, Users, ListFilter } from 'lucide-react'
import { createPromotionTest, deletePromotionTest, updatePromotionTestStatus } from '@/app/organization/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import GlobalDropdown from '@/components/GlobalDropdown'

interface PromotionTest {
    id: string
    name: string
    testDate: Date
    venue: string | null
    status: string
    fee: number | null
    _count: { registrations: number }
}

const statusConfig: Record<string, { bg: string, text: string }> = {
    UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700' },
    OPEN: { bg: 'bg-green-50', text: 'text-green-700' },
    CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
    COMPLETED: { bg: 'bg-red-50', text: 'text-red-700' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' }
}

export default function PromotionsWidget({ promotionTests: initial }: { promotionTests: PromotionTest[] }) {
    const [promotionTests, setPromotionTests] = useState(initial)
    const [showModal, setShowModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('ALL')

    const filteredTests = promotionTests.filter(t =>
        filterStatus === 'ALL' ? true : t.status === filterStatus
    )

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const result = await createPromotionTest(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Promotion test created!')
            setShowModal(false)
            window.location.reload()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this promotion test?')) return

        const result = await deletePromotionTest(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Promotion test deleted')
            setPromotionTests(prev => prev.filter(p => p.id !== id))
        }
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-50/50 to-white">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-gray-900">Promotion Tests</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <GlobalDropdown
                            trigger={
                                <button className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-amber-600 transition-colors">
                                    <ListFilter className="w-4 h-4" />
                                </button>
                            }
                            align="right"
                            items={[
                                { label: 'All Status', onClick: () => setFilterStatus('ALL') },
                                { label: 'Upcoming', onClick: () => setFilterStatus('UPCOMING'), icon: <Calendar className="w-3 h-3 text-blue-500" /> },
                                { label: 'Open', onClick: () => setFilterStatus('OPEN'), icon: <Star className="w-3 h-3 text-green-500" /> },
                                { label: 'Closed', onClick: () => setFilterStatus('CLOSED'), icon: <X className="w-3 h-3 text-gray-500" /> },
                                { label: 'Completed', onClick: () => setFilterStatus('COMPLETED') }
                            ]}
                        />
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {filteredTests.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400 text-center">No promotion tests found</p>
                    ) : (
                        filteredTests.slice(0, 3).map(test => {
                            const config = statusConfig[test.status] || statusConfig.UPCOMING
                            return (
                                <div key={test.id} className="p-4 hover:bg-gray-50/50 group relative">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{test.name}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(test.testDate).toLocaleDateString()}
                                                </span>
                                                {test.venue && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {test.venue}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                                                {test.status}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(test.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className="flex items-center gap-1 text-gray-500">
                                            <Users className="w-3 h-3" />
                                            {test._count.registrations} registered
                                        </span>
                                        {test.fee && (
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <DollarSign className="w-3 h-3" />
                                                ₱{test.fee.toFixed(0)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {filteredTests.length > 3 && (
                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <Link href="/promotions" className="text-xs text-red-600 font-medium hover:underline">
                            View all {filteredTests.length} promotion tests →
                        </Link>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
                            <h3 className="font-bold text-gray-900">New Promotion Test</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="e.g., January 2026 Belt Test"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                    placeholder="Optional description..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Date *</label>
                                    <input
                                        name="testDate"
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                                    <input
                                        name="registrationDeadline"
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                                    <input
                                        name="venue"
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="Location"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee (₱)</label>
                                    <input
                                        name="fee"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Promotion Test'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
