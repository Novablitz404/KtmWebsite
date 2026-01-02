import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import Pagination from '@/components/Pagination'

const PAGE_SIZE = 10

export default async function AdminTournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const { page = '1' } = await searchParams
    const currentPage = parseInt(page) || 1

    // Fetch Total Count
    const totalTournaments = await prisma.tournament.count()
    const totalPages = Math.ceil(totalTournaments / PAGE_SIZE)

    // Fetch Paginated Tournaments
    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE
    })

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tournaments</h1>
                    <p className="text-gray-500 mt-1">Manage and monitor all tournaments.</p>
                </div>
                <Link
                    href="/manage" // Organizer Dashboard for creation
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Tournament
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Tournament Name</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tournaments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                                        No tournaments found.
                                    </td>
                                </tr>
                            ) : (
                                tournaments.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">{t.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {new Date(t.startDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <TournamentStatusBadge startDate={t.startDate} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/tournament/${t.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
                                            >
                                                <Settings className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination totalPages={totalPages} currentPage={currentPage} />
            </div>
        </div>
    )
}

function TournamentStatusBadge({ startDate }: { startDate: Date }) {
    const now = new Date()
    const start = new Date(startDate)
    // Assume 1 day tournament if no end date
    const end = new Date(start.getTime() + 86400000)

    let status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' = 'UPCOMING'
    let style = 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'

    if (now > end) {
        status = 'COMPLETED'
        style = 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
    } else if (now >= start && now <= end) {
        status = 'ONGOING'
        style = 'bg-green-50 text-green-700 ring-1 ring-green-100'
    } else {
        // Upcoming
        style = 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
    }

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
            {status}
        </span>
    )
}
