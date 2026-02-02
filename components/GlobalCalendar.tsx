'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    startOfWeek,
    endOfWeek,
    setYear,
    setMonth,
    getYear,
    getMonth
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GlobalCalendarProps {
    label?: string
    value?: Date | string
    onChange: (date: Date) => void
    minDate?: Date
    maxDate?: Date
    placeholder?: string
    className?: string
    fullWidth?: boolean
    error?: string
}

export default function GlobalCalendar({
    label,
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = 'Select date',
    className = '',
    fullWidth = false,
    error
}: GlobalCalendarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Parse value to Date object safely
    const selectedDate = value ? new Date(value) : undefined

    // View state for calendar navigation
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())
    const [view, setView] = useState<'day' | 'month' | 'year'>('day')
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom')
    const [hPosition, setHPosition] = useState<'left' | 'right'>('left')

    // Handle click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Update position on open
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const viewportHeight = window.innerHeight

            const calendarWidth = 320 // matches w-[320px] in className
            const calendarHeight = 350 // approximate max height

            // Vertical collision
            const spaceBelow = viewportHeight - rect.bottom
            if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
                setPosition('top')
            } else {
                setPosition('bottom')
            }

            // Horizontal collision
            const spaceRight = viewportWidth - rect.left
            if (spaceRight < calendarWidth && rect.right > calendarWidth) {
                setHPosition('right')
            } else {
                setHPosition('left')
            }
        }
    }, [isOpen])

    // Update view when value changes externally
    useEffect(() => {
        if (selectedDate) {
            setCurrentMonth(selectedDate)
        }
    }, [value])

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    const handleDateClick = (date: Date) => {
        onChange(date)
        setIsOpen(false)
    }

    // Generate days
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Years for year view (100 years back, 10 forward)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 110 }, (_, i) => currentYear - 100 + i).reverse()

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    return (
        <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`} ref={containerRef}>
            {/* Label */}
            {label && (
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative w-full bg-white border rounded-xl shadow-sm px-4 py-2.5 text-left text-sm cursor-default transition-all flex items-center justify-between
                    ${error ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-gray-200'}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className={`block truncate ${!selectedDate ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                        {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : placeholder}
                    </span>
                </div>
                {selectedDate && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            // No built-in clear yet, would need onClear prop
                            setIsOpen(!isOpen)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        {/* Chevron handled by CSS usually, but here we just show value */}
                    </div>
                )}
            </button>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className={`
                    absolute z-50 p-4 w-[320px] bg-white rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200
                    ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                    ${hPosition === 'right' ? 'right-0 origin-right' : 'left-0 origin-left'}
                    ${position === 'top' ? (hPosition === 'right' ? 'origin-bottom-right' : 'origin-bottom-left') : (hPosition === 'right' ? 'origin-top-right' : 'origin-top-left')}
                `}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setView(view === 'month' ? 'day' : 'month')}
                                className="px-2 py-1 hover:bg-gray-100 rounded-md text-sm font-semibold text-gray-900"
                            >
                                {format(currentMonth, 'MMMM')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView(view === 'year' ? 'day' : 'year')}
                                className="px-2 py-1 hover:bg-gray-100 rounded-md text-sm font-semibold text-gray-900"
                            >
                                {format(currentMonth, 'yyyy')}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Views */}
                    {view === 'day' && (
                        <>
                            <div className="grid grid-cols-7 mb-2">
                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                    <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, dayIdx) => {
                                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                                    const isCurrentMonth = isSameMonth(day, currentMonth)

                                    return (
                                        <button
                                            key={day.toString()}
                                            type="button"
                                            onClick={() => handleDateClick(day)}
                                            className={`
                                                h-9 w-9 rounded-lg text-sm flex items-center justify-center transition-colors
                                                ${!isCurrentMonth && 'text-gray-300'}
                                                ${isCurrentMonth && !isSelected && 'text-gray-700 hover:bg-gray-100'}
                                                ${isSelected && 'bg-red-600 text-white font-semibold shadow-md'}
                                            `}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {view === 'month' && (
                        <div className="grid grid-cols-3 gap-2">
                            {months.map((month, idx) => (
                                <button
                                    key={month}
                                    type="button"
                                    onClick={() => {
                                        setCurrentMonth(setMonth(currentMonth, idx))
                                        setView('day')
                                    }}
                                    className={`
                                        p-2 rounded-lg text-sm hover:bg-gray-100
                                        ${getMonth(currentMonth) === idx ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'}
                                    `}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'year' && (
                        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                            {years.map(year => (
                                <button
                                    key={year}
                                    type="button"
                                    onClick={() => {
                                        setCurrentMonth(setYear(currentMonth, year))
                                        setView('day')
                                    }}
                                    className={`
                                        p-2 rounded-lg text-sm hover:bg-gray-100
                                        ${getYear(currentMonth) === year ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'}
                                    `}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
