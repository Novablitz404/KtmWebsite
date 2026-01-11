'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, CalendarCheck, User, LayoutDashboard, Users, CalendarDays } from 'lucide-react'

interface TabConfig {
    href: string
    icon: React.ReactNode
    label: string
    activePattern?: RegExp
}

interface BottomTabBarProps {
    role: string | null
}

export default function BottomTabBar({ role }: BottomTabBarProps) {
    const pathname = usePathname()

    // Define tabs based on user role
    const getTabs = (): TabConfig[] => {
        switch (role) {
            case 'ATHLETE':
                return [
                    { href: '/athlete/home', icon: <Home size={22} />, label: 'Home', activePattern: /^\/athlete\/home/ },
                    { href: '/athlete/events', icon: <CalendarCheck size={22} />, label: 'My Events', activePattern: /^\/athlete\/events/ },
                    { href: '/tournaments', icon: <Trophy size={22} />, label: 'Register', activePattern: /^\/tournaments/ },
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            case 'CLUB_MASTER':
            case 'ASSISTANT_CLUB_MASTER':
                return [
                    { href: '/club', icon: <LayoutDashboard size={22} />, label: 'Dashboard', activePattern: /^\/club$/ },
                    { href: '/members', icon: <Users size={22} />, label: 'Members', activePattern: /^\/members/ },
                    { href: '/club/attendance', icon: <CalendarDays size={22} />, label: 'Attendance', activePattern: /^\/club\/attendance/ },
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            case 'ORGANIZER':
            case 'MANAGER':
            case 'ADMIN':
                return [
                    { href: '/manage', icon: <LayoutDashboard size={22} />, label: 'Dashboard', activePattern: /^\/manage/ },
                    { href: '/manage', icon: <Trophy size={22} />, label: 'Tournaments', activePattern: /^\/manage\/tournament/ },
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            default:
                return [
                    { href: '/', icon: <Home size={22} />, label: 'Home' },
                    { href: '/profile', icon: <User size={22} />, label: 'Profile' },
                ]
        }
    }

    const tabs = getTabs()

    const isActive = (tab: TabConfig) => {
        if (tab.activePattern) {
            return tab.activePattern.test(pathname || '')
        }
        return pathname === tab.href
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-14">
                {tabs.map((tab) => {
                    const active = isActive(tab)
                    return (
                        <Link
                            key={tab.href + tab.label}
                            href={tab.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${active
                                    ? 'text-red-600'
                                    : 'text-gray-400 active:scale-95'
                                }`}
                        >
                            <div className={`relative ${active ? 'scale-110' : ''} transition-transform duration-200`}>
                                {tab.icon}
                                {active && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full" />
                                )}
                            </div>
                            <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-semibold' : ''}`}>
                                {tab.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
