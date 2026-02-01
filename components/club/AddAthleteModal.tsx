'use client'
import { useState, useEffect } from 'react'
import { X, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { searchClubMembers, getUpcomingTournaments, registerForTournament, findPlayerCategory } from '@/app/actions'

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

    // Auto-Detection State
    const [tentativeCategory, setTentativeCategory] = useState<Category | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)

    // Form State (Details)
    const [weight, setWeight] = useState<string>('')
    const [belt, setBelt] = useState<string>('')
    const [eventType, setEventType] = useState<'KYORUGI' | 'POOMSAE' | 'KYUKPA'>('KYORUGI')
    const [poomsaeType, setPoomsaeType] = useState<string>('INDIVIDUAL')
    const [teamId, setTeamId] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)

    // Load Tournaments on Mount
    useEffect(() => {
        if (isOpen) {
            getUpcomingTournaments().then(setTournaments).catch(() => toast.error('Failed to load tournaments'))
        }
    }, [isOpen])

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
    }, [selectedTournament, selectedMember, weight, belt, poomsaeType])

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
        setEventType('KYORUGI')
        setPoomsaeType('INDIVIDUAL')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMember || !selectedTournament || !tentativeCategory || !weight || !belt) {
            toast.error('Please fill in all fields and ensure a category is detected')
            return
        }

        setSubmitting(true)
        try {
            const res = await registerForTournament({
                categoryId: tentativeCategory.id,
                userId: selectedMember.id,
                name: selectedMember.name || 'Unknown',
                gender: selectedMember.gender || 'MALE',
                belt: belt,
                weight: parseFloat(weight),
                clubName: clubName,
                poomsaeType: eventType === 'POOMSAE' ? poomsaeType : undefined,
                teamId: eventType === 'POOMSAE' ? teamId : undefined
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Athlete registered successfully')
                onClose()
                // Reset state
                setSelectedMember(null)
                setSelectedTournament('')
                setTentativeCategory(null)
                setWeight('')
                setBelt('')
                setEventType('KYORUGI')
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
                    <h2 className="text-lg font-bold text-gray-900">Add Athlete to Tournament</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
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
                        </div>

                        {/* Event Category Selection */}
                        <div className="space-y-4">
                            <CustomSelect
                                label="Event Category"
                                value={eventType}
                                onChange={(val: any) => setEventType(val)}
                                options={[
                                    { value: 'KYORUGI', label: 'Kyorugi (Sparring)' },
                                    { value: 'POOMSAE', label: 'Poomsae (Forms)' },
                                    { value: 'KYUKPA', label: 'Kyukpa (Breaking)' }
                                ]}
                                placeholder="Select Event Type"
                                required
                            />
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
                                    required={eventType === 'KYORUGI'}
                                    disabled={eventType === 'POOMSAE' || eventType === 'KYUKPA'}
                                />
                                {(eventType === 'POOMSAE' || eventType === 'KYUKPA') && <p className="text-[10px] text-gray-400">Not required for {eventType === 'POOMSAE' ? 'Poomsae' : 'Kyukpa'}</p>}
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

                        {/* Poomsae Specifics - Only show if Poomsae selected */}
                        {eventType === 'POOMSAE' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Poomsae Type</label>
                                    <CustomSelect
                                        value={poomsaeType}
                                        onChange={setPoomsaeType}
                                        options={[
                                            { value: 'INDIVIDUAL', label: 'Individual' },
                                            { value: 'PAIR', label: 'Pair' },
                                            { value: 'TEAM', label: 'Team' }
                                        ]}
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

                        {/* Tentative Category Display */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Detailed Category</label>
                            {isDetecting ? (
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
                                        <p className="text-xs text-gray-500 mt-0.5">Please check weight, age, and requirements.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !tentativeCategory}
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
