'use client'

import { useAuth } from '@/app/providers/AuthProvider'
import { useTenant } from '@/app/providers/TenantProvider'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    Bell,
    Settings,
    LogOut,
    ClipboardList,
    Trophy,
    Medal
} from 'lucide-react'

interface AthleteSidebarProps {
    activeView: 'home' | 'events' | 'achievements' | 'settings' | 'ranking'
    onNavigate: (view: 'home' | 'events' | 'achievements' | 'settings' | 'ranking') => void
    userName?: string | null
    userImageUrl?: string | null
    isOpen: boolean
    onClose: () => void
}

const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'achievements', label: 'Achievements', icon: Medal },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
] as const

export default function AthleteSidebar({
    activeView,
    onNavigate,
    userName,
    userImageUrl,
    isOpen,
    onClose
}: AthleteSidebarProps) {
    const { signOut } = useAuth()
    const router = useRouter()
    const tenant = useTenant()

    const handleLogout = async () => {
        await signOut()
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 text-gray-900 flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Logo / Brand */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <img
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            className="w-10 h-10 object-contain"
                        />
                        <div className="flex-1 min-w-0">
                            <h2 className="font-bold text-sm truncate text-gray-900">WOTF Philippines</h2>
                            <p className="text-xs text-gray-500">Athlete Dashboard</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeView === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onNavigate(item.id as any)
                                    onClose()
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-gray-100 space-y-1">
                    <button
                        onClick={() => {
                            onNavigate('settings')
                            onClose()
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'settings'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut size={20} />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
