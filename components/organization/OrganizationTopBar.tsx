'use client'

import { Search } from 'lucide-react'

interface OrganizationTopBarProps {
    userName?: string
    userImageUrl?: string
    notificationCount?: number
    onNotificationsClick?: () => void
    searchQuery?: string
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    title?: string
    subtitle?: string
    onSettingsClick?: () => void
}

export default function OrganizationTopBar({
    userName = 'Admin',
    userImageUrl,
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
    onSettingsClick,
}: OrganizationTopBarProps) {
    return (
        <div className="flex items-center justify-between h-14 px-6 border-b border-gray-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">

            {/* Search */}
            <div className="flex-1 max-w-xs">
                {onSearchChange ? (
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery || ''}
                            onChange={e => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-8 pr-4 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
                        />
                    </div>
                ) : (
                    <span className="md:hidden text-sm font-bold text-gray-900">Organization</span>
                )}
            </div>

            {/* Right: User */}
            <button
                onClick={onSettingsClick}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
                {userImageUrl ? (
                    <img
                        src={userImageUrl}
                        alt={userName}
                        className="w-7 h-7 rounded-full object-cover border border-gray-200 shadow-sm"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-black shadow-sm">
                        {userName.charAt(0)}
                    </div>
                )}
                <span className="hidden md:block text-xs font-semibold text-gray-700">{userName}</span>
            </button>
        </div>
    )
}
