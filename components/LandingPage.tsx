import Link from 'next/link'
import Image from 'next/image'

interface LandingPageProps {
    upcomingTournaments: any[]
    user: any
}

export default function LandingPage({ upcomingTournaments, user }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section - Red & White Theme */}
            <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-800">
                {/* Subtle Pattern */}
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />

                {/* Hero Content */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
                    <div className="text-center">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                                <Image
                                    src="/KTMLogo.png"
                                    alt="KTM Logo"
                                    fill
                                    className="object-contain drop-shadow-2xl"
                                    priority
                                />
                            </div>
                        </div>

                        {/* Title - Solid Text */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight">
                            KTM Tournament Manager
                        </h1>

                        <p className="mt-6 text-lg sm:text-xl text-red-100 max-w-2xl mx-auto leading-relaxed">
                            The professional platform for Taekwondo tournament management,
                            real-time scoring, and athlete tracking.
                        </p>

                        {/* CTA Buttons */}
                        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                href="/events"
                                className="group px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Browse Tournaments
                                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                            {!user && (
                                <Link
                                    href="/sign-in"
                                    className="px-8 py-4 bg-red-900/30 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-red-900/50 hover:border-white/50 transition-all duration-200"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z" fill="white" />
                    </svg>
                </div>
            </div>

            {/* Tournaments Section */}
            <div className="bg-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
                            <p className="text-gray-500 mt-2">Register now for upcoming tournaments</p>
                        </div>
                        <Link
                            href="/events"
                            className="group flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold transition-colors"
                        >
                            View All Events
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>

                    {upcomingTournaments.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
                            <div className="text-5xl mb-4">🏆</div>
                            <p className="text-gray-600 text-lg">No upcoming tournaments scheduled.</p>
                            <p className="text-gray-400 mt-2">Check back soon for new events!</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingTournaments.map((tournament, index) => {
                                const isCancelled = tournament.status === 'CANCELLED'
                                const now = new Date()
                                const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                                const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null

                                let statusBadge = null
                                let statusColor = ''
                                if (isCancelled) {
                                    statusBadge = 'Cancelled'
                                    statusColor = 'bg-red-100 text-red-700 border-red-200'
                                } else if (regEnd && now > regEnd) {
                                    statusBadge = 'Closed'
                                    statusColor = 'bg-gray-100 text-gray-600 border-gray-200'
                                } else if (regStart && now < regStart) {
                                    statusBadge = 'Opening Soon'
                                    statusColor = 'bg-blue-100 text-blue-700 border-blue-200'
                                } else {
                                    statusBadge = 'Open'
                                    statusColor = 'bg-green-100 text-green-700 border-green-200'
                                }

                                const CardContent = (
                                    <>
                                        {/* Image */}
                                        <div className={`h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative ${isCancelled ? 'grayscale opacity-60' : ''}`}>
                                            {tournament.headerImageUrl ? (
                                                <Image
                                                    src={tournament.headerImageUrl}
                                                    alt={tournament.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                    priority={index < 3}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                                                    <span className="text-5xl">🥋</span>
                                                </div>
                                            )}

                                            {/* Status Badge */}
                                            <div className="absolute top-3 right-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColor}`}>
                                                    {statusBadge}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            <h3 className={`font-bold text-lg truncate ${isCancelled ? 'text-gray-400' : 'text-gray-900 group-hover:text-red-600 transition-colors'}`}>
                                                {tournament.name}
                                            </h3>

                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {new Date(tournament.startDate).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                {tournament.venue && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span className="truncate">{tournament.venue}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )

                                if (isCancelled) {
                                    return (
                                        <div key={tournament.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-not-allowed shadow-sm">
                                            {CardContent}
                                        </div>
                                    )
                                }

                                return (
                                    <Link
                                        key={tournament.id}
                                        href={`/tournament/${tournament.id}`}
                                        className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-red-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {CardContent}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900">Professional Tournament Tools</h2>
                        <p className="text-gray-500 mt-2">Everything you need to run world-class events</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Scoring</h3>
                            <p className="text-gray-500">Live score updates with instant bracket progression and match tracking.</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Club Management</h3>
                            <p className="text-gray-500">Register athletes, manage club profiles, and track team performance.</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics & Rankings</h3>
                            <p className="text-gray-500">Comprehensive statistics and rankings across all tournament events.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center mb-4">
                        <Image
                            src="/KTMLogo.png"
                            alt="KTM Logo"
                            width={48}
                            height={48}
                            className="opacity-70"
                        />
                    </div>
                    <p className="text-gray-400 text-sm text-center mb-4">
                        © {new Date().getFullYear()} KTM Tournament Manager. Built for the Taekwondo community.
                    </p>
                    <div className="flex justify-center gap-6">
                        <Link href="/privacy" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                            Terms of Service
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
