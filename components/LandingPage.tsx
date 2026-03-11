'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

interface LandingPageProps {
    upcomingTournaments: any[]
    user: any
    stats: { athletes: number; tournaments: number; clubs: number }
}

// Animated counter hook
function useCounter(target: number, duration: number = 2000) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLDivElement>(null)
    const hasAnimated = useRef(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true
                    const startTime = performance.now()
                    const animate = (currentTime: number) => {
                        const elapsed = currentTime - startTime
                        const progress = Math.min(elapsed / duration, 1)
                        // Ease-out cubic
                        const eased = 1 - Math.pow(1 - progress, 3)
                        setCount(Math.floor(eased * target))
                        if (progress < 1) requestAnimationFrame(animate)
                    }
                    requestAnimationFrame(animate)
                }
            },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [target, duration])

    return { count, ref }
}

export default function LandingPage({ upcomingTournaments, user, stats }: LandingPageProps) {
    // Stats counters — use real data from database
    const athletes = useCounter(stats.athletes, 2000)
    const tournaments = useCounter(stats.tournaments, 1800)
    const clubs = useCounter(stats.clubs, 1600)

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ===================== HERO SECTION ===================== */}
            <section className="relative min-h-[90vh] sm:min-h-screen overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image
                        src="/ktmback.png"
                        alt="KTM Combat Sports"
                        fill
                        className="object-cover object-center"
                        priority
                        unoptimized
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
                    {/* Red accent glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
                </div>

                {/* Hero Content — Left Aligned */}
                <div className="relative z-10 flex flex-col items-start justify-center min-h-[90vh] sm:min-h-screen max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Headline */}
                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
                        Tradition Rooted.
                    </h1>
                    <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent pb-2">
                        Innovation Driven
                    </h2>

                    {/* Subtitle */}
                    <p className="mt-5 sm:mt-8 text-base sm:text-xl text-gray-300 max-w-lg leading-relaxed">
                        The professional platform for multi-combat sports — tournament management, real-time scoring, and athlete tracking for Taekwondo, Arnis, and beyond.
                    </p>

                    {/* CTA Buttons */}
                    <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link
                            href="/events"
                            className="group relative px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-0.5 text-center overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Browse Events
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </span>
                        </Link>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
                        <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* ===================== STATS STRIP ===================== */}
            <section className="relative bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <div className="text-center mb-10 sm:mb-14">
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Trusted by the Community</h2>
                        <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-2xl mx-auto">Join the growing network of athletes and clubs using KTM</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 sm:gap-8">
                        <div ref={athletes.ref} className="text-center">
                            <div className="text-3xl sm:text-5xl font-black text-red-600 tabular-nums">
                                {athletes.count}<span className="text-red-400">+</span>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Athletes</div>
                        </div>
                        <div ref={tournaments.ref} className="text-center border-x border-gray-200">
                            <div className="text-3xl sm:text-5xl font-black text-red-600 tabular-nums">
                                {tournaments.count}<span className="text-red-400">+</span>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Tournaments</div>
                        </div>
                        <div ref={clubs.ref} className="text-center">
                            <div className="text-3xl sm:text-5xl font-black text-red-600 tabular-nums">
                                {clubs.count}<span className="text-red-400">+</span>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">Clubs</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===================== PARTNERS CAROUSEL ===================== */}
            <section className="bg-white py-12 sm:py-16 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">Our Partners</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-gray-500 text-xs font-bold uppercase tracking-wider">
                            Powering the Combat Sports Community
                        </div>
                    </div>
                </div>

                {/* Infinite Scroll Track */}
                <div className="relative">
                    {/* Fade edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10" />

                    <div className="flex animate-scroll w-max">
                        {[...Array(3)].map((_, setIndex) => (
                            <div key={setIndex} className="flex shrink-0 items-center gap-16 sm:gap-24 px-8 sm:px-12">
                                {[
                                    { src: '/Partners/world-taekwondo.png', alt: 'World Taekwondo' },
                                    { src: '/Partners/kukkiwon.png', alt: 'Kukkiwon' },
                                    { src: '/Partners/wotf-phi.png', alt: 'WOTF Philippines' },
                                    { src: '/Partners/wotf-world.png', alt: 'WOTF World' },
                                    { src: '/Partners/pomelo-ticket.png', alt: 'Pomelo Ticket' },
                                ].map((partner, i) => (
                                    <div
                                        key={`${setIndex}-${i}`}
                                        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300 cursor-default"
                                    >
                                        <img
                                            src={partner.src}
                                            alt={partner.alt}
                                            className="h-10 sm:h-14 w-auto object-contain"
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes scroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-33.3333%); }
                    }
                    .animate-scroll {
                        animation: scroll 20s linear infinite;
                    }
                    .animate-scroll:hover {
                        animation-play-state: paused;
                    }
                `}</style>
            </section>


            {/* ===================== FEATURES SECTION ===================== */}
            < section className="bg-white py-16 sm:py-24" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14 sm:mb-20">
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Professional Tournament Tools</h2>
                        <p className="text-gray-500 mt-3 text-base sm:text-lg max-w-2xl mx-auto">Everything you need to organize, manage, and compete in world-class combat sports events</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                        {/* Feature 1 */}
                        <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 hover:border-red-200 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Scoring</h3>
                            <p className="text-gray-500 leading-relaxed">Live score updates with instant bracket progression, round-by-round tracking, and automated match advancement.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 hover:border-red-200 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Club Management</h3>
                            <p className="text-gray-500 leading-relaxed">Register athletes, manage club profiles, handle team registrations, and track your team's tournament performance.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group relative bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 hover:border-red-200 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics & Rankings</h3>
                            <p className="text-gray-500 leading-relaxed">Comprehensive statistics, national rankings, medal tracking, and performance analytics across all events.</p>
                        </div>
                    </div>
                </div>
            </section >



            {/* ===================== CTA BANNER ===================== */}
            {
                !user && (
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-700 to-red-800" />
                        {/* Decorative pattern */}
                        <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '32px 32px'
                        }} />
                        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
                            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                                Ready to Compete?
                            </h2>
                            <p className="text-red-100 text-base sm:text-lg max-w-xl mx-auto mb-8">
                                Join the KTM platform and get access to tournaments, rankings, and a community of combat sports athletes.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    href="/about"
                                    className="px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Learn More
                                </Link>
                            </div>
                        </div>
                    </section>
                )
            }

            {/* ===================== FOOTER ===================== */}
            <footer className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                        {/* Brand */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    src="/ktmnav.png"
                                    alt="KTM Logo"
                                    className="h-8 object-contain brightness-0 invert"
                                />
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                                The complete platform for multi-combat sports management — tournaments, athlete registration, and real-time scoring for Taekwondo, Arnis, and more.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><Link href="/events" className="text-gray-300 hover:text-white text-sm transition-colors">Events</Link></li>
                                <li><Link href="/rankings" className="text-gray-300 hover:text-white text-sm transition-colors">Rankings</Link></li>
                                <li><Link href="/about" className="text-gray-300 hover:text-white text-sm transition-colors">About Us</Link></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Legal</h4>
                            <ul className="space-y-3">
                                <li><Link href="/privacy" className="text-gray-300 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="text-gray-300 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-gray-800 mt-10 pt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            © {new Date().getFullYear()} KTM — Combat Sports Manager. Built for the martial arts community.
                        </p>
                    </div>
                </div>
            </footer>
        </div >
    )
}
