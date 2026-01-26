'use client'

import { Search, Menu } from 'lucide-react'

interface AdminTopBarProps {
    userName?: string
    userImageUrl?: string
    searchQuery?: string
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    title?: string
    onSettingsClick?: () => void
    onMenuClick?: () => void
}

export default function AdminTopBar({
    userName = 'Admin',
    userImageUrl,
    searchQuery,
    onSearchChange,
    searchPlaceholder = 'Search...',
    title,
    onSettingsClick,
    onMenuClick
}: AdminTopBarProps) {
    // Determine what to show in the center/left area (Search vs Title)
    // If onSearchChange is provided, we prefer showing the search bar.
    // Otherwise, we show the title.
    const showSearch = !!onSearchChange

    return (
        <div className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-gray-200 sticky top-0 z-20">
            {/* Mobile menu button */}
            <div className="md:hidden mr-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Center Content: Search or Title */}
            <div className="flex-1 max-w-md mr-4">
                {showSearch ? (
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery || ''}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                ) : (
                    <h1 className="text-xl font-bold text-gray-900">{title || 'Admin Dashboard'}</h1>
                )}
            </div>

            {/* Right Side: User Profile */}
            <div className="flex items-center gap-2 md:gap-4">
                <div
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={onSettingsClick}
                >
                    {/* User Name - Now shown on all screen sizes, or maybe just hidden on very small? User asked to "put it next to profile picture" */}
                    <span className="text-sm font-medium text-gray-700">{userName}</span>

                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold border-2 border-gray-100 shadow-sm">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
