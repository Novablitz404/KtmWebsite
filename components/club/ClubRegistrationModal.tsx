'use client'

import { useState, useEffect } from 'react'
import { X, Search, User, Calendar, Check, Trophy } from 'lucide-react'
import { getUpcomingTournaments, searchClubMembers, registerForTournamentAuto } from '@/app/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

interface ClubRegistrationModalProps {
    isOpen: boolean
    onClose: () => void
    clubId: string
    clubName: string
}

export default function ClubRegistrationModal({ isOpen, onClose, clubId, clubName }: ClubRegistrationModalProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Data - Step 1: Membership
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedMember, setSelectedMember] = useState<any | null>(null)

    // Data - Step 2: Tournament
    const [tournaments, setTournaments] = useState<any[]>([])
    const [selectedTournament, setSelectedTournament] = useState<any | null>(null)

    // Data - Step 3: Category/Confirmation
    const [division, setDivision] = useState('')
    const [categoryName, setCategoryName] = useState('')

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setSearchQuery('')
            setSearchResults([])
            setSelectedMember(null)
            setSelectedTournament(null)
            fetchTournaments()
        }
    }, [isOpen])

    const fetchTournaments = async () => {
        try {
            const data = await getUpcomingTournaments()
            setTournaments(data)
        } catch (error) {
            toast.error('Failed to load tournaments')
        }
    }

    // Debounced Search
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setLoading(true)
                try {
                    const results = await searchClubMembers(clubName, searchQuery)
                    setSearchResults(results)
                } catch (error) {
                    console.error('Search failed', error)
                } finally {
                    setLoading(false)
                }
            } else {
                setSearchResults([])
            }
        }, 300)

        return () => clearTimeout(timeout)
    }, [searchQuery, clubId])

    const handleNext = () => {
        if (step === 1 && selectedMember) setStep(2)
        else if (step === 2 && selectedTournament) {
            // Auto-calculate division/category logic
            const isPoomsae = selectedTournament.categories.some((c: any) => c.name.toLowerCase().includes('poomsae'))
            // Simple robust auto-generation for now
            const calcDivision = selectedMember.belt || 'Black Belt'
            const calcCategory = `${selectedMember.gender} ${selectedMember.belt} ${selectedMember.weight ? selectedMember.weight + 'kg' : ''}`.trim()

            setDivision(calcDivision)
            setCategoryName(calcCategory)
            setStep(3)
        }
    }

    const handleSubmit = async () => {
        if (!selectedMember || !selectedTournament) return

        setSubmitting(true)
        try {
            const result = await registerForTournamentAuto({
                tournamentId: selectedTournament.id,
                userId: selectedMember.id,
                name: selectedMember.name,
                gender: selectedMember.gender,
                belt: selectedMember.belt,
                weight: selectedMember.weight || 0,
                clubName: clubName,
                division: division,
                categoryName: categoryName
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Registration successful')
                onClose()
                queryClient.invalidateQueries({ queryKey: ['club-registrations', clubId] })
                queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
                router.refresh()
            }
        } catch (error) {
            toast.error('Failed to register')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Add Participant</h2>
                        <p className="text-xs text-gray-500">Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Step 1: Select Member */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search club member..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto">
                                {loading ? (
                                    <div className="flex justify-center py-8 text-gray-400">Loading...</div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-2">
                                        {searchResults.map(member => (
                                            <div
                                                key={member.id}
                                                onClick={() => setSelectedMember(member)}
                                                className={`p-3 rounded-xl cursor-pointer transition-colors flex items-center gap-3 ${selectedMember?.id === member.id
                                                    ? 'bg-indigo-50 border-indigo-200 border'
                                                    : 'hover:bg-gray-50 border border-transparent'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                                                    <p className="text-xs text-gray-500">{member.belt} • {member.gender}</p>
                                                </div>
                                                {selectedMember?.id === member.id && <Check size={16} className="ml-auto text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.length >= 2 ? (
                                    <div className="text-center py-8 text-gray-500">No members found</div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">Type to search for a member</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Tournament */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                                {tournaments.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTournament(t)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedTournament?.id === t.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <Trophy size={20} className="text-amber-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{t.name}</h4>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <Calendar size={12} />
                                                    {new Date(t.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && selectedMember && selectedTournament && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Athlete</span>
                                    <span className="font-medium text-gray-900">{selectedMember.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tournament</span>
                                    <span className="font-medium text-gray-900">{selectedTournament.name}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Category / Weight Class</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="e.g. Male Black Belt 68kg"
                                />
                                <p className="text-xs text-gray-500">Adjust the category name if needed to match tournament requirements.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(prev => prev - 1 as any)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={(step === 1 && !selectedMember) || (step === 2 && !selectedTournament)}
                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                        >
                            {submitting ? 'Registering...' : 'Confirm Registration'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
