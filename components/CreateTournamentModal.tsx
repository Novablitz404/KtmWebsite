'use client'

import { Fragment } from 'react'
import { X } from 'lucide-react'
import TournamentForm from './TournamentForm'

interface CreateTournamentModalProps {
    isOpen: boolean
    onClose: () => void
    templates: { id: string; name: string }[]
}

export default function CreateTournamentModal({ isOpen, onClose, templates }: CreateTournamentModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">Create New Tournament</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[85vh] overflow-y-auto">
                        {/* We pass a custom prop or just rely on the form. 
                             Ideally TournamentForm should handle 'onSuccess' to close modal, 
                             but for now let's just render it. */}
                        <TournamentForm isModal={true} onSuccess={onClose} templates={templates} />
                    </div>
                </div>
            </div>
        </div>
    )
}
