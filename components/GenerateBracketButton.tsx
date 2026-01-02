'use client'

import { generateBracketsForCategory } from '@/app/actions'
import { useState } from 'react'

interface GenerateButtonProps {
    categoryId: string
    disabled?: boolean
}

export default function GenerateBracketButton({ categoryId, disabled }: GenerateButtonProps) {
    const [loading, setLoading] = useState(false)

    return (
        <form action={async () => {
            setLoading(true)
            await generateBracketsForCategory(categoryId)
            setLoading(false)
        }}>
            <button
                type="submit"
                disabled={loading || disabled}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Generating...' : 'Generate Brackets'}
            </button>
        </form>
    )
}
