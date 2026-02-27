'use client'

import { useState, useEffect } from 'react'
import { X, Trophy, Award, BookOpen, Loader2, Calendar, MapPin, User, Weight, Ruler, Shield } from 'lucide-react'
import { getAthleteDetails } from '@/app/club/actions'
import { useScrollLock } from '@/hooks/useScrollLock'

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

const medalConfig: Record<string, { emoji: string; bg: string; text: string; label: string }> = {
    'GOLD': { emoji: '🥇', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Gold' },
    'Gold': { emoji: '🥇', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Gold' },
    'SILVER': { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Silver' },
    'Silver': { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Silver' },
    'BRONZE': { emoji: '🥉', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bronze' },
    'Bronze': { emoji: '🥉', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bronze' },
    'QF': { emoji: '🏅', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Quarter-Final' },
    'R16': { emoji: '🏅', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Round of 16' },
}

const promotionStatusConfig: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    'PASSED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅' },
    'FAILED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '❌' },
    'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⏳' },
    'APPROVED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '✓' },
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
            if ('error' in result) {
                setError(result.error as string)
            } else {
                setData(result as AthleteData)
            }
            setLoading(false)
        })
    }, [isOpen, memberId])

    if (!isOpen) return null

    const formatDate = (date: string | Date | null | undefined) => {
        if (!date) return '-'
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const member = data?.member
    const age = member?.birthDate
        ? Math.floor((Date.now() - new Date(member.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    // Compute summary stats
    const totalMedals = data?.tournaments.filter(t => t.medal).length || 0
    const goldCount = data?.tournaments.filter(t => t.medal === 'GOLD' || t.medal === 'Gold').length || 0
    const silverCount = data?.tournaments.filter(t => t.medal === 'SILVER' || t.medal === 'Silver').length || 0
    const bronzeCount = data?.tournaments.filter(t => t.medal === 'BRONZE' || t.medal === 'Bronze').length || 0
    const promosPassed = data?.promotions.filter(p => p.status === 'PASSED').length || 0

    const tabs = [
        { id: 'tournaments' as const, label: 'Tournaments', icon: Trophy, count: data?.tournaments.length || 0 },
        { id: 'promotions' as const, label: 'Promotions', icon: Award, count: data?.promotions.length || 0 },
        { id: 'seminars' as const, label: 'Seminars', icon: BookOpen, count: data?.seminars.length || 0 },
    ]

    const getBeltColor = (belt: string | null) => {
        if (!belt) return 'bg-gray-200 text-gray-600'
        if (belt === 'Black') return 'bg-gray-900 text-white'
        if (belt.includes('Red')) return 'bg-red-600 text-white'
        if (belt.includes('Blue')) return 'bg-blue-600 text-white'
        if (belt.includes('Yellow')) return 'bg-yellow-400 text-yellow-900'
        if (belt.includes('Brown')) return 'bg-amber-700 text-white'
        return 'bg-gray-100 text-gray-700'
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-900">Athlete Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                        <p className="text-sm text-gray-500">Loading athlete profile...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-24">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* Profile Section */}
                        <div className="relative flex-shrink-0">
                            <div className="px-6 pt-5 pb-4">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        {memberAvatar ? (
                                            <img
                                                src={memberAvatar}
                                                alt={memberName}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-white"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg">
                                                {memberName.charAt(0)}
                                            </div>
                                        )}
                                        {member?.isVerified && (
                                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Belt */}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold text-gray-900 truncate">{memberName}</h2>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {member?.belt && (
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getBeltColor(member.belt)}`}>
                                                    {member.belt}
                                                </span>
                                            )}
                                            {member?.gender && (
                                                <span className="text-xs text-gray-500">{member.gender}</span>
                                            )}
                                            {member?.clubName && (
                                                <span className="text-xs text-gray-400">• {member.clubName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="px-6 pb-4 flex-shrink-0">
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                                    <p className="text-lg font-bold text-gray-900">{age || '-'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Age</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                                    <p className="text-lg font-bold text-gray-900">{member?.weight ? `${member.weight}` : '-'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Kg</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                                    <p className="text-lg font-bold text-gray-900">{member?.height ? `${member.height}` : '-'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Cm</p>
                                </div>
                                <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
                                    <p className="text-lg font-bold text-yellow-700">{totalMedals}</p>
                                    <p className="text-[10px] text-yellow-500 uppercase tracking-wider font-semibold">Medals</p>
                                </div>
                            </div>

                            {/* Medal Breakdown */}
                            {totalMedals > 0 && (
                                <div className="flex items-center gap-3 mt-2 px-1">
                                    {goldCount > 0 && <span className="text-xs text-gray-500">🥇 {goldCount}</span>}
                                    {silverCount > 0 && <span className="text-xs text-gray-500">🥈 {silverCount}</span>}
                                    {bronzeCount > 0 && <span className="text-xs text-gray-500">🥉 {bronzeCount}</span>}
                                    {promosPassed > 0 && (
                                        <span className="text-xs text-emerald-600 ml-auto font-medium">
                                            {promosPassed} promotion{promosPassed !== 1 ? 's' : ''} passed
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex border-t border-b border-gray-100 bg-gray-50/50 px-6 flex-shrink-0">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${activeTab === tab.id
                                        ? 'border-red-600 text-red-600 bg-white rounded-t-lg'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center ${activeTab === tab.id ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto">
                            {/* Tournaments Tab */}
                            {activeTab === 'tournaments' && (
                                <div className="p-4 space-y-2">
                                    {data?.tournaments.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Trophy className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium">No tournament entries yet</p>
                                            <p className="text-gray-400 text-xs mt-1">Register this athlete in a tournament to track results</p>
                                        </div>
                                    ) : (
                                        data?.tournaments.map(t => {
                                            const medal = t.medal ? medalConfig[t.medal] : null
                                            return (
                                                <div
                                                    key={t.id}
                                                    className={`rounded-xl p-4 border transition-all hover:shadow-sm ${medal ? `${medal.bg} ${medal.text} border-${medal.text.replace('text-', '')}/20` : 'bg-white border-gray-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Medal / Status Icon */}
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${medal ? '' : 'bg-gray-100'}`}>
                                                            {medal ? medal.emoji : <Trophy className="w-5 h-5 text-gray-400" />}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm text-gray-900 truncate">{t.tournamentName}</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                                {t.categoryName} • {t.categoryType}
                                                                {t.division && ` • ${t.division}`}
                                                            </p>
                                                        </div>

                                                        {/* Right side */}
                                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                            {medal ? (
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${medal.bg} ${medal.text}`}>
                                                                    {medal.label}
                                                                </span>
                                                            ) : (
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {t.status}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatDate(t.tournamentDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}

                            {/* Promotions Tab */}
                            {activeTab === 'promotions' && (
                                <div className="p-4 space-y-2">
                                    {data?.promotions.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Award className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium">No promotion tests yet</p>
                                            <p className="text-gray-400 text-xs mt-1">Belt promotion history will appear here</p>
                                        </div>
                                    ) : (
                                        data?.promotions.map(p => {
                                            const status = promotionStatusConfig[p.status] || promotionStatusConfig['PENDING']
                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`rounded-xl p-4 border ${status.border} ${status.bg} transition-all hover:shadow-sm`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Status Icon */}
                                                        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 text-xl shadow-sm">
                                                            {status.icon}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm text-gray-900 truncate">{p.testName}</h4>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getBeltColor(p.currentBelt)}`}>
                                                                    {p.currentBelt}
                                                                </span>
                                                                <span className="text-gray-400 text-xs">→</span>
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getBeltColor(p.targetBelt)}`}>
                                                                    {p.targetBelt || '?'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right side */}
                                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.text} border ${status.border}`}>
                                                                {p.status}
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                    {p.paymentStatus}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatDate(p.testDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}

                            {/* Seminars Tab */}
                            {activeTab === 'seminars' && (
                                <div className="p-4 space-y-2">
                                    {data?.seminars.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <BookOpen className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium">No seminar registrations yet</p>
                                            <p className="text-gray-400 text-xs mt-1">Seminar attendance history will appear here</p>
                                        </div>
                                    ) : (
                                        data?.seminars.map(s => (
                                            <div
                                                key={s.id}
                                                className="bg-white rounded-xl p-4 border border-gray-200 transition-all hover:shadow-sm"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Icon */}
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="w-5 h-5 text-blue-500" />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm text-gray-900 truncate">{s.seminarName}</h4>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> {formatDate(s.seminarDate)}
                                                            </span>
                                                            {s.venue && (
                                                                <span className="flex items-center gap-1 truncate">
                                                                    <MapPin className="w-3 h-3" /> {s.venue}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Status */}
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${s.status === 'APPROVED' ? 'bg-green-100 text-green-700' : s.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {s.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
