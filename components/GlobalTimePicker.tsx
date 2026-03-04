'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'

interface GlobalTimePickerProps {
    label?: string
    value?: string // "HH:mm" format
    onChange: (time: string) => void
    placeholder?: string
    className?: string
    fullWidth?: boolean
    error?: string
    name?: string
}

export default function GlobalTimePicker({
    label,
    value = '08:00',
    onChange,
    placeholder = 'Select time',
    className = '',
    fullWidth = false,
    error,
    name
}: GlobalTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

    // Local editing state for typing
    const [editHour, setEditHour] = useState<string | null>(null)
    const [editMin, setEditMin] = useState<string | null>(null)

    // Parse value
    const [hours, minutes] = (value || '08:00').split(':').map(Number)
    const isPM = hours >= 12
    const display12Hour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const period = isPM ? 'PM' : 'AM'

    // Format display
    const displayTime = value
        ? `${display12Hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
        : placeholder

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Calculate position
    const calculatePosition = () => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const pickerWidth = 220
        const pickerHeight = 160

        const style: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            width: pickerWidth,
        }

        const spaceBelow = viewportHeight - rect.bottom
        if (spaceBelow < pickerHeight && rect.top > pickerHeight) {
            style.bottom = viewportHeight - rect.top + 4
        } else {
            style.top = rect.bottom + 4
        }

        const spaceRight = viewportWidth - rect.left
        if (spaceRight < pickerWidth) {
            style.right = viewportWidth - rect.right
        } else {
            style.left = rect.left
        }

        setDropdownStyle(style)
    }

    const togglePicker = () => {
        if (!isOpen) {
            calculatePosition()
        }
        setIsOpen(!isOpen)
    }

    const updateTime = (newHours: number, newMinutes: number) => {
        const h = Math.max(0, Math.min(23, newHours))
        const m = Math.max(0, Math.min(59, newMinutes))
        onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }

    const incrementHour = () => updateTime((hours + 1) % 24, minutes)
    const decrementHour = () => updateTime((hours - 1 + 24) % 24, minutes)
    const incrementMinute = () => {
        const newMin = minutes + 15
        if (newMin >= 60) {
            updateTime((hours + 1) % 24, newMin - 60)
        } else {
            updateTime(hours, newMin)
        }
    }
    const decrementMinute = () => {
        const newMin = minutes - 15
        if (newMin < 0) {
            updateTime((hours - 1 + 24) % 24, 60 + newMin)
        } else {
            updateTime(hours, newMin)
        }
    }
    const togglePeriod = () => {
        updateTime((hours + 12) % 24, minutes)
    }

    return (
        <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`} ref={containerRef}>
            {/* Label */}
            {label && (
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {label}
                </label>
            )}

            {/* Hidden input for form submission */}
            {name && <input type="hidden" name={name} value={value || ''} />}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={togglePicker}
                className={`
                    relative w-full bg-white border rounded-xl shadow-sm px-3 py-2 text-left text-sm cursor-default transition-all flex items-center justify-between
                    ${error ? 'border-red-300 ring-4 ring-red-500/10' : 'border-gray-200 hover:border-gray-300 focus:ring-2 focus:ring-gray-200'}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className={`block truncate ${!value ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                        {displayTime}
                    </span>
                </div>
            </button>

            {/* Dropdown Picker */}
            {isOpen && (
                <div
                    className="p-4 bg-white rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
                    style={dropdownStyle}
                >
                    <div className="flex items-center justify-center gap-3">
                        {/* Hours */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                type="button"
                                onClick={incrementHour}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <div className="w-12 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editHour !== null ? editHour : display12Hour.toString().padStart(2, '0')}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                                        setEditHour(raw)
                                    }}
                                    onFocus={(e) => {
                                        setEditHour(display12Hour.toString())
                                        setTimeout(() => e.target.select(), 0)
                                    }}
                                    onBlur={() => {
                                        const val = parseInt(editHour || '0')
                                        if (val >= 1 && val <= 12) {
                                            const newH = isPM ? (val === 12 ? 12 : val + 12) : (val === 12 ? 0 : val)
                                            updateTime(newH, minutes)
                                        }
                                        setEditHour(null)
                                    }}
                                    className="w-full h-full text-center text-lg font-bold text-gray-900 tabular-nums bg-transparent outline-none"
                                    maxLength={2}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={decrementHour}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Separator */}
                        <span className="text-xl font-bold text-gray-400 mt-[-2px]">:</span>

                        {/* Minutes */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                type="button"
                                onClick={incrementMinute}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <div className="w-12 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editMin !== null ? editMin : minutes.toString().padStart(2, '0')}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
                                        setEditMin(raw)
                                    }}
                                    onFocus={(e) => {
                                        setEditMin(minutes.toString())
                                        setTimeout(() => e.target.select(), 0)
                                    }}
                                    onBlur={() => {
                                        const val = parseInt(editMin || '0')
                                        if (!isNaN(val) && val >= 0 && val <= 59) {
                                            updateTime(hours, val)
                                        }
                                        setEditMin(null)
                                    }}
                                    className="w-full h-full text-center text-lg font-bold text-gray-900 tabular-nums bg-transparent outline-none"
                                    maxLength={2}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={decrementMinute}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* AM/PM Toggle */}
                        <div className="flex flex-col items-center gap-1 ml-1">
                            <button
                                type="button"
                                onClick={togglePeriod}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <div
                                onClick={togglePeriod}
                                className="w-12 h-10 bg-red-50 rounded-lg flex items-center justify-center border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                            >
                                <span className="text-sm font-bold text-red-600">
                                    {period}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={togglePeriod}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 justify-center">
                        {[
                            { label: '8 AM', time: '08:00' },
                            { label: '12 PM', time: '12:00' },
                            { label: '5 PM', time: '17:00' },
                            { label: '11:59 PM', time: '23:59' },
                        ].map((preset) => (
                            <button
                                key={preset.time}
                                type="button"
                                onClick={() => {
                                    onChange(preset.time)
                                    setIsOpen(false)
                                }}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${value === preset.time
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
