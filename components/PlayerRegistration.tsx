'use client'

import { createPlayer } from '@/app/actions'
import { useRef, useState } from 'react'

interface matches {
    id: string
    category: { name: string }
    categoryRefId: string | null
    round: number
    player1: string
    player2: string
    winner: string | null
    status: string
    nextMatchId: string | null
    nextMatchSlot: string | null
    court: string
}

interface PlayerRegistrationProps {
    tournamentId: string
    categories: { id: string; name: string }[]
    players: {
        id: string
        name: string
        category: { name: string }
        belt: string | null
        club: { name: string } | null
        skillLevel: string | null
        weight: number | null
    }[]
}

export default function PlayerRegistration({ tournamentId, categories, players }: PlayerRegistrationProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 50

    const totalPages = Math.ceil(players.length / itemsPerPage)
    const displayedPlayers = players.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4">Register Athlete</h3>
                <form
                    ref={formRef}
                    action={async (formData) => {
                        await createPlayer(formData)
                        formRef.current?.reset()
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <input type="hidden" name="tournamentId" value={tournamentId} />

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Athlete Name"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Club / Team</label>
                        {/*
                           TODO: Change this to a search/dropdown from Club table later.
                           For now, the server action 'createPlayer' accepts a manual string and figures it out (or we need to update createPlayer to find/create club).
                           If we removed club string field, we must pass clubId.
                           Or createPlayer creates a Club if not exists?
                           Let's assume createPlayer is handling the club string -> Club relation logic for now, or we re-add the string field to handle free-text entry until UI is updated.
                        */}
                        <input
                            type="text"
                            name="club"
                            placeholder="Club Name (Legacy/New)"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                        <select
                            name="categoryId"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Belt</label>
                            <select name="belt" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="Black">Black</option>
                                <option value="Color">Color</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Skill</label>
                            <select name="skillLevel" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="Novice">Novice</option>
                                <option value="Advance">Advance</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Weight (kg)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="weight"
                            placeholder="e.g. 57.5"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors h-[42px]"
                            disabled={categories.length === 0}
                        >
                            Register Athlete
                        </button>
                    </div>
                    {categories.length === 0 && (
                        <div className="col-span-full">
                            <p className="text-red-500 text-xs mt-2">Please create a category first.</p>
                        </div>
                    )}
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Registered Athletes ({players.length})
                    </h3>
                    <span className="text-xs text-gray-500">
                        Page {currentPage} of {totalPages || 1}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belt</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {players.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No players registered.
                                    </td>
                                </tr>
                            ) : (
                                displayedPlayers.map((player) => (
                                    <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.club?.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.category.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.belt}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${player.skillLevel === 'Advance' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                {player.skillLevel || 'Novice'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <div className="space-x-1">
                            {/* Simple numbered pages logic could go here, but Prev/Next is robust for now */}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
