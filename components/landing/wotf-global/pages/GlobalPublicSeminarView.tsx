'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, ChevronRight, Users, Lock, GraduationCap } from 'lucide-react'
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

export default function GlobalPublicSeminarView({ seminar, currentUserId, isRestricted, userRole }: PublicSeminarViewProps) {
    const [activeTab, setActiveTab] = useState<'overview'>('overview')
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
                        const isRegistered = currentUserId && seminar.registrations.some(r => r.playerId === currentUserId)

                        if (isRestricted) {
                            return (
                                <button disabled className="px-6 py-2 bg-[#111] text-gray-500 font-bold uppercase tracking-widest rounded border border-white/10 cursor-not-allowed flex items-center gap-2 text-sm">
                                    <Lock className="w-4 h-4" />
                                    Restricted
                                </button>
                            )
                        }

                        if (isRegistered) {
                            return (
                                <button disabled className="px-6 py-2 bg-green-500/10 text-green-500 font-bold uppercase tracking-widest rounded shadow-sm border border-green-500/20 cursor-default text-sm">
                                    ✅ Registered
                                </button>
                            )
                        }

                        if (seminar.status === 'CLOSED') {
                            return (
                                <button disabled className="px-6 py-2 bg-[#111] text-gray-500 font-bold uppercase tracking-widest rounded border border-white/10 cursor-not-allowed text-sm">
                                    🚫 Closed
                                </button>
                            )
                        }

                        if (seminar.status === 'CANCELLED') {
                            return (
                                <button disabled className="px-6 py-2 bg-red-500/10 text-red-500 font-bold uppercase tracking-widest rounded border border-red-500/20 cursor-not-allowed text-sm">
                                    Cancelled
                                </button>
                            )
                        }

                        if (seminar.status === 'UPCOMING' || seminar.status === 'OPEN') {
                            return (
                                <Link
                                    href={`/seminars/${seminar.id}/register`}
                                    className="inline-flex items-center px-6 py-2 text-white font-black uppercase tracking-widest rounded shadow-md transition-all active:scale-95 hover:opacity-90 bg-[#DF0024] text-sm"
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

            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden shadow-lg bg-[#111] border border-white/10">
                {seminar.bannerUrl ? (
                    <img
                        src={seminar.bannerUrl}
                        alt={seminar.name}
                        className="w-full h-full object-cover opacity-80 mix-blend-screen"
                    />
                ) : (
                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                        <GraduationCap className="w-20 h-20 text-[#0085C7]/30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-white mb-4">
                                {seminar.name}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-white/90">
                                <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-white/10">
                                    📅 {new Date(seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {seminar.venue && (
                                    <span className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded backdrop-blur-sm border border-white/10">
                                        📍 {seminar.venue}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isRestricted && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 mt-0.5" />
                        <div>
                            <p className="font-bold text-base uppercase tracking-wider">Restricted Access</p>
                            <p className="mt-1 font-medium">
                                This is a private seminar. Only members of affiliated clubs and organizations can register.
                            </p>
                            {!currentUserId ? (
                                <p className="mt-2 text-xs text-amber-400">
                                    Please <Link href="/sign-in" className="underline font-bold hover:text-amber-300">sign in</Link> to check your eligibility.
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-amber-400">
                                    Your account is not linked to an affiliated club. Contact your club master for assistance.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-1 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-[#0085C7] text-[#0085C7]'
                        : 'border-transparent text-gray-500 hover:text-white'
                        }`}
                >
                    Overview
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#111] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg text-[#0085C7]">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block">Participants</span>
                                <span className="text-2xl font-black text-white">{seminar.registrations.length}</span>
                            </div>
                        </div>

                        <div className="bg-[#111] p-6 rounded-xl border border-white/10 flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-lg text-purple-400">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block">Event Date</span>
                                <span className="text-lg font-black text-white uppercase tracking-wider">
                                    {new Date(seminar.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <section className="bg-[#111] p-8 rounded-xl border border-white/10">
                        <h3 className="text-xl font-black uppercase tracking-wider text-white mb-6">
                            About This Event
                        </h3>
                        {seminar.description ? (
                            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed text-sm font-medium">
                                {seminar.description}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic text-sm">No description provided.</p>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}
