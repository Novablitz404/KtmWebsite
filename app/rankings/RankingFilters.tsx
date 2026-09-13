'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X, Search } from 'lucide-react'
import { useState, useEffect, useTransition } from 'react'
import GlobalDropdown from '@/components/GlobalDropdown'

export default function RankingFilters({ weightClasses = [] }: { weightClasses?: string[] }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [searchText, setSearchText] = useState(searchParams.get('search') || '')

    // Debounce the name search so it doesn't push a new URL on every keystroke
    useEffect(() => {
        const current = searchParams.get('search') || ''
        if (searchText === current) return

        const timeout = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (searchText) params.set('search', searchText)
            else params.delete('search')
            startTransition(() => {
                router.push(`/rankings?${params.toString()}`)
            })
        }, 400)

        return () => clearTimeout(timeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchText])

    // Filter Options
    const disciplines = ['KYORUGI', 'POOMSAE']
    const divisions = ['Grade School', 'Cadet', 'Junior', 'Senior']
    const skills = ['Advance', 'Novice']
    const belts = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']
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

    // Exclude 'type' (it's a tab) and 'tenant' (a site-level override, not a
    // filter) from the filter count.
    const hasFilters = Array.from(searchParams.entries()).some(([key]) => key !== 'type' && key !== 'tenant')

    const clearFilters = () => {
        const params = new URLSearchParams()
        const currentType = searchParams.get('type')
        const tenant = searchParams.get('tenant')
        if (currentType) params.set('type', currentType)
        if (tenant) params.set('tenant', tenant)
        setSearchText('')
        startTransition(() => {
            router.push(`/rankings${params.toString() ? `?${params.toString()}` : ''}`)
        })
    }

    return (
        <div className="bg-[#111] rounded-xl border border-white/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
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

            {/* Name search */}
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search athlete by name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
                />
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

                {/* Category (Weight Class) — options come from whatever weight
                    classes actually exist in the data for the current
                    division/gender, since different organizations define
                    their own weight-class names/cutoffs via their own
                    guideline templates (e.g. "Under 73kg" vs "Under 74kg") —
                    a hardcoded list here would silently mismatch real data. */}
                <GlobalDropdown
                    label="Category"
                    value={getVal('weightCategory')}
                    onChange={(val) => updateFilter('weightCategory', val)}
                    options={[
                        { label: 'All Categories', value: '' },
                        ...weightClasses.map(c => ({ label: c, value: c }))
                    ]}
                    className="w-full"
                    fullWidth
                    trigger={
                        <button
                            type="button"
                            disabled={!getVal('division') || weightClasses.length === 0}
                            className={`inline-flex justify-between items-center rounded-lg border border-gray-200 shadow-sm px-4 py-2 bg-white text-sm font-medium transition-all w-full ${!getVal('division') || weightClasses.length === 0 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
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
                <div className="mt-2 text-xs text-center text-gray-500 animate-pulse">
                    Updating results...
                </div>
            )}
        </div>
    )
}
