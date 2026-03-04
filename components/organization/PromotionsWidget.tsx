'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, X, Calendar, MapPin, DollarSign, Trash2, Users, ChevronRight, Eye, Copy, Check } from 'lucide-react'
import { createPromotionTest, deletePromotionTest } from '@/app/organization/actions'
import { toast } from 'sonner'
import Link from 'next/link'
import GlobalCalendar from '@/components/GlobalCalendar'

interface PromotionTest {
    id: string
    name: string
    testDate: Date
    venue: string | null
    status: string
    fee: number | null
    _count: { registrations: number }
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'OPEN': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Open</span>
        case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">Completed</span>
        case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-100">Cancelled</span>
        case 'CLOSED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-100">Closed</span>
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Upcoming</span>
    }
}

export default function PromotionsWidget({ promotionTests: initial }: { promotionTests: PromotionTest[] }) {
    const queryClient = useQueryClient()
    const [promotionTests, setPromotionTests] = useState(initial)
    const [showModal, setShowModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedTest, setSelectedTest] = useState<PromotionTest | null>(null)

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
            queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
        }
    }

    return (
        <>
            <div className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule & Venue</th>
                                <th className="px-6 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-23 py-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {promotionTests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="font-medium text-gray-900">No promotion tests found</p>
                                            <p className="text-sm text-gray-400 mt-1">Click "Create" to schedule a new promotion test.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                promotionTests.map((test) => (
                                    <tr key={test.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 max-w-sm">
                                            <div className="min-w-0">
                                                <span className="block font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {test.name}
                                                </span>
                                                <CopyableId id={test.id} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(test.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                {test.venue && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate max-w-[200px]" title={test.venue}>{test.venue}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(test.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/promotion/${test.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                                                >
                                                    Manage
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setSelectedTest(test)}
                                                    className="inline-flex items-center p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-gray-200 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedTest && (
                <PromotionDetailsModal
                    test={selectedTest}
                    onClose={() => setSelectedTest(null)}
                    onDelete={handleDelete}
                />
            )}

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
                                    <GlobalCalendar
                                        label="Test Date"
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementsByName('testDate')[0] as HTMLInputElement
                                            if (input) input.value = format(date, 'yyyy-MM-dd')
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="testDate" required />
                                </div>
                                <div>
                                    <GlobalCalendar
                                        label="Registration Deadline"
                                        value={undefined}
                                        onChange={(date) => {
                                            const input = document.getElementsByName('registrationDeadline')[0] as HTMLInputElement
                                            if (input) input.value = format(date, 'yyyy-MM-dd')
                                        }}
                                        placeholder="Select date..."
                                        className="w-full"
                                        fullWidth
                                    />
                                    <input type="hidden" name="registrationDeadline" />
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

function PromotionDetailsModal({ test, onClose, onDelete }: { test: PromotionTest; onClose: () => void; onDelete: (id: string) => void }) {
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{test.name}</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                {getStatusBadge(test.status)}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-3">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        <DetailRow icon={<Calendar className="w-4 h-4" />} label="Test Date">
                            <span className="text-sm font-medium text-gray-900">
                                {new Date(test.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </DetailRow>

                        {test.venue && (
                            <DetailRow icon={<MapPin className="w-4 h-4" />} label="Venue">
                                <span className="text-sm text-gray-900">{test.venue}</span>
                            </DetailRow>
                        )}

                        <DetailRow icon={<DollarSign className="w-4 h-4" />} label="Fee">
                            <span className="text-sm font-medium text-gray-900">
                                {test.fee ? `₱${test.fee.toFixed(2)}` : <span className="text-green-600">Free</span>}
                            </span>
                        </DetailRow>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                                <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                                <p className="text-xl font-bold text-gray-900">{test._count.registrations}</p>
                                <p className="text-xs text-gray-500">Registrations</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between">
                        <button
                            onClick={() => { onDelete(test.id); onClose() }}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Delete
                        </button>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                                Close
                            </button>
                            <Link
                                href={`/promotion/${test.id}`}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                            >
                                Manage
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                {children}
            </div>
        </div>
    )
}

function CopyableId({ id }: { id: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <span className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400 font-mono truncate max-w-[220px]" title={id}>
                {id}
            </span>
            <button
                onClick={handleCopy}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Copy ID"
            >
                {copied ? (
                    <Check className="w-3 h-3 text-green-500" />
                ) : (
                    <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                )}
            </button>
        </span>
    )
}
