'use client'

import { useState } from 'react'
import { SeminarRegistration } from '@prisma/client'
import { Check, X, Trash2, Search, DollarSign, Loader2 } from 'lucide-react'
import { updateSeminarRegistrationStatus, deleteSeminarRegistration } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// Basic type matching the schema
interface SeminarParticipantsProps {
    registrations: SeminarRegistration[]
}

export default function SeminarParticipants({ registrations }: SeminarParticipantsProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const filteredRegistrations = registrations.filter(reg =>
        reg.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (reg.clubName && reg.clubName.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    async function handlePaymentToggle(regId: string, currentStatus: string) {
        setUpdatingId(regId)
        const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID'

        try {
            const result = await updateSeminarRegistrationStatus(regId, undefined, newStatus)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Payment status updated to ${newStatus}`)
                router.refresh()
            }
        } catch (error) {
            toast.error('Failed to update status')
        } finally {
            setUpdatingId(null)
        }
    }

    async function handleDelete(regId: string) {
        if (!confirm('Are you sure you want to remove this participant?')) return

        setDeletingId(regId)
        try {
            const result = await deleteSeminarRegistration(regId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Participant removed')
                router.refresh()
            }
        } catch (error) {
            toast.error('Failed to remove participant')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
                    <p className="text-gray-500">Manage registered seminar attendees.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-medium text-gray-500 mr-2">Total Registered:</span>
                    <span className="text-lg font-bold text-indigo-600">{registrations.length}</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or club..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Participant</th>
                                <th className="px-6 py-4">Club</th>
                                <th className="px-6 py-4">Registered On</th>
                                <th className="px-6 py-4">Payment Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRegistrations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <p>No participants found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRegistrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                                                    {reg.playerName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{reg.playerName}</p>
                                                    {reg.belt && <p className="text-xs text-gray-400">{reg.belt} Belt</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {reg.clubName ? (
                                                <span className="text-sm text-gray-700">{reg.clubName}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Independent</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${reg.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {reg.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handlePaymentToggle(reg.id, reg.paymentStatus)}
                                                    disabled={updatingId === reg.id}
                                                    title={reg.paymentStatus === 'PAID' ? "Mark as Unpaid" : "Mark as Paid"}
                                                    className={`p-2 rounded-lg transition-colors 
                                                        ${reg.paymentStatus === 'PAID'
                                                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                            : 'text-gray-400 hover:text-green-600 hover:bg-gray-50'}`}
                                                >
                                                    {updatingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                                                </button>

                                                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                                                <button
                                                    onClick={() => handleDelete(reg.id)}
                                                    disabled={deletingId === reg.id}
                                                    title="Remove Participant"
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    {deletingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
        </div>
    )
}
