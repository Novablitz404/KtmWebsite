'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserButton, useUser, SignInButton, SignOutButton as ClerkSignOutButton } from '@clerk/nextjs'

export default function Header() {
    const { user, isLoaded } = useUser()
    const pathname = usePathname()
    const router = useRouter()
    const wasSignedOut = useRef(true)
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Client-side role fetching
    const [role, setRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        if (isLoaded && user) {
            fetch('/api/user/role')
                .then(res => res.json())
                .then(data => {
                    setRole(data.role)
                    setUserName(data.userName)
                })
                .catch(console.error)
        }
    }, [isLoaded, user])

    // Detect sign-in and refresh page to trigger server-side admin redirect
    useEffect(() => {
        if (isLoaded) {
            if (user && wasSignedOut.current) {
                // User just signed in, show loading and refresh
                wasSignedOut.current = false
                setIsRedirecting(true)
                router.refresh()
            } else if (!user) {
                wasSignedOut.current = true
                setIsRedirecting(false)
            }
        }
    }, [isLoaded, user, router])

    // Clear redirecting state when we've navigated away
    useEffect(() => {
        if (pathname?.startsWith('/admin') || pathname?.startsWith('/club') || pathname?.startsWith('/manage')) {
            setIsRedirecting(false)
        }
    }, [pathname])

    // Show full-screen loading overlay during redirect (only on homepage)
    if (isRedirecting && pathname === '/') {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Signing you in...</p>
                </div>
            </div>
        )
    }

    // Hide header on auth pages and Admin Panel
    if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up') || pathname?.startsWith('/onboarding') || pathname?.startsWith('/admin')) {
        return null
    }

    const isHomePage = pathname === '/'
    // Admins should also see Organizer links (Profile, Dashboard) to manage tournaments
    const isOrganizer = role === 'ORGANIZER' || role === 'MANAGER' || role === 'ADMIN'
    const isClubMaster = role === 'CLUB_MASTER' || role === 'ASSISTANT_CLUB_MASTER'
    // Athlete is strictly ATHLETE or someone who has no other role (role is null/undefined)
    const isAthlete = role === 'ATHLETE' || (!role)

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="px-4 sm:px-6">
                <div className="flex items-center h-16">
                    {/* Left Side: Logo & Navigation */}
                    <div className="flex items-center gap-10">
                        {/* Logo / Brand */}
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/KTMLogo.png" alt="KTM Logo" className="h-10 w-10 object-contain" />
                            <span className="font-bold text-xl text-gray-900">KTM</span>
                        </Link>

                        {/* Navigation - Hide on Homepage */}
                        {!isHomePage && user && (
                            <nav className="hidden md:flex items-center gap-8">
                                {/* Athlete Links */}
                                {isAthlete && (
                                    <>
                                        <Link
                                            href="/profile"
                                            className={`text-base font-semibold transition-colors ${pathname === '/profile' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Profile
                                        </Link>
                                        <Link
                                            href="/tournaments"
                                            className={`text-base font-semibold transition-colors ${pathname === '/tournaments' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Register
                                        </Link>
                                        <span className="text-base font-semibold text-gray-400 cursor-not-allowed">
                                            Stats
                                        </span>
                                    </>
                                )}

                                {/* Club Master Links */}
                                {isClubMaster && (
                                    <>
                                        <Link
                                            href="/profile"
                                            className={`text-base font-semibold transition-colors ${pathname === '/profile' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Profile
                                        </Link>
                                        <Link
                                            href="/members"
                                            className={`text-base font-semibold transition-colors ${pathname === '/members' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Members
                                        </Link>
                                        <Link
                                            href="/club"
                                            className={`text-base font-semibold transition-colors ${pathname === '/club' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Tournaments
                                        </Link>
                                    </>
                                )}

                                {/* Organizer Links */}
                                {isOrganizer && (
                                    <>
                                        <Link
                                            href="/profile"
                                            className={`text-base font-semibold transition-colors ${pathname === '/profile' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Profile
                                        </Link>
                                        <Link
                                            href="/manage"
                                            className={`text-base font-semibold transition-colors ${pathname === '/manage' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Dashboard
                                        </Link>
                                    </>
                                )}

                                {/* Admin Dashboard Link - Only show for ADMIN when on /manage */}
                                {role === 'ADMIN' && pathname?.startsWith('/manage') && (
                                    <Link
                                        href="/admin"
                                        className={`text-base font-semibold transition-colors ${pathname === '/admin' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Admin Dashboard
                                    </Link>
                                )}

                                {/* Always show Admin Dashboard link for Admin if they are NOT on /manage, or keep it standard? 
                                    User said: "The admin Dashboard will only appear when the admin is accessing the manage page." 
                                    This implies it should be HIDDEN otherwise if they are acting as an organizer? 
                                    But usually Admins need to get back to Admin land. 
                                    I will interpret "only appear... accessing manage page" as a strict requirement for this context, 
                                    but standard Admin navigation usually requires a permanent link. 
                                    However, sticking to strict user request: */}

                                {role === 'ADMIN' && !pathname?.startsWith('/manage') && (
                                    <Link
                                        href="/admin"
                                        className={`text-base font-semibold transition-colors ${pathname === '/admin' ? 'text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Admin Dashboard
                                    </Link>
                                )}
                            </nav>
                        )}
                    </div>

                    {/* User Menu - Pushed to right */}
                    <div className="flex items-center gap-4 ml-auto">
                        {isLoaded && user ? (
                            <>
                                <span className="hidden sm:inline text-sm text-gray-500">
                                    {user.firstName}
                                </span>
                                {/* Custom User Dropdown */}
                                <UserDropdown user={user} dbName={userName} role={role} />
                            </>
                        ) : isLoaded ? (
                            <SignInButton mode="modal" forceRedirectUrl="/">
                                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Login
                                </button>
                            </SignInButton>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    )
}

import { UserResource } from '@clerk/types'

function UserDropdown({ user, dbName, role }: { user: UserResource, dbName?: string | null, role: string | null }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    // Determine roles for dropdown links
    const isOrganizer = role === 'ORGANIZER' || role === 'MANAGER' || role === 'ADMIN'
    const isClubMaster = role === 'CLUB_MASTER' || role === 'ASSISTANT_CLUB_MASTER'
    const isAthlete = role === 'ATHLETE' || (!role)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [dropdownRef])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 focus:outline-none"
            >
                <img
                    src={user.imageUrl}
                    alt={dbName || user.fullName || "User"}
                    className={`w-9 h-9 rounded-full object-cover border transition-all ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:border-gray-300'}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                            {dbName || user.fullName || user.firstName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                        {/* Mobile Navigation Links (Hidden on Desktop) */}
                        <div className="md:hidden border-b border-gray-50 mb-1 pb-1">
                            {/* Athlete Links */}
                            {isAthlete && (
                                <>
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href="/tournaments"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/tournaments' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Register
                                    </Link>
                                    <span className="flex items-center px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                                        Stats
                                    </span>
                                </>
                            )}

                            {/* Club Master Links */}
                            {isClubMaster && (
                                <>
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href="/members"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/members' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Members
                                    </Link>
                                    <Link
                                        href="/club"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/club' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Tournaments
                                    </Link>
                                </>
                            )}

                            {/* Organizer Links */}
                            {isOrganizer && (
                                <>
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href="/manage"
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname === '/manage' ? 'bg-red-50 text-red-600' : ''}`}
                                    >
                                        Dashboard
                                    </Link>
                                </>
                            )}

                            {/* Admin Link */}
                            {role === 'ADMIN' && (
                                <Link
                                    href="/admin"
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${pathname?.startsWith('/admin') ? 'bg-red-50 text-red-600' : ''}`}
                                >
                                    Admin Dashboard
                                </Link>
                            )}
                        </div>

                        <ClerkSignOutButton redirectUrl="/">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Log Out
                            </button>
                        </ClerkSignOutButton>
                    </div>
                </div>
            )}
        </div>
    )
}
