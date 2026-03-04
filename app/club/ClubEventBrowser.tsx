'use client'

import { useState, useEffect } from 'react'
import { fetchAvailableEvents, toggleEventParticipation } from '@/app/actions'
import { toast } from 'sonner'
import { Search, MapPin, Calendar, Check, Plus, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface Event {
    id: string
    name: string
    date: Date
    venue: string | null
    type: 'TOURNAMENT' | 'PROMOTION_TEST' | 'SEMINAR'
    isJoined: boolean
}

interface ClubEventBrowserProps {
    clubId: string
}

export default function ClubEventBrowser({ clubId }: ClubEventBrowserProps) {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'TOURNAMENT' | 'PROMOTION_TEST' | 'SEMINAR'>('TOURNAMENT')
    const [events, setEvents] = useState<{ tournaments: Event[], promotionTests: Event[], seminars: Event[] } | null>(null)
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
                const key = event.type === 'TOURNAMENT' ? 'tournaments' : event.type === 'PROMOTION_TEST' ? 'promotionTests' : 'seminars'
                return {
                    ...prev,
                    [key]: prev[key].map(e =>
                        e.id === event.id ? { ...e, isJoined: !e.isJoined } : e
                    )
                }
            })

            toast.success(event.isJoined ? 'Left event' : 'Joined event')
            queryClient.invalidateQueries({ queryKey: ['club-home', clubId] })
        } catch {
            toast.error('Something went wrong')
        } finally {
            setProcessingId(null)
        }
    }

    const filteredEvents = events
        ? (activeTab === 'TOURNAMENT' ? events.tournaments : activeTab === 'PROMOTION_TEST' ? events.promotionTests : (events.seminars || []))
            .filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-900">Browse Events</h2>
                <p className="text-sm text-gray-500">Select events your club will participate in</p>
            </div>

            {/* Tabs & Search */}
            <div className="px-5 pb-4 space-y-3 flex-shrink-0">
                <div className="flex p-1 bg-gray-100 rounded-xl">
                    {(['TOURNAMENT', 'PROMOTION_TEST', 'SEMINAR'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'TOURNAMENT' ? 'Tournaments' : tab === 'PROMOTION_TEST' ? 'Promos' : 'Seminars'}
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
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Loading events...</p>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No events found</p>
                    </div>
                ) : (
                    filteredEvents.map(event => (
                        <div
                            key={event.id}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${event.isJoined
                                ? 'bg-red-50/50 border-red-100'
                                : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="min-w-0 flex-1 mr-3">
                                <h3 className={`font-semibold text-sm truncate ${event.isJoined ? 'text-red-900' : 'text-gray-900'}`}>
                                    {event.name}
                                </h3>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${event.isJoined
                                    ? 'bg-white text-red-600 border border-red-100 hover:bg-red-50'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                    }`}
                            >
                                {processingId === event.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : event.isJoined ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" /> Joined
                                    </>
                                ) : (
                                    <>
                                        Join <Plus className="w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
