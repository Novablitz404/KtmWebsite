'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import GlobalDropdown from '@/components/GlobalDropdown'

interface Tournament {
    id: string
    name: string
    startDate: Date
    athleteCount?: number
    gold: number
    silver: number
    bronze: number
}

interface ClubScheduleWidgetProps {
    tournaments: Tournament[]
    isLoading?: boolean
}

export default function ClubScheduleWidget({ tournaments, isLoading }: ClubScheduleWidgetProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }) // Start on Monday
    )
    const [currentTime, setCurrentTime] = useState(new Date())

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    // Generate week days
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)) // Mon-Sun
    }, [currentWeekStart])

    // Time slots (12am - 11pm = 24 hours)
    const timeSlots = [
        '12 am', '1 am', '2 am', '3 am', '4 am', '5 am', '6 am', '7 am', '8 am', '9 am', '10 am', '11 am',
        '12 pm', '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm', '8 pm', '9 pm', '10 pm', '11 pm'
    ]

    // Calculate current time position
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const isToday = weekDays.some(day => isSameDay(day, currentTime))

    // Calculate which row the current time falls into (12am = row 0)
    const currentTimeRow = currentHour
    // Row height is 48px + 4px gap (gap-1) = 52px per row. Center of row = row * 52 + 24
    const timeIndicatorTop = currentTimeRow * 52 + 24

    // Map tournaments to days
    const eventsByDay = useMemo(() => {
        const map = new Map<string, Tournament[]>()
        tournaments.forEach(t => {
            const date = new Date(t.startDate)
            const key = format(date, 'yyyy-MM-dd')
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(t)
        })
        return map
    }, [tournaments])

    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentWeekStart(prev =>
            direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
        )
    }

    const handleMonthChange = (val: string) => {
        const newMonth = parseInt(val)
        const currentYear = currentWeekStart.getFullYear()
        const newDate = new Date(currentYear, newMonth, 1)
        setCurrentWeekStart(startOfWeek(newDate, { weekStartsOn: 1 }))
    }

    const handleYearChange = (val: string) => {
        const newYear = parseInt(val)
        const currentMonth = currentWeekStart.getMonth()
        const newDate = new Date(newYear, currentMonth, 1)
        setCurrentWeekStart(startOfWeek(newDate, { weekStartsOn: 1 }))
    }

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2024, i, 1), 'MMMM')
    }))

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const year = new Date().getFullYear() - 1 + i
        return { value: year.toString(), label: year.toString() }
    })

    // Colors for events - using red theme
    const eventColors = [
        'bg-red-50 border-l-4 border-red-500 text-red-700',
        'bg-blue-50 border-l-4 border-blue-500 text-blue-700',
        'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700',
        'bg-orange-50 border-l-4 border-orange-500 text-orange-700',
    ]

    // Tooltip State
    const [hoveredEvent, setHoveredEvent] = useState<{ event: Tournament; x: number; y: number } | null>(null)

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0 relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Schedule</h2>
                <div className="flex items-center gap-20">
                    <div className="w-40">
                        <GlobalDropdown
                            value={addDays(currentWeekStart, 3).getMonth().toString()}
                            onChange={handleMonthChange}
                            options={monthOptions}
                        />
                    </div>
                    <div className="w-28">
                        <GlobalDropdown
                            value={addDays(currentWeekStart, 3).getFullYear().toString()}
                            onChange={handleYearChange}
                            options={yearOptions}
                        />
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={() => navigateWeek('prev')}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => navigateWeek('next')}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col h-full overflow-x-auto">
                    <div className="min-w-[500px] flex flex-col h-full">
                        {/* Day Headers */}
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 mb-1 flex-shrink-0">
                            <div className="col-span-1"></div> {/* Empty corner for time labels */}
                            {weekDays.map((day, index) => (
                                <div key={index} className="text-center py-2">
                                    <div className="text-xs text-gray-400 uppercase">{format(day, 'EEE')}</div>
                                    <div className={`text-lg font-bold mt-1 ${isSameDay(day, new Date()) ? 'w-8 h-8 mx-auto bg-red-600 text-white rounded-full flex items-center justify-center' : 'text-gray-900'}`}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scrollable Time Grid */}
                        <div className="flex-1 overflow-y-auto relative min-h-0">
                            <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 relative pb-2">
                                {timeSlots.map((time, timeIndex) => (
                                    <React.Fragment key={`row-${timeIndex}`}>
                                        {/* Time label */}
                                        <div className="text-xs text-gray-400 py-3 text-right pr-2 h-[48px] flex items-center justify-end">
                                            {time}
                                        </div>

                                        {/* Day cells */}
                                        {weekDays.map((day, dayIndex) => {
                                            const dayKey = format(day, 'yyyy-MM-dd')
                                            const dayEvents = eventsByDay.get(dayKey) || []

                                            // Find events for this hour
                                            const slotEvents = dayEvents.filter(e => new Date(e.startDate).getHours() === timeIndex)

                                            return (
                                                <div
                                                    key={`${timeIndex}-${dayIndex}`}
                                                    className="bg-gray-50 rounded-lg h-[48px] relative border border-gray-100 group"
                                                >
                                                    {slotEvents.map((event, i) => (
                                                        <div
                                                            key={event.id}
                                                            className={`absolute inset-1 rounded-lg p-2 ${eventColors[i % eventColors.length]} overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10`}
                                                            onMouseEnter={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setHoveredEvent({
                                                                    event,
                                                                    x: rect.right + 10,
                                                                    y: rect.top
                                                                })
                                                            }}
                                                            onMouseLeave={() => setHoveredEvent(null)}
                                                        >
                                                            <p className="text-xs font-medium truncate">
                                                                {event.name}
                                                            </p>
                                                            <p className="text-[10px] opacity-70 mt-0.5 truncate">
                                                                {format(new Date(event.startDate), 'h:mm a')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                    </React.Fragment>
                                ))}

                                {/* Current Time Indicator Line */}
                                {isToday && currentTimeRow >= 0 && currentTimeRow < timeSlots.length && (
                                    <div
                                        className="absolute left-[60px] right-0 flex items-center pointer-events-none z-10"
                                        style={{ top: `${timeIndicatorTop}px` }}
                                    >
                                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                                        <div className="flex-1 h-[2px] bg-red-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Hover Tooltip Portal */}
            {hoveredEvent && (
                <div
                    className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-64 animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                    style={{
                        top: Math.min(window.innerHeight - 200, Math.max(10, hoveredEvent.y)), // Keep within screen vertically
                        left: Math.min(window.innerWidth - 270, hoveredEvent.x) // Keep within screen horizontally
                    }}
                >
                    <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight">{hoveredEvent.event.name}</h4>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {format(new Date(hoveredEvent.event.startDate), 'MMM d')}
                        </span>
                    </div>

                    <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Clock size={14} className="text-gray-400" />
                            <span>{format(new Date(hoveredEvent.event.startDate), 'h:mm a')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Users size={14} className="text-gray-400" />
                            <span>{hoveredEvent.event.athleteCount || 0} Athletes</span>
                        </div>
                    </div>

                    {(hoveredEvent.event.gold > 0 || hoveredEvent.event.silver > 0 || hoveredEvent.event.bronze > 0) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                            <div className="text-center">
                                <div className="text-xs font-bold text-yellow-600">🥇 {hoveredEvent.event.gold}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-bold text-gray-500">🥈 {hoveredEvent.event.silver}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-bold text-amber-700">🥉 {hoveredEvent.event.bronze}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
