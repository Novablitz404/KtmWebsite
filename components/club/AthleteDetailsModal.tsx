'use client'

import { useState, useEffect } from 'react'
import {
    X, Trophy, Award, BookOpen, Loader2, Calendar, MapPin,
    Ruler, Weight, User2, ShieldCheck, Medal
} from 'lucide-react'
import { getAthleteDetails } from '@/app/club/actions'
import { useScrollLock } from '@/hooks/useScrollLock'
import { calculateAge } from '@/lib/placement'
import UserAvatar from '@/components/UserAvatar'

interface AthleteDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    memberId: string
    memberName: string
    memberAvatar?: string | null
}

type AthleteData = {
    member: any
    tournaments: any[]
    promotions: any[]
    seminars: any[]
}

// ── Belt config ─────────────────────────────────────────────
const BELT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
    White:  { bg: 'bg-white',       text: 'text-gray-700',   ring: 'ring-gray-300' },
    Yellow: { bg: 'bg-yellow-400',  text: 'text-yellow-900', ring: 'ring-yellow-300' },
    Orange: { bg: 'bg-orange-500',  text: 'text-white',      ring: 'ring-orange-400' },
    Green:  { bg: 'bg-green-600',   text: 'text-white',      ring: 'ring-green-500' },
    Purple: { bg: 'bg-purple-600',  text: 'text-white',      ring: 'ring-purple-500' },
    Blue:   { bg: 'bg-blue-600',    text: 'text-white',      ring: 'ring-blue-500' },
    Red:    { bg: 'bg-red-600',     text: 'text-white',      ring: 'ring-red-500' },
    Maroon: { bg: 'bg-rose-900',    text: 'text-white',      ring: 'ring-rose-800' },
    Brown:  { bg: 'bg-amber-700',   text: 'text-white',      ring: 'ring-amber-600' },
    Black:  { bg: 'bg-gray-900',    text: 'text-white',      ring: 'ring-gray-700' },
}

