'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarCheck, User, LayoutDashboard, Users, CalendarDays, Bell, Calendar } from 'lucide-react'
import { getUnreadCount } from '@/app/actions/notifications'

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

    // Check if a path is active
    const isActive = (patterns: (string | RegExp)[]) => {
        return patterns.some(p =>
            typeof p === 'string'
                ? pathname === p || pathname?.startsWith(p + '/')
                : p.test(pathname || '')
        )
    }

    // Athlete-specific nav with centered Home (also default when role is null/loading)
    if (role === 'ATHLETE' || role === null) {
        const homeActive = isActive(['/athlete/home'])
        const registerActive = isActive(['/tournaments', '/tournament'])
        const eventsActive = isActive(['/athlete/events'])
        const alertsActive = isActive(['/notifications'])
        const profileActive = isActive(['/profile'])

        return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-16 relative">
                    {/* Register */}
                    <Link
                        href="/tournaments"
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${registerActive ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={registerActive ? 2.5 : 2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[10px] font-medium">Register</span>
                    </Link>

                    {/* Events */}
                    <Link
                        href="/athlete/events"
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${eventsActive ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <Calendar size={22} strokeWidth={eventsActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </Link>

                    {/* Center Home Button */}
                    <Link
                        href="/athlete/home"
                        className={`flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg transition-all active:scale-95 ${homeActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        <Home size={26} strokeWidth={2.5} />
                    </Link>

                    {/* Alerts */}
                    <Link
                        href="/athlete/home?tab=alerts"
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 relative ${alertsActive ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <div className="relative">
                            <Bell size={22} strokeWidth={alertsActive ? 2.5 : 2} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Alerts</span>
                    </Link>

                    {/* Profile */}
                    <Link
                        href="/athlete/home?tab=profile"
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${profileActive ? 'text-indigo-600' : 'text-gray-400'}`}
                    >
                        <User size={22} strokeWidth={profileActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </div>
            </nav>
        )
    }

    // Club Master nav
    if (role === 'CLUB_MASTER' || role === 'ASSISTANT_CLUB_MASTER') {
        const tabs = [
            { href: '/club', icon: <LayoutDashboard size={22} />, label: 'Club', pattern: /^\/club$/ },
            { href: '/members', icon: <Users size={22} />, label: 'Members', pattern: /^\/members/ },
            { href: '/club/attendance', icon: <CalendarDays size={22} />, label: 'Check-in', pattern: /^\/club\/attendance/ },
            { href: '/notifications', icon: <Bell size={22} />, label: 'Alerts', pattern: /^\/notifications/, badge: unreadCount },
            { href: '/profile', icon: <User size={22} />, label: 'Profile', pattern: /^\/profile/ },
        ]

        return (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-14">
                    {tabs.map((tab) => {
                        const active = tab.pattern.test(pathname || '')
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex flex-col items-center justify-center flex-1 h-full space-y-0.5 ${active ? 'text-red-600' : 'text-gray-400'}`}
                            >
                                <div className="relative">
                                    {tab.icon}
                                    {tab.badge && tab.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white px-0.5">
                                            {tab.badge > 99 ? '99+' : tab.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{tab.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        )
    }

    // Default minimal nav
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-14">
                <Link href="/" className={`flex flex-col items-center justify-center flex-1 h-full space-y-0.5 ${pathname === '/' ? 'text-red-600' : 'text-gray-400'}`}>
                    <Home size={22} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link href="/profile" className={`flex flex-col items-center justify-center flex-1 h-full space-y-0.5 ${pathname === '/profile' ? 'text-red-600' : 'text-gray-400'}`}>
                    <User size={22} />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>
        </nav>
    )
}
