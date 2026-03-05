'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/app/providers/AuthProvider'
import { motion } from 'framer-motion'
import { useTenant } from '@/app/providers/TenantProvider'

export default function Header() {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const tenant = useTenant()

    // PWA detection state
    const [isMobilePWA, setIsMobilePWA] = useState(false)

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true
        const isMobileWidth = window.innerWidth < 768
        setIsMobilePWA((isStandalone || isIOSStandalone) && isMobileWidth)

        const handleResize = () => {
            const newIsMobile = window.innerWidth < 768
            setIsMobilePWA((isStandalone || isIOSStandalone) && newIsMobile)
        }

        // Scroll detection for header background
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Initial check
        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    if (!isLoaded) return null
    if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname?.startsWith('/onboarding')) return null
    if (user) return null
    if (isMobilePWA) return null

    const isHomePage = pathname === '/'

    return (
        <>
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${scrolled
                    ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'
                    : isHomePage
                        ? 'bg-transparent'
                        : 'bg-white border-b border-gray-200'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Left: Logo & Nav */}
                        <div className="flex items-center gap-8 lg:gap-12">
                            <Link href="/" className="flex items-center relative">
                                <img
                                    src={tenant.logoUrl}
                                    alt={`${tenant.name} Logo`}
                                    className={`h-8 sm:h-9 object-contain transition-opacity duration-300 ${scrolled || !isHomePage ? 'opacity-100' : 'opacity-0'
                                        }`}
                                />
                                <img
                                    src={tenant.logoWhiteUrl}
                                    alt={`${tenant.name} Logo`}
                                    className={`h-8 sm:h-9 object-contain transition-opacity duration-300 absolute left-0 ${scrolled || !isHomePage ? 'opacity-0' : 'opacity-100'
                                        }`}
                                />
                            </Link>

                            <nav className="hidden md:flex items-center gap-8">
                                {[
                                    { href: '/', label: 'Home' },
                                    { href: '/about', label: 'About' },
                                    { href: '/events', label: 'Events' },
                                    { href: '/rankings', label: 'Rankings' },
                                ].map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`text-sm font-semibold transition-colors relative ${pathname === link.href
                                            ? (scrolled || !isHomePage ? 'text-red-600' : 'text-white')
                                            : (scrolled || !isHomePage ? 'text-gray-600 hover:text-gray-900' : 'text-white/70 hover:text-white')
                                            }`}
                                    >
                                        {link.label}
                                        {pathname === link.href && (
                                            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                                        )}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-3">
                            <MobilePublicMenu scrolled={scrolled} isHomePage={isHomePage} />
                        </div>
                    </div>
                </div>
            </motion.header>
            {/* Spacer for non-home pages to prevent fixed header from clipping content */}
            {!isHomePage && <div className="h-16 sm:h-20" />}
        </>
    )
}

function MobilePublicMenu({ scrolled, isHomePage }: { scrolled: boolean; isHomePage: boolean }) {
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

    const iconColor = scrolled || !isHomePage ? 'text-gray-700' : 'text-white'

    return (
        <div className="md:hidden relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 ${iconColor} transition-colors`}
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
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50">
                    {[
                        { href: '/', label: 'Home' },
                        { href: '/about', label: 'About' },
                        { href: '/events', label: 'Events' },
                        { href: '/rankings', label: 'Rankings' },
                    ].map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`block px-5 py-3 text-sm font-medium transition-colors ${pathname === link.href ? 'text-red-600 bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                </div>
            )}
        </div>
    )
}
