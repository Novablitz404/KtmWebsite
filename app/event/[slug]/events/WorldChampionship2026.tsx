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
import { Calendar, MapPin, Trophy, Users, Clock, ChevronRight, Globe } from 'lucide-react'
import type { TournamentPricing, TournamentStats } from '../page'

const CURRENCY_SYMBOLS: Record<string, string> = {
    PHP: '₱', USD: '$', EUR: '€', SGD: 'S$', AUD: 'A$', GBP: '£', JPY: '¥', KRW: '₩',
}

// Country name → flag emoji using regional indicators
function getFlagEmoji(countryName: string): string {
    const MAP: Record<string, string> = {
        'Philippines': '🇵🇭', 'United States': '🇺🇸', 'USA': '🇺🇸', 'Japan': '🇯🇵',
        'South Korea': '🇰🇷', 'Korea': '🇰🇷', 'China': '🇨🇳', 'Australia': '🇦🇺',
        'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'Canada': '🇨🇦', 'Germany': '🇩🇪',
        'France': '🇫🇷', 'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Brazil': '🇧🇷',
        'Indonesia': '🇮🇩', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Malaysia': '🇲🇾',
        'Singapore': '🇸🇬', 'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩',
        'Nepal': '🇳🇵', 'Sri Lanka': '🇱🇰', 'Myanmar': '🇲🇲', 'Cambodia': '🇰🇭',
        'Laos': '🇱🇦', 'Brunei': '🇧🇳', 'Timor-Leste': '🇹🇱', 'Mexico': '🇲🇽',
        'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪',
        'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪', 'Qatar': '🇶🇦', 'Kuwait': '🇰🇼',
        'Egypt': '🇪🇬', 'Nigeria': '🇳🇬', 'South Africa': '🇿🇦', 'Kenya': '🇰🇪',
        'Russia': '🇷🇺', 'Ukraine': '🇺🇦', 'Poland': '🇵🇱', 'Netherlands': '🇳🇱',
        'Belgium': '🇧🇪', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
        'Finland': '🇫🇮', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Portugal': '🇵🇹',
        'Greece': '🇬🇷', 'Turkey': '🇹🇷', 'Iran': '🇮🇷', 'Iraq': '🇮🇶',
        'Israel': '🇮🇱', 'Jordan': '🇯🇴', 'Lebanon': '🇱🇧', 'Syria': '🇸🇾',
        'New Zealand': '🇳🇿', 'Fiji': '🇫🇯', 'Papua New Guinea': '🇵🇬',
        'Hong Kong': '🇭🇰', 'Taiwan': '🇹🇼', 'Macau': '🇲🇴',
        'Mongolia': '🇲🇳', 'Kazakhstan': '🇰🇿', 'Uzbekistan': '🇺🇿',
    }
    return MAP[countryName] ?? '🏳️'
}

interface EventPageProps {
    tournamentId: string
    eventName: string
    pricing: TournamentPricing
    stats: TournamentStats
}

