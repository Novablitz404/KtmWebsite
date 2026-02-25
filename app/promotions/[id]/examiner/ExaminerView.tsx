'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { examinerUpdateStatus, examinerToggleJump } from './actions'
import { toast } from 'sonner'

interface Registration {
    id: string
    playerName: string
    clubName: string | null
    currentBelt: string
    targetBelt: string | null
    status: string
    paymentStatus: string
    isJump: boolean
    createdAt: string
}

interface PromotionTest {
    id: string
    name: string
    testDate: string
    venue: string | null
    fee: number | null
    organization: { name: string; logoUrl: string | null }
    registrations: Registration[]
}

const BELT_ORDER = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Maroon', 'Red', 'Brown', 'Black']

const beltColors: Record<string, string> = {
    White: 'bg-gray-100 text-gray-800 border-gray-300',
    Yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Orange: 'bg-orange-100 text-orange-800 border-orange-300',
    Green: 'bg-green-100 text-green-800 border-green-300',
    Purple: 'bg-purple-100 text-purple-800 border-purple-300',
    Blue: 'bg-blue-100 text-blue-800 border-blue-300',
    Maroon: 'bg-red-100 text-red-900 border-red-300',
    Red: 'bg-red-100 text-red-800 border-red-300',
    Brown: 'bg-amber-100 text-amber-900 border-amber-300',
    Black: 'bg-gray-900 text-white border-gray-700',
}

