'use client'

import { createPlayer, getTournamentPlayers, searchAllAthletes, findPlayerCategory } from '@/app/actions'
import { useRef, useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, UserPlus, Loader2, Search, CheckCircle2, AlertCircle, ChevronUpIcon, ChevronsUpDown } from 'lucide-react'
import GlobalDropdown from '@/components/GlobalDropdown'
import { calculateAge } from '@/lib/placement'

interface PlayerRegistrationProps {
    tournamentId: string
    categories: { id: string; name: string; type?: string }[]
    players: any[]
    readOnly?: boolean
    totalCount?: number
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

export default function PlayerRegistration({ tournamentId, categories, players: initialPlayers, readOnly = false, totalCount = 0 }: PlayerRegistrationProps) {
    const formRef = useRef<HTMLFormElement>(null)

    // Collapsible + loading state
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Athlete Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedAthlete, setSelectedAthlete] = useState<SearchResult | null>(null)

    // Form Fields (editable, pre-filled on athlete select)
    const [athleteName, setAthleteName] = useState('')
    const [clubName, setClubName] = useState('')
    const [belt, setBelt] = useState('Black')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')

    // Event Type + Category State
    const availableEventTypes = (() => {
        const types = new Set(categories.map(c => (c as any).type || 'KYORUGI'))
        return [
            { value: 'KYORUGI', label: 'Kyorugi (Sparring)' },
            { value: 'POOMSAE', label: 'Poomsae (Forms)' },
            { value: 'KYUKPA', label: 'Kyukpa (Breaking)' }
        ].filter(t => types.has(t.value))
    })()

    const [eventType, setEventType] = useState<string>(availableEventTypes[0]?.value || 'KYORUGI')
    const [poomsaeType, setPoomsaeType] = useState('INDIVIDUAL')
    const [teamId, setTeamId] = useState('')