export default function WorldChampionship2026({ tournamentId, eventName, pricing, stats }: EventPageProps) {
    const slug = 'world-championship-2026'
    const symbol = CURRENCY_SYMBOLS[pricing.currency] ?? pricing.currency
    const hasEarlyBird = pricing.earlyBirdPrice != null
    const hasRegular = pricing.regularPrice != null
    const hasCategoryPricing = pricing.categoryPricing && Object.keys(pricing.categoryPricing).length > 0
    const showAnyPricing = pricing.showPricing && (hasEarlyBird || hasRegular || hasCategoryPricing)

    const formatPrice = (amount: number) => amount % 1 === 0 ? amount.toLocaleString() : amount.toFixed(2)

    const earlyBirdDeadlineStr = pricing.earlyBirdDeadline
        ? new Date(pricing.earlyBirdDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : null

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

            {/* ===== LIVE STATS BAR ===== */}
            <section className="relative py-12 px-6 bg-slate-900/70 border-y border-white/5">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-8">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                Live Registration Stats
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                                { label: 'Athletes', value: stats.totalAthletes, color: 'from-red-500/20 to-red-500/5 border-red-500/20' },
                                { label: 'Kyorugi', value: stats.kyorugi, color: 'from-orange-500/20 to-orange-500/5 border-orange-500/20' },
                                { label: 'Poomsae', value: stats.poomsae, color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20' },
                                { label: 'Teams', value: stats.teams, color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20' },
                                { label: 'Countries', value: stats.countries.length, color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20' },
                            ].map(s => (
                                <div key={s.label} className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5 text-center`}>
                                    <div className="text-3xl font-black text-white mb-0.5">{s.value.toLocaleString()}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            {/* ===== COUNTRY FLAGS ===== */}
            <section className="relative py-14 px-6 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 to-transparent pointer-events-none" />
                    <div className="relative max-w-5xl mx-auto">
                        <div className="flex items-center gap-3 mb-8 justify-center">
                            <Globe className="w-4 h-4 text-slate-500" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{stats.countries.length} Countries Participating</p>
                            <Globe className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {stats.countries.map(({ country, count }) => (
                                <div
                                    key={country}
                                    className="flex flex-col items-center gap-1.5 group cursor-default"
                                >
                                    <div className="w-20 h-12 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 group-hover:bg-white/10 flex items-center justify-center text-3xl transition-all duration-300 shadow-lg">
                                        {getFlagEmoji(country)}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium text-center max-w-[80px] leading-tight">{country}</span>
                                    <span className="text-xs font-black text-red-400 tabular-nums">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            {/* ===== PRICING SECTION ===== */}
            <section id="pricing" className="relative py-24 px-6 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto">
                    {/* Section header */}
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest mb-5">
                            💰 Registration Fees
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                            Secure Your Spot
                        </h2>
                        <p className="text-slate-400 text-lg max-w-md mx-auto">
                            Register early for the best rates. All fees are non-refundable after confirmation.
                        </p>
                    </div>

                    {!showAnyPricing ? (
                        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                            <div className="text-5xl mb-4">🏷️</div>
                            <p className="text-xl font-bold text-white mb-2">Fee details coming soon</p>
                            <p className="text-slate-400 text-sm">Contact the organizer for current registration fees.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Main pricing cards */}
                            {(hasEarlyBird || hasRegular) && (
                                <div className={`grid gap-5 ${hasEarlyBird && hasRegular ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>

                                    {/* Early Bird Card */}
                                    {hasEarlyBird && (
                                        <div className="group relative rounded-3xl overflow-hidden">
                                            {/* Card glow */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            {/* Glass card */}
                                            <div className="relative bg-gradient-to-br from-emerald-950/80 to-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col">
                                                {/* Top badge */}
                                                <div className="flex items-center justify-between mb-6">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
                                                        ⚡ Early Bird
                                                    </span>
                                                    {earlyBirdDeadlineStr && (
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Clock className="w-3 h-3" /> Until {earlyBirdDeadlineStr}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Price */}
                                                <div className="mb-6 flex-1">
                                                    <div className="text-6xl font-black text-white leading-none mb-1">
                                                        <span className="text-2xl font-bold text-emerald-400 align-top mt-2 inline-block mr-1">{symbol}</span>
                                                        {formatPrice(pricing.earlyBirdPrice!)}
                                                    </div>
                                                    <p className="text-slate-400 text-sm mt-2">per athlete</p>
                                                </div>

                                                {/* Savings badge */}
                                                {hasRegular && (
                                                    <div className="mt-auto p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                                        <p className="text-emerald-400 text-sm font-black">
                                                            🎉 Save {symbol}{formatPrice(pricing.regularPrice! - pricing.earlyBirdPrice!)} vs Regular
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Bottom decorative line */}
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Regular Card */}
                                    {hasRegular && (
                                        <div className="group relative rounded-3xl overflow-hidden">
                                            {/* Card glow */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            {/* Glass card */}
                                            <div className="relative bg-gradient-to-br from-red-950/80 to-slate-900/90 border border-red-500/30 rounded-3xl p-8 backdrop-blur-sm h-full flex flex-col">
                                                {/* Best value badge */}
                                                {!hasEarlyBird && (
                                                    <div className="absolute -top-px left-1/2 -translate-x-1/2 px-5 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black rounded-b-xl shadow-lg shadow-red-500/30 uppercase tracking-wider">
                                                        Standard Rate
                                                    </div>
                                                )}

                                                {/* Top badge */}
                                                <div className="flex items-center justify-between mb-6 mt-2">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-black uppercase tracking-widest">
                                                        🏆 Regular
                                                    </span>
                                                </div>

                                                {/* Price */}
                                                <div className="mb-6 flex-1">
                                                    <div className="text-6xl font-black text-white leading-none mb-1">
                                                        <span className="text-2xl font-bold text-red-400 align-top mt-2 inline-block mr-1">{symbol}</span>
                                                        {formatPrice(pricing.regularPrice!)}
                                                    </div>
                                                    <p className="text-slate-400 text-sm mt-2">per athlete</p>
                                                </div>

                                                {/* CTA hint */}
                                                <div className="mt-auto p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                                                    <p className="text-red-400 text-sm font-semibold">
                                                        Standard registration rate
                                                    </p>
                                                </div>

                                                {/* Bottom decorative line */}
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-60" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Per-category pricing — card grid */}
                            {hasCategoryPricing && (
                                <div>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Category Breakdown</p>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(pricing.categoryPricing!).map(([key, val]) => {
                                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                            const hasEB = val.earlyBird != null
                                            const hasReg = val.regular != null
                                            return (
                                                <div key={key} className="group relative bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all duration-300 backdrop-blur-sm flex flex-col gap-3">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>

                                                    <div className="flex items-end justify-between gap-3">
                                                        {hasEB && (
                                                            <div>
                                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-0.5">Early Bird</p>
                                                                <p className="text-2xl font-black text-white">{symbol}{formatPrice(val.earlyBird!)}</p>
                                                            </div>
                                                        )}
                                                        {hasReg && (
                                                            <div className={hasEB ? 'text-right' : ''}>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Regular</p>
                                                                <p className={`font-black ${hasEB ? 'text-slate-500 line-through text-base' : 'text-white text-2xl'}`}>{symbol}{formatPrice(val.regular!)}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Savings badge — only when both prices exist */}
                                                    {hasEB && hasReg && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
                                                            <span className="text-emerald-400 text-[11px] font-black">
                                                                🏷️ You save {symbol}{formatPrice(val.regular! - val.earlyBird!)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Hover accent */}
                                                    <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Bottom CTA */}
                            <div className="text-center pt-4">
                                <Link
                                    href={`/event/${slug}/register`}
                                    className="group inline-flex items-center gap-2 px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-2xl transition-all shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/50 hover:-translate-y-0.5"
                                >
                                    Register Now — Get Your Spot
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <p className="text-xs text-slate-500 mt-3">All registrations are subject to approval</p>
                            </div>
                        </div>
                    )}
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
