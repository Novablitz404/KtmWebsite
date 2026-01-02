'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import CreateTournamentModal from '@/components/CreateTournamentModal'

export default function ManagePageActions() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-indigo-200"
            >
                <Plus className="w-5 h-5" />
                Create Tournament
            </button>

            <CreateTournamentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    )
}
