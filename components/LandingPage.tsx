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
                        alt="Taekwondo athletes in action"
                        fill
                        className="object-cover object-center"
                        priority
                        quality={90}
                    />
                    {/* Dark overlay — heavier on the left for text readability, lighter on the right to show athletes */}
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
                        The professional platform for tournament management, real-time scoring, and athlete tracking.
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
                        {!user && (
                            <Link
                                href="/sign-in"
                                className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 transition-all duration-300 backdrop-blur-sm text-center"
                            >
                                Sign In
                            </Link>
                        )}
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
                            Powering the Taekwondo Community
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

            {/* ===================== UPCOMING EVENTS ===================== */}
            < section className="bg-gray-50 py-16 sm:py-24" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 sm:mb-14 gap-4">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Upcoming Events</h2>
                            <p className="text-gray-500 mt-2 text-base sm:text-lg">Register now for the latest tournaments and events</p>
                        </div>
                        <Link
                            href="/events"
                            className="group flex items-center gap-2 text-red-600 hover:text-red-700 font-bold transition-colors text-sm sm:text-base"
                        >
                            View All Events
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>

                    {upcomingTournaments.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                            <div className="text-6xl mb-4">🏆</div>
                            <p className="text-gray-600 text-lg font-semibold">No upcoming events</p>
                            <p className="text-gray-400 mt-2">Check back soon for new tournaments and events!</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingTournaments.map((event, index) => {
                                const isCancelled = event.status === 'CANCELLED'
                                const now = new Date()
                                const regStart = event.regStart ? new Date(event.regStart) : null
                                const regEnd = event.regEnd ? new Date(event.regEnd) : null

                                let statusBadge = ''
                                let statusColor = ''
                                if (isCancelled) {
                                    statusBadge = 'Cancelled'
                                    statusColor = 'bg-red-500 text-white'
                                } else if (regEnd && now > regEnd) {
                                    statusBadge = 'Closed'
                                    statusColor = 'bg-gray-500 text-white'
                                } else if (regStart && now < regStart) {
                                    statusBadge = 'Opening Soon'
                                    statusColor = 'bg-blue-500 text-white'
                                } else {
                                    statusBadge = 'Open'
                                    statusColor = 'bg-emerald-500 text-white'
                                }

                                const eventDate = new Date(event.date)
                                const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                                const day = eventDate.getDate()

                                const CardContent = (
                                    <>
                                        {/* Image */}
                                        <div className={`relative h-48 sm:h-52 overflow-hidden ${isCancelled ? 'grayscale opacity-60' : ''}`}>
                                            {event.imageUrl ? (
                                                <Image
                                                    src={event.imageUrl}
                                                    alt={event.name}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, 33vw"
                                                    priority={index < 3}
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                                                    <span className="text-6xl">
                                                        {event.type === 'PROMOTION' ? '🥋' : event.type === 'SEMINAR' ? '🎓' : '🏆'}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                                            {/* Date Pill */}
                                            <div className="absolute top-4 left-4 bg-white rounded-xl px-3 py-2 shadow-lg text-center min-w-[56px]">
                                                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider leading-none">{month}</div>
                                                <div className="text-xl font-black text-gray-900 leading-tight mt-0.5">{day}</div>
                                            </div>

                                            {/* Status & Type Badges */}
                                            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                                                {event.visibility === 'PRIVATE' && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-900/80 text-white backdrop-blur-sm flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Private
                                                    </span>
                                                )}
                                                {event.type === 'PROMOTION' && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">Test</span>
                                                )}
                                                {event.type === 'SEMINAR' && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500 text-white">Seminar</span>
                                                )}
                                                {!event.visibility?.includes('PRIVATE') && (
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                                                        {statusBadge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 sm:p-6">
                                            <h3 className={`font-bold text-lg leading-snug line-clamp-2 ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-red-600 transition-colors'}`}>
                                                {event.name}
                                            </h3>

                                            <div className="mt-4 space-y-2.5">
                                                {event.venue && (
                                                    <div className="flex items-start gap-2.5 text-sm text-gray-500">
                                                        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span className="truncate">{event.venue}</span>
                                                    </div>
                                                )}
                                                {regEnd && now < regEnd && !isCancelled && (
                                                    <div className="flex items-center gap-2.5 text-sm text-gray-500">
                                                        <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>Deadline: {new Date(regEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )

                                if (isCancelled) {
                                    return (
                                        <div key={event.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-not-allowed shadow-sm">
                                            {CardContent}
                                        </div>
                                    )
                                }

                                return (
                                    <Link
                                        key={event.id}
                                        href={event.link}
                                        className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-red-200 hover:shadow-xl hover:shadow-red-600/5 transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {CardContent}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            </section >

            {/* ===================== FEATURES SECTION ===================== */}
            < section className="bg-white py-16 sm:py-24" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-14 sm:mb-20">
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Professional Tournament Tools</h2>
                        <p className="text-gray-500 mt-3 text-base sm:text-lg max-w-2xl mx-auto">Everything you need to organize, manage, and compete in world-class Taekwondo events</p>
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

            {/* ===================== MOBILE APP SECTION ===================== */}
            < section className="bg-gray-50 py-16 sm:py-24 overflow-hidden" >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Section Header */}
                    <div className="text-center mb-14 sm:mb-20">
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900">Take KTM Anywhere</h2>
                        <p className="text-gray-500 mt-3 text-base sm:text-lg max-w-2xl mx-auto">Manage registrations, track events, and stay updated — all from your phone</p>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
                        {/* Phone Mockup — 2 cols */}
                        <div className="lg:col-span-2 relative flex justify-center">
                            <div className="relative">
                                {/* Phone frame */}
                                <div className="relative w-[240px] sm:w-[270px] bg-gray-950 rounded-[2.5rem] p-2.5 shadow-2xl shadow-gray-900/30 border border-gray-800">
                                    {/* Screen */}
                                    <div className="w-full aspect-[9/19] bg-gray-900 rounded-[2rem] overflow-hidden relative">
                                        {/* Status bar */}
                                        <div className="flex items-center justify-between px-6 pt-3 pb-2">
                                            <span className="text-[10px] text-white/50 font-medium">9:41</span>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-950 rounded-b-2xl" />
                                            <div className="flex items-center gap-1">
                                                <div className="w-3.5 h-2 border border-white/50 rounded-sm"><div className="w-2 h-full bg-white/50 rounded-sm" /></div>
                                            </div>
                                        </div>

                                        {/* App header */}
                                        <div className="px-5 pt-2 pb-4">
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="flex items-center gap-2">
                                                    <img src="/KTMLogo.png" alt="KTM" className="w-7 h-7 object-contain" />
                                                    <span className="text-xs font-bold text-white">KTM</span>
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-red-600/20 flex items-center justify-center">
                                                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                    </svg>
                                                </div>
                                            </div>

                                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Welcome back</div>
                                            <div className="text-sm font-bold text-white mb-5">Juan Dela Cruz</div>
                                        </div>

                                        {/* Upcoming event card */}
                                        <div className="px-5 mb-3">
                                            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-4 shadow-lg shadow-red-900/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[9px] font-bold text-red-200 uppercase tracking-wider">Upcoming Event</span>
                                                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-bold text-white">Registered</span>
                                                </div>
                                                <div className="text-xs font-bold text-white leading-snug">National Championship 2026</div>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-red-200">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        Mar 15
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                                        Manila
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats row */}
                                        <div className="px-5 mb-3 grid grid-cols-3 gap-2">
                                            {[
                                                { val: '5', label: 'Events' },
                                                { val: '3', label: 'Medals' },
                                                { val: '#12', label: 'Rank' },
                                            ].map((s, i) => (
                                                <div key={i} className="bg-gray-800/60 rounded-xl py-2.5 text-center">
                                                    <div className="text-sm font-black text-white">{s.val}</div>
                                                    <div className="text-[9px] text-gray-500 font-semibold uppercase">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Registration list */}
                                        <div className="px-5">
                                            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">My Registrations</div>
                                            {[
                                                { cat: 'Kyorugi - Senior', status: 'Confirmed', color: 'bg-emerald-400' },
                                                { cat: 'Poomsae - Individual', status: 'Pending', color: 'bg-amber-400' },
                                            ].map((r, i) => (
                                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                                                    <span className="text-[11px] text-gray-300">{r.cat}</span>
                                                    <span className={`flex items-center gap-1 text-[9px] font-bold uppercase ${r.status === 'Confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${r.color}`} />
                                                        {r.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Subtle glow */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-12 bg-red-500/15 rounded-full blur-2xl" />
                            </div>
                        </div>

                        {/* Features — 3 cols */}
                        <div className="lg:col-span-3">
                            <div className="grid sm:grid-cols-2 gap-5">
                                {[
                                    {
                                        title: 'Easy Registration',
                                        desc: 'Browse tournaments and register your athletes directly from your phone.',
                                        icon: (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        title: 'Event Tracking',
                                        desc: 'View brackets, schedules, and match results as they happen.',
                                        icon: (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        title: 'Push Notifications',
                                        desc: 'Stay informed with alerts for match schedules, updates, and announcements.',
                                        icon: (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        title: 'Athlete Profile',
                                        desc: 'Manage your profile, track medals, and view your national ranking.',
                                        icon: (
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        ),
                                    },
                                ].map((feature, i) => (
                                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-red-200 hover:shadow-lg hover:shadow-red-600/5 transition-all duration-300">
                                        <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-600 mb-4">
                                            {feature.icon}
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Coming Soon buttons */}
                            <div className="flex flex-wrap gap-3 mt-8">
                                <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-gray-100/80 text-gray-400 rounded-xl border border-gray-200 cursor-not-allowed">
                                    <svg className="w-6 h-6 grayscale opacity-80" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">App Store</div>
                                        <div className="text-sm font-semibold leading-none text-gray-500">Coming Soon</div>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-gray-100/80 text-gray-400 rounded-xl border border-gray-200 cursor-not-allowed">
                                    <svg className="w-6 h-6 grayscale opacity-80" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.302-2.302 2.302-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                                    </svg>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Google Play</div>
                                        <div className="text-sm font-semibold leading-none text-gray-500">Coming Soon</div>
                                    </div>
                                </div>
                            </div>
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
                                Join the KTM platform and get access to tournaments, rankings, and a community of Taekwondo athletes.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    href="/sign-up"
                                    className="px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Create Account
                                </Link>
                                <Link
                                    href="/about"
                                    className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 transition-all duration-200"
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
                                The complete platform for Taekwondo tournament management, athlete registration, and real-time scoring.
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
                            © {new Date().getFullYear()} KTM Taekwondo Manager. Built for the Taekwondo community.
                        </p>
                    </div>
                </div>
            </footer>
        </div >
    )
}
