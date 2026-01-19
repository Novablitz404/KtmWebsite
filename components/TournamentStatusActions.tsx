'use client'

import GlobalDropdown from '@/components/GlobalDropdown'

import { useState } from 'react'
import { updateTournamentStatus } from '@/app/actions/tournament-status'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { MoreHorizontal, Ban, CalendarDays, CheckCircle, Clock, PlayCircle } from 'lucide-react'

export default function TournamentStatusActions({
    tournamentId,
    currentStatus
}: {
    tournamentId: string,
    currentStatus: string
}) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    async function handleStatusChange(status: string) {
        if (!confirm(`Are you sure you want to mark this tournament as ${status}?`)) return

        setLoading(true)
        const res = await updateTournamentStatus(tournamentId, status)
        setLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`Status updated to ${status}`)
            router.refresh()
        }
    }

    const options = [
        { value: 'UPCOMING', label: 'Upcoming', icon: <Clock className="w-4 h-4 text-blue-500" /> },
        { value: 'ONGOING', label: 'Ongoing', icon: <PlayCircle className="w-4 h-4 text-green-500" /> },
        { value: 'COMPLETED', label: 'Completed', icon: <CheckCircle className="w-4 h-4 text-gray-500" /> },
        { value: 'RESCHEDULED', label: 'Rescheduled', icon: <CalendarDays className="w-4 h-4 text-orange-500" /> },
        { value: 'CANCELLED', label: 'Cancelled', icon: <Ban className="w-4 h-4 text-red-500" /> },
    ]

    return (
        <GlobalDropdown
            trigger={
                <button
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Change Status"
                >
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
            }
            align="right"
            items={options.map(opt => ({
                label: opt.label,
                icon: opt.icon,
                onClick: () => handleStatusChange(opt.value),
                disabled: opt.value === currentStatus
            }))}
        />
    )
}
