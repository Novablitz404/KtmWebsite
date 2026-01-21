'use client'
import { useState, useEffect, useMemo } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { searchClubMembers, getUpcomingTournaments, getTournamentCategories, registerForTournament } from '@/app/actions'

interface AddAthleteModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    clubName: string
}

interface Member {
    id: string
    name: string | null
    email: string
    belt: string | null
    weight: number | null
    gender: string | null
    birthDate: Date | null
}

interface Tournament {
    id: string
    name: string
    startDate: Date
}

interface Category {
    id: string
    name: string
    type: string
}

export default function AddAthleteModal({ isOpen, onClose, clubId, clubName }: AddAthleteModalProps) {
    // Member Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Member[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)

    // Selection State
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [selectedTournament, setSelectedTournament] = useState<string>('')
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('')

    // Form State (Details)
    const [weight, setWeight] = useState<string>('')
    const [belt, setBelt] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)
    const [categorySearch, setCategorySearch] = useState('')
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)

    // Filtered categories based on search
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    )

    // Load Tournaments on Mount
    useEffect(() => {
        if (isOpen) {
            getUpcomingTournaments().then(setTournaments).catch(() => toast.error('Failed to load tournaments'))
        }
    }, [isOpen])

    // Load Categories when Tournament Selected
    useEffect(() => {
        if (selectedTournament) {
            getTournamentCategories(selectedTournament).then(setCategories).catch(() => toast.error('Failed to load categories'))
            setSelectedCategory('')
        }
    }, [selectedTournament])

    // Member Search Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true)
                try {
                    const results = await searchClubMembers(clubName, searchQuery)
                    setSearchResults(results)
                } catch (error) {
                    console.error(error)
                } finally {
                    setIsSearching(false)
                }
            } else {
                setSearchResults([])
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery, clubId])

    // Pre-fill form when member selected
    const handleSelectMember = (member: Member) => {
        setSelectedMember(member)
        setSearchQuery('')
        setSearchResults([])
        setWeight(member.weight?.toString() || '')
        setBelt(member.belt || '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMember || !selectedTournament || !selectedCategory || !weight || !belt) {
            toast.error('Please fill in all fields')
            return
        }

        setSubmitting(true)
        try {
            const res = await registerForTournament({
                categoryId: selectedCategory,
                userId: selectedMember.id, // Using Member ID from search
                name: selectedMember.name || 'Unknown',
                gender: selectedMember.gender || 'MALE', // Default fallback, should probably ask if missing
                belt: belt,
                weight: parseFloat(weight),
                clubName: clubName
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Athlete registered successfully')
                onClose()
                // Reset state
                setSelectedMember(null)
                setSelectedTournament('')
                setSelectedCategory('')
                setWeight('')
                setBelt('')
            }
        } catch (error) {
            toast.error('Registration failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Add Athlete to Tournament</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-visible">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Member Search */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Athlete</label>
                            {selectedMember ? (
                                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                            {selectedMember.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{selectedMember.name}</p>
                                            <p className="text-xs text-indigo-600">{selectedMember.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMember(null)}
                                        className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1"
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
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
                                    )}

                                    {/* Search Dropdown */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 max-h-60 overflow-y-auto">
                                            {searchResults.map(member => (
                                                <button
                                                    key={member.id}
                                                    type="button"
                                                    onClick={() => handleSelectMember(member)}
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                        {member.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                        <p className="text-xs text-gray-500">{member.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tournament Selection */}
                        <div className="space-y-4">
                            <CustomSelect
                                label="Tournament"
                                value={selectedTournament}
                                onChange={setSelectedTournament}
                                options={tournaments.map(t => ({ value: t.id, label: t.name }))}
                                placeholder="Select Tournament"
                                required
                            />

                            {/* Searchable Category Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search or select category..."
                                        value={categories.find(c => c.id === selectedCategory)?.name || categorySearch}
                                        onChange={(e) => {
                                            setCategorySearch(e.target.value)
                                            setSelectedCategory('')
                                            setIsCategoryDropdownOpen(true)
                                        }}
                                        onFocus={() => setIsCategoryDropdownOpen(true)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                        required
                                    />
                                    {isCategoryDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 max-h-40 overflow-y-auto">
                                            {(categorySearch ? filteredCategories : categories).length > 0 ? (
                                                (categorySearch ? filteredCategories : categories).map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory(cat.id)
                                                            setCategorySearch('')
                                                            setIsCategoryDropdownOpen(false)
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors ${selectedCategory === cat.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="px-3 py-2 text-sm text-gray-400">No categories found</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Player Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Belt</label>
                                <input
                                    type="text"
                                    value={belt}
                                    onChange={(e) => setBelt(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                'Register Athlete'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
