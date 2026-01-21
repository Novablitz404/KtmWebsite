'use client'

import { Bell, Search } from 'lucide-react'

interface ClubTopBarProps {
    userName?: string
    userImageUrl?: string
    notificationCount?: number
    onNotificationsClick?: () => void
    onBrowseEvents?: () => void
    searchQuery?: string
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    title?: string
}

export default function ClubTopBar({
    userName = 'User',
    userImageUrl,
    notificationCount = 0,
    onNotificationsClick,
    onBrowseEvents,
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
    title
}: ClubTopBarProps) {
    if (title) {
        return (
            <div className="hidden md:flex items-center h-16 px-6">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
        )
    }

    return (
        <div className="hidden md:flex items-center justify-between h-16 px-6">
            {/* Search Bar OR Browse Events Button */}
            <div className="flex-1 max-w-md">
                {onSearchChange ? (
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                ) : (
                    <button
                        onClick={onBrowseEvents}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
                    >
                        <Search className="h-4 w-4" />
                        <span>Browse Events</span>
                    </button>
                )}
            </div>

            {/* Right Side: Notifications & User Profile */}
            <div className="flex items-center gap-4">
                {/* Notification Bell Removed as requested */}

                {/* User Profile - Display only */}
                <div className="flex items-center gap-3 px-3 py-1.5">
                    <span className="text-sm font-medium text-gray-700">{userName}</span>
                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-9 h-9 rounded-full object-cover border-2 border-gray-100"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
