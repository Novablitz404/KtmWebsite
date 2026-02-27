'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import GlobalDropdown from '@/components/GlobalDropdown'

export default function RankingFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Filter Options
    const disciplines = ['KYORUGI', 'POOMSAE']
    const divisions = ['Grade School', 'Cadet', 'Junior', 'Senior']
    const skills = ['Advance', 'Novice']
    const belts = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']
    const genders = ['Male', 'Female']

    // Category Mappings (Standard WT)
    // Category Mappings (Matched with prisma/seed-tap-elite-combined.ts)
    const categoryMap: Record<string, string[]> = {
        'Grade School': [
            'Under 112cm', 'Under 120cm', 'Under 128cm', 'Under 136cm',
            'Under 144cm', 'Under 152cm', 'Under 160cm', 'Under 168cm', 'Over 168cm'
        ],
        'Cadet': [
            'Fin', 'Fly', 'Bantam', 'Feather',
            'Light', 'Welter', 'Lt Middle', 'Middle',
            'Lt Heavy', 'Heavy'
        ],
        'Junior': [
            'Fin', 'Fly', 'Bantam', 'Feather',
            'Light', 'Welter', 'Lt Middle', 'Middle',
            'Lt Heavy', 'Heavy'
        ],
        'Senior': [
            'Under 54kg', 'Under 58kg', 'Under 63kg', 'Under 68kg',
            'Under 74kg', 'Under 80kg', 'Under 87kg', 'Over 87kg', // Male
            'Under 46kg', 'Under 49kg', 'Under 53kg', 'Under 57kg',
            'Under 62kg', 'Under 67kg', 'Under 73kg', 'Over 73kg'  // Female
        ],
    }

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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Discipline Removed - Handled by Tabs */}
                {/* Division */}
                {/* Division */}
                <GlobalDropdown
                    label="Division"
                    value={getVal('division')}
                    onChange={(val) => {
                        const params = new URLSearchParams(searchParams.toString())
                        if (val) params.set('division', val)
                        else params.delete('division')
                        params.delete('weightCategory') // Reset dependent filter
                        startTransition(() => router.push(`/rankings?${params.toString()}`))
                    }}
                    options={[
                        { label: 'All Divisions', value: '' },
                        ...divisions.map(d => ({ label: d, value: d }))
                    ]}
                    className="w-full"
                    fullWidth
                />

                {/* Categories (Dependent on Division) */}
                {/* Categories (Dependent) */}
                <GlobalDropdown
                    label="Category"
                    value={getVal('weightCategory')}
                    onChange={(val) => updateFilter('weightCategory', val)}
                    options={[
                        { label: 'All Categories', value: '' },
                        ...(categoryMap[getVal('division')] || []).map(c => ({ label: c, value: c }))
                    ]}
                    className="w-full"
                    fullWidth
                    trigger={
                        <button
                            type="button"
                            disabled={!getVal('division') || !categoryMap[getVal('division')]}
                            className={`inline-flex justify-between items-center rounded-lg border border-gray-200 shadow-sm px-4 py-2 bg-white text-sm font-medium transition-all w-full ${!getVal('division') ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                            <span className="truncate">{getVal('weightCategory') || 'All Categories'}</span>
                            <svg className="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    }
                />

                {/* Skill Level - Only show if relevant (Logic: Kyorugi is strict Advance, Poomsae has no skill. So hide for now?)
                    Actually, user said "Kyorugi: Advance only" and "Poomsae: No skill level".
                    So the dropdown is effectively useless for both default cases.
                    Let's hide it unless there's a specific need, or keep it disabled/readonly?
                    User request: "remove the novice"
                    Let's hide the dropdown completely to avoid confusion.
                 */}
                {/*
                <select
                    value={getVal('skillLevel')}
                    onChange={(e) => updateFilter('skillLevel', e.target.value)}
                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                    <option value="">All Skill Levels</option>
                    {skills.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                */}

                {/* Belt */}
                {/* Belt */}
                <GlobalDropdown
                    label="Belt"
                    value={getVal('belt')}
                    onChange={(val) => updateFilter('belt', val)}
                    options={[
                        { label: 'All Belts', value: '' },
                        ...belts.map(b => ({ label: b, value: b }))
                    ]}
                    className="w-full"
                    fullWidth
                />

                {/* Gender */}
                {/* Gender */}
                <GlobalDropdown
                    label="Gender"
                    value={getVal('gender')}
                    onChange={(val) => updateFilter('gender', val)}
                    options={[
                        { label: 'All Genders', value: '' },
                        ...genders.map(g => ({ label: g, value: g }))
                    ]}
                    className="w-full"
                    fullWidth
                />
            </div>

            {isPending && (
                <div className="mt-2 text-xs text-center text-gray-400 animate-pulse">
                    Updating results...
                </div>
            )}
        </div>
    )
}
