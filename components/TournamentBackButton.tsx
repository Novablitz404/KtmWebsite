'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function TournamentBackButton() {
    const router = useRouter()

    return (
        <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 px-3 py-1.5 rounded-lg -ml-3"
        >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
        </button>
    )
}
