'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, ChevronRight, Trophy } from 'lucide-react'

// Helper for badge style
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ONGOING': return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Ongoing</span>
        case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ring-1 ring-gray-200">Completed</span>
        case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-100">Cancelled</span>
        case 'RESCHEDULED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-orange-100">Rescheduled</span>
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-100">Upcoming</span>
    }
}

interface Tournament {
    id: string
    name: string
    startDate: string | Date
    venue: string | null
    status: string
    headerImageUrl: string | null
    _count: {
        categories: number
    }
    categories: {
        _count: {
            players: number
        }
    }[]
}

interface TournamentsListProps {
    tournaments: any[] // Typing slightly loose to match Prisma return, but mostly conforms to above
    embedded?: boolean
}

export default function TournamentsList({ tournaments, embedded = false }: TournamentsListProps) {
    if (tournaments.length === 0) {
        return (
            <div className={`text-center py-16 ${embedded ? '' : 'bg-white rounded-xl border border-dashed border-gray-200'}`}>
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No tournaments yet</h3>
                <p className="text-gray-500 mt-1">Create your first tournament to get started.</p>
            </div>
        )
    }

    return (
        <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-200">
                            <th className="px-6 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</th>
                            <th className="px-6 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule & Venue</th>
                            <th className="px-6 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Participants</th>
                            <th className="px-6 py-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tournaments.map((tournament) => {
                            const playerCount = tournament.categories.reduce((acc: number, cat: any) => acc + cat._count.players, 0)
                            return (
                                <tr key={tournament.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 max-w-sm">
                                        <div className="flex items-center gap-4">
                                            {tournament.headerImageUrl ? (
                                                <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                                                    <Image
                                                        src={tournament.headerImageUrl}
                                                        alt={tournament.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="48px"
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-lg border border-indigo-100">
                                                    {tournament.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <span className="block font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                                                    {tournament.name}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">ID: {tournament.id.slice(-4)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            {tournament.venue && (
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span className="truncate max-w-[200px]" title={tournament.venue}>{tournament.venue}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-600 font-medium border border-gray-100">
                                                {playerCount}
                                            </div>
                                            <span className="text-gray-500">Athletes</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(tournament.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/tournament/${tournament.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors ml-2 shadow-sm"
                                            >
                                                Manage
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
