'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { generateKioskToken, setKioskPin } from '@/app/actions/attendance'

interface AttendanceDashboardProps {
    club: {
        id: string
        name: string
        logoUrl: string | null
        kioskToken: string | null
        kioskPin: string | null
    }
    records: {
        id: string
        checkInTime: Date
        confidence: number | null
        user: {
            id: string
            name: string | null
            clerkId: string
        }
    }[]
    avatars: Record<string, string>
    stats: {
        totalMembers: number
        enrolledCount: number
        periodCount: number
    }
    userRole: string
    currentDate: string
    currentView: 'daily' | 'weekly' | 'monthly'
}

export default function AttendanceDashboard({
    club,
    records,
    avatars,
    stats,
    userRole,
    currentDate,
    currentView
}: AttendanceDashboardProps) {
    const router = useRouter()

    // Kiosk States
    const [kioskToken, setKioskTokenState] = useState(club.kioskToken)
    const [kioskPinValue, setKioskPinValue] = useState(club.kioskPin || '')
    const [showKioskSettings, setShowKioskSettings] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSavingPin, setIsSavingPin] = useState(false)
    const [copied, setCopied] = useState(false)
    const [showManualCheckIn, setShowManualCheckIn] = useState(false)

    // Navigation Handlers
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.push(`/club/attendance?date=${e.target.value}&view=${currentView}`)
    }

    const handleViewChange = (view: 'daily' | 'weekly' | 'monthly') => {
        router.push(`/club/attendance?date=${currentDate}&view=${view}`)
    }

    // Kiosk Actions
    const handleGenerateToken = async () => {
        setIsGenerating(true)
        const result = await generateKioskToken(club.id)
        setKioskTokenState(result.token)
        setIsGenerating(false)
    }

    const handleSavePin = async () => {
        if (kioskPinValue.length !== 6) return
        setIsSavingPin(true)
        await setKioskPin(club.id, kioskPinValue)
        setIsSavingPin(false)
    }

    const kioskUrl = kioskToken
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/attendance/kiosk?token=${kioskToken}`
        : null

    const copyToClipboard = () => {
        if (kioskUrl) {
            navigator.clipboard.writeText(kioskUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                    <p className="text-gray-500">Track member attendance with face recognition</p>
                </div>
                {userRole === 'CLUB_MASTER' && (
                    <button
                        onClick={() => setShowKioskSettings(!showKioskSettings)}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
                    >
                        ⚙️ Kiosk Settings
                    </button>
                )}
            </div>

            {/* Kiosk Settings Modal */}
            {showKioskSettings && userRole === 'CLUB_MASTER' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowKioskSettings(false)} />
                    <div className="relative bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Kiosk Configuration</h3>
                                <p className="text-sm text-gray-500">Manage access to your club's attendance kiosk</p>
                            </div>
                            <button onClick={() => setShowKioskSettings(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">
                                &times;
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* PIN Configuration */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                                    Set Access PIN
                                </h4>
                                <div className="ml-8">
                                    <label className="block text-sm text-gray-600 mb-2">
                                        Create a 6-digit PIN. This will be required to unlock the kiosk on any device.
                                    </label>
                                    <div className="flex gap-3 max-w-xs">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={kioskPinValue}
                                            onChange={(e) => setKioskPinValue(e.target.value.replace(/\D/g, ''))}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest font-mono text-lg"
                                            placeholder="000000"
                                        />
                                        <button
                                            onClick={handleSavePin}
                                            disabled={kioskPinValue.length !== 6 || isSavingPin}
                                            className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                                        >
                                            {isSavingPin ? 'Saving...' : 'Save PIN'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Token & QR Code */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                                    Connect Device
                                </h4>

                                <div className="ml-8 grid md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-2">
                                            Generate a secure link
                                        </label>
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                readOnly
                                                value={kioskToken || ''}
                                                placeholder="No token generated"
                                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 text-xs font-mono truncate"
                                            />
                                            <button
                                                onClick={handleGenerateToken}
                                                disabled={isGenerating}
                                                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                {isGenerating ? '...' : 'Generate'}
                                            </button>
                                        </div>

                                        {kioskUrl && (
                                            <div className="space-y-3">
                                                <button
                                                    onClick={copyToClipboard}
                                                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${copied
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'
                                                        }`}
                                                >
                                                    {copied ? '✓ Copied to clipboard' : '📋 Copy Link'}
                                                </button>

                                                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800">
                                                    <strong>Note:</strong> Open this link on a tablet or iPad to start Kiosk Mode.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* QR Code */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        {kioskUrl ? (
                                            <>
                                                <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                                                    <QRCodeSVG value={kioskUrl} size={140} />
                                                </div>
                                                <p className="text-xs text-center text-gray-500 font-medium">
                                                    Scan with Tablet Camera
                                                </p>
                                            </>
                                        ) : (
                                            <div className="h-[140px] w-[140px] flex items-center justify-center text-gray-300">
                                                <span className="text-4xl">📱</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowKioskSettings(false)}
                                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                    <p className="text-3xl font-bold text-gray-900">{stats.periodCount}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {currentView === 'daily' ? 'Check-ins Today' :
                            currentView === 'weekly' ? 'Check-ins This Week' : 'Check-ins This Month'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                    <p className="text-3xl font-bold text-green-600">{stats.enrolledCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Faces Enrolled</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
                    <p className="text-3xl font-bold text-gray-400">{stats.totalMembers}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Members</p>
                </div>
            </div>

            {/* Attendance Report & Filter */}
            <div className="bg-white rounded-xl border border-gray-200">
                {/* Controls */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="font-bold text-gray-900">Attendance Report</h2>

                    <div className="flex items-center gap-3">
                        {/* Date Picker */}
                        <input
                            type="date"
                            value={currentDate}
                            onChange={handleDateChange}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />

                        {/* View Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(['daily', 'weekly', 'monthly'] as const).map((view) => (
                                <button
                                    key={view}
                                    onClick={() => handleViewChange(view)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${currentView === view
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {view}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List */}
                {records.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-4xl mb-3">📋</p>
                        <p className="text-gray-500">No attendance records found for this period</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {records.map((record) => (
                            <div key={record.id} className="px-6 py-4 flex items-center gap-4">
                                {avatars[record.user.clerkId] ? (
                                    <img
                                        src={avatars[record.user.clerkId]}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                        {(record.user.name || '?')[0]}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{record.user.name || 'Unknown'}</p>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{new Date(record.checkInTime).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{new Date(record.checkInTime).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                                {record.confidence !== null ? (
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                                        {Math.round(record.confidence * 100)}% match
                                    </span>
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                        Manual
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manual Check-in Button (Desktop) */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowManualCheckIn(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm font-medium transition"
                >
                    📝 Manual Check-In
                </button>
            </div>

            {/* Manual Check-in Modal */}
            {showManualCheckIn && (
                <ManualCheckInModal
                    clubId={club.id}
                    onClose={() => setShowManualCheckIn(false)}
                />
            )}
        </div>
    )
}

import { searchMembers, manualCheckIn } from '@/app/actions/attendance'

function ManualCheckInModal({ clubId, onClose }: { clubId: string, onClose: () => void }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<{ id: string, name: string | null }[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        if (val.length < 2) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const members = await searchMembers(clubId, val)
            setResults(members)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async (userId: string, name: string) => {
        try {
            const result = await manualCheckIn(clubId, userId)
            if (result.success) {
                setMessage(`✓ Checked in ${name}`)
                setTimeout(onClose, 1000)
            } else {
                setMessage(`❌ ${result.error}`)
            }
        } catch (e) {
            setMessage('❌ Failed to check in')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Manual Check-In</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search member name..."
                        value={query}
                        onChange={handleSearch}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                </div>

                <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                    {loading && <p className="text-center text-gray-500 py-4">Searching...</p>}

                    {!loading && results.length === 0 && query.length >= 2 && (
                        <p className="text-center text-gray-500 py-4">No members found</p>
                    )}

                    {results.map(member => (
                        <button
                            key={member.id}
                            onClick={() => handleCheckIn(member.id, member.name || 'Member')}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group transition-colors text-left"
                        >
                            <span className="font-medium text-gray-700 group-hover:text-gray-900">{member.name}</span>
                            <span className="text-sm text-red-600 font-medium px-3 py-1 bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                Check In
                            </span>
                        </button>
                    ))}
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg text-center font-medium ${message.includes('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    )
}
