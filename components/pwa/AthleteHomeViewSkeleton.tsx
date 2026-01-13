'use client'

import Link from 'next/link'
import { Bell, Home, User, Calendar } from 'lucide-react'

// Complete skeleton matching PwaDashboard - uses REAL static content where possible
export default function AthleteHomeViewSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pb-20">
                <main className="min-h-[calc(100vh-80px)] bg-gray-50 pb-20">
                    {/* Hero Section - Only dynamic parts are skeleton */}
                    <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 pt-8 pb-16 px-4">
                        <div className="flex flex-col items-center text-center">
                            {/* Avatar - skeleton (needs user image) */}
                            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mb-3 shadow-lg">
                                <span className="text-3xl">🥋</span>
                            </div>
                            {/* Name - skeleton */}
                            <div className="h-7 w-32 bg-white/30 rounded-lg animate-pulse mb-1" />
                            {/* Club - skeleton */}
                            <div className="h-5 w-24 bg-white/20 rounded animate-pulse" />
                            {/* Belt badge - skeleton */}
                            <div className="mt-2 h-6 w-24 bg-white/30 rounded-full animate-pulse" />
                        </div>
                    </div>

                    {/* Stats Cards - skeleton (needs database counts) */}
                    <div className="px-4 -mt-8">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                                <div className="h-7 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
                                <div className="text-xs text-gray-500 mt-0.5">Events</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                                <div className="h-7 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
                                <div className="text-xs text-gray-500 mt-0.5">Medals</div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                                <div className="h-7 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
                                <div className="text-xs text-gray-500 mt-0.5">Rank</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions - REAL content (no data needed) */}
                    <div className="px-4 mt-6">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
                        <div className="space-y-3">
                            <Link
                                href="/tournaments"
                                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl">
                                    🏆
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Register for Tournament</h3>
                                    <p className="text-sm text-gray-500">Browse upcoming events</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>

                            <Link
                                href="/athlete/events"
                                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                                    📋
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">My Events</h3>
                                    <p className="text-sm text-gray-500">View your registered tournaments</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Ranking section - REAL content (static) */}
                    <div className="px-4 mt-6 pb-8">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ranking</h2>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="text-gray-500 text-sm">Ranking system coming soon</p>
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Navigation Bar - REAL content */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 sm:hidden">
                <nav className="flex items-center justify-around h-16 relative">
                    {/* Left side tabs */}
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[10px] font-medium">Register</span>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <Calendar size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </div>

                    {/* Center Home Button - Floating Circle */}
                    <div className="flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg bg-indigo-600 text-white">
                        <Home size={26} strokeWidth={2.5} />
                    </div>

                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <Bell size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Alerts</span>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <User size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </div>
                </nav>
            </div>
        </div>
    )
}
