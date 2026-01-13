'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Home, User, Calendar } from 'lucide-react'

interface MobileNavWrapperProps {
    children: React.ReactNode
}

export default function MobileNavWrapper({ children }: MobileNavWrapperProps) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        setIsMobile(window.innerWidth < 768)
    }, [])

    if (!isMobile) {
        return <>{children}</>
    }

    return (
        <>
            {/* Add bottom padding for nav bar */}
            <div className="pb-24">
                {children}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
                <nav className="flex items-center justify-around h-16 relative">
                    {/* Register - Active on this page */}
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-indigo-600">
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[10px] font-medium">Register</span>
                    </div>

                    {/* Events */}
                    <Link href="/athlete/events" className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <Calendar size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </Link>

                    {/* Center Home Button */}
                    <Link
                        href="/athlete/home"
                        className="flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg bg-gray-100 text-gray-600 active:scale-95 transition-all"
                    >
                        <Home size={26} strokeWidth={2.5} />
                    </Link>

                    {/* Alerts */}
                    <Link href="/athlete/home?tab=alerts" className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <Bell size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Alerts</span>
                    </Link>

                    {/* Profile */}
                    <Link href="/athlete/home?tab=profile" className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <User size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </nav>
            </div>
        </>
    )
}