    // Auto-Category State
    const [tentativeCategory, setTentativeCategory] = useState<{ id: string; name: string; type: string } | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualCategoryId, setManualCategoryId] = useState('')

    // Categories filtered by selected event type (for manual selection)
    const filteredCategories = categories.filter(c => (c as any).type === eventType)

    // The effective category: manual override takes priority
    const effectiveCategory = isManualMode
        ? filteredCategories.find(c => c.id === manualCategoryId) || null
        : tentativeCategory

    // Server-side pagination state
    const [players, setPlayers] = useState(initialPlayers)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const itemsPerPage = 20

    // ─── Table search / sort / filter state ───
    const [tableSearch, setTableSearch] = useState('')
    const [sortField, setSortField] = useState<'name' | 'club' | 'category' | 'status'>('name')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL')
    const [filterDiscipline, setFilterDiscipline] = useState<'ALL' | 'KYORUGI' | 'POOMSAE' | 'KYUKPA'>('ALL')
    const [isSearchMode, setIsSearchMode] = useState(false)

    const totalPages = Math.ceil(Math.max(totalCount, players.length, initialPlayers.length) / itemsPerPage)

    // ─── Derived: filtered + sorted display list (search is server-side now) ───
    const displayedPlayers = useMemo(() => {
        return [...players]
            .filter(p => filterStatus === 'ALL' || p.registrationStatus === filterStatus)
            .filter(p => filterDiscipline === 'ALL' || (p.category as any)?.type === filterDiscipline)
            .sort((a, b) => {
                let aVal = '', bVal = ''
                if (sortField === 'name')     { aVal = a.name || ''; bVal = b.name || '' }
                if (sortField === 'club')     { aVal = a.club?.name || ''; bVal = b.club?.name || '' }
                if (sortField === 'category') { aVal = a.category?.name || ''; bVal = b.category?.name || '' }
                if (sortField === 'status')   { aVal = a.registrationStatus || ''; bVal = b.registrationStatus || '' }
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
            })
    }, [players, sortField, sortDir, filterStatus, filterDiscipline])

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('asc') }
    }

    useEffect(() => {
        if (currentPage === 1 && !isSearchMode) {
            setPlayers(initialPlayers)
        }
    }, [initialPlayers, currentPage, isSearchMode])

    // ─── Debounced server-side search ───
    useEffect(() => {
        if (!tableSearch || tableSearch.trim().length < 2) {
            if (isSearchMode) {
                setIsSearchMode(false)
                setPlayers(initialPlayers)
                setCurrentPage(1)
            }
            return
        }

        const timer = setTimeout(async () => {
            setIsLoading(true)
            try {
                const results = await getTournamentPlayers(tournamentId, undefined, undefined, tableSearch.trim())
                setPlayers(results)
                setIsSearchMode(true)
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setIsLoading(false)
            }
        }, 400)

        return () => clearTimeout(timer)
    }, [tableSearch])

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

    // Auto-Detect Category
    useEffect(() => {
        const detect = async () => {
            if (!selectedAthlete) {
                setTentativeCategory(null)
                return
            }

            setIsDetecting(true)
            try {
                const category = await findPlayerCategory(tournamentId, {
                    birthDate: selectedAthlete.birthDate || new Date(),
                    gender: selectedAthlete.gender || 'Male',
                    weight: parseFloat(weight) || 0,
                    height: parseFloat(height) || 0,
                    belt: belt,
                    poomsaeType: eventType === 'POOMSAE' ? poomsaeType : undefined,
                    type: eventType,
                })
                setTentativeCategory(category)
            } catch (e) {
                console.error(e)
                setTentativeCategory(null)
            } finally {
                setIsDetecting(false)
            }
        }

        const timer = setTimeout(detect, 500)
        return () => clearTimeout(timer)
    }, [selectedAthlete, weight, height, belt, eventType, poomsaeType, tournamentId])

    // Select athlete from search
    const handleSelectAthlete = (athlete: SearchResult) => {
        setSelectedAthlete(athlete)
        setAthleteName(athlete.name || '')
        setClubName(athlete.clubName || '')
        setBelt(athlete.belt || 'Black')
        setWeight(athlete.weight?.toString() || '')
        setHeight(athlete.height?.toString() || '')
        setSearchQuery('')
        setSearchResults([])
        setIsManualMode(false)
        setManualCategoryId('')
    }

    // Clear selected athlete
    const handleClearAthlete = () => {
        setSelectedAthlete(null)
        setAthleteName('')
        setClubName('')
        setBelt('Black')
        setWeight('')
        setHeight('')
        setTentativeCategory(null)
        setIsManualMode(false)
        setManualCategoryId('')
    }

    // Smart height/weight: <=11yo uses height, 12+ uses weight
    const memberAge = selectedAthlete?.birthDate ? calculateAge(selectedAthlete.birthDate) : null
    const usesHeight = memberAge !== null && memberAge <= 11

    const handlePageChange = async (newPage: number) => {
        if (newPage === currentPage) return
        setIsLoading(true)
        try {
            const skip = (newPage - 1) * itemsPerPage
            const newPlayers = await getTournamentPlayers(tournamentId, skip, itemsPerPage)
            setPlayers(newPlayers)
            setCurrentPage(newPage)
        } catch (error) {
            console.error("Failed to fetch players:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!athleteName) {
            toast.error('Please enter or select an athlete')
            return
        }
        if (!effectiveCategory) {
            toast.error('Please ensure a category is selected')
            return
        }

        setIsSubmitting(true)
        const formData = new FormData()
        formData.set('tournamentId', tournamentId)
        formData.set('name', athleteName)
        formData.set('club', clubName)
        formData.set('categoryId', effectiveCategory.id)
        formData.set('belt', belt)
        formData.set('weight', weight)
        formData.set('skillLevel', belt === 'Black' ? 'Advance' : 'Novice')
        formData.set('poomsaeType', eventType === 'POOMSAE' ? poomsaeType : 'INDIVIDUAL')
        if (selectedAthlete?.gender) formData.set('gender', selectedAthlete.gender)

        try {
            await createPlayer(formData)
            toast.success(`${athleteName} registered successfully!`)

            // Reset form
            handleClearAthlete()
            setEventType(availableEventTypes[0]?.value || 'KYORUGI')
            setPoomsaeType('INDIVIDUAL')
            setTeamId('')

            // Refresh list
            if (currentPage !== 1) {
                handlePageChange(1)
            } else {
                const refreshed = await getTournamentPlayers(tournamentId, 0, itemsPerPage)
                setPlayers(refreshed)
            }
        } catch {
            toast.error('Failed to register athlete. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"

    return (
        <div className="space-y-4">
            {/* ─── Collapsible Register Form ─── */}
            {!readOnly && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                        type="button"
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                                <UserPlus className="w-4.5 h-4.5 text-red-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-gray-900">Register Athlete</h3>
                                <p className="text-[11px] text-gray-400">Search existing athletes or add manually</p>
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
                    <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isFormOpen ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 pt-4">

                                {/* ─── Step 1: Athlete Search ─── */}
                                <div className="space-y-2">
                                    <label className={labelClass}>Athlete</label>
                                    {selectedAthlete ? (
                                        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">
                                                    {selectedAthlete.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{selectedAthlete.name}</p>
                                                    <p className="text-xs text-red-600">
                                                        {selectedAthlete.clubName || 'No club'} · {selectedAthlete.belt || 'No Belt'}
                                                        {memberAge !== null && ` · ${memberAge}yo`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleClearAthlete}
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
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm"
                                            />
                                            {isSearching && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 animate-spin" />
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

                                {/* ─── Step 2: Athlete Details (editable) ─── */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Name (manual entry when no athlete selected) */}
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

                                    {/* Belt */}
                                    <div>
                                        <label className={labelClass}>Belt</label>
                                        <GlobalDropdown
                                            value={belt}
                                            onChange={setBelt}
                                            options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                            label="Select..."
                                            fullWidth
                                        />
                                    </div>

                                    {/* Weight or Height (smart) */}
                                    {usesHeight ? (
                                        <div>
                                            <label className={labelClass}>Height (cm)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                                placeholder="e.g. 140"
                                                className={inputClass}
                                                required={eventType === 'KYORUGI'}
                                                disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className={labelClass}>Weight (kg)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                placeholder="e.g. 57.5"
                                                className={inputClass}
                                                required={eventType === 'KYORUGI'}
                                                disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ─── Step 3: Event Type ─── */}
                                {availableEventTypes.length > 1 && (
                                    <div>
                                        <label className={labelClass}>Event Type</label>
                                        <div className="flex gap-2">
                                            {availableEventTypes.map(type => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setEventType(type.value)
                                                        setIsManualMode(false)
                                                        setManualCategoryId('')
                                                    }}
                                                    className={`flex-1 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${eventType === type.value
                                                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Poomsae extra fields */}
                                {eventType === 'POOMSAE' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className={labelClass}>Poomsae Type</label>
                                            <GlobalDropdown
                                                value={poomsaeType}
                                                onChange={setPoomsaeType}
                                                options={[
                                                    { value: 'INDIVIDUAL', label: 'Individual' },
                                                    { value: 'PAIR', label: 'Pair' },
                                                    { value: 'TEAM', label: 'Team' }
                                                ]}
                                                fullWidth
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Team ID (optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1, A, B"
                                                value={teamId}
                                                onChange={(e) => setTeamId(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ─── Step 4: Category (Auto-Detect + Manual Override) ─── */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsManualMode(!isManualMode)
                                                setManualCategoryId('')
                                            }}
                                            className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
                                        >
                                            {isManualMode ? '← Auto-Detect' : 'Choose Manually'}
                                        </button>
                                    </div>

                                    {isManualMode ? (
                                        <div className="space-y-2">
                                            <GlobalDropdown
                                                value={manualCategoryId}
                                                onChange={setManualCategoryId}
                                                options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
                                                label="Select category..."
                                                fullWidth
                                                searchable
                                            />
                                            {manualCategoryId && (
                                                <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Manually selected</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        !selectedAthlete ? (
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-500 text-sm">Select an athlete first</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">Category will auto-detect from athlete profile, or choose manually.</p>
                                                </div>
                                            </div>
                                        ) : isDetecting ? (
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Detecting category...</span>
                                            </div>
                                        ) : tentativeCategory ? (
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{tentativeCategory.name}</p>
                                                    <p className="text-xs text-green-600 mt-0.5">Auto-detected based on profile</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                                <div>
                                                    <p className="font-medium text-gray-700 text-sm">No Category Found</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">Try choosing manually or check weight, age, and requirements.</p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                {categories.length === 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-amber-700 text-xs font-medium">⚠️ Please create a category first before registering athletes.</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || categories.length === 0 || !effectiveCategory}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            Register Athlete
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Athletes Table ─── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Table header + toolbar */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                            {isSearchMode
                                ? `Search Results (${players.length})`
                                : `Registered Athletes (${totalCount > 0 ? totalCount : players.length})`
                            }
                        </h3>
                        {!isSearchMode && (
                            <span className="text-xs text-gray-500">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                        )}
                    </div>

                    {/* Search + filters */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Search input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search name, club, or category..."
                                value={tableSearch}
                                onChange={e => setTableSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                            />
                        </div>

                        {/* Discipline pills */}
                        <div className="flex gap-1">
                            {(['ALL', 'KYORUGI', 'POOMSAE', 'KYUKPA'] as const).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setFilterDiscipline(d)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                        filterDiscipline === d
                                            ? d === 'KYORUGI' ? 'bg-red-600 text-white'
                                            : d === 'POOMSAE' ? 'bg-blue-600 text-white'
                                            : d === 'KYUKPA' ? 'bg-purple-600 text-white'
                                            : 'bg-gray-900 text-white'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {d === 'ALL' ? 'All' : d.charAt(0) + d.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>

                        {/* Status filter */}
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        >
                            <option value="ALL">All Status</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {/* Sortable: Name */}
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('name')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Name
                                            <ChevronsUpDown className={`w-3 h-3 ${sortField === 'name' ? 'text-red-500' : 'text-gray-300'}`} />
                                        </span>
                                    </th>
                                    {/* Sortable: Club */}
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('club')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Club
                                            <ChevronsUpDown className={`w-3 h-3 ${sortField === 'club' ? 'text-red-500' : 'text-gray-300'}`} />
                                        </span>
                                    </th>
                                    {/* Sortable: Category */}
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('category')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Category
                                            <ChevronsUpDown className={`w-3 h-3 ${sortField === 'category' ? 'text-red-500' : 'text-gray-300'}`} />
                                        </span>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belt</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                                    {/* Sortable: Status */}
                                    <th
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('status')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Status
                                            <ChevronsUpDown className={`w-3 h-3 ${sortField === 'status' ? 'text-red-500' : 'text-gray-300'}`} />
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedPlayers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            {tableSearch || filterStatus !== 'ALL' || filterDiscipline !== 'ALL'
                                                ? 'No athletes match your filters.'
                                                : 'No players registered.'}
                                        </td>
                                    </tr>
                                ) : (
                                    displayedPlayers.map((player) => (
                                        <tr key={player.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.club?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.category?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.belt}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${player.skillLevel === 'Advance' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                    {player.skillLevel || 'Novice'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${player.registrationStatus === 'APPROVED'
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
                                                    : player.registrationStatus === 'REJECTED'
                                                        ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                                                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${player.registrationStatus === 'APPROVED' ? 'bg-green-500'
                                                        : player.registrationStatus === 'REJECTED' ? 'bg-red-500'
                                                            : 'bg-amber-500 animate-pulse'
                                                        }`}></span>
                                                    {player.registrationStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && !isSearchMode && (
                    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <div className="text-xs text-gray-500 font-medium">
                            Page {currentPage} of {totalPages}
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || isLoading}
                            className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
