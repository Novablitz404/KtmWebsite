'use client'

import { Bell, Search } from 'lucide-react'

interface ClubTopBarProps {
    userName?: string
    userImageUrl?: string
    notificationCount?: number
    onNotificationsClick?: () => void

    searchQuery?: string
    onSearchChange?: (term: string) => void
    searchPlaceholder?: string
    title?: string
    onActionClick?: () => void
    actionCount?: number
}

export default function ClubTopBar({
    userName = 'User',
    userImageUrl,
    notificationCount = 0,
    onNotificationsClick,

    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
    title,
    onActionClick,
    actionCount = 0
}: ClubTopBarProps) {
    if (title) {
        return (
            <div className="hidden md:flex items-center justify-between h-16 px-6">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                {/* Show Action Button here too if needed, or just Profile */}
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
                    <div />
                )}
            </div>

            {/* Right Side: Notifications & User Profile */}
            <div className="flex items-center gap-4">


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
