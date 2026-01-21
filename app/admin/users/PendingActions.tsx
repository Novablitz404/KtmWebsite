'use client'

import { Trash2 } from 'lucide-react'
import { deleteInvite } from '../actions'
import { toast } from 'sonner'
import { useState } from 'react'

interface PendingActionsProps {
    inviteId: string
    type: 'ORGANIZER'
}

export default function PendingActions({ inviteId, type }: PendingActionsProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this invite?')) return

        setIsLoading(true)
        const formData = new FormData()
        formData.append('inviteId', inviteId)

        try {
            await deleteInvite(formData)
            toast.success('Invite cancelled')
        } catch {
            toast.error('Failed to cancel invite')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Cancel Invite"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    )
}
