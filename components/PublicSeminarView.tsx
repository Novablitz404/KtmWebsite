'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Search, Filter, Info, ChevronRight, Users, DollarSign, Lock } from 'lucide-react'
import { Seminar } from '@prisma/client'

// Define a type that matches what we're passing (Seminar + registrations relation)
type ExtendedSeminar = Seminar & {
    registrations: any[]
}

interface PublicSeminarViewProps {
    seminar: ExtendedSeminar
    currentUserId?: string
    isRestricted?: boolean
    userRole?: string
}

export default function PublicSeminarView({ seminar, currentUserId, isRestricted, userRole }: PublicSeminarViewProps) {
    // Tab State
    const [activeTab, setActiveTab] = useState<'overview'>('overview')
    const router = useRouter()

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
                        const isRegistered = currentUserId && seminar.registrations.some(r => r.playerId === currentUserId)

                        if (isRestricted) {
                            return (
                                <button disabled className="px-6 py-2 bg-gray-100 text-gray-500 font-semibold rounded-lg border border-gray-200 cursor-not-allowed flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    Restricted Access
                                </button>
                            )
                        }

                        if (isRegistered) {
                            return (
                                <button disabled className="px-6 py-2 bg-green-100 text-green-700 font-semibold rounded-lg shadow-sm border border-green-200 cursor-default">
                                    ✅ Already Registered
                                </button>
                            )
                        }

                        if (seminar.status === 'CLOSED') {
                            return (
                                <button disabled className="px-6 py-2 bg-gray-100 text-gray-500 font-semibold rounded-lg border border-gray-200 cursor-not-allowed">
                                    🚫 Registration Closed
                                </button>
                            )
                        }

                        if (seminar.status === 'CANCELLED') {
                            return (
                                <button disabled className="px-6 py-2 bg-red-100 text-red-500 font-semibold rounded-lg border border-red-200 cursor-not-allowed">
                                    Cancelled
                                </button>
                            )
                        }

                        if (seminar.status === 'UPCOMING' || seminar.status === 'OPEN') {
                            return (
                                <Link
                                    href={`/seminars/${seminar.id}/register`}
                                    className="inline-flex items-center px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95"
                                >
                                    Register Now
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                            )
                        }

                        return null
                    })()}
                </div>
            </div>

            {/* Seminar Banner */}
            <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                {seminar.bannerUrl ? (
                    <img
                        src={seminar.bannerUrl}
                        alt={seminar.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                        <span className="text-6xl">🎓</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 drop-shadow-md">
                                {seminar.name}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-sm sm:text-base text-white/95 font-medium">
                                <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                    📅 {new Date(seminar.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                                {seminar.venue && (
                                    <span className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        📍 {seminar.venue}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Restricted Access Warning */}
            {isRestricted && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 mt-0.5" />
                        <div>
                            <p className="font-bold text-base">Restricted Access</p>
                            <p className="mt-1">
                                This is a private seminar. Only members of affiliated clubs and organizations can register.
                            </p>
                            {!currentUserId ? (
                                <p className="mt-2 text-xs text-amber-700">
                                    Please <Link href="/sign-in" className="underline font-bold hover:text-amber-900">sign in</Link> to check your eligibility.
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-amber-700">
                                    Your account is not linked to an affiliated club. Contact your club master for assistance.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Overview
                </button>
            </div>

            {/* CONTENT: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                            <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider block">Participants</span>
                                <span className="text-2xl font-bold text-gray-900">{seminar.registrations.length}</span>
                            </div>
                        </div>

                        {seminar.fee && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500 font-medium uppercase tracking-wider block">Registration Fee</span>
                                    <span className="text-2xl font-bold text-gray-900">₱{seminar.fee.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider block">Event Date</span>
                                <span className="text-lg font-bold text-gray-900">
                                    {new Date(seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">
                            About This Event
                        </h3>
                        {seminar.description ? (
                            <div className="prose prose-indigo max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {seminar.description}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No description provided.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}
