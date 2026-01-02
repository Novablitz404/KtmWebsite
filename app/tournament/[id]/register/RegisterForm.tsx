'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerForTournament } from '@/app/actions'
import { toast } from 'sonner'

interface RegisterFormProps {
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
    }
    categories: {
        id: string
        name: string
    }[]
}

export default function RegisterForm({ tournament, user, categories }: RegisterFormProps) {
    const router = useRouter()
    const [selectedCategory, setSelectedCategory] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Filter categories based on user profile
    const filteredCategories = categories.filter(cat => {
        const catName = cat.name.toLowerCase()
        const userGender = user.gender?.toLowerCase() || ''
        const userBelt = user.belt?.toLowerCase() || ''

        // Basic filtering: match gender
        if (userGender === 'male' && catName.includes('female')) return false
        if (userGender === 'female' && catName.includes('male') && !catName.includes('female')) return false

        // Match belt level
        if (userBelt === 'black' && catName.includes('color')) return false
        if (userBelt === 'color' && catName.includes('black')) return false

        return true
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedCategory) {
            toast.error('Please select a category')
            return
        }

        setSubmitting(true)

        try {
            const result = await registerForTournament({
                categoryId: selectedCategory,
                userId: user.id,
                name: user.name!,
                gender: user.gender!,
                belt: user.belt!,
                weight: user.weight!,
                clubName: user.clubName!
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Registration request sent!')
                router.push(`/tournament/${tournament.id}?registered=true`)
            }
        } catch {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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

            {/* Category Selection */}
            <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Your Category
                </label>

                {filteredCategories.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                        No matching categories found for your profile.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredCategories.map(cat => (
                            <label
                                key={cat.id}
                                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${selectedCategory === cat.id
                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="category"
                                    value={cat.id}
                                    checked={selectedCategory === cat.id}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="sr-only"
                                />
                                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* Notice */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Your registration will be marked as <strong>Pending</strong> until your Club Master approves it.
                    </p>
                </div>



                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting || !selectedCategory}
                    className="mt-6 w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {submitting ? 'Registering...' : 'Register'}
                </button>
            </div>
        </form>
    )
}
