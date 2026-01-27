'use client'

import { Search } from 'lucide-react'
import { JoinNetworkModal } from './JoinNetworkModal'

interface OrganizationTopBarProps {
    userName?: string
    userImageUrl?: string
    notificationCount?: number
    onNotificationsClick?: () => void
    searchQuery?: string
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    title?: string
    onSettingsClick?: () => void
}

export default function OrganizationTopBar({
    userName = 'Admin',
    userImageUrl,
    notificationCount = 0,
    onNotificationsClick,
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
    title,
    onSettingsClick
}: OrganizationTopBarProps) {
    if (title) {
        return (
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100/50 md:border-none bg-white md:bg-transparent">
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>

                {/* Mobile User Profile (Visible when title is shown, e.g. Settings) */}
                <div className="md:hidden flex items-center gap-3">
                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-8 h-8 rounded-full object-cover border border-gray-100"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between h-16 px-4 md:px-6 bg-white md:bg-transparent border-b border-gray-100 md:border-none sticky top-0 z-20 md:static">
            {/* Search Bar */}
            <div className="flex-1 max-w-md mr-4">
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
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 md:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                ) : (
                    <div className="md:hidden text-lg font-bold text-gray-900">
                        Organization
                    </div>
                )}
            </div>

            {/* Right Side: Notifications & User Profile */}
            <div className="flex items-center gap-2 md:gap-4">
                <JoinNetworkModal />

                {/* User Profile */}
                <div
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                    onClick={onSettingsClick}
                >
                    <span className="hidden md:block text-sm font-medium text-gray-700">{userName}</span>
                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-white md:border-gray-100 shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold border-2 border-white md:border-gray-100 shadow-sm">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
