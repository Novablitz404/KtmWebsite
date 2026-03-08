'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, UserPlus, Loader2, Search } from 'lucide-react'
import GlobalDropdown from '@/components/GlobalDropdown'
import { searchAllAthletes } from '@/app/actions'
import { registerForPromotion } from '@/app/promotions/actions'
import { calculateAge } from '@/lib/placement'

interface PromotionRegisterFormProps {
    promotionTestId: string
    onRegistered?: () => void
}

interface SearchResult {
    id: string
    name: string | null
    email: string
    belt: string | null
    weight: number | null
    height: number | null
    gender: string | null
    birthDate: Date | null
    clubName: string | null
}

const BELT_OPTIONS = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']

export default function PromotionRegisterForm({ promotionTestId, onRegistered }: PromotionRegisterFormProps) {
    // Collapsible state
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Athlete Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedAthlete, setSelectedAthlete] = useState<SearchResult | null>(null)

    // Form fields
    const [athleteName, setAthleteName] = useState('')
    const [clubName, setClubName] = useState('')
    const [currentBelt, setCurrentBelt] = useState('')

    // Derived: target belt
    const currentBeltIdx = BELT_OPTIONS.findIndex(b => b.toLowerCase() === currentBelt.toLowerCase())
    const targetBelt = currentBeltIdx !== -1 && currentBeltIdx < BELT_OPTIONS.length - 1
        ? BELT_OPTIONS[currentBeltIdx + 1]
        : null

    // Derived: age
    const memberAge = selectedAthlete?.birthDate ? calculateAge(selectedAthlete.birthDate) : null

    // Debounced Athlete Search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([])
            return
        }
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await searchAllAthletes(searchQuery)
                setSearchResults(results as SearchResult[])
            } catch (error) {
                console.error(error)
            } finally {
                setIsSearching(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleSelectAthlete = (athlete: SearchResult) => {
        setSelectedAthlete(athlete)
        setAthleteName(athlete.name || '')
        setClubName(athlete.clubName || '')
        setCurrentBelt(athlete.belt || '')
        setSearchQuery('')
        setSearchResults([])
    }

    const handleClearAthlete = () => {
        setSelectedAthlete(null)
        setAthleteName('')
        setClubName('')
        setCurrentBelt('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!athleteName) {
            toast.error('Please enter or select an athlete')
            return
        }
        if (!currentBelt) {
            toast.error('Please select a current belt')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await registerForPromotion({
                promotionTestId,
                playerId: selectedAthlete?.id || 'manual',
                playerName: athleteName,
                clubName: clubName,
                currentBelt: currentBelt,
                targetBelt: targetBelt || undefined,
                age: memberAge ?? undefined,
            })

            if ('error' in res && res.error) {
                toast.error(res.error)
            } else {
                toast.success(`${athleteName} registered for promotion!`)
                handleClearAthlete()
                onRegistered?.()
            }
        } catch {
            toast.error('Failed to register. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm"
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Collapsible Header */}
            <button
                type="button"
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                        <UserPlus className="w-4.5 h-4.5 text-amber-600" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-gray-900">Register Participant</h3>
                        <p className="text-[11px] text-gray-400">Add an athlete to this promotion test</p>
                    </div>
                </div>
                <div className={`p-1.5 rounded-lg transition-colors ${isFormOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}>
                    {isFormOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                        : <ChevronDown className="w-4 h-4 text-gray-500" />
                    }
                </div>
            </button>

            {/* Collapsible Content */}
            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isFormOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-5 pt-4">

                        {/* Athlete Search */}
                        <div className="space-y-2">
                            <label className={labelClass}>Athlete</label>
                            {selectedAthlete ? (
                                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">
                                            {selectedAthlete.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{selectedAthlete.name}</p>
                                            <p className="text-xs text-amber-600">
                                                {selectedAthlete.clubName || 'No club'} · {selectedAthlete.belt || 'No Belt'}
                                                {memberAge !== null && ` · ${memberAge}yo`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearAthlete}
                                        className="text-xs font-semibold text-gray-500 hover:text-amber-600 px-2 py-1"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all text-sm"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />
                                    )}

                                    {/* Search Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 max-h-60 overflow-y-auto">
                                            {searchResults.map(athlete => (
                                                <button
                                                    key={athlete.id}
                                                    type="button"
                                                    onClick={() => handleSelectAthlete(athlete)}
                                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {athlete.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{athlete.name}</p>
                                                        <p className="text-xs text-gray-500">{athlete.clubName || 'No club'} · {athlete.belt || '—'}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                                        <p className="text-xs text-gray-400 mt-1.5">No athletes found. Fill in details manually below.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name (manual entry) */}
                            {!selectedAthlete && (
                                <div>
                                    <label className={labelClass}>
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={athleteName}
                                        onChange={(e) => setAthleteName(e.target.value)}
                                        placeholder="Athlete full name"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                            )}

                            {/* Club */}
                            <div>
                                <label className={labelClass}>Club / Team</label>
                                <input
                                    type="text"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    placeholder="Club name"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Belt Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>
                                    Current Belt <span className="text-red-500">*</span>
                                </label>
                                <GlobalDropdown
                                    value={currentBelt}
                                    onChange={setCurrentBelt}
                                    options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                    label="Select belt..."
                                    fullWidth
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Target Belt</label>
                                <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium ${targetBelt
                                    ? 'bg-green-50 border border-green-200 text-green-800'
                                    : 'bg-gray-100 border border-gray-200 text-gray-400'
                                    }`}>
                                    {targetBelt || (currentBelt ? 'Already at highest rank' : 'Select current belt first')}
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !athleteName || !currentBelt}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Register Participant
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
