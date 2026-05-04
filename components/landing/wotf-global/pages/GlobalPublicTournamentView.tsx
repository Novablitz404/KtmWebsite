'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, ChevronRight, FileText } from 'lucide-react'
import { Tournament, Player as PrismaPlayer } from '@prisma/client'

// Extended Player type with enriched fields
type Player = PrismaPlayer & {
    club: { name: string; logoUrl: string | null } | null
    category?: { id: string; name: string; type: string; tournamentId: string; court: string | null } | null
    imageUrl?: string
}

type UniqueAthlete = {
    name: string
    belt: string | null
    club: { name: string; logoUrl: string | null } | null
    imageUrl?: string
    eventTypes: string[]
    userId: string | null
    id: string
}

interface TournamentStats {
    total: number
    approved: number
    pending: number
    rejected: number
    uniqueAthletes?: number
    uniqueApproved?: number
    kyorugi: number
    poomsae: number
    kyukpa: number
    clubs: { name: string; logoUrl: string | null; count: number; approved: number; pending: number }[]
}

interface PublicTournamentViewProps {
    tournament: Tournament
    players: Player[]
    guidelinesContent?: string | null
    currentUserId?: string
    tournamentStats?: TournamentStats | null
    totalPlayersCount?: number
}

export default function GlobalPublicTournamentView(props: PublicTournamentViewProps) {
    const { tournament, players, tournamentStats, totalPlayersCount } = props

    const totalAthletes = tournamentStats?.uniqueAthletes ?? totalPlayersCount ?? players.length
    const totalClubs = tournamentStats?.clubs?.length ?? (() => {
        const clubMap = new Map<string, string | null>()
        players.forEach(p => { if (p.club?.name) clubMap.set(p.club.name, p.club.logoUrl || null) })
        return clubMap.size
    })()

    const clubMap = new Map<string, string | null>()
    if (tournamentStats?.clubs?.length) {
        tournamentStats.clubs.forEach(c => clubMap.set(c.name, c.logoUrl))
    } else {
        players.forEach(p => {
            if (p.club?.name) {
                if (!clubMap.has(p.club.name) || p.club.logoUrl) {
                    clubMap.set(p.club.name, p.club.logoUrl || null)
                }
            }
        })
    }

    const teams = Array.from(clubMap.keys()).sort()

    const athleteMap = new Map<string, UniqueAthlete>()
    players.forEach(p => {
        const key = p.userId || `${p.name.toLowerCase().trim()}::${p.clubId || 'none'}`
        const existing = athleteMap.get(key)
        const eventType = p.category?.type || 'KYORUGI'
        if (existing) {
            if (!existing.eventTypes.includes(eventType)) {
                existing.eventTypes.push(eventType)
            }
            if (p.imageUrl && !existing.imageUrl) {
                existing.imageUrl = p.imageUrl
            }
        } else {
            athleteMap.set(key, {
                name: p.name,
                belt: p.belt,
                club: p.club,
                imageUrl: (p as any).imageUrl || undefined,
                eventTypes: [eventType],
                userId: p.userId,
                id: p.id,
            })
        }
    })
    const uniqueAthletes = Array.from(athleteMap.values())

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 28
    const totalPages = Math.ceil(uniqueAthletes.length / itemsPerPage)
    const displayedAthletes = uniqueAthletes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const [activeTab, setActiveTab] = useState<'overview' | 'guidelines'>('overview')
    const router = useRouter()

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-white transition-colors hover:bg-white/5 px-3 py-1.5 rounded-lg -ml-3 uppercase tracking-widest"
                >
                    <ChevronRight className="w-4 h-4 mr-1.5 rotate-180" />
                    Back
                </button>

                <div>
                    {(() => {
                        const now = new Date()
                        const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                        const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null
                        const isRegistered = props.currentUserId && players.some(p => p.userId === props.currentUserId)

                        if (isRegistered) {
                            return (
                                <button disabled className="px-6 py-2 bg-green-500/10 text-green-500 font-bold uppercase tracking-widest rounded shadow-sm border border-green-500/20 cursor-default text-sm">
                                    ✅ Registered
                                </button>
                            )
                        }

                        if (regEnd && now > regEnd) {
                            return (
                                <button disabled className="px-6 py-2 bg-[#111] text-gray-500 font-bold uppercase tracking-widest rounded border border-white/10 cursor-not-allowed text-sm">
                                    🚫 Closed
                                </button>
                            )
                        }

                        if (regStart && now < regStart) {
                            return (
                                <button disabled className="px-6 py-2 bg-[#0085C7]/10 text-[#0085C7] font-bold uppercase tracking-widest rounded border border-[#0085C7]/20 cursor-default text-sm">
                                    ⏳ Opens {regStart.toLocaleDateString()}
                                </button>
                            )
                        }

                        return (
                            <a
                                href={`/tournament/${tournament.id}/register`}
                                className="inline-flex items-center px-6 py-2 text-white font-black uppercase tracking-widest rounded shadow-md transition-all active:scale-95 hover:opacity-90 bg-[#DF0024] text-sm"
                            >
                                Register Now
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </a>
                        )
                    })()}
                </div>
            </div>

            {tournament.headerImageUrl && (
                <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden shadow-lg bg-[#111] border border-white/10">
                    <img
                        src={tournament.headerImageUrl}
                        alt={tournament.name}
                        className="w-full h-full object-cover opacity-80 mix-blend-screen"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-white mb-4">
                                    {tournament.name}
                                </h1>
                                <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-white/90">
                                    <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-white/10">
                                        📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {tournament.venue && (
                                        <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-white/10">
                                            📍 {tournament.venue}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-1 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-[#DF0024] text-[#DF0024]'
                        : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                >
                    Overview
                </button>
                {props.guidelinesContent && (
                    <button
                        onClick={() => setActiveTab('guidelines')}
                        className={`pb-3 px-1 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'guidelines'
                            ? 'border-[#DF0024] text-[#DF0024]'
                            : 'border-transparent text-gray-500 hover:text-white'
                            }`}
                    >
                        Guidelines
                    </button>
                )}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#111] p-6 rounded-xl border border-white/10 text-center">
                            <span className="text-4xl font-black text-[#F4C300] block mb-1">{totalClubs}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Participating Teams</span>
                        </div>
                        <div className="bg-[#111] p-6 rounded-xl border border-white/10 text-center">
                            <span className="text-4xl font-black text-[#0085C7] block mb-1">{totalAthletes}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Registered Athletes</span>
                        </div>
                        <div className="bg-[#111] p-6 rounded-xl border border-white/10 text-center flex flex-col justify-center">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Venue</span>
                            <span className="text-lg font-black text-white uppercase tracking-wider">{tournament.venue || 'TBA'}</span>
                        </div>
                    </div>

                    <section>
                        <h3 className="text-xl font-black uppercase tracking-wider text-white mb-6">
                            Participating Teams
                        </h3>
                        {teams.length === 0 ? (
                            <div className="text-gray-500 font-medium text-sm">No teams registered yet.</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {teams.map((teamName, idx) => {
                                    const logoUrl = clubMap.get(teamName)
                                    return (
                                        <span key={idx} className="bg-[#111] px-4 py-2 rounded-lg border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-wide flex items-center gap-3 pr-6 hover:bg-white/5 transition-colors">
                                            {logoUrl ? (
                                                <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 p-0.5 overflow-hidden flex-shrink-0">
                                                    <img src={logoUrl} alt={teamName} className="w-full h-full object-contain filter brightness-90" />
                                                </div>
                                            ) : (
                                                <span className="w-8 h-8 rounded-md bg-[#222] flex items-center justify-center text-xs text-gray-400 font-black border border-white/5">
                                                    {teamName.substring(0, 2)}
                                                </span>
                                            )}
                                            <span>{teamName}</span>
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    <section>
                        <div className="mb-6">
                            <h3 className="text-xl font-black uppercase tracking-wider text-white">
                                Registered Athletes
                            </h3>
                        </div>

                        {uniqueAthletes.length === 0 ? (
                            <div className="text-gray-500 font-medium text-sm">No athletes registered yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {displayedAthletes.map((athlete) => {
                                    return (
                                        <div key={athlete.id} className="group bg-[#111] rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-12 bg-white/5 z-0" />
                                            <div className="absolute top-2 right-2 z-20 flex gap-1">
                                                {athlete.eventTypes.includes('KYORUGI') && (
                                                    <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider bg-[#0085C7] text-white">
                                                        Kyorugi
                                                    </span>
                                                )}
                                                {athlete.eventTypes.includes('POOMSAE') && (
                                                    <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider bg-purple-600 text-white">
                                                        Poomsae
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative z-10 mb-3 mt-1">
                                                <div className="relative w-14 h-14 rounded-full bg-[#222] border border-white/10 overflow-hidden flex-shrink-0">
                                                    {athlete.imageUrl ? (
                                                        <img src={athlete.imageUrl} alt={athlete.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-[#222] text-gray-400 font-black text-xl uppercase">
                                                            {athlete.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                {athlete.belt && (
                                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm ${athlete.belt === 'Black' ? 'bg-black text-white border-white/20' :
                                                            athlete.belt === 'Red' ? 'bg-[#DF0024] text-white border-[#DF0024]' :
                                                            'bg-[#222] text-gray-300 border-white/10'
                                                        }`}>
                                                            {athlete.belt}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative z-10 w-full mt-2">
                                                <h3 className="font-bold text-white text-sm uppercase tracking-tight truncate px-1" title={athlete.name}>
                                                    {athlete.name}
                                                </h3>
                                                <div className="flex items-center justify-center gap-1.5 mt-1 px-2">
                                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider truncate max-w-[120px]">
                                                        {athlete.club?.name || 'Independent'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-8">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded bg-[#111] text-white border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
                                >
                                    Prev
                                </button>
                                <span className="px-3 py-1 text-sm font-bold text-gray-500">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded bg-[#111] text-white border border-white/10 hover:bg-white/5 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {activeTab === 'guidelines' && props.guidelinesContent && (
                <div className="bg-[#111] p-8 rounded-xl border border-white/10 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h3 className="text-xl font-black uppercase tracking-wider text-white">
                            Tournament Guidelines
                        </h3>
                        <Link
                            href={`/tournament/${tournament.id}/guidelines`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white/5 border border-white/10 transition-colors text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10"
                        >
                            <FileText className="w-4 h-4" />
                            View Full Page
                        </Link>
                    </div>

                    <div className="prose prose-invert max-w-none text-gray-300 text-sm">
                        {props.guidelinesContent.split('\n').map((line, i) => (
                            line.trim() !== '' ?
                                <p key={i} className="mb-4 leading-relaxed font-medium">{line}</p>
                                : <div key={i} className="h-4" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
