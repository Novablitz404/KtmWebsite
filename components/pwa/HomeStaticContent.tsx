'use client'

import Link from 'next/link'

export function QuickActionsAndRanking() {
    return (
        <>
            {/* Quick Actions */}
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

            {/* Ranking Section */}
            <div className="px-4 mt-6 pb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Ranking</h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-gray-500 text-sm">Ranking system coming soon</p>
                </div>
            </div>
        </>
    )
}
