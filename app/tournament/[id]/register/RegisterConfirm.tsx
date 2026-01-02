'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerForTournamentAuto } from '@/app/actions'

interface RegisterConfirmProps {
    tournament: {
        id: string
        name: string
    }
    user: {
        id: string
        name: string | null
        clubName: string | null
        gender: string | null
        belt: string | null
        weight: number | null
        birthDate: Date | null
    }
    placement: {
        division: { id: string; name: string }
        weightCategory: { id: string; name: string }
        categoryName: string
    }
}

export default function RegisterConfirm({ tournament, user, placement }: RegisterConfirmProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Calculate age
    const age = user.birthDate
        ? Math.floor((Date.now() - new Date(user.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0

    const handleRegister = async () => {
        setSubmitting(true)
        setError('')

        try {
            const result = await registerForTournamentAuto({
                tournamentId: tournament.id,
                userId: user.id,
                name: user.name!,
                gender: user.gender!,
                belt: user.belt!,
                weight: user.weight!,
                clubName: user.clubName!,
                division: placement.division.name,
                categoryName: placement.categoryName
            })

            if (result.error) {
                setError(result.error)
            } else {
                router.push(`/tournaments?registered=true`)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Profile Summary */}
            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <h2 className="text-lg font-semibold mb-4">Your Registration Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-indigo-200">Name</p>
                        <p className="font-medium">{user.name}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200">Club</p>
                        <p className="font-medium">{user.clubName}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200">Age</p>
                        <p className="font-medium">{age} years old</p>
                    </div>
                    <div>
                        <p className="text-indigo-200">Gender</p>
                        <p className="font-medium">{user.gender}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200">Belt</p>
                        <p className="font-medium">{user.belt}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200">Weight</p>
                        <p className="font-medium">{user.weight} kg</p>
                    </div>
                </div>
            </div>

            {/* Auto-Placed Division & Category */}
            <div className="p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">You will be registered in:</h3>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white text-lg">
                            🥋
                        </div>
                        <div>
                            <p className="font-semibold text-indigo-900">{placement.division.name}</p>
                            <p className="text-sm text-indigo-700">{placement.weightCategory.name}</p>
                        </div>
                    </div>
                </div>

                {/* Notice */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Your registration will be marked as <strong>Pending</strong> until your Club Master approves it. They can also adjust your division or category if needed.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleRegister}
                    disabled={submitting}
                    className="mt-6 w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
            </div>
        </div>
    )
}
