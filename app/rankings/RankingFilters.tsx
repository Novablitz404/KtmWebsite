'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { useState, useTransition } from 'react'

export default function RankingFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Filter Options
    const disciplines = ['KYORUGI', 'POOMSAE']
    const divisions = ['Toddler', 'Grade School', 'Cadet', 'Junior', 'Senior']
    const skills = ['Novice', 'Advance']
    const belts = ['White', 'Yellow', 'Blue', 'Red', 'Black']
    const genders = ['Male', 'Female']

    // Helpers to get current value
    const getVal = (key: string) => searchParams.get(key) || ''

    // Update URL
    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        startTransition(() => {
            router.push(`/rankings?${params.toString()}`)
        })
    }

    // Exclude 'type' from filter count since it's a tab
    const hasFilters = Array.from(searchParams.entries()).some(([key]) => key !== 'type')

    const clearFilters = () => {
        const currentType = searchParams.get('type')
        startTransition(() => {
            if (currentType) {
                router.push(`/rankings?type=${currentType}`)
            } else {
                router.push('/rankings')
            }
        })
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Rankings
                </h3>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium"
                    >
                        <X className="w-3 h-3" />
                        Reset All
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Discipline Removed - Handled by Tabs */}
                {/* Division */}
                <select
                    value={getVal('division')}
                    onChange={(e) => updateFilter('division', e.target.value)}
                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                    <option value="">All Divisions</option>
                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {/* Skill */}
                <select
                    value={getVal('skillLevel')}
                    onChange={(e) => updateFilter('skillLevel', e.target.value)}
                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                    <option value="">All Skill Levels</option>
                    {skills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Belt */}
                <select
                    value={getVal('belt')}
                    onChange={(e) => updateFilter('belt', e.target.value)}
                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                    <option value="">All Belts</option>
                    {belts.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                {/* Gender */}
                <select
                    value={getVal('gender')}
                    onChange={(e) => updateFilter('gender', e.target.value)}
                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                    <option value="">All Genders</option>
                    {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>

            {isPending && (
                <div className="mt-2 text-xs text-center text-gray-400 animate-pulse">
                    Updating results...
                </div>
            )}
        </div>
    )
}
