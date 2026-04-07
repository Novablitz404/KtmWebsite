'use client'

import { createPlayer, getTournamentPlayers, searchAllAthletes, findPlayerCategory } from '@/app/actions'
import { useRef, useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
    ChevronDown, ChevronUp, UserPlus, Loader2, Search,
    CheckCircle2, AlertCircle, ChevronsUpDown, X, Users, Filter
} from 'lucide-react'
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

const STATUS_BADGE: Record<string, string> = {
    APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    PENDING:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
}
const STATUS_DOT: Record<string, string> = {
    APPROVED: 'bg-emerald-500',
    PENDING:  'bg-amber-500 animate-pulse',
    REJECTED: 'bg-red-500',
}

export default function PlayerRegistration({
    tournamentId, categories, players: initialPlayers, readOnly = false, totalCount = 0
}: PlayerRegistrationProps) {
    const formRef = useRef<HTMLFormElement>(null)

    const [isFormOpen, setIsFormOpen]   = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [searchQuery, setSearchQuery]     = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching]     = useState(false)
    const [selectedAthlete, setSelectedAthlete] = useState<SearchResult | null>(null)

    const [athleteName, setAthleteName] = useState('')
    const [clubName, setClubName]       = useState('')
    const [belt, setBelt]               = useState('Black')
    const [weight, setWeight]           = useState('')
    const [height, setHeight]           = useState('')

    const availableEventTypes = (() => {
        const types = new Set(categories.map(c => (c as any).type || 'KYORUGI'))
        return [
            { value: 'KYORUGI', label: 'Kyorugi' },
            { value: 'POOMSAE', label: 'Poomsae' },
            { value: 'KYUKPA',  label: 'Kyukpa'  },
        ].filter(t => types.has(t.value))
    })()

    const [eventType, setEventType]       = useState<string>(availableEventTypes[0]?.value || 'KYORUGI')
    const [poomsaeType, setPoomsaeType]   = useState('INDIVIDUAL')
    const [teamId, setTeamId]             = useState('')

    const [tentativeCategory, setTentativeCategory]   = useState<{ id: string; name: string; type: string } | null>(null)
    const [isDetecting, setIsDetecting]               = useState(false)
    const [isManualMode, setIsManualMode]             = useState(false)
    const [manualCategoryId, setManualCategoryId]     = useState('')

    const filteredCategories = categories.filter(c => (c as any).type === eventType)
    const effectiveCategory  = isManualMode
        ? filteredCategories.find(c => c.id === manualCategoryId) || null
        : tentativeCategory

    const [players, setPlayers]           = useState(initialPlayers)
    const [currentPage, setCurrentPage]   = useState(1)
    const [isLoading, setIsLoading]       = useState(false)
    const itemsPerPage = 20

    const [tableSearch, setTableSearch]         = useState('')
    const [sortField, setSortField]             = useState<'name' | 'club' | 'category' | 'status'>('name')
    const [sortDir, setSortDir]                 = useState<'asc' | 'desc'>('asc')
    const [filterStatus, setFilterStatus]       = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL')
    const [filterDiscipline, setFilterDiscipline] = useState<'ALL' | 'KYORUGI' | 'POOMSAE' | 'KYUKPA'>('ALL')
    const [isFilterMode, setIsFilterMode]       = useState(false)

    const totalPages = Math.ceil(Math.max(totalCount, players.length, initialPlayers.length) / itemsPerPage)

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
        if (currentPage === 1 && !isFilterMode) setPlayers(initialPlayers)
    }, [initialPlayers, currentPage, isFilterMode])

    const hasActiveFilter = tableSearch.trim().length >= 2 || filterStatus !== 'ALL' || filterDiscipline !== 'ALL'

    useEffect(() => {
        if (!hasActiveFilter) {
            if (isFilterMode) { setIsFilterMode(false); setPlayers(initialPlayers); setCurrentPage(1) }
            return
        }
        const timer = setTimeout(async () => {
            setIsLoading(true)
            try {
                const results = await getTournamentPlayers(
                    tournamentId, undefined, undefined,
                    tableSearch.trim() || undefined,
                    filterStatus !== 'ALL' ? filterStatus : undefined,
                    filterDiscipline !== 'ALL' ? filterDiscipline : undefined
                )
                setPlayers(results); setIsFilterMode(true)
            } catch (error) { console.error('Filter failed:', error) }
            finally { setIsLoading(false) }
        }, 300)
        return () => clearTimeout(timer)
    }, [tableSearch, filterStatus, filterDiscipline])

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return }
        const timer = setTimeout(async () => {
            setIsSearching(true)
            try {
                const results = await searchAllAthletes(searchQuery)
                setSearchResults(results as SearchResult[])
            } catch (error) { console.error(error) }
            finally { setIsSearching(false) }
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        const detect = async () => {
            if (!selectedAthlete) { setTentativeCategory(null); return }
            setIsDetecting(true)
            try {
                const category = await findPlayerCategory(tournamentId, {
                    birthDate: selectedAthlete.birthDate || new Date(),
                    gender: selectedAthlete.gender || 'Male',
                    weight: parseFloat(weight) || 0,
                    height: parseFloat(height) || 0,
                    belt,
                    poomsaeType: eventType === 'POOMSAE' ? poomsaeType : undefined,
                    type: eventType,
                })
                setTentativeCategory(category)
            } catch (e) { console.error(e); setTentativeCategory(null) }
            finally { setIsDetecting(false) }
        }
        const timer = setTimeout(detect, 500)
        return () => clearTimeout(timer)
    }, [selectedAthlete, weight, height, belt, eventType, poomsaeType, tournamentId])

    const handleSelectAthlete = (athlete: SearchResult) => {
        setSelectedAthlete(athlete)
        setAthleteName(athlete.name || '')
        setClubName(athlete.clubName || '')
        setBelt(athlete.belt || 'Black')
        setWeight(athlete.weight?.toString() || '')
        setHeight(athlete.height?.toString() || '')
        setSearchQuery(''); setSearchResults([])
        setIsManualMode(false); setManualCategoryId('')
    }

    const handleClearAthlete = () => {
        setSelectedAthlete(null); setAthleteName(''); setClubName('')
        setBelt('Black'); setWeight(''); setHeight('')
        setTentativeCategory(null); setIsManualMode(false); setManualCategoryId('')
    }

    const memberAge  = selectedAthlete?.birthDate ? calculateAge(selectedAthlete.birthDate) : null
    const usesHeight = memberAge !== null && memberAge <= 11

    const handlePageChange = async (newPage: number) => {
        if (newPage === currentPage) return
        setIsLoading(true)
        try {
            const newPlayers = await getTournamentPlayers(tournamentId, (newPage - 1) * itemsPerPage, itemsPerPage)
            setPlayers(newPlayers); setCurrentPage(newPage)
        } catch (error) { console.error('Failed to fetch players:', error) }
        finally { setIsLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!athleteName) { toast.error('Please enter or select an athlete'); return }
        if (!effectiveCategory) { toast.error('Please ensure a category is selected'); return }
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
            handleClearAthlete()
            setEventType(availableEventTypes[0]?.value || 'KYORUGI')
            setPoomsaeType('INDIVIDUAL'); setTeamId('')
            if (currentPage !== 1) handlePageChange(1)
            else { const refreshed = await getTournamentPlayers(tournamentId, 0, itemsPerPage); setPlayers(refreshed) }
        } catch { toast.error('Failed to register athlete. Please try again.') }
        finally { setIsSubmitting(false) }
    }

    const inputClass = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all'
    const labelClass = 'block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5'

    return (
        <div className="space-y-4 animate-in fade-in duration-300">

            {/* ── Page header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Athletes</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage registered participants.</p>
                </div>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            isFormOpen
                                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                : 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                    >
                        {isFormOpen
                            ? <><X size={15} /> Cancel</>
                            : <><UserPlus size={15} /> Register Athlete</>
                        }
                    </button>
                )}
            </div>

            {/* ── Register form panel ──────────────────────────────── */}
            {!readOnly && isFormOpen && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                            <UserPlus size={15} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">Register Athlete</h3>
                            <p className="text-[11px] text-gray-400">Search existing athletes or add manually.</p>
                        </div>
                    </div>

                    <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">

                        {/* ── Athlete search ── */}
                        <div>
                            <label className={labelClass}>Athlete</label>
                            {selectedAthlete ? (
                                <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                                            {selectedAthlete.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{selectedAthlete.name}</p>
                                            <p className="text-xs text-red-600 font-medium mt-0.5">
                                                {selectedAthlete.clubName || 'No club'} · {selectedAthlete.belt || 'No Belt'}
                                                {memberAge !== null && ` · ${memberAge}yo`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearAthlete}
                                        className="text-xs font-bold text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all"
                                    />
                                    {isSearching && (
                                        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
                                    )}

                                    {/* Dropdown results */}
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 max-h-52 overflow-y-auto">
                                            {searchResults.map(athlete => (
                                                <button
                                                    key={athlete.id}
                                                    type="button"
                                                    onClick={() => handleSelectAthlete(athlete)}
                                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">
                                                        {athlete.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{athlete.name}</p>
                                                        <p className="text-xs text-gray-400">{athlete.clubName || 'No club'} · {athlete.belt || '—'}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                                        <p className="text-xs text-gray-400 mt-1.5">No athletes found. Fill in details below.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Athlete details ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {!selectedAthlete && (
                                <div>
                                    <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={athleteName}
                                        onChange={e => setAthleteName(e.target.value)}
                                        placeholder="Athlete full name"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                            )}
                            <div>
                                <label className={labelClass}>Club / Team</label>
                                <input
                                    type="text"
                                    value={clubName}
                                    onChange={e => setClubName(e.target.value)}
                                    placeholder="Club name"
                                    className={inputClass}
                                />
                            </div>
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
                            {usesHeight ? (
                                <div>
                                    <label className={labelClass}>Height (cm)</label>
                                    <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)}
                                        placeholder="e.g. 140" className={inputClass}
                                        required={eventType === 'KYORUGI'} disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'} />
                                </div>
                            ) : (
                                <div>
                                    <label className={labelClass}>Weight (kg)</label>
                                    <input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)}
                                        placeholder="e.g. 57.5" className={inputClass}
                                        required={eventType === 'KYORUGI'} disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'} />
                                </div>
                            )}
                        </div>

                        {/* ── Event type ── */}
                        {availableEventTypes.length > 1 && (
                            <div>
                                <label className={labelClass}>Discipline</label>
                                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                    {availableEventTypes.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => { setEventType(type.value); setIsManualMode(false); setManualCategoryId('') }}
                                            className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                                                eventType === type.value
                                                    ? 'bg-white text-red-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Poomsae extras */}
                        {eventType === 'POOMSAE' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className={labelClass}>Poomsae Type</label>
                                    <GlobalDropdown
                                        value={poomsaeType}
                                        onChange={setPoomsaeType}
                                        options={[
                                            { value: 'INDIVIDUAL', label: 'Individual' },
                                            { value: 'PAIR',       label: 'Pair'       },
                                            { value: 'TEAM',       label: 'Team'       },
                                        ]}
                                        fullWidth
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Team ID <span className="font-medium text-gray-400 normal-case">(optional)</span></label>
                                    <input type="text" placeholder="e.g. 1, A, B" value={teamId}
                                        onChange={e => setTeamId(e.target.value)} className={inputClass} />
                                </div>
                            </div>
                        )}

                        {/* ── Category auto-detect / manual ── */}
                        <div className={`rounded-2xl border p-4 transition-colors ${
                            effectiveCategory
                                ? 'bg-emerald-50 border-emerald-100'
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <label className={labelClass + ' mb-0'}>Category</label>
                                <button
                                    type="button"
                                    onClick={() => { setIsManualMode(!isManualMode); setManualCategoryId('') }}
                                    className="text-[11px] font-bold text-red-600 hover:text-red-800 transition-colors"
                                >
                                    {isManualMode ? '← Auto-Detect' : 'Choose Manually →'}
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
                                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1">
                                            <CheckCircle2 size={12} />
                                            Manually selected
                                        </div>
                                    )}
                                </div>
                            ) : !selectedAthlete ? (
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle size={16} className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Select an athlete first</p>
                                        <p className="text-xs text-gray-400">Category will auto-detect from profile.</p>
                                    </div>
                                </div>
                            ) : isDetecting ? (
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    Detecting category...
                                </div>
                            ) : tentativeCategory ? (
                                <div className="flex items-center gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{tentativeCategory.name}</p>
                                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Auto-detected from profile</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-700 text-sm">No Category Found</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Try choosing manually or check weight/age.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {categories.length === 0 && (
                            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                                <p className="text-amber-700 text-xs font-medium">Create a category first before registering athletes.</p>
                            </div>
                        )}

                        {/* ── Submit ── */}
                        <button
                            type="submit"
                            disabled={isSubmitting || categories.length === 0 || !effectiveCategory}
                            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isSubmitting
                                ? <><Loader2 size={16} className="animate-spin" /> Registering...</>
                                : <><UserPlus size={16} /> Register Athlete</>
                            }
                        </button>
                    </form>
                </div>
            )}

            {/* ── Athletes table ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Table toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-700">
                                {isFilterMode ? `Filtered (${players.length})` : `Registered Athletes`}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                {isFilterMode ? players.length : (totalCount > 0 ? totalCount : players.length)}
                            </span>
                        </div>
                        {!isFilterMode && totalPages > 1 && (
                            <span className="text-xs text-gray-400 font-medium">
                                Page {currentPage} / {totalPages}
                            </span>
                        )}
                    </div>

                    {/* Search + filters row */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search name, club, or category..."
                                value={tableSearch}
                                onChange={e => setTableSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                            />
                            {isLoading && (
                                <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-spin" />
                            )}
                        </div>

                        {/* Discipline pills */}
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                            {(['ALL', 'KYORUGI', 'POOMSAE', 'KYUKPA'] as const).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setFilterDiscipline(d)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                        filterDiscipline === d
                                            ? d === 'KYORUGI' ? 'bg-red-600 text-white shadow-sm'
                                            : d === 'POOMSAE' ? 'bg-blue-600 text-white shadow-sm'
                                            : d === 'KYUKPA'  ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-gray-900 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
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
                            className="px-3 py-2 text-[11px] font-bold bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                        >
                            <option value="ALL">All Status</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading && displayedPlayers.length === 0 ? (
                        <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm font-medium">Loading...</span>
                        </div>
                    ) : (
                        <table className="w-full min-w-[680px]">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    {([
                                        { label: '#',        field: null        },
                                        { label: 'Athlete',  field: 'name'      },
                                        { label: 'Club',     field: 'club'      },
                                        { label: 'Category', field: 'category'  },
                                        { label: 'Belt',     field: null        },
                                        { label: 'Skill',    field: null        },
                                        { label: 'Status',   field: 'status'    },
                                    ] as { label: string; field: typeof sortField | null }[]).map(({ label, field }) => (
                                        <th
                                            key={label}
                                            onClick={() => field && handleSort(field)}
                                            className={`px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest ${field ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                                        >
                                            <span className="flex items-center gap-1">
                                                {label}
                                                {field && (
                                                    <ChevronsUpDown size={10} className={sortField === field ? 'text-red-500' : 'text-gray-300'} />
                                                )}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedPlayers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-14 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Users size={18} className="text-gray-300" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-500">
                                                    {tableSearch || filterStatus !== 'ALL' || filterDiscipline !== 'ALL'
                                                        ? 'No athletes match your filters.'
                                                        : 'No athletes registered yet.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedPlayers.map((player, i) => (
                                        <tr key={player.id} className="border-t border-gray-50 hover:bg-gray-50/70 transition-colors">
                                            <td className="px-5 py-3.5 text-xs font-bold text-gray-300">
                                                {(currentPage - 1) * itemsPerPage + i + 1}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                                {player.name}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                                                {player.club?.name || <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs font-medium text-gray-600 max-w-[180px] truncate">
                                                {player.category?.name || <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                                                {player.belt || <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                                    player.skillLevel === 'Advance'      ? 'bg-red-100 text-red-700' :
                                                    player.skillLevel === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {player.skillLevel || 'Novice'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                                    STATUS_BADGE[player.registrationStatus] || STATUS_BADGE.PENDING
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        STATUS_DOT[player.registrationStatus] || STATUS_DOT.PENDING
                                                    }`} />
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

                {/* Pagination */}
                {totalPages > 1 && !isFilterMode && (
                    <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>
                        <span className="text-xs text-gray-400 font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
