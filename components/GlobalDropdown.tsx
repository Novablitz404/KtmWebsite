'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DropdownItem {
    label: string
    onClick?: () => void
    icon?: React.ReactNode
    danger?: boolean
    disabled?: boolean
}

// Select-like option
interface DropdownOption {
    value: string
    label: string
    icon?: React.ReactNode
    danger?: boolean
    disabled?: boolean
}

// ... imports

interface GlobalDropdownProps {
    label?: string | React.ReactNode
    icon?: React.ReactNode
    items?: DropdownItem[]
    options?: DropdownOption[] | string[] // Support string array
    value?: string
    onChange?: (value: string) => void
    name?: string
    align?: 'left' | 'right'
    className?: string
    width?: string
    trigger?: React.ReactNode
    fullWidth?: boolean
    searchable?: boolean
    required?: boolean // Added for form compatibility
}

export default function GlobalDropdown({
    label,
    icon,
    items,
    options,
    value,
    onChange,
    name,
    align = 'left',
    className = '',
    width = 'w-56',
    trigger,
    fullWidth = false,
    searchable = false,
    required = false
}: GlobalDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [dropUp, setDropUp] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLDivElement>(null)

    // Normalize options
    const normalizedOptions: DropdownOption[] = options?.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    ) || []

    // Find selected option label/icon if in select mode
    const selectedOption = normalizedOptions.find(opt => opt.value === value)

    // Effective label to show in trigger
    const displayLabel = selectedOption ? selectedOption.label : (label || 'Select')
    const displayIcon = selectedOption ? selectedOption.icon : icon

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('')
            return
        }

        // Check if dropdown should open upward
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const spaceNeeded = 280 // approximate max dropdown height
            setDropUp(spaceBelow < spaceNeeded && rect.top > spaceNeeded)
        }
    }, [isOpen])

    const filteredOptions = normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredItems = items?.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className={`relative inline-block text-left ${fullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
            {/* Hidden Input for Forms */}
            {name && <input type="hidden" name={name} value={value} />}
            {required && <input type="hidden" value={value} required={required} />}

            <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={fullWidth ? 'w-full' : ''}>
                {trigger ? (
                    trigger
                ) : (
                    <button
                        type="button"
                        className={`inline-flex justify-between items-center rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 bg-white text-sm font-medium ${!selectedOption ? 'text-gray-500' : 'text-gray-900'} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all ${fullWidth ? 'w-full' : width}`}
                        aria-expanded="true"
                        aria-haspopup="true"
                    >
                        <div className="flex items-center truncate">
                            {displayIcon && <span className="mr-2 flex-shrink-0">{displayIcon}</span>}
                            <span className="truncate">{displayLabel}</span>
                        </div>
                        <svg
                            className={`ml-2 h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                )}
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        absolute z-50 ${dropUp ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} ${fullWidth ? 'w-full' : width} rounded-xl shadow-lg bg-white border border-gray-100 focus:outline-none 
                        transform opacity-100 scale-100 transition-all duration-200 overflow-hidden flex flex-col
                        ${align === 'right' ? 'right-0' : 'left-0'}
                    `}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="menu-button"
                >
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Search..."
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                    )}
                    <div className="py-1 max-h-60 overflow-y-auto" role="none">
                        {/* Render Items (Actions) */}
                        {filteredItems?.map((item, index) => (
                            <button
                                key={`item-${index}`}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (!item.disabled && item.onClick) {
                                        item.onClick()
                                        setIsOpen(false)
                                    }
                                }}
                                disabled={item.disabled}
                                className={`
                                    w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 group transition-colors
                                    ${item.disabled ? 'opacity-50 cursor-not-allowed text-gray-400' :
                                        item.danger
                                            ? 'text-red-700 hover:bg-red-50'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }
                                `}
                                role="menuitem"
                            >
                                {item.icon && (
                                    <span className={`
                                        ${item.danger ? 'text-red-400 group-hover:text-red-600' : 'text-gray-400 group-hover:text-gray-600'}
                                    `}>
                                        {item.icon}
                                    </span>
                                )}
                                {item.label}
                            </button>
                        ))}

                        {/* Render Options (Selection) */}
                        {filteredOptions?.map((opt, index) => (
                            <button
                                key={`opt-${index}`}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (!opt.disabled && onChange) {
                                        onChange(opt.value)
                                        setIsOpen(false)
                                    }
                                }}
                                disabled={opt.disabled}
                                className={`
                                    w-full text-left px-4 py-2.5 text-sm flex items-center justify-between group transition-colors
                                    ${opt.disabled ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-700 hover:bg-gray-50'}
                                    ${value === opt.value ? 'bg-red-50 text-red-700 font-medium' : ''}
                                `}
                                role="menuitem"
                            >
                                <div className="flex items-center gap-2">
                                    {opt.icon && <span className="text-gray-400 group-hover:text-gray-600">{opt.icon}</span>}
                                    {opt.label}
                                </div>
                                {value === opt.value && (
                                    <span className="text-red-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
