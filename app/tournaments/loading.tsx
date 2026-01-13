'use client'

import { Bell, Home, User, Calendar } from 'lucide-react'

// Skeleton loading state matching the tournaments page layout
export default function TournamentsLoading() {
    return (
        <main className="min-h-screen bg-gray-50">
            {/* Mobile Header - REAL content (static) */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-900">Register</h1>
                <p className="text-sm text-gray-500 mt-0.5">Browse upcoming tournaments</p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:pt-4 sm:pb-2">
                {/* Desktop Header - REAL content (static) */}
                <header className="mb-6 sm:mb-8 hidden sm:block">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Active Tournaments
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Find and register for upcoming competitions
                    </p>
                </header>

                {/* Tournament Cards - Skeleton */}
                <div className="space-y-3 sm:space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                        >
                            <div className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Tournament Name */}
                                        <div className="h-5 sm:h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />

                                        {/* Date & Venue */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                                            <span className="text-gray-300">•</span>
                                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                                        </div>

                                        {/* Categories count */}
                                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mt-2" />
                                    </div>

                                    {/* Register Button Skeleton */}
                                    <div className="flex-shrink-0 self-stretch sm:self-center">
                                        <div className="h-10 w-full sm:w-24 bg-gray-200 rounded-xl animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Navigation Bar - Same as athlete home */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 sm:hidden">
                <nav className="flex items-center justify-around h-16 relative">
                    {/* Left side tabs */}
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-indigo-600">
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[10px] font-medium">Register</span>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-400">
                        <Calendar size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </div>

                    {/* Center Home Button */}
                    <div className="flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg bg-gray-100 text-gray-600">
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
        </main>
    )
}
