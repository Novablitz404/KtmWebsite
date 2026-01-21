'use client'

import { useState, useEffect } from 'react'
import { fetchAvailableEvents, toggleEventParticipation } from '@/app/actions'
import { toast } from 'sonner'
import { Search, MapPin, Calendar, Check, Plus, Loader2 } from 'lucide-react'

interface Event {
    id: string
    name: string
    date: Date
    venue: string | null
    type: 'TOURNAMENT' | 'PROMOTION_TEST'
    isJoined: boolean
}

interface ClubEventBrowserProps {
    clubId: string
    onClose: () => void
}

export default function ClubEventBrowser({ clubId, onClose }: ClubEventBrowserProps) {
    const [activeTab, setActiveTab] = useState<'TOURNAMENT' | 'PROMOTION_TEST'>('TOURNAMENT')
    const [events, setEvents] = useState<{ tournaments: Event[], promotionTests: Event[] } | null>(null)
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await fetchAvailableEvents(clubId)
                setEvents(data)
            } catch (error) {
                toast.error('Failed to load events')
            } finally {
                setLoading(false)
            }
        }
        loadEvents()
    }, [clubId])

    const handleToggle = async (event: Event) => {
        setProcessingId(event.id)
        try {
            const result = await toggleEventParticipation(
                event.type,
                event.id,
                !event.isJoined,
                clubId
            )

            if (result.error) {
                toast.error(result.error)
                return
            }

            // Update local state
            setEvents(prev => {
                if (!prev) return null
                const key = event.type === 'TOURNAMENT' ? 'tournaments' : 'promotionTests'
                return {
                    ...prev,
                    [key]: prev[key].map(e =>
                        e.id === event.id ? { ...e, isJoined: !e.isJoined } : e
                    )
                }
            })

            toast.success(event.isJoined ? 'Left event' : 'Joined event')
        } catch {
            toast.error('Something went wrong')
        } finally {
            setProcessingId(null)
        }
    }

    const filteredEvents = events
        ? (activeTab === 'TOURNAMENT' ? events.tournaments : events.promotionTests)
            .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Browse Events</h2>
                        <p className="text-sm text-gray-500">Select events your club will participate in</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                    <div className="flex p-1 bg-gray-200/50 rounded-xl">
                        {(['TOURNAMENT', 'PROMOTION_TEST'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab === 'TOURNAMENT' ? 'Tournaments' : 'Promotion Tests'}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-sm">Loading events...</p>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No events found</p>
                        </div>
                    ) : (
                        filteredEvents.map(event => (
                            <div
                                key={event.id}
                                className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${event.isJoined
                                    ? 'bg-indigo-50/50 border-indigo-100'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                    }`}
                            >
                                <div className="min-w-0 flex-1 mr-4">
                                    <h3 className={`font-semibold truncate ${event.isJoined ? 'text-indigo-900' : 'text-gray-900'}`}>
                                        {event.name}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(event.date).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        {event.venue && (
                                            <span className="flex items-center gap-1 truncate">
                                                <MapPin className="w-3 h-3" />
                                                {event.venue}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggle(event)}
                                    disabled={processingId === event.id}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${event.isJoined
                                        ? 'bg-white text-indigo-600 border border-indigo-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                                        : 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {processingId === event.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : event.isJoined ? (
                                        <>
                                            <span className="group-hover:hidden flex items-center gap-1">
                                                <Check className="w-4 h-4" /> Joined
                                            </span>
                                            <span className="hidden group-hover:flex items-center gap-1">
                                                Leave
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            Join <Plus className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
