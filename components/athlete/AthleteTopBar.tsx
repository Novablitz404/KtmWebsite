'use client'

import { Search } from 'lucide-react'

interface AthleteTopBarProps {
    userName?: string | null
    userImageUrl?: string | null
    title?: string
    searchQuery?: string
    onSearchChange?: (term: string) => void
    searchPlaceholder?: string
}

export default function AthleteTopBar({
    userName,
    userImageUrl,
    title,
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
}: AthleteTopBarProps) {
    return (
        <div className="hidden md:flex items-center justify-between h-16 px-6 bg-white border-b border-gray-100 flex-shrink-0">
            {/* Left: Title or Search */}
            <div className="flex-1 max-w-md">
                {title ? (
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                ) : onSearchChange ? (
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery || ''}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300 transition-all shadow-sm"
                        />
                    </div>
                ) : (
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Dashboard</h1>
                        <p className="text-xs text-gray-400 font-medium">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                )}
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-3 px-3 py-1.5">
                <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700 leading-tight">{userName || 'Athlete'}</p>
                    <p className="text-[10px] text-gray-400">Athlete</p>
                </div>
                {userImageUrl ? (
                    <img
                        src={userImageUrl}
                        alt={userName || 'Athlete'}
                        className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-sm font-bold border-2 border-gray-100">
                        {(userName || 'A').charAt(0)}
                    </div>
                )}
            </div>
        </div>
    )
}
