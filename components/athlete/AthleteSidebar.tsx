'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Calendar,
    Bell,
    Settings,
    LogOut,
    ClipboardList,
    Trophy
} from 'lucide-react'

interface AthleteSidebarProps {
    activeView: 'home' | 'settings' | 'ranking'
    onNavigate: (view: 'home' | 'settings' | 'ranking') => void
    userName?: string | null
    userImageUrl?: string | null
}

const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
] as const

export default function AthleteSidebar({
    activeView,
    onNavigate,
    userName,
    userImageUrl
}: AthleteSidebarProps) {
    const { signOut } = useClerk()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 text-gray-900 flex-col z-50">
            {/* Logo / Brand */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <img
                        src="/KTMLogo.png"
                        alt="KTM"
                        className="w-10 h-10 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm truncate text-gray-900">KTM</h2>
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
                            onClick={() => onNavigate(item.id as any)}
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
                    onClick={() => onNavigate('settings')}
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
    )
}
