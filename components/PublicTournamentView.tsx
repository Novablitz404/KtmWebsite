'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Search, Filter, Info, ChevronRight, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { Tournament, Player as PrismaPlayer } from '@prisma/client'
import { useTenant } from '@/app/providers/TenantProvider'
import UserAvatar from '@/components/UserAvatar'

// Extended Player type with enriched fields
type Player = PrismaPlayer & {
    club: { name: string; logoUrl: string | null } | null
    category?: { id: string; name: string; type: string; tournamentId: string; court: string | null } | null
    imageUrl?: string
}

// Deduplicated athlete for display
type UniqueAthlete = {
    name: string
    belt: string | null
    club: { name: string; logoUrl: string | null } | null
    imageUrl?: string
    eventTypes: string[] // ['KYORUGI', 'POOMSAE']
    userId: string | null
    id: string // first player record id for key
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


export default function PublicTournamentView(props: PublicTournamentViewProps) {
    const { tournament, players, tournamentStats, totalPlayersCount } = props

    // Use uniqueAthletes (deduplicated) for display; fall back to local dedup count
    const totalAthletes = tournamentStats?.uniqueAthletes ?? totalPlayersCount ?? players.length
    const totalClubs = tournamentStats?.clubs?.length ?? (() => {
        const clubMap = new Map<string, string | null>()
        players.forEach(p => { if (p.club?.name) clubMap.set(p.club.name, p.club.logoUrl || null) })
        return clubMap.size
    })()

    // Build club map for team display (use server stats clubs if available, else local)
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

    // Deduplicate athletes: group by userId or name+clubId
    const athleteMap = new Map<string, UniqueAthlete>()
    players.forEach(p => {
        const key = p.userId || `${p.name.toLowerCase().trim()}::${p.clubId || 'none'}`
        const existing = athleteMap.get(key)
        const eventType = p.category?.type || 'KYORUGI'
        if (existing) {
            if (!existing.eventTypes.includes(eventType)) {
                existing.eventTypes.push(eventType)
            }
            // Prefer the record with an image
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

    // Pagination for Athletes
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 28
    const totalPages = Math.ceil(uniqueAthletes.length / itemsPerPage)
    const displayedAthletes = uniqueAthletes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Tab State
    const [activeTab, setActiveTab] = useState<'overview' | 'guidelines'>('overview')

    const router = useRouter()
    const tenant = useTenant()
    const isKtm = tenant.slug === 'ktm'

    // Tenant-aware accent colors
    const accentColor = tenant.primaryColor || '#dc2626' // fallback red-600
    const accentStyle = { color: accentColor }
    const accentBgStyle = { backgroundColor: accentColor }
    const accentBorderStyle = { borderColor: accentColor }

    return (
        <div className="space-y-8">
            {/* Header Actions: Back & Registration Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100 px-3 py-1.5 rounded-lg -ml-3"
                >
                    <ChevronRight className="w-4 h-4 mr-1.5 rotate-180" />
                    Back
                </button>

                {/* Registration Action / Status */}
                <div>
                    {(() => {
                        const now = new Date()
                        const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                        const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null
                        const isRegistered = props.currentUserId && players.some(p => p.userId === props.currentUserId)

                        if (isRegistered) {
                            return (
                                <button disabled className="px-6 py-2 bg-green-100 text-green-700 font-semibold rounded-lg shadow-sm border border-green-200 cursor-default">
                                    ✅ Already Registered
                                </button>
                            )
                        }

                        if (regEnd && now > regEnd) {
                            return (
                                <button disabled className="px-6 py-2 bg-gray-100 text-gray-500 font-semibold rounded-lg border border-gray-200 cursor-not-allowed">
                                    🚫 Registration Closed
                                </button>
                            )
                        }

                        if (regStart && now < regStart) {
                            return (
                                <button disabled className="px-6 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg border border-blue-100 cursor-default">
                                    ⏳ Opens {regStart.toLocaleDateString()}
                                </button>
                            )
                        }

                        return (
                            <a
                                href={`/tournament/${tournament.id}/register`}
                                className="inline-flex items-center px-6 py-2 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 hover:opacity-90"
                                style={accentBgStyle}
                            >
                                Register Now
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </a>
                        )
                    })()}
                </div>
            </div>

            {/* Tournament Banner */}
            {tournament.headerImageUrl && (
                <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                    <img
                        src={tournament.headerImageUrl}
                        alt={tournament.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex flex-wrap gap-4 text-sm sm:text-base text-white/95 font-medium">
                                <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                    📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                                {tournament.venue && (
                                    <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        📍 {tournament.venue}
                                    </span>
                                )}
                            </div>

                            {/* Registration Button */}

                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-current'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    style={activeTab === 'overview' ? { ...accentStyle, borderColor: accentColor } : {}}
                >
                    Overview
                </button>
                {props.guidelinesContent && (
                    <button
                        onClick={() => setActiveTab('guidelines')}
                        className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guidelines'
                            ? 'border-current'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        style={activeTab === 'guidelines' ? { ...accentStyle, borderColor: accentColor } : {}}
                    >
                        Guidelines
                    </button>
                )}
            </div>

            {/* CONTENT: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <span className="text-4xl font-bold block mb-1" style={accentStyle}>{totalClubs}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Participating Teams</span>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
                            <span className="text-4xl font-bold block mb-1" style={accentStyle}>{totalAthletes}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Registered Athletes</span>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col justify-center">
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-2">Venue</span>
                            <span className="text-lg font-semibold text-gray-900">{tournament.venue || 'TBA'}</span>
                        </div>
                    </div>

                    {/* Participating Teams */}
                    <section>
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            Participating Teams
                        </h3>
                        {teams.length === 0 ? (
                            <div className="text-gray-500 italic">No teams registered yet.</div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {teams.map((teamName, idx) => {
                                    const logoUrl = clubMap.get(teamName)
                                    return (
                                        <span key={idx} className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-700 font-medium flex items-center gap-2 pr-6">
                                            {logoUrl ? (
                                                <div className="w-8 h-8 rounded-md bg-white border border-gray-100 p-0.5 shadow-sm overflow-hidden flex-shrink-0">
                                                    <img src={logoUrl} alt={teamName} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <span className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-bold border border-gray-200">
                                                    {teamName.substring(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                            <span>{teamName}</span>
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {/* Athletes Grid */}
                    <section>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                Registered Athletes
                            </h3>
                        </div>

                        {uniqueAthletes.length === 0 ? (
                            <div className="text-gray-500 italic">No athletes registered yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {displayedAthletes.map((athlete) => {
                                    const initials = athlete.name
                                        .split(' ')
                                        .map((n: string) => n[0])
                                        .slice(0, 2)
                                        .join('')
                                        .toUpperCase();

                                    return (
                                        <div key={athlete.id} className="group bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden">

                                            {/* Top Background Decoration */}
                                            <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-gray-50 to-white z-0" />

                                            {/* Event Type Badges - Top Right */}
                                            <div className="absolute top-2 right-2 z-20 flex gap-1">
                                                {athlete.eventTypes.includes('KYORUGI') && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-blue-600 text-white shadow-sm">
                                                        Kyorugi
                                                    </span>
                                                )}
                                                {athlete.eventTypes.includes('POOMSAE') && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-purple-600 text-white shadow-sm">
                                                        Poomsae
                                                    </span>
                                                )}
                                                {athlete.eventTypes.includes('KYUKPA') && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-orange-600 text-white shadow-sm">
                                                        Kyukpa
                                                    </span>
                                                )}
                                            </div>

                                            {/* Avatar */}
                                            <div className="relative z-10 mb-2">
                                                <div className="p-0.5 bg-white rounded-full shadow-sm">
                                                    <UserAvatar
                                                        src={athlete.imageUrl}
                                                        name={athlete.name}
                                                        size={56}
                                                    />
                                                </div>
                                                {/* Belt Indicator (if exists) */}
                                                {athlete.belt && (
                                                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shadow-sm ${athlete.belt === 'Black' ? 'bg-black text-white border-gray-800' :
                                                            athlete.belt === 'Red' ? 'bg-red-600 text-white border-red-700' :
                                                                athlete.belt === 'Maroon' ? 'bg-rose-900 text-white border-rose-950' :
                                                                    athlete.belt === 'Brown' ? 'bg-amber-800 text-white border-amber-900' :
                                                                        athlete.belt === 'Blue' ? 'bg-blue-600 text-white border-blue-700' :
                                                                            athlete.belt === 'Purple' ? 'bg-purple-600 text-white border-purple-700' :
                                                                                athlete.belt === 'Green' ? 'bg-green-600 text-white border-green-700' :
                                                                                    athlete.belt === 'Orange' ? 'bg-orange-500 text-white border-orange-600' :
                                                                                        athlete.belt === 'Yellow' ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                                                                                            athlete.belt === 'White' ? 'bg-white text-gray-700 border-gray-300' :
                                                                                                'bg-gray-100 text-gray-700 border-gray-200'
                                                            }`}>
                                                            {athlete.belt}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="relative z-10 w-full mt-1">
                                                <h3 className="font-bold text-gray-900 text-sm truncate px-1" title={athlete.name}>
                                                    {athlete.name}
                                                </h3>
                                                <div className="flex items-center justify-center gap-1.5 mt-0.5 px-2">
                                                    {athlete.club?.logoUrl && (
                                                        <img
                                                            src={athlete.club.logoUrl}
                                                            alt="Club"
                                                            className="w-4 h-4 object-contain rounded-sm"
                                                        />
                                                    )}
                                                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                                        {athlete.club?.name || 'Independent'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Prev
                                </button>
                                <span className="px-3 py-1 text-sm text-gray-500">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* CONTENT: Guidelines */}
            {activeTab === 'guidelines' && props.guidelinesContent && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Tournament Guidelines
                        </h3>
                        <Link
                            href={`/tournament/${tournament.id}/guidelines`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium hover:opacity-80"
                            style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                        >
                            <FileText className="w-4 h-4" />
                            View Full Page / Download PDF
                        </Link>
                    </div>

                    <div className="prose prose-indigo max-w-none text-gray-600">
                        {props.guidelinesContent.split('\n').map((line, i) => (
                            line.trim() !== '' ?
                                <p key={i} className="mb-4 leading-relaxed">{line}</p>
                                : <div key={i} className="h-4" />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
