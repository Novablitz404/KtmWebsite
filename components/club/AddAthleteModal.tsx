'use client'
import { useState, useEffect } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { X, Search, Loader2, AlertCircle, CheckCircle2, Upload, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import { searchClubMembers, getUpcomingTournaments, registerForTournament, findPlayerCategory } from '@/app/actions'
import { getUpcomingSeminars, registerForSeminar } from '@/app/seminars/actions'
import { getUpcomingPromotions, registerForPromotion } from '@/app/promotions/actions'
import { calculateAge } from '@/lib/placement'
import { useQueryClient } from '@tanstack/react-query'

interface AddAthleteModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    clubName: string
    defaultType?: 'TOURNAMENT' | 'SEMINAR' | 'PROMOTION'
}

interface Member {
    id: string
    name: string | null
    email: string
    belt: string | null
    weight: number | null
    height: number | null
    gender: string | null
    birthDate: Date | null
}

interface Tournament {
    id: string
    name: string
    startDate: Date
    categories: {
        id: string
        name: string
        type: string
    }[]
}

interface Category {
    id: string
    name: string
    type: string
}

interface Seminar {
    id: string
    name: string
    startDate: Date
    fee: number | null
}

interface PromotionTest {
    id: string
    name: string
    testDate: Date
}

const BELT_OPTIONS = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']