export default function ExaminerView({ promotionTest }: { promotionTest: PromotionTest }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'collection' | 'participants'>('participants')
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [groupByBelt, setGroupByBelt] = useState(true)

    const registrations = promotionTest.registrations
    const fee = promotionTest.fee || 0

    // Filter by search
    const filtered = registrations.filter(reg =>
        reg.playerName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Group by belt
    const knownBelts = new Set(BELT_ORDER.map(b => b.toLowerCase()))
    const beltGroups = BELT_ORDER.reduce((acc, belt) => {
        const regs = filtered.filter(r => r.currentBelt.toLowerCase() === belt.toLowerCase())
        if (regs.length > 0) acc.push({ belt, registrations: regs })
        return acc
    }, [] as { belt: string; registrations: Registration[] }[])
    const unknownRegs = filtered.filter(r => !knownBelts.has(r.currentBelt.toLowerCase()))
    if (unknownRegs.length > 0) beltGroups.push({ belt: 'Other', registrations: unknownRegs })

    // Group by club for collection tab
    const clubGroups = registrations.reduce((acc, reg) => {
        const club = reg.clubName || 'Unaffiliated'
        if (!acc[club]) acc[club] = { count: 0, athletes: [] as string[] }
        acc[club].count++
        acc[club].athletes.push(reg.playerName)
        return acc
    }, {} as Record<string, { count: number; athletes: string[] }>)

    const totalCollection = registrations.length * fee

    const handleStatusUpdate = async (id: string, status: string) => {
        setLoadingId(id)
        const result = await examinerUpdateStatus(id, status)
        setLoadingId(null)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Marked as ${status}`)
            router.refresh()
        }
    }

    const handleToggleJump = async (id: string) => {
        setLoadingId(id)
        const result = await examinerToggleJump(id)
        setLoadingId(null)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.isJump ? 'Jump enabled — will skip a rank' : 'Jump disabled')
            router.refresh()
        }
    }

    const approvedCount = registrations.filter(r => r.status === 'APPROVED').length
    const passedCount = registrations.filter(r => r.status === 'PASSED').length
    const failedCount = registrations.filter(r => r.status === 'FAILED').length

    const renderCard = (reg: Registration, index: number) => {
        const isLoading = loadingId === reg.id
        const isGraded = reg.status === 'PASSED' || reg.status === 'FAILED'

        return (
            <div
                key={reg.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isGraded
                    ? reg.status === 'PASSED'
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-red-200 bg-red-50/30'
                    : 'border-gray-200'
                    }`}
            >
                <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {index + 1}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm truncate">{reg.playerName}</h3>
                                <p className="text-xs text-gray-500 truncate">{reg.clubName || 'No club'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                            <span className="px-2 py-0.5 bg-gray-100 rounded font-medium text-gray-700">{reg.currentBelt}</span>
                            <span className="text-gray-400">→</span>
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 font-medium rounded">{reg.targetBelt || '?'}</span>
                            {reg.isJump && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                                    JUMP
                                </span>
                            )}
                        </div>
                    </div>

                    {!isGraded ? (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                            <button
                                onClick={() => handleToggleJump(reg.id)}
                                disabled={isLoading}
                                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${reg.isJump
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                                    } disabled:opacity-50`}
                            >
                                {reg.isJump ? 'Jump On' : 'Jump'}
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => handleStatusUpdate(reg.id, 'FAILED')}
                                disabled={isLoading}
                                className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all disabled:opacity-50"
                            >
                                Fail
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(reg.id, 'PASSED')}
                                disabled={isLoading}
                                className="px-4 py-2 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
                            >
                                Pass
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${reg.status === 'PASSED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {reg.status}
                            </span>
                            <button
                                onClick={() => handleStatusUpdate(reg.id, 'APPROVED')}
                                disabled={isLoading}
                                className="text-xs text-indigo-600 hover:underline font-medium disabled:opacity-50"
                            >
                                Edit Result
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

                {/* Header */}
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 rounded-2xl p-6 sm:p-8 shadow-lg mb-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-semibold text-red-300 uppercase tracking-widest mb-1">{promotionTest.organization.name}</p>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{promotionTest.name}</h1>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-300">
                            <span>{new Date(promotionTest.testDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            {promotionTest.venue && <span>• {promotionTest.venue}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                                {approvedCount} Awaiting
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/20 text-green-200 border border-green-400/30">
                                {passedCount} Passed
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-200 border border-red-400/30">
                                {failedCount} Failed
                            </span>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => setActiveTab('participants')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'participants'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Participants
                    </button>
                    <button
                        onClick={() => setActiveTab('collection')}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'collection'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Collection
                    </button>
                </div>

                {/* Participants Tab */}
                {activeTab === 'participants' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Search + Group Toggle */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search student name..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <button
                                onClick={() => setGroupByBelt(!groupByBelt)}
                                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${groupByBelt
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Group by Belt
                            </button>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-500">{searchQuery ? 'No students match your search.' : 'No approved participants yet.'}</p>
                            </div>
                        ) : groupByBelt ? (
                            /* Grouped View */
                            <div className="space-y-6">
                                {beltGroups.map(group => (
                                    <div key={group.belt}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${beltColors[group.belt] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                                {group.belt} Belt
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">{group.registrations.length} student{group.registrations.length !== 1 ? 's' : ''}</span>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>
                                        <div className="space-y-3">
                                            {group.registrations.map((reg, i) => renderCard(reg, i))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Flat View */
                            <div className="space-y-3">
                                {filtered.map((reg, index) => renderCard(reg, index))}
                            </div>
                        )}
                    </div>
                )}

                {/* Collection Tab */}
                {activeTab === 'collection' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collection</p>
                                    <p className="text-3xl font-extrabold text-gray-900 mt-1">₱{totalCollection.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">{registrations.length} athletes × ₱{fee.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{Object.keys(clubGroups).length} clubs</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900 text-sm">Breakdown by Club</h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {Object.entries(clubGroups)
                                    .sort(([, a], [, b]) => b.count - a.count)
                                    .map(([club, data]) => (
                                        <div key={club} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-gray-900 text-sm truncate">{club}</h4>
                                                <p className="text-xs text-gray-500 mt-0.5">{data.count} athlete{data.count !== 1 ? 's' : ''}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-gray-900 text-sm">₱{(data.count * fee).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
