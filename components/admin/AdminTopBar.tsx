'use client'

import { Menu } from 'lucide-react'

interface AdminTopBarProps {
    userName?: string
    userImageUrl?: string
    title?: string
    onSettingsClick?: () => void
    onMenuClick?: () => void
}

export default function AdminTopBar({
    userName = 'Admin',
    userImageUrl,
    title,
    onSettingsClick,
    onMenuClick
}: AdminTopBarProps) {
    return (
        <div className="flex items-center justify-between py-2 px-4 md:px-8">
            {/* Mobile menu and Title container */}
            <div className="flex items-center gap-3">
                <div className="md:hidden">
                    <button
                        onClick={onMenuClick}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title || 'Admin Dashboard'}</h1>
                </div>
            </div>

            {/* Right Side: User Profile */}
            <div className="flex items-center gap-2 md:gap-4">
                <div
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={onSettingsClick}
                >
                    <span className="text-sm font-medium text-gray-700">{userName}</span>

                    {userImageUrl ? (
                        <img
                            src={userImageUrl}
                            alt={userName}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                    ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