export default function AddAthleteModal({ isOpen, onClose, clubId, clubName, defaultType = 'TOURNAMENT' }: AddAthleteModalProps) {
    useScrollLock(isOpen)
    const queryClient = useQueryClient()

    // Member Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Member[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)

    // Selection State
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [selectedTournament, setSelectedTournament] = useState<string>('')

    const [seminars, setSeminars] = useState<Seminar[]>([])
    const [selectedSeminarId, setSelectedSeminarId] = useState<string>('')

    const [promotions, setPromotions] = useState<PromotionTest[]>([])
    const [selectedPromotionId, setSelectedPromotionId] = useState<string>('')

    // Promotion Specific State
    const [targetBelt, setTargetBelt] = useState<string>('')

    // Auto-Detection State
    const [tentativeCategory, setTentativeCategory] = useState<Category | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)
    const [isManualMode, setIsManualMode] = useState(false)
    const [manualCategoryId, setManualCategoryId] = useState<string>('')

    // Form State (Details)
    const [weight, setWeight] = useState<string>('')
    const [height, setHeight] = useState<string>('')
    const [belt, setBelt] = useState<string>('')
    const [eventType, setEventType] = useState<'KYORUGI' | 'POOMSAE' | 'KYUKPA'>('KYORUGI')
    const [poomsaeType, setPoomsaeType] = useState<string>('INDIVIDUAL')
    const [teamId, setTeamId] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)

    const [activeTab, setActiveTab] = useState<'TOURNAMENT' | 'SEMINAR' | 'PROMOTION'>(defaultType)

    // Initial tab setup when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultType)
        }
    }, [isOpen, defaultType])

    // Load data based on active tab
    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'TOURNAMENT' && tournaments.length === 0) {
                getUpcomingTournaments().then(setTournaments).catch(() => toast.error('Failed to load tournaments'))
            } else if (activeTab === 'SEMINAR' && seminars.length === 0) {
                getUpcomingSeminars(clubId).then(setSeminars).catch(() => toast.error('Failed to load seminars'))
            } else if (activeTab === 'PROMOTION' && promotions.length === 0) {
                getUpcomingPromotions(clubId).then(setPromotions).catch(() => toast.error('Failed to load promotions'))
            }
        }
    }, [isOpen, activeTab, clubId, tournaments.length, seminars.length, promotions.length])

    // Derived state for available event types
    const selectedTournamentObj = tournaments.find(t => t.id === selectedTournament)
    const availableEventTypes = selectedTournamentObj
        ? [
            { value: 'KYORUGI', label: 'Kyorugi (Sparring)' },
            { value: 'POOMSAE', label: 'Poomsae (Forms)' },
            { value: 'KYUKPA', label: 'Kyukpa (Breaking)' }
        ].filter(type => selectedTournamentObj.categories.some(c => c.type === type.value))
        : []

    // Categories filtered by selected event type (for manual selection)
    const filteredCategories = selectedTournamentObj
        ? selectedTournamentObj.categories.filter(c => c.type === eventType)
        : []

    // The effective category: manual override takes priority
    const effectiveCategory = isManualMode
        ? filteredCategories.find(c => c.id === manualCategoryId) || null
        : tentativeCategory

    // Auto-Detect Category Logic
    useEffect(() => {
        const detectCategory = async () => {
            if (!selectedTournament || !selectedMember) {
                setTentativeCategory(null)
                return
            }

            setIsDetecting(true)
            try {
                const category = await findPlayerCategory(selectedTournament, {
                    birthDate: selectedMember.birthDate || new Date(),
                    gender: selectedMember.gender || 'Male',
                    weight: parseFloat(weight) || 0,
                    height: parseFloat(height) || 0,
                    belt: belt,
                    poomsaeType: eventType === 'POOMSAE' ? poomsaeType : undefined,
                    type: eventType
                })
                setTentativeCategory(category)
            } catch (e) {
                console.error(e)
                setTentativeCategory(null)
            } finally {
                setIsDetecting(false)
            }
        }

        const timer = setTimeout(detectCategory, 500)
        return () => clearTimeout(timer)
    }, [selectedTournament, selectedMember, weight, height, belt, poomsaeType, eventType])

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
        setHeight(member.height?.toString() || '')
        setBelt(member.belt || '')
        setEventType('KYORUGI')
        setPoomsaeType('INDIVIDUAL')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedMember) {
            toast.error('Please select an athlete')
            return
        }

        setSubmitting(true)
        try {
            if (activeTab === 'TOURNAMENT') {
                if (!selectedTournament || !effectiveCategory) {
                    toast.error('Please select a tournament and ensure a category is selected')
                    setSubmitting(false)
                    return
                }

                const res = await registerForTournament({
                    categoryId: effectiveCategory.id,
                    userId: selectedMember.id,
                    name: selectedMember.name || 'Unknown',
                    gender: selectedMember.gender || 'MALE',
                    belt: belt,
                    weight: parseFloat(weight) || 0,
                    clubName: clubName,
                    poomsaeType: eventType === 'POOMSAE' ? poomsaeType : undefined,
                    teamId: eventType === 'POOMSAE' ? teamId : undefined
                })

                if (res.error) toast.error(res.error)
                else {
                    toast.success('Athlete registered for tournament')
                    queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                    onClose()
                }
            } else if (activeTab === 'SEMINAR') {
                if (!selectedSeminarId) {
                    toast.error('Please select a seminar')
                    setSubmitting(false)
                    return
                }

                const formData = new FormData()
                formData.append('seminarId', selectedSeminarId)
                formData.append('playerId', selectedMember.id)
                formData.append('playerName', selectedMember.name || 'Unknown')
                formData.append('clubName', clubName)
                formData.append('belt', belt)

                const res = await registerForSeminar(formData)
                if (res.error) toast.error(res.error)
                else {
                    toast.success('Athlete registered for seminar')
                    queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                    onClose()
                }
            } else if (activeTab === 'PROMOTION') {
                if (!selectedPromotionId) {
                    toast.error('Please select a promotion test')
                    setSubmitting(false)
                    return
                }

                const res = await registerForPromotion({
                    promotionTestId: selectedPromotionId,
                    playerId: selectedMember.id,
                    playerName: selectedMember.name || 'Unknown',
                    clubName: clubName,
                    currentBelt: belt,
                    targetBelt: (() => {
                        const idx = BELT_OPTIONS.findIndex(b => b.toLowerCase() === belt.toLowerCase())
                        return idx !== -1 && idx < BELT_OPTIONS.length - 1 ? BELT_OPTIONS[idx + 1] : undefined
                    })(),
                    age: selectedMember.birthDate ? calculateAge(selectedMember.birthDate) : undefined
                })

                if (res.error) toast.error(res.error)
                else {
                    toast.success('Athlete registered for promotion test')
                    queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                    onClose()
                }
            }
        } catch (error) {
            toast.error('Registration failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    const tabLabel = activeTab === 'TOURNAMENT' ? 'Tournament' : activeTab === 'SEMINAR' ? 'Seminar' : 'Promotion Test'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className="flex-shrink-0 flex items-center justify-between px-7 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Add Athlete</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Register a club member to an upcoming {tabLabel.toLowerCase()}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Event Type Switcher ── */}
                <div className="flex-shrink-0 px-7 pt-5">
                    <div className="flex p-1 bg-gray-100 rounded-xl w-full">
                        {(['TOURNAMENT', 'SEMINAR', 'PROMOTION'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto">
                    <form id="add-athlete-form" onSubmit={handleSubmit}>
                        <div className="px-7 py-5 space-y-6">

                            {/* ── Section: Athlete ── */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Athlete</p>
                                {selectedMember ? (
                                    <div className="flex items-center justify-between px-4 py-3.5 bg-gray-900 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                                {selectedMember.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-sm leading-tight">{selectedMember.name}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{selectedMember.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMember(null)}
                                            className="text-xs font-bold text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                        />
                                        {isSearching && (
                                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                        )}
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 max-h-52 overflow-y-auto">
                                                {searchResults.map(member => (
                                                    <button
                                                        key={member.id}
                                                        type="button"
                                                        onClick={() => handleSelectMember(member)}
                                                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-xs font-black text-gray-600 flex-shrink-0">
                                                            {member.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900">{member.name}</p>
                                                            <p className="text-[11px] text-gray-400 mt-0.5">{member.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Section: Event ── */}
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Event Details</p>

                                {activeTab === 'TOURNAMENT' && (
                                    <div className="space-y-4">
                                        {/* Tournament + Event Type */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tournament</label>
                                                <GlobalDropdown
                                                    value={selectedTournament}
                                                    onChange={setSelectedTournament}
                                                    options={tournaments.map(t => ({ value: t.id, label: t.name }))}
                                                    fullWidth
                                                    searchable
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Event Type</label>
                                                <GlobalDropdown
                                                    value={eventType}
                                                    onChange={(val: any) => setEventType(val)}
                                                    options={availableEventTypes}
                                                    fullWidth
                                                />
                                                {selectedTournament && availableEventTypes.length === 0 && (
                                                    <p className="text-[10px] text-red-500 mt-1 font-medium">No categories available.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weight/Height + Belt */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {(() => {
                                                const memberAge = selectedMember?.birthDate ? calculateAge(selectedMember.birthDate) : null
                                                const usesHeight = memberAge !== null && memberAge <= 11
                                                return usesHeight ? (
                                                    <div>
                                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Height (cm)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={height}
                                                            onChange={(e) => setHeight(e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                            required={eventType === 'KYORUGI'}
                                                            disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={weight}
                                                            onChange={(e) => setWeight(e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                            required={eventType === 'KYORUGI'}
                                                            disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                                        />
                                                    </div>
                                                )
                                            })()}
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Current Belt</label>
                                                <GlobalDropdown
                                                    value={belt}
                                                    onChange={setBelt}
                                                    options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                                    label="Select..."
                                                    fullWidth
                                                />
                                            </div>
                                        </div>

                                        {/* Poomsae extras */}
                                        {eventType === 'POOMSAE' && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div>
                                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Poomsae Type</label>
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
                                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                                                        Team ID <span className="normal-case font-medium text-gray-400">(optional)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 1, A, B"
                                                        value={teamId}
                                                        onChange={(e) => setTeamId(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm font-medium"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Category Detector Card */}
                                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detected Category</p>
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
                                                        <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-bold mt-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Manually selected
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isDetecting ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span className="font-medium">Detecting category...</span>
                                                </div>
                                            ) : tentativeCategory ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{tentativeCategory.name}</p>
                                                        <p className="text-[11px] text-green-600 font-medium mt-0.5">Auto-detected based on profile</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-700 text-sm">No Category Found</p>
                                                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">Enter weight, belt &amp; select a tournament to detect.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'SEMINAR' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Seminar</label>
                                            <GlobalDropdown
                                                value={selectedSeminarId}
                                                onChange={setSelectedSeminarId}
                                                options={seminars.map(s => ({ value: s.id, label: s.name }))}
                                                fullWidth
                                                searchable
                                            />
                                        </div>
                                        {selectedSeminarId && seminars.find(s => s.id === selectedSeminarId)?.fee && (
                                            <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
                                                <span className="text-xs font-black text-green-700 uppercase tracking-wider">Registration Fee</span>
                                                <span className="font-black text-green-700">₱{seminars.find(s => s.id === selectedSeminarId)?.fee}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'PROMOTION' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Promotion Test</label>
                                            <GlobalDropdown
                                                value={selectedPromotionId}
                                                onChange={setSelectedPromotionId}
                                                options={promotions.map(p => ({ value: p.id, label: p.name }))}
                                                fullWidth
                                                searchable
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Current Belt</label>
                                                <GlobalDropdown
                                                    value={belt}
                                                    onChange={setBelt}
                                                    options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                                    label="Select..."
                                                    fullWidth
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Target Belt</label>
                                                {(() => {
                                                    const idx = BELT_OPTIONS.findIndex(b => b.toLowerCase() === belt.toLowerCase())
                                                    const nextBelt = idx !== -1 && idx < BELT_OPTIONS.length - 1 ? BELT_OPTIONS[idx + 1] : null
                                                    return (
                                                        <div className={`w-full px-4 py-2.5 rounded-xl text-sm font-black ${nextBelt ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-100 border border-gray-200 text-gray-400'}`}>
                                                            {nextBelt || (belt ? 'Highest rank' : 'Select current belt')}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </form>
                </div>

                {/* ── Sticky Footer ── */}
                <div className="flex-shrink-0 px-7 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center gap-3 rounded-b-3xl">
                    <div className="flex-1 hidden sm:block">
                        <p className="text-[11px] text-gray-400 font-medium truncate">
                            {selectedMember
                                ? <><span className="font-black text-gray-700">{selectedMember.name}</span>{effectiveCategory && activeTab === 'TOURNAMENT' && <> · <span className="text-green-600 font-black">{effectiveCategory.name}</span></>}</>
                                : 'No athlete selected yet'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-black text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-athlete-form"
                            disabled={submitting || !selectedMember || (activeTab === 'TOURNAMENT' && !effectiveCategory)}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registering...
                                </>
                            ) : activeTab === 'TOURNAMENT' ? 'Register Athlete' : 'Add Athlete'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
