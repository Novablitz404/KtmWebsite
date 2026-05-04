'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'

interface LandingPageProps {
    upcomingTournaments: any[]
    user: any
    stats: { athletes: number; tournaments: number; clubs: number }
}

// ─── Animated counter hook ───────────────────────────────────────────────────
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

// ─── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal() {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('ktm-visible')
                    observer.unobserve(el)
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return ref
}

// ─── RevealWrapper component for staggered children ──────────────────────────
function Reveal({ direction = 'up', delay = 0, children, className = '' }: {
    direction?: 'up' | 'scale' | 'left' | 'right'
    delay?: number
    children: React.ReactNode
    className?: string
}) {
    const ref = useReveal()
    return (
        <div
            ref={ref}
            className={`ktm-reveal ktm-dir-${direction} ${className}`}
            style={{ animationDelay: delay ? `${delay}s` : undefined }}
        >
            {children}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function LandingPage({ upcomingTournaments, user, stats }: LandingPageProps) {
    const athletes = useCounter(stats.athletes, 2000)
    const tournaments = useCounter(stats.tournaments, 1800)
    const clubs = useCounter(stats.clubs, 1600)

    return (
        <div className="min-h-screen bg-[#070709]" style={{ fontFamily: "var(--font-outfit, 'Inter', sans-serif)" }}>

            {/* ═══════════════════ HERO ═══════════════════ */}
            <section className="relative min-h-[92vh] sm:min-h-screen overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <Image
                        src="/ktmback.png"
                        alt="KTM Combat Sports"
                        fill
                        className="object-cover object-center scale-105"
                        priority
                        unoptimized
                    />
                    {/* Multi-layer gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-transparent to-black/30" />
                    {/* Red accent bloom at bottom */}
                    <div className="absolute bottom-0 left-1/4 w-[600px] h-[300px] bg-red-600/10 blur-[120px] rounded-full" />
                </div>

                {/* Floating particles (CSS-only) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[
                        { left: '10%', top: '20%', size: 3, delay: 0, dur: 8 },
                        { left: '25%', top: '60%', size: 2, delay: 2, dur: 10 },
                        { left: '70%', top: '30%', size: 4, delay: 1, dur: 7 },
                        { left: '85%', top: '70%', size: 2, delay: 3, dur: 9 },
                        { left: '50%', top: '45%', size: 3, delay: 4, dur: 11 },
                        { left: '15%', top: '80%', size: 2, delay: 5, dur: 8 },
                    ].map((p, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-red-500/40"
                            style={{
                                left: p.left, top: p.top,
                                width: p.size, height: p.size,
                                animation: `ktmFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
                            }}
                        />
                    ))}
                </div>

                {/* Hero Content */}
                <div className="relative z-10 flex flex-col items-start justify-center min-h-[92vh] sm:min-h-screen max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                    {/* Headline */}
                    <h1 className="ktm-hero-stagger-2">
                        <span className="block text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.05]">
                            Tradition Rooted.
                        </span>
                        <span className="block text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mt-1 sm:mt-2 pb-2">
                            Innovation Driven.
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="ktm-hero-stagger-3 mt-5 sm:mt-8 text-base sm:text-xl text-gray-400 max-w-xl leading-relaxed">
                        The professional platform for multi-combat sports — tournament management, real-time scoring, and athlete tracking for Taekwondo, Arnis, and beyond.
                    </p>

                    {/* CTA */}
                    <div className="ktm-hero-stagger-4 mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link
                            href="/events"
                            className="group relative px-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all duration-300 shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 text-center overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Browse Events
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </span>
                        </Link>
                        <Link
                            href="/about"
                            className="px-8 py-4 border border-white/15 text-white font-bold rounded-xl hover:bg-white/5 hover:border-white/25 transition-all duration-300 text-center backdrop-blur-sm"
                        >
                            Learn More
                        </Link>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:flex flex-col items-center gap-2">
                        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em]">Scroll</span>
                        <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ STATS ═══════════════════ */}
            <section className="relative bg-[#070709] ktm-grain overflow-hidden">
                {/* Top gradient bleed from hero */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#070709] to-transparent z-10" />

                <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                    <Reveal direction="up">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className="text-2xl sm:text-3xl font-black text-white">Trusted by the Community</h2>
                            <p className="text-gray-500 mt-2 text-sm sm:text-base max-w-2xl mx-auto">Join the growing network of athletes and clubs using KTM</p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-3 gap-4 sm:gap-8">
                        {[
                            { ref: athletes.ref, count: athletes.count, label: 'Athletes', icon: (
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            )},
                            { ref: tournaments.ref, count: tournaments.count, label: 'Tournaments', icon: (
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            )},
                            { ref: clubs.ref, count: clubs.count, label: 'Clubs', icon: (
                                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )},
                        ].map((stat, i) => (
                            <Reveal key={stat.label} direction="up" delay={i * 0.15}>
                                <div
                                    ref={stat.ref}
                                    className="relative text-center p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm ktm-card-glow"
                                >
                                    {/* Icon */}
                                    <div className="flex justify-center mb-3 sm:mb-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                            {stat.icon}
                                        </div>
                                    </div>
                                    {/* Number */}
                                    <div className="text-3xl sm:text-5xl font-black text-white tabular-nums ktm-glow-text">
                                        {stat.count}<span className="text-red-500">+</span>
                                    </div>
                                    {/* Label */}
                                    <div className="mt-2 text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                        {stat.label}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ PARTNERS ═══════════════════ */}
            <section className="relative bg-[#070709] py-12 sm:py-20 overflow-hidden">
                {/* Subtle divider */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

                <Reveal direction="up">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">Our Partners</h2>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-gray-500 text-xs font-bold uppercase tracking-wider">
                                Powering the Combat Sports Community
                            </div>
                        </div>
                    </div>
                </Reveal>

                {/* Infinite Scroll Track */}
                <div className="relative">
                    {/* Fade edges — dark */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-[#070709] to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-[#070709] to-transparent z-10" />

                    <div className="flex ktm-marquee-track w-max">
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
                                        className="shrink-0 opacity-40 hover:opacity-80 transition-opacity duration-300 cursor-default"
                                    >
                                        <img
                                            src={partner.src}
                                            alt={partner.alt}
                                            className="h-10 sm:h-14 w-auto object-contain brightness-0 invert"
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

            </section>

            {/* ═══════════════════ FEATURES ═══════════════════ */}
            <section className="relative bg-[#070709] ktm-grain py-20 sm:py-32 overflow-hidden">
                {/* Background accent */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-red-600/[0.03] blur-[150px] rounded-full pointer-events-none" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal direction="up">
                        <div className="text-center mb-14 sm:mb-20">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 mb-5">
                                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Platform Features</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
                                Professional Tournament Tools
                            </h2>
                            <p className="text-gray-500 mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                                Everything you need to organize, manage, and compete in world-class combat sports events
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
                        {/* Feature 1: Real-time Scoring */}
                        <Reveal direction="up" delay={0}>
                            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 ktm-card-glow overflow-hidden">
                                {/* Top accent bar */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                {/* Hover glow */}
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center mb-6 group-hover:border-red-500/40 transition-colors">
                                        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">Real-time Scoring</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                                        Live score updates with instant bracket progression, round-by-round tracking, and automated match advancement.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* Feature 2: Club Management */}
                        <Reveal direction="up" delay={0.12}>
                            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 ktm-card-glow overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center mb-6 group-hover:border-red-500/40 transition-colors">
                                        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">Club Management</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                                        Register athletes, manage club profiles, handle team registrations, and track your team's tournament performance.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* Feature 3: Analytics & Rankings */}
                        <Reveal direction="up" delay={0.24}>
                            <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 sm:p-10 ktm-card-glow overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-red-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center mb-6 group-hover:border-red-500/40 transition-colors">
                                        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">Analytics & Rankings</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                                        Comprehensive statistics, national rankings, medal tracking, and performance analytics across all events.
                                    </p>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
            <section className="relative bg-[#0a0a0c] ktm-grain py-20 sm:py-32 overflow-hidden">
                {/* Divider */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Reveal direction="up">
                        <div className="text-center mb-14 sm:mb-20">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-5">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Simple Process</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-white">How It Works</h2>
                            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">From sign-up to scoreboard — streamlined in three steps</p>
                        </div>
                    </Reveal>

                    <div className="space-y-5 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-5">
                        {[
                            {
                                step: '01',
                                title: 'Register & Organize',
                                desc: 'Create your tournament, set categories, and open registrations — all in minutes.',
                                icon: (
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                ),
                            },
                            {
                                step: '02',
                                title: 'Manage & Compete',
                                desc: 'Automated brackets, real-time scoring, and live match updates for every bout.',
                                icon: (
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                ),
                            },
                            {
                                step: '03',
                                title: 'Track & Grow',
                                desc: 'Rankings, analytics, and performance history to fuel athlete development.',
                                icon: (
                                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                ),
                            },
                        ].map((item, i) => (
                            <Reveal key={item.step} direction="up" delay={i * 0.12}>
                                <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-7 sm:p-8 ktm-card-glow overflow-hidden h-full">
                                    {/* Red top accent on hover */}
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Step number — large watermark */}
                                    <div className="absolute -top-4 -right-2 text-[80px] sm:text-[100px] font-black text-white/[0.02] leading-none select-none pointer-events-none">
                                        {item.step}
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full">
                                        {/* Top row: icon + step badge */}
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/15 to-red-600/5 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:border-red-500/40 transition-colors">
                                                {item.icon}
                                            </div>
                                            <span className="text-xs font-black text-red-500/60 uppercase tracking-widest">Step {item.step}</span>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed flex-1">{item.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ CTA BANNER ═══════════════════ */}
            {!user && (
                <section className="relative overflow-hidden">
                    {/* Multi-layer background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-800 to-[#070709]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070709]/50 to-transparent" />
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '32px 32px'
                    }} />
                    {/* Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-red-500/20 blur-[120px] rounded-full" />

                    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
                        <Reveal direction="scale">
                            <h2 className="text-3xl sm:text-5xl font-black text-white mb-5">
                                Ready to Compete?
                            </h2>
                            <p className="text-red-100/70 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                                Join the KTM platform and get access to tournaments, rankings, and a community of combat sports athletes.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    href="/events"
                                    className="group px-8 py-4 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 transition-all duration-300 shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-0.5"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        Get Started
                                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </svg>
                                    </span>
                                </Link>
                                <Link
                                    href="/about"
                                    className="px-8 py-4 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition-all duration-300"
                                >
                                    Learn More
                                </Link>
                            </div>
                        </Reveal>
                    </div>
                </section>
            )}

            {/* ═══════════════════ FOOTER ═══════════════════ */}
            <footer className="relative bg-[#050507]">
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                        {/* Brand */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-3 mb-5">
                                <img
                                    src="/ktmnav.png"
                                    alt="KTM Logo"
                                    className="h-8 object-contain brightness-0 invert"
                                />
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                                The complete platform for multi-combat sports management — tournaments, athlete registration, and real-time scoring for Taekwondo, Arnis, and more.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-5">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><Link href="/events" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">Events</Link></li>
                                <li><Link href="/rankings" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">Rankings</Link></li>
                                <li><Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">About Us</Link></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-5">Legal</h4>
                            <ul className="space-y-3">
                                <li><Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">Privacy Policy</Link></li>
                                <li><Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">Terms of Service</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-white/[0.06] mt-12 pt-8 text-center">
                        <p className="text-gray-600 text-sm">
                            © {new Date().getFullYear()} KTM — Combat Sports Manager. Built for the martial arts community.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
