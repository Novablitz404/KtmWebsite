'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    Calendar,
    Key,
    Settings,
    LogOut,
    Shield,
    FileText
} from 'lucide-react'

interface AdminSidebarProps {
    activeView: 'home' | 'users' | 'events' | 'api-keys' | 'guidelines' | 'settings'
    onNavigate: (view: 'home' | 'users' | 'events' | 'api-keys' | 'guidelines' | 'settings') => void
    userName?: string | null
}

const navItems = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'guidelines', label: 'Guidelines', icon: FileText },
    { id: 'api-keys', label: 'API Keys', icon: Key },
] as const

export default function AdminSidebar({
    activeView,
    onNavigate,
    userName
}: AdminSidebarProps) {
    const { signOut } = useClerk()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-gray-900 text-white flex-col z-50">
            {/* Logo / Brand */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm truncate text-white">KTM Admin</h2>
                        <p className="text-xs text-gray-400">System Management</p>
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
                                : 'text-gray-300 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-800 space-y-1">
                <button
                    onClick={() => onNavigate('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeView === 'settings'
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all"
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>


        </aside>
    )
}
