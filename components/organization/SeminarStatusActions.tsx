'use client'

import { useState } from 'react'
import { updateSeminarStatus, deleteSeminar } from '@/app/organization/actions'
import { toast } from 'sonner'
import { ChevronDown, Trash2 } from 'lucide-react'

const statuses = ['UPCOMING', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED']

export default function SeminarStatusActions({ seminarId, currentStatus }: { seminarId: string, currentStatus: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    async function handleStatusChange(newStatus: string) {
        if (newStatus === currentStatus) {
            setIsOpen(false)
            return
        }

        setIsLoading(true)
        const result = await updateSeminarStatus(seminarId, newStatus)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Status updated to ${newStatus}`)
            window.location.reload()
        }
        setIsLoading(false)
        setIsOpen(false)
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this seminar? This action cannot be undone.')) return

        setIsLoading(true)
        const result = await deleteSeminar(seminarId)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Seminar deleted')
            window.location.reload()
        }
        setIsLoading(false)
    }

    return (
        <div className="relative flex items-center gap-1">
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                    Status
                    <ChevronDown className="w-3 h-3" />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            {statuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${status === currentStatus ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={handleDelete}
                disabled={isLoading}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )
}
