import { createPlayer, getTournamentPlayers } from '@/app/actions'
import { useRef, useState, useEffect } from 'react'
import GlobalDropdown from '@/components/GlobalDropdown'

interface PlayerRegistrationProps {
    tournamentId: string
    categories: { id: string; name: string }[]
    players: any[] // Using any to avoid complex Prisma type matching for now, or match PlayerWithCategory
    readOnly?: boolean
    totalCount?: number
}

export default function PlayerRegistration({ tournamentId, categories, players: initialPlayers, readOnly = false, totalCount = 0 }: PlayerRegistrationProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '')
    const [selectedType, setSelectedType] = useState('INDIVIDUAL')
    const [selectedBelt, setSelectedBelt] = useState('Black')
    const [selectedSkill, setSelectedSkill] = useState('Novice')

    // Server-side pagination state
    const [players, setPlayers] = useState(initialPlayers)
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const itemsPerPage = 30 // Authenticated page size

    const totalPages = Math.ceil(Math.max(totalCount, players.length, initialPlayers.length) / itemsPerPage)

    // Sync initial players if props change (e.g. realtime update or parent re-render)
    // But only if on page 1, otherwise we might overwrite user's navigation
    useEffect(() => {
        if (currentPage === 1) {
            setPlayers(initialPlayers)
        }
    }, [initialPlayers, currentPage])

    const handlePageChange = async (newPage: number) => {
        if (newPage === currentPage) return

        setIsLoading(true)
        try {
            const skip = (newPage - 1) * itemsPerPage
            // Fetch updated list from server
            const newPlayers = await getTournamentPlayers(tournamentId, skip, itemsPerPage)
            setPlayers(newPlayers)
            setCurrentPage(newPage)
        } catch (error) {
            console.error("Failed to fetch players:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {!readOnly && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-4">Register Athlete</h3>
                    <form
                        ref={formRef}
                        action={async (formData) => {
                            await createPlayer(formData)
                            formRef.current?.reset()
                            // If on page 1, we might see the new player if we re-fetch? 
                            // Or just let parent Realtime handle it.
                            // Ideally, we reset to page 1 to see the new entry if it's there.
                            if (currentPage !== 1) {
                                handlePageChange(1)
                            }
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
                            <input
                                type="text"
                                name="club"
                                placeholder="Club Name (Legacy/New)"
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                            <GlobalDropdown
                                name="categoryId"
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                fullWidth
                                searchable={true}
                                options={categories.map(c => ({
                                    label: c.name,
                                    value: c.id
                                }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Event Type</label>
                            <GlobalDropdown
                                name="poomsaeType"
                                fullWidth
                                options={[
                                    { label: 'Individual', value: 'INDIVIDUAL' },
                                    { label: 'Pair', value: 'PAIR' },
                                    { label: 'Team', value: 'TEAM' }
                                ]}
                                value={selectedType}
                                onChange={setSelectedType}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Belt</label>
                                <GlobalDropdown
                                    name="belt"
                                    fullWidth
                                    options={[
                                        { label: 'Black', value: 'Black' },
                                        { label: 'Color', value: 'Color' }
                                    ]}
                                    value={selectedBelt}
                                    onChange={setSelectedBelt}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Skill</label>
                                <GlobalDropdown
                                    name="skillLevel"
                                    fullWidth
                                    options={[
                                        { label: 'Novice', value: 'Novice' },
                                        { label: 'Advance', value: 'Advance' }
                                    ]}
                                    value={selectedSkill}
                                    onChange={setSelectedSkill}
                                />
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
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Registered Athletes ({totalCount > 0 ? totalCount : players.length})
                    </h3>
                    <span className="text-xs text-gray-500">
                        Page {currentPage} of {totalPages || 1}
                    </span>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48 text-gray-400">
                            Loading...
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belt</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {players.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No players registered.
                                        </td>
                                    </tr>
                                ) : (
                                    players.map((player) => (
                                        <tr key={player.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.club?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.category?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.belt}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${player.skillLevel === 'Advance' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                                    {player.skillLevel || 'Novice'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${player.registrationStatus === 'APPROVED'
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
                                                    : player.registrationStatus === 'REJECTED'
                                                        ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                                                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${player.registrationStatus === 'APPROVED' ? 'bg-green-500'
                                                        : player.registrationStatus === 'REJECTED' ? 'bg-red-500'
                                                            : 'bg-amber-500 animate-pulse'
                                                        }`}></span>
                                                    {player.registrationStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            className="px-3 py-1 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <div className="space-x-1 text-xs text-gray-500">
                            {/* Optional page numbers */}
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || isLoading}
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
