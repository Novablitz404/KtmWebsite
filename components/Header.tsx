'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function Header() {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()

    // PWA detection state - starts as false, updated on client
    const [isMobilePWA, setIsMobilePWA] = useState(false)

    useEffect(() => {
        // Check if running as installed PWA on mobile
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true
        const isMobileWidth = window.innerWidth < 768

        setIsMobilePWA((isStandalone || isIOSStandalone) && isMobileWidth)

        // Listen for resize
        const handleResize = () => {
            const newIsMobile = window.innerWidth < 768
            setIsMobilePWA((isStandalone || isIOSStandalone) && newIsMobile)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])



    // Prevent flash of header during loading state
    if (!isLoaded) {
        return null
    }

    // Hide header on auth pages and onboarding
    if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname?.startsWith('/onboarding')) {
        return null
    }

    // Hide header for ALL logged-in users - they use their dashboard sidebars instead
    if (user) {
        return null
    }

    // Hide header for ALL Mobile Standalone PWA Users (they use bottom tab bar instead)
    if (isMobilePWA) {
        return null
    }

    const isHomePage = pathname === '/'

    return (
        <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="px-4 sm:px-6">
                <div className="flex items-center h-16">
                    {/* Left Side: Logo & Navigation */}
                    <div className="flex items-center gap-10">
                        {/* Logo / Brand */}
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/KTMLogo.png" alt="KTM Logo" className="h-10 w-10 object-contain" />
                        </Link>

                        {/* Public Navigation Links */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link
                                href="/"
                                className={`text-base font-semibold transition-colors ${pathname === '/' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Home
                            </Link>
                            <Link
                                href="/about"
                                className={`text-base font-semibold transition-colors ${pathname === '/about' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                About Us
                            </Link>
                            <Link
                                href="/events"
                                className={`text-base font-semibold transition-colors ${pathname === '/events' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Tournaments
                            </Link>
                            <Link
                                href="/ranking"
                                className={`text-base font-semibold transition-colors ${pathname === '/ranking' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Ranking
                            </Link>
                        </nav>
                    </div>

                    {/* Right Side: Mobile Menu & Sign In Button */}
                    <div className="flex items-center gap-4 ml-auto">
                        <MobilePublicMenu />

                        {isLoaded && (
                            <Link href="/sign-in">
                                <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                    Sign In
                                </button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}

function MobilePublicMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()
    const { user, isLoaded } = useUser()

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [menuRef])

    return (
        <div className="md:hidden relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Menu"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <Link
                        href="/"
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors ${pathname === '/' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        Home
                    </Link>
                    <Link
                        href="/about"
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors ${pathname === '/about' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        About Us
                    </Link>
                    <Link
                        href="/events"
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors ${pathname === '/events' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        Tournaments
                    </Link>
                    <Link
                        href="/ranking"
                        onClick={() => setIsOpen(false)}
                        className={`block px-4 py-2.5 text-sm font-medium transition-colors ${pathname === '/ranking' ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        Ranking
                    </Link>

                    {/* Sign In Button for Mobile */}
                    {isLoaded && !user && (
                        <>
                            <div className="border-t border-gray-100 my-2" />
                            <div className="px-4 py-2">
                                <Link href="/sign-in">
                                    <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                                        Sign In
                                    </button>
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
