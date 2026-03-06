'use client'

/**
 * SAMPLE EVENT LANDING PAGE — World Championship 2026
 * 
 * This is a TEMPLATE that KTM can clone and customize for each event.
 * Each event gets its own unique design. Copy this file, rename it,
 * and customize everything — layout, colors, images, content.
 * 
 * Then register it in /app/event/[slug]/page.tsx → EVENT_PAGES map.
 */

import Link from 'next/link'
import { Calendar, MapPin, Trophy, Users, Clock, ChevronRight } from 'lucide-react'

interface EventPageProps {
    tournamentId: string
    eventName: string
}

export default function WorldChampionship2026({ tournamentId, eventName }: EventPageProps) {
    // Get the slug from the event config or derive from URL
    const slug = 'world-championship-2026'

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* ===== CUSTOM EVENT NAVBAR ===== */}
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-red-500" />
                        <span className="font-black text-lg tracking-tight">WORLDS 2026</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-8 text-sm text-slate-300">
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#schedule" className="hover:text-white transition-colors">Schedule</a>
                        <Link href={`/event/${slug}/status`} className="hover:text-white transition-colors">Check Status</Link>
                    </div>
                    <Link
                        href={`/event/${slug}/register`}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-all"
                    >
                        Register
                    </Link>
                </div>
            </nav>
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background — event hero image */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-slate-900 to-slate-950" />
                <div className="absolute inset-0 bg-[url('/events/world-championship-2026/herofill.gif')] bg-cover bg-center opacity-30" />

                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />

                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    {/* Event badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full text-red-300 text-sm font-semibold mb-8">
                        <Trophy className="w-4 h-4" />
                        SPECIAL EVENT
                    </div>

                    {/* Event name */}
                    <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                        WOTF World<br />
                        <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                            Championship 2026
                        </span>
                    </h1>

                    {/* Event details */}
                    <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300 mb-10">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-red-400" />
                            <span>August 15-17, 2026</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-400" />
                            <span>Manila, Philippines</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-red-400" />
                            <span>500+ Athletes Expected</span>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={`/event/${slug}/register`}
                            className="group px-10 py-5 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            Register Now
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href={`/event/${slug}/status`}
                            className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-2xl border border-white/20 transition-all"
                        >
                            Check Registration Status
                        </Link>
                    </div>
                </div>
            </section>

            {/* ===== PRICING SECTION ===== */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-4">Registration Fees</h2>
                    <p className="text-slate-400 text-center mb-12">Secure your spot early and save</p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Early Bird */}
                        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/30 rounded-2xl p-8 text-center">
                            <div className="text-green-400 text-sm font-bold uppercase tracking-wider mb-2">Early Bird</div>
                            <div className="text-4xl font-black text-white mb-2">₱2,500</div>
                            <div className="text-slate-400 text-sm mb-4">Until June 30, 2026</div>
                            <div className="inline-flex items-center gap-1 text-green-400 text-sm font-semibold">
                                <Clock className="w-4 h-4" /> Save ₱1,000
                            </div>
                        </div>

                        {/* Regular */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-500/30 rounded-2xl p-8 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">STANDARD</div>
                            <div className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-2">Regular</div>
                            <div className="text-4xl font-black text-white mb-2">₱3,500</div>
                            <div className="text-slate-400 text-sm mb-4">July 1 – Aug 1, 2026</div>
                        </div>

                        {/* Late */}
                        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/30 rounded-2xl p-8 text-center">
                            <div className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-2">Late Registration</div>
                            <div className="text-4xl font-black text-white mb-2">₱4,500</div>
                            <div className="text-slate-400 text-sm mb-4">After August 1, 2026</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CLUB REGISTRATION ===== */}
            <section className="py-20 px-6 bg-slate-900/50">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Club Registration</h2>
                    <p className="text-slate-400 mb-8">
                        Registering multiple athletes? Use our bulk registration to register your entire team in one go.
                    </p>
                    <Link
                        href={`/event/${slug}/bulk-register`}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all"
                    >
                        <Users className="w-5 h-5" />
                        Bulk Register Your Team
                    </Link>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="py-8 px-6 border-t border-slate-800">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                    <p>© 2026 KTM Sports. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
