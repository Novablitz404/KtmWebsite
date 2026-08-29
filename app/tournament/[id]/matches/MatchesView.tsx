'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Loader2, Trophy } from 'lucide-react'
import { searchPlayerMatches, type PlayerMatchResult } from '@/app/actions'
import BracketPDF from '@/components/pdf/BracketPDF'
import PoomsaeBracketPDF from '@/components/pdf/PoomsaeBracketPDF'

interface MatchesViewProps {
    tournament: {
        id: string
        name: string
        headerImageUrl: string | null
    }
    theme?: 'light' | 'dark'
    // Light theme only — tenant.primaryColor. Dark theme always uses the
    // wotf-global brand red (#DF0024), matching GlobalPublicTournamentView.
    accentColor?: string
}

const DISCIPLINE_BADGE: Record<string, string> = {
    KYORUGI: 'bg-blue-600',
    POOMSAE: 'bg-purple-600',
    KYUKPA: 'bg-orange-600',
}

const DISCIPLINE_LABEL: Record<string, string> = {
    KYORUGI: 'Kyorugi',
    POOMSAE: 'Poomsae',
    KYUKPA: 'Kyukpa',
}

function opponentLabel(m: { opponentName: string | null; opponentStatus: string }): string {
    if (m.opponentStatus === 'KNOWN' && m.opponentName) return m.opponentName
    if (m.opponentStatus === 'BYE') return 'Bye — automatic advance'
    if (m.opponentStatus === 'TBD') return 'Opponent TBD — awaiting previous round'
    return ''
}

