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

    // Seminar Specific State


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

    // Handle Proof of Payment Preview


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
            // Basic requirements: Tournament + Member (for Age/Gender) + Weight (for Kyorugi) or Belt (for Poomsae)
            if (!selectedTournament || !selectedMember) {
                setTentativeCategory(null)
                return
            }

            setIsDetecting(true)
            try {
                const category = await findPlayerCategory(selectedTournament, {
                    birthDate: selectedMember.birthDate || new Date(), // Fallback if missing, but should be there
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
    }, [selectedTournament, selectedMember, weight, height, belt, poomsaeType])

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">
                        {activeTab === 'TOURNAMENT' ? 'Add Athlete to Tournament' :
                            activeTab === 'SEMINAR' ? 'Add Athlete to Seminar' :
                                'Add Athlete to Promotion'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Event Type Switcher (only if not pre-selected or force-shown) */}
                <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100">
                    <div className="flex p-1 bg-gray-200/50 rounded-xl">
                        {(['TOURNAMENT', 'SEMINAR', 'PROMOTION'] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
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

                        {/* Event Selection */}
                        {activeTab === 'TOURNAMENT' && (
                            <>
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tournament</label>
                                    <GlobalDropdown
                                        value={selectedTournament}
                                        onChange={setSelectedTournament}
                                        options={tournaments.map(t => ({ value: t.id, label: t.name }))}
                                        fullWidth
                                        searchable
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Category</label>
                                    <GlobalDropdown
                                        value={eventType}
                                        onChange={(val: any) => setEventType(val)}
                                        options={availableEventTypes}
                                        fullWidth
                                    />
                                    {selectedTournament && availableEventTypes.length === 0 && (
                                        <p className="text-xs text-red-500">No event categories available for this tournament.</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Dynamic: Height for ages 0-11, Weight for ages 12+ */}
                                    {(() => {
                                        const memberAge = selectedMember?.birthDate
                                            ? calculateAge(selectedMember.birthDate)
                                            : null
                                        const usesHeight = memberAge !== null && memberAge <= 11

                                        return usesHeight ? (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Height (cm)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={height}
                                                    onChange={(e) => setHeight(e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    required={eventType === 'KYORUGI'}
                                                    disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Weight (kg)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={weight}
                                                    onChange={(e) => setWeight(e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    required={eventType === 'KYORUGI'}
                                                    disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                                />
                                            </div>
                                        )
                                    })()}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Belt</label>
                                        <GlobalDropdown
                                            value={belt}
                                            onChange={setBelt}
                                            options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                            label="Select..."
                                            fullWidth
                                        />
                                    </div>
                                </div>

                                {eventType === 'POOMSAE' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Poomsae Type</label>
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
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team ID (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1, A, B"
                                                value={teamId}
                                                onChange={(e) => setTeamId(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsManualMode(!isManualMode)
                                                setManualCategoryId('')
                                            }}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                            {isManualMode ? '← Auto-Detect' : 'Choose Manually'}
                                        </button>
                                    </div>

                                    {isManualMode ? (
                                        /* Manual Category Selection */
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
                                                <div className="flex items-center gap-2 text-xs text-indigo-600 mt-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Manually selected</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Auto-Detected Category */
                                        isDetecting ? (
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
                            </>
                        )}

                        {activeTab === 'SEMINAR' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Seminar</label>
                                    <GlobalDropdown
                                        value={selectedSeminarId}
                                        onChange={setSelectedSeminarId}
                                        options={seminars.map(s => ({ value: s.id, label: s.name }))}
                                        fullWidth
                                        searchable
                                    />
                                    {selectedSeminarId && seminars.find(s => s.id === selectedSeminarId)?.fee && (
                                        <div className="flex items-center justify-between px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <span className="text-xs font-medium text-emerald-700">Registration Fee</span>
                                            <span className="font-bold text-emerald-700">₱{seminars.find(s => s.id === selectedSeminarId)?.fee}</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}

                        {activeTab === 'PROMOTION' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Test</label>
                                    <GlobalDropdown
                                        value={selectedPromotionId}
                                        onChange={setSelectedPromotionId}
                                        options={promotions.map(p => ({ value: p.id, label: p.name }))}
                                        fullWidth
                                        searchable
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Belt</label>
                                        <GlobalDropdown
                                            value={belt}
                                            onChange={setBelt}
                                            options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                            label="Select..."
                                            fullWidth
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Belt</label>
                                        {(() => {
                                            const idx = BELT_OPTIONS.findIndex(b => b.toLowerCase() === belt.toLowerCase())
                                            const nextBelt = idx !== -1 && idx < BELT_OPTIONS.length - 1 ? BELT_OPTIONS[idx + 1] : null
                                            return (
                                                <div className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium ${nextBelt ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-100 border border-gray-200 text-gray-400'}`}>
                                                    {nextBelt || (belt ? 'Already at highest rank' : 'Select current belt first')}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !selectedMember || (activeTab === 'TOURNAMENT' && !effectiveCategory)}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                activeTab === 'TOURNAMENT' ? 'Register Athlete' : 'Add Athlete'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
