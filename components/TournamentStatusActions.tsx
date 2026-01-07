'use client'

import { useState } from 'react'
import { updateTournamentStatus } from '@/app/actions/tournament-status'
import { toast } from 'sonner'
import { MoreHorizontal, Ban, CalendarDays, CheckCircle, Clock, PlayCircle } from 'lucide-react'

export default function TournamentStatusActions({
    tournamentId,
    currentStatus
}: {
    tournamentId: string,
    currentStatus: string
}) {
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    async function handleStatusChange(status: string) {
        if (!confirm(`Are you sure you want to mark this tournament as ${status}?`)) return

        setLoading(true)
        setIsOpen(false)

        const res = await updateTournamentStatus(tournamentId, status)
        setLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`Status updated to ${status}`)
        }
    }

    const options = [
        { value: 'UPCOMING', label: 'Upcoming', icon: Clock, color: 'text-blue-600' },
        { value: 'ONGOING', label: 'Ongoing', icon: PlayCircle, color: 'text-green-600' },
        { value: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: 'text-gray-600' },
        { value: 'RESCHEDULED', label: 'Rescheduled', icon: CalendarDays, color: 'text-orange-600' },
        { value: 'CANCELLED', label: 'Cancelled', icon: Ban, color: 'text-red-600' },
    ]

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Change Status"
            >
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleStatusChange(opt.value)}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${opt.value === currentStatus ? 'bg-gray-50 font-medium' : ''} ${opt.color}`}
                            >
                                <opt.icon className="w-4 h-4" />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