export default function MatchesView({ tournament, theme = 'light', accentColor }: MatchesViewProps) {
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'no-results' | 'not-generated' | 'results' | 'rate-limited'>('idle')
    const [results, setResults] = useState<PlayerMatchResult[]>([])
    const [retryAfterSeconds, setRetryAfterSeconds] = useState(0)
    const [downloadingCategoryId, setDownloadingCategoryId] = useState<string | null>(null)

    const isDark = theme === 'dark'
    const accent = isDark ? '#DF0024' : (accentColor || '#312e81') // indigo-900 fallback for light

    async function handleSearch() {
        const trimmed = query.trim()
        if (trimmed.length < 2) return

        setStatus('loading')
        const res = await searchPlayerMatches(tournament.id, trimmed)

        if (res.status === 'rate_limited') {
            setRetryAfterSeconds(res.retryAfterSeconds)
            setStatus('rate-limited')
            return
        }

        if (res.results.length === 0) {
            setResults([])
            setStatus('no-results')
            return
        }

        const allNotGenerated = res.results.every(r => !r.generated)
        setResults(res.results)
        setStatus(allNotGenerated ? 'not-generated' : 'results')
    }

    async function handleDownload(result: PlayerMatchResult) {
        setDownloadingCategoryId(result.categoryId)
        try {
            const { pdf } = await import('@react-pdf/renderer')
            const blob = result.categoryType === 'KYORUGI'
                ? await pdf(
                    <BracketPDF
                        tournamentName={tournament.name}
                        categoryName={result.categoryName}
                        matches={result.bracketMatches || []}
                    />
                ).toBlob()
                : await pdf(
                    <PoomsaeBracketPDF
                        tournamentName={tournament.name}
                        categoryName={result.categoryName}
                        matches={(result.bracketPoomsaeMatches || []) as any}
                        isHeadToHead={result.poomsaeFormat === 'HEAD_TO_HEAD'}
                    />
                ).toBlob()

            const safeName = result.categoryName.replace(/\s+/g, '-').replace(/[^\w-]/g, '')
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${safeName}-bracket.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setTimeout(() => URL.revokeObjectURL(url), 2000)
        } finally {
            setDownloadingCategoryId(null)
        }
    }

    const generatedResults = results.filter(r => r.generated)
    const notGeneratedResults = results.filter(r => !r.generated)

    return (
        <div className="pb-20">
            {/* Hero Header */}
            <div
                className={`relative overflow-hidden border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                style={{ backgroundColor: isDark ? '#000000' : accent }}
            >
                {tournament.headerImageUrl && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={tournament.headerImageUrl}
                            alt="Tournament Banner"
                            className="w-full h-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
                    </div>
                )}

                <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-white">
                    <Link href={`/tournament/${tournament.id}`} className="inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back to Tournament
                    </Link>

                    <h1 className={`text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-md ${isDark ? 'uppercase' : ''}`}>
                        Find My Match
                    </h1>
                    <p className="text-xl md:text-2xl text-white/80 font-medium opacity-90 mb-8">
                        {tournament.name}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                            placeholder="Enter athlete's full name..."
                            className={`flex-1 px-5 py-3.5 rounded-xl font-medium shadow-lg focus:outline-none focus:ring-4 transition-shadow ${isDark
                                ? 'bg-white/15 text-white placeholder:text-gray-300 border-2 border-white/30 focus:ring-white/20 focus:border-white/50'
                                : 'bg-white text-gray-900 placeholder:text-gray-400 border-2 border-white focus:ring-white/40'
                                }`}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={query.trim().length < 2 || status === 'loading'}
                            className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                                ? 'bg-[#DF0024] text-white hover:bg-[#DF0024]/90'
                                : 'bg-white hover:bg-gray-100'
                                }`}
                            style={!isDark ? { color: accent } : {}}
                        >
                            {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                <div className={`rounded-2xl shadow-xl p-8 md:p-10 min-h-[200px] ${isDark ? 'bg-[#111] border border-white/10' : 'bg-white border border-gray-100'}`}>
                    {status === 'idle' && (
                        <p className={`text-center py-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enter an athlete's name above to find their match number, opponent, and round for every discipline they're registered in.
                        </p>
                    )}

                    {status === 'loading' && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
                        </div>
                    )}

                    {status === 'rate-limited' && (
                        <p className={`rounded-xl px-5 py-4 text-center font-medium ${isDark ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                            Too many searches — please wait {retryAfterSeconds}s and try again.
                        </p>
                    )}

                    {status === 'no-results' && (
                        <p className={`text-center py-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            No athlete named "{query.trim()}" found in this tournament.
                        </p>
                    )}

                    {status === 'not-generated' && (
                        <p className={`rounded-xl px-5 py-4 text-center font-medium ${isDark ? 'text-gray-300 bg-white/5 border border-white/10' : 'text-gray-600 bg-gray-50 border border-gray-200'}`}>
                            Matches haven't been generated yet for this category. Check back closer to the event.
                        </p>
                    )}

                    {status === 'results' && (
                        <div className="space-y-6">
                            {generatedResults.map(result => (
                                <div key={`${result.playerId}-${result.categoryId}`} className={`rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    <div className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white ${DISCIPLINE_BADGE[result.categoryType] || 'bg-gray-500'}`}>
                                                    {DISCIPLINE_LABEL[result.categoryType] || result.categoryType}
                                                </span>
                                                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{result.categoryName}</span>
                                            </div>
                                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {result.playerName}{result.clubName ? ` · ${result.clubName}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(result)}
                                            disabled={downloadingCategoryId === result.categoryId}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: accent }}
                                        >
                                            {downloadingCategoryId === result.categoryId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                            Download Bracket Tree PDF
                                        </button>
                                    </div>

                                    {result.myMatches.length === 0 ? (
                                        <p className={`px-5 py-4 text-sm italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            No bracket matches found for this name in this category — if you recently had a name correction, contact the tournament desk.
                                        </p>
                                    ) : (
                                        <ul className={`divide-y ${isDark ? 'divide-white/10' : 'divide-gray-100'}`}>
                                            {result.myMatches.map((m, idx) => (
                                                <li key={idx} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold" style={{ color: accent }}>Match #{m.matchNum ?? '—'}</span>
                                                        <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>·</span>
                                                        <span className={`font-medium flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            {m.isFinal && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                                                            {m.roundLabel}
                                                        </span>
                                                        {m.opponentStatus !== 'NA' && (
                                                            <>
                                                                <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>·</span>
                                                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>vs {opponentLabel(m)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-orange-500 whitespace-nowrap">Court {m.court}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}

                            {notGeneratedResults.map(result => (
                                <div key={`${result.playerId}-${result.categoryId}`} className={`px-5 py-3 rounded-xl text-sm border ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                    {result.playerName}{result.clubName ? ` (${result.clubName})` : ''} — {result.categoryName} — Bracket not generated yet
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