function getBeltStyle(belt: string | null) {
    if (!belt) return { bg: 'bg-gray-200', text: 'text-gray-600', ring: 'ring-gray-300' }
    return BELT_STYLES[belt] || { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-200' }
}

// ── Medal config ─────────────────────────────────────────────
const MEDAL: Record<string, { emoji: string; label: string; bg: string; text: string; border: string }> = {
    GOLD:   { emoji: '🥇', label: 'Gold',    bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
    Gold:   { emoji: '🥇', label: 'Gold',    bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
    SILVER: { emoji: '🥈', label: 'Silver',  bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200' },
    Silver: { emoji: '🥈', label: 'Silver',  bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200' },
    BRONZE: { emoji: '🥉', label: 'Bronze',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
    Bronze: { emoji: '🥉', label: 'Bronze',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200' },
    QF:     { emoji: '🏅', label: 'QF',      bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-100' },
    R16:    { emoji: '🏅', label: 'R16',     bg: 'bg-blue-50',    text: 'text-blue-600',   border: 'border-blue-100' },
}

// ── Promotion status config ───────────────────────────────────
const PROMO_STATUS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    PASSED:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
    FAILED:   { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-400' },
    PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-400' },
    APPROVED: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-400' },
}

const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">{sub}</p>
        </div>
    )
}

export default function AthleteDetailsModal({ isOpen, onClose, memberId, memberName, memberAvatar }: AthleteDetailsModalProps) {
    useScrollLock(isOpen)

    const [data, setData] = useState<AthleteData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'tournaments' | 'promotions' | 'seminars'>('tournaments')

    useEffect(() => {
        if (!isOpen || !memberId) return
        setLoading(true)
        setError(null)
        setActiveTab('tournaments')
        getAthleteDetails(memberId).then((result) => {
            if ('error' in result) setError(result.error as string)
            else setData(result as AthleteData)
            setLoading(false)
        })
    }, [isOpen, memberId])

    if (!isOpen) return null

    const member = data?.member
    const age = member?.birthDate ? calculateAge(member.birthDate) : null
    const belt = member?.belt || null
    const beltStyle = getBeltStyle(belt)

    const totalTournaments = data?.tournaments.length || 0
    const goldCount   = data?.tournaments.filter(t => t.medal === 'GOLD'   || t.medal === 'Gold').length   || 0
    const silverCount = data?.tournaments.filter(t => t.medal === 'SILVER' || t.medal === 'Silver').length || 0
    const bronzeCount = data?.tournaments.filter(t => t.medal === 'BRONZE' || t.medal === 'Bronze').length || 0
    const totalMedals = goldCount + silverCount + bronzeCount
    const promosPassed = data?.promotions.filter(p => p.status === 'PASSED').length || 0

    const tabs = [
        { id: 'tournaments' as const, label: 'Tournaments', icon: Trophy,   count: data?.tournaments.length || 0 },
        { id: 'promotions'  as const, label: 'Promotions',  icon: Award,    count: data?.promotions.length  || 0 },
        { id: 'seminars'    as const, label: 'Seminars',    icon: BookOpen, count: data?.seminars.length    || 0 },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ───────────────────────────────────────── */}
                <div className="relative flex-shrink-0 bg-white border-b border-gray-100">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>

                    {/* Profile row */}
                    <div className="px-6 pt-6 pb-5">
                        <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <div className="ring-2 ring-gray-100 rounded-full">
                                    <UserAvatar src={memberAvatar} name={memberName} size={68} className="rounded-full" />
                                </div>
                                {member?.isVerified && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <ShieldCheck size={11} className="text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 pt-1">
                                <h2 className="text-lg font-black text-gray-900 tracking-tight truncate">{memberName}</h2>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {belt && (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ring-1 ${beltStyle.bg} ${beltStyle.text} ${beltStyle.ring}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                            {belt} Belt
                                        </span>
                                    )}
                                    {member?.gender && (
                                        <span className="text-[11px] text-gray-400 font-medium">{member.gender}</span>
                                    )}
                                    {member?.clubName && (
                                        <span className="text-[11px] text-gray-400 truncate">· {member.clubName}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stat chips */}
                        {!loading && (
                            <div className="grid grid-cols-5 gap-2 mt-5">
                                {[
                                    { label: 'Age',    value: age || '—' },
                                    { label: 'Weight', value: member?.weight ? `${member.weight}` : '—', sub: 'kg' },
                                    { label: 'Height', value: member?.height ? `${member.height}` : '—', sub: 'cm' },
                                    { label: 'Events', value: totalTournaments },
                                    { label: 'Medals', value: totalMedals, accent: totalMedals > 0, sub: totalMedals > 0 ? `${goldCount}G ${silverCount}S ${bronzeCount}B` : undefined },
                                ].map(chip => (
                                    <div key={chip.label} className={`rounded-xl px-3 py-2.5 text-center border ${chip.accent ? 'bg-yellow-50 border-yellow-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className={`text-base font-black leading-none ${chip.accent ? 'text-yellow-600' : 'text-gray-900'}`}>{chip.value}</p>
                                        <p className={`text-[9px] font-semibold uppercase tracking-wider mt-1 truncate ${chip.accent ? 'text-yellow-400' : 'text-gray-400'}`}>
                                            {chip.sub && chip.accent ? chip.sub : chip.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-t border-gray-100 px-4 gap-1">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 -mb-px transition-all ${
                                        isActive
                                            ? 'border-red-600 text-red-600'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <tab.icon size={13} />
                                    <span>{tab.label}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                                        isActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ── Content area ───────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                            <p className="text-xs text-gray-400 font-medium">Loading athlete profile…</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-sm text-red-500 font-medium">{error}</p>
                        </div>
                    ) : (
                        <div className="p-5 space-y-3">

                            {/* ── Tournaments tab ───────────────────── */}
                            {activeTab === 'tournaments' && (
                                data?.tournaments.length === 0
                                    ? <EmptyState icon={Trophy} title="No tournament entries yet" sub="Tournament results will appear here once this athlete registers" />
                                    : data?.tournaments.map(t => {
                                        const m = t.medal ? MEDAL[t.medal] : null
                                        return (
                                            <div key={t.id} className={`rounded-2xl border p-4 bg-white transition-shadow hover:shadow-sm ${m ? m.border : 'border-gray-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    {/* Icon */}
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${m ? `${m.bg} border ${m.border}` : 'bg-gray-100'}`}>
                                                        {m ? m.emoji : <Trophy className="w-5 h-5 text-gray-300" />}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{t.tournamentName}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            <span className="text-[11px] text-gray-400 font-medium truncate">{t.categoryName}</span>
                                                            <span className="text-gray-200 text-xs">·</span>
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                                                t.categoryType === 'KYORUGI' ? 'bg-red-50 text-red-600'
                                                                : t.categoryType === 'POOMSAE' ? 'bg-purple-50 text-purple-600'
                                                                : 'bg-orange-50 text-orange-600'
                                                            }`}>{t.categoryType}</span>
                                                        </div>
                                                    </div>

                                                    {/* Right */}
                                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                        {m ? (
                                                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${m.bg} ${m.text} border ${m.border}`}>
                                                                {m.emoji} {m.label}
                                                            </span>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                t.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
                                                                : t.status === 'REJECTED' ? 'bg-red-50 text-red-600'
                                                                : 'bg-amber-50 text-amber-600'
                                                            }`}>{t.status}</span>
                                                        )}
                                                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(t.tournamentDate)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                            )}

                            {/* ── Promotions tab ───────────────────── */}
                            {activeTab === 'promotions' && (
                                data?.promotions.length === 0
                                    ? <EmptyState icon={Award} title="No promotion tests yet" sub="Belt promotion history will appear here" />
                                    : data?.promotions.map(p => {
                                        const s = PROMO_STATUS[p.status] || PROMO_STATUS['PENDING']
                                        const from = getBeltStyle(p.currentBelt)
                                        const to   = getBeltStyle(p.targetBelt)
                                        return (
                                            <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    {/* Status dot icon */}
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} border ${s.border}`}>
                                                        <Award size={18} className={s.text} />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{p.testName}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ${from.bg} ${from.text} ${from.ring}`}>
                                                                {p.currentBelt || '—'}
                                                            </span>
                                                            <span className="text-gray-300 text-sm">→</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ${to.bg} ${to.text} ${to.ring}`}>
                                                                {p.targetBelt || '?'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Right */}
                                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                        <span className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg border ${s.bg} ${s.text} ${s.border}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            {p.status}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${p.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                {p.paymentStatus}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(p.testDate)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                            )}

                            {/* ── Seminars tab ─────────────────────── */}
                            {activeTab === 'seminars' && (
                                data?.seminars.length === 0
                                    ? <EmptyState icon={BookOpen} title="No seminar registrations yet" sub="Seminar attendance history will appear here" />
                                    : data?.seminars.map(s => (
                                        <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <BookOpen size={18} className="text-indigo-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{s.seminarName}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                                                            <Calendar size={10} className="flex-shrink-0" /> {formatDate(s.seminarDate)}
                                                        </span>
                                                        {s.venue && (
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium truncate">
                                                                <MapPin size={10} className="flex-shrink-0" />{s.venue}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 ${
                                                    s.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : s.status === 'REJECTED' ? 'bg-red-50 text-red-600 border border-red-100'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
