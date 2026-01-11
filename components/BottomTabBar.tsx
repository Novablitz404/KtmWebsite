'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, CalendarCheck, User, LayoutDashboard, Users, CalendarDays, Bell } from 'lucide-react'
import { getUnreadCount } from '@/app/actions/notifications'

interface TabConfig {
    href: string
    icon: React.ReactNode
    label: string
    activePattern?: RegExp
    badge?: number
}

interface BottomTabBarProps {
    role: string | null
    userId: string | null
}

export default function BottomTabBar({ role, userId }: BottomTabBarProps) {
    const pathname = usePathname()
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!userId) return

        const fetchCount = async () => {
            try {
                const count = await getUnreadCount(userId)
                setUnreadCount(count)
            } catch (error) {
                console.error('Failed to fetch unread count:', error)
            }
        }

        fetchCount()
        const interval = setInterval(fetchCount, 60000)
        return () => clearInterval(interval)
    }, [userId])

    // Define tabs based on user role
    const getTabs = (): TabConfig[] => {
        const notifTab = {
            href: '/notifications',
            icon: <Bell size={22} />,
            label: 'Alerts',
            activePattern: /^\/notifications/,
            badge: unreadCount
        }

        switch (role) {
            case 'ATHLETE':
                return [
                    { href: '/athlete/home', icon: <Home size={22} />, label: 'Home', activePattern: /^\/athlete\/home/ },
                    { href: '/athlete/events', icon: <CalendarCheck size={22} />, label: 'My Events', activePattern: /^\/athlete\/events/ },
                    { href: '/tournaments', icon: <Trophy size={22} />, label: 'Register', activePattern: /^\/tournaments/ },
                    notifTab,
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            case 'CLUB_MASTER':
            case 'ASSISTANT_CLUB_MASTER':
                return [
                    { href: '/club', icon: <LayoutDashboard size={22} />, label: 'Club', activePattern: /^\/club$/ },
                    { href: '/members', icon: <Users size={22} />, label: 'Members', activePattern: /^\/members/ },
                    { href: '/club/attendance', icon: <CalendarDays size={22} />, label: 'Check-in', activePattern: /^\/club\/attendance/ },
                    notifTab,
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            case 'ORGANIZER':
            case 'MANAGER':
            case 'ADMIN':
                return [
                    { href: '/manage', icon: <LayoutDashboard size={22} />, label: 'Dash', activePattern: /^\/manage/ },
                    { href: '/manage', icon: <Trophy size={22} />, label: 'Events', activePattern: /^\/manage\/tournament/ },
                    notifTab,
                    { href: '/profile', icon: <User size={22} />, label: 'Profile', activePattern: /^\/profile/ },
                ]
            default:
                return [
                    { href: '/', icon: <Home size={22} />, label: 'Home' },
                    notifTab,
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
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${active
                                ? 'text-red-600'
                                : 'text-gray-400 active:scale-95'
                                }`}
                        >
                            <div className={`relative ${active ? 'scale-110' : ''} transition-transform duration-200`}>
                                {tab.icon}
                                {active && !tab.badge && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full" />
                                )}
                                {tab.badge && tab.badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white px-0.5">
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </span>
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
