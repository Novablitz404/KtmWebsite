'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle,
    Loader2, ScanLine, ChevronDown, RotateCcw, Usb,
    Zap, History, Trash2, Users, Search, Shield, Clock, UserCheck
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

interface CheckInResult {
    success: boolean
    alreadyCheckedIn?: boolean
    status: string
    error?: string
    player?: {
        id?: string
        name: string
        category?: string | null
        club?: string | null
        type?: string | null
        belt?: string | null
        checkedInAt?: Date | string | null
    }
}

interface SearchResult {
    id: string
    name: string
    category?: string | null
    type?: string | null
    club?: string | null
    belt?: string | null
    checkedIn: boolean
    checkedInAt?: Date | string | null
    paymentStatus?: string
}

interface ScanHistoryEntry {
    id: string
    scannedId: string
    playerName?: string
    club?: string | null
    status: 'checked_in' | 'already' | 'error'
    message?: string
    scannedAt: Date
}

interface CheckedInAthlete {
    id: string
    name: string
    category?: string | null
    type?: string | null
    club?: string | null
    belt?: string | null
    checkedInAt: Date | string | null
}

interface EventCheckInProps {
    eventId: string
    eventName: string
    eventType: 'tournament' | 'seminar'
    onCheckIn: (id: string, eventId: string) => Promise<CheckInResult>
    onSearch: (eventId: string, query: string) => Promise<SearchResult[]>
    onGetStats: (eventId: string) => Promise<{ total: number; checkedIn: number }>
    onGetCheckedIn: (eventId: string) => Promise<CheckedInAthlete[]>
}

type CameraDevice = { id: string; label: string }

// ============================================
// MAIN COMPONENT
// ============================================

export default function EventCheckIn({
    eventId, eventName, eventType,
    onCheckIn, onSearch, onGetStats, onGetCheckedIn
}: EventCheckInProps) {
    const [mode, setMode] = useState<'scanner' | 'camera' | 'search'>('scanner')
    const [stats, setStats] = useState({ total: 0, checkedIn: 0 })
    const [result, setResult] = useState<CheckInResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // USB Scanner
    const [scannerInput, setScannerInput] = useState('')
    const [scannerReady, setScannerReady] = useState(true)
    const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])
    const scannerInputRef = useRef<HTMLInputElement>(null)

    // Camera
    const [cameras, setCameras] = useState<CameraDevice[]>([])
    const [selectedCamera, setSelectedCamera] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [loadingCameras, setLoadingCameras] = useState(false)
    const scannerRef = useRef<any>(null)
    const cooldownRef = useRef(false)
    const lastScannedRef = useRef('')
    const containerId = 'qr-scanner-container'

    // Search
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Bottom panel
    const [checkedInAthletes, setCheckedInAthletes] = useState<CheckedInAthlete[]>([])
    const [bottomTab, setBottomTab] = useState<'history' | 'checkedin'>('history')
    const [loadingCheckedIn, setLoadingCheckedIn] = useState(false)

    // ---- Init ----
    useEffect(() => {
        onGetStats(eventId).then(setStats)
        refreshCheckedIn()
    }, [eventId])

    const refreshCheckedIn = async () => {
        setLoadingCheckedIn(true)
        const athletes = await onGetCheckedIn(eventId)
        setCheckedInAthletes(athletes)
        setLoadingCheckedIn(false)
    }

    const percentage = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0
    const remaining = stats.total - stats.checkedIn

    // ---- Helpers ----
    const addToHistory = (checkInResult: CheckInResult, scannedId: string) => {
        if (!checkInResult.player?.name) return
        const entry: ScanHistoryEntry = {
            id: crypto.randomUUID(),
            scannedId,
            playerName: checkInResult.player.name,
            club: checkInResult.player.club,
            status: checkInResult.success
                ? checkInResult.alreadyCheckedIn ? 'already' : 'checked_in'
                : 'error',
            message: checkInResult.error,
            scannedAt: new Date(),
        }
        setScanHistory(prev => [entry, ...prev])
    }

    const afterCheckIn = () => {
        onGetStats(eventId).then(setStats)
        refreshCheckedIn()
    }

    const clearResult = () => {
        setResult(null)
        lastScannedRef.current = ''
        cooldownRef.current = false
    }

    // ---- USB Scanner ----
    const handleScannerKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const scannedId = scannerInput.trim()
            if (!scannedId || !scannerReady) return
            setScannerReady(false)
            setScannerInput('')

            const res = await onCheckIn(scannedId, eventId)
            setResult(res)
            addToHistory(res, scannedId)
            afterCheckIn()

            setTimeout(() => {
                setResult(null)
                setScannerReady(true)
                scannerInputRef.current?.focus()
            }, 2500)
        }
    }

    useEffect(() => {
        if (mode === 'scanner' && scannerReady) {
            const t = setTimeout(() => scannerInputRef.current?.focus(), 100)
            return () => clearTimeout(t)
        }
    }, [mode, scannerReady, result])

    // ---- Camera ----
    const requestCameraAccess = async () => {
        setLoadingCameras(true)
        setCameraError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(t => t.stop())
            const devices = await navigator.mediaDevices.enumerateDevices()
            const vids = devices.filter(d => d.kind === 'videoinput').map(d => ({ id: d.deviceId, label: d.label }))
            if (vids.length > 0) { setCameras(vids); setSelectedCamera(vids[vids.length - 1].id) }
            else setCameraError('No cameras found.')
        } catch (err: any) {
            setCameraError(err.name === 'NotAllowedError' ? 'Camera permission denied.' : `Camera error: ${err.message}`)
        }
        setLoadingCameras(false)
    }

    const handleQRDetected = useCallback(async (decodedText: string) => {
        if (cooldownRef.current || decodedText === lastScannedRef.current) return
        cooldownRef.current = true
        lastScannedRef.current = decodedText
        setIsLoading(true)
        const res = await onCheckIn(decodedText.trim(), eventId)
        setResult(res)
        addToHistory(res, decodedText)
        afterCheckIn()
        setIsLoading(false)
        setTimeout(() => { cooldownRef.current = false }, 3000)
    }, [eventId, onCheckIn])

    const startScanning = async () => {
        if (!selectedCamera) return
        try {
            setCameraError(null); setResult(null); lastScannedRef.current = ''
            const { Html5Qrcode } = await import('html5-qrcode')
            const scanner = new Html5Qrcode(containerId)
            scannerRef.current = scanner
            await scanner.start(selectedCamera, { fps: 10, qrbox: { width: 250, height: 250 } },
                (t) => handleQRDetected(t), () => { })
            setIsScanning(true)
        } catch { setCameraError('Failed to start camera scanner.') }
    }

    const stopScanning = async () => {
        if (scannerRef.current) { try { await scannerRef.current.stop() } catch { } scannerRef.current = null }
        setIsScanning(false); setResult(null)
    }

    useEffect(() => { return () => { scannerRef.current?.stop().catch(() => { }) } }, [])

    // ---- Search ----
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return }
        setIsSearching(true)
        const t = setTimeout(async () => {
            const r = await onSearch(eventId, searchQuery)
            setSearchResults(r); setIsSearching(false)
        }, 400)
        return () => clearTimeout(t)
    }, [searchQuery, eventId, onSearch])

    const handleManualCheckIn = async (id: string) => {
        setIsLoading(true)
        const res = await onCheckIn(id, eventId)
        setResult(res)
        addToHistory(res, id)
        afterCheckIn()
        setSearchQuery(''); setSearchResults([]); setIsLoading(false)
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="animate-in fade-in duration-300 space-y-6">

            {/* ══ HERO HEADER ══ */}
            <div className="bg-gray-900 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/[0.03] rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-1/3 -mb-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Check-In Station</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">{eventName}</h1>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full backdrop-blur-sm self-start md:self-auto">
                            <div className={`w-2 h-2 rounded-full ${percentage >= 100 ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse'}`} />
                            <span className="text-xs font-black text-white uppercase tracking-wider">{eventType === 'tournament' ? 'Tournament' : 'Seminar'}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {[
                            { label: 'Checked In', value: stats.checkedIn, opacity: '' },
                            { label: 'Remaining', value: remaining, opacity: 'text-white/60' },
                            { label: 'Total', value: stats.total, opacity: 'text-white/40' }
                        ].map(s => (
                            <div key={s.label} className="bg-white/[0.06] rounded-2xl p-4 backdrop-blur-sm border border-white/[0.06]">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className={`text-3xl font-black leading-none ${s.opacity || 'text-white'}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Progress</span>
                            <span className="text-xs font-black text-white">{percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${percentage}%`,
                                    background: percentage >= 100 ? 'linear-gradient(90deg, #34d399, #10b981)'
                                        : percentage >= 50 ? 'linear-gradient(90deg, #818cf8, #34d399)'
                                            : 'linear-gradient(90deg, #818cf8, #a78bfa)'
                                }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ MODE TOGGLE ══ */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
                <div className="flex gap-1">
                    {[
                        { id: 'scanner' as const, label: 'External Scanner', icon: Usb, desc: 'USB / Bluetooth' },
                        { id: 'camera' as const, label: 'Camera', icon: Camera, desc: 'Phone / Webcam' },
                        { id: 'search' as const, label: 'Manual Search', icon: Search, desc: 'Name / ID lookup' },
                    ].map(tab => (
                        <button key={tab.id}
                            onClick={() => { if (tab.id !== 'camera') stopScanning(); setMode(tab.id); setResult(null) }}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${mode === tab.id
                                ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <div className="text-left hidden sm:block">
                                <p className="leading-tight">{tab.label}</p>
                                <p className={`text-[9px] font-medium mt-0.5 ${mode === tab.id ? 'text-gray-400' : 'text-gray-300'}`}>{tab.desc}</p>
                            </div>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ══ USB SCANNER MODE ══ */}
            {mode === 'scanner' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6">
                                {/* Status */}
                                <div className={`mb-5 p-6 rounded-2xl border-2 transition-all duration-500 ${!scannerReady ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
                                    : result?.success && !result.alreadyCheckedIn ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50'
                                        : result?.alreadyCheckedIn ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
                                            : result ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                                                : 'border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50'
                                    }`}>
                                    <div className="flex flex-col items-center gap-3">
                                        {!scannerReady ? (
                                            <>
                                                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center"><Loader2 className="w-7 h-7 text-amber-600 animate-spin" /></div>
                                                <div className="text-center"><p className="text-sm font-black text-amber-800">Verifying...</p><p className="text-[10px] text-amber-600 mt-0.5">Processing check-in</p></div>
                                            </>
                                        ) : result?.success ? (
                                            <>
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${result.alreadyCheckedIn ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                                    {result.alreadyCheckedIn ? <AlertTriangle className="w-7 h-7 text-amber-600" /> : <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                                                </div>
                                                <div className="text-center">
                                                    <p className={`text-sm font-black ${result.alreadyCheckedIn ? 'text-amber-800' : 'text-emerald-800'}`}>{result.alreadyCheckedIn ? 'Already Checked In' : 'Check-In Successful'}</p>
                                                    <p className="text-xs font-bold text-gray-600 mt-0.5">{result.player?.name}</p>
                                                    {result.player?.club && <p className="text-[10px] text-gray-400 mt-0.5">{result.player.club}</p>}
                                                </div>
                                            </>
                                        ) : result ? (
                                            <>
                                                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center"><XCircle className="w-7 h-7 text-red-600" /></div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-red-800">{result.status === 'NOT_APPROVED' ? 'Not Approved' : result.status === 'NOT_PAID' ? 'Unpaid' : result.status === 'NOT_FOUND' ? 'Not Found' : 'Error'}</p>
                                                    <p className="text-[10px] text-red-600 mt-0.5">{result.error}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center relative">
                                                    <Zap className="w-7 h-7 text-emerald-500" />
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
                                                </div>
                                                <div className="text-center"><p className="text-sm font-black text-gray-800">Ready to Scan</p><p className="text-[10px] text-gray-400 mt-0.5">Waiting for external scanner input</p></div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Input */}
                                <div className="relative">
                                    <input ref={scannerInputRef} type="text" value={scannerInput}
                                        onChange={e => setScannerInput(e.target.value)}
                                        onKeyDown={handleScannerKeyDown}
                                        onBlur={() => { if (mode === 'scanner' && scannerReady) setTimeout(() => scannerInputRef.current?.focus(), 100) }}
                                        autoFocus placeholder="Scanner input auto-captured here..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder-gray-300 font-mono tracking-wider" />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <Usb className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-300 mt-3 text-center font-medium uppercase tracking-wider">External scanner auto-submits on QR read</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-full lg:w-[400px] flex-shrink-0">
                        <ResultPanel result={result} onClear={clearResult} />
                    </div>
                </div>
            )}

            {/* ══ CAMERA MODE ══ */}
            {mode === 'camera' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6">
                            {cameras.length === 0 && !loadingCameras && !cameraError && (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 rounded-3xl bg-gray-900 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-gray-900/20"><Camera className="w-10 h-10 text-white" /></div>
                                    <h3 className="text-lg font-black text-gray-900 mb-1">Camera Access Required</h3>
                                    <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Allow camera access to scan QR codes.</p>
                                    <button onClick={requestCameraAccess} className="px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-xl shadow-gray-900/20">Allow Camera Access</button>
                                </div>
                            )}
                            {loadingCameras && <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><p className="text-sm font-medium">Detecting cameras...</p></div>}
                            {cameras.length > 0 && !isScanning && (
                                <div className="mb-5">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Camera</label>
                                    <div className="relative">
                                        <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 pr-10">
                                            {cameras.map((c, i) => <option key={c.id} value={c.id}>{c.label || `Camera ${i + 1}`}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                            {cameras.length > 0 && (
                                <>
                                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video mx-auto shadow-inner">
                                        <div id={containerId} className="w-full h-full" />
                                        {!isScanning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
                                                <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10"><ScanLine className="w-10 h-10 text-white/60" /></div>
                                                <p className="text-white/50 text-sm font-semibold">Start camera to begin scanning</p>
                                            </div>
                                        )}
                                        {isLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
                                    </div>
                                    <div className="mt-5 flex justify-center">
                                        {!isScanning ? (
                                            <button onClick={startScanning} disabled={!selectedCamera} className="flex items-center gap-2.5 px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-gray-900/20"><Camera className="w-4 h-4" />Start Scanning</button>
                                        ) : (
                                            <button onClick={stopScanning} className="flex items-center gap-2.5 px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-xl shadow-red-600/20"><CameraOff className="w-4 h-4" />Stop Camera</button>
                                        )}
                                    </div>
                                </>
                            )}
                            {cameraError && (
                                <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><XCircle className="w-4 h-4 text-red-500" /></div>
                                        <div><p className="text-sm font-bold text-red-800">Camera Error</p><p className="text-xs text-red-600 mt-0.5">{cameraError}</p></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="w-full lg:w-[400px] flex-shrink-0">
                        <ResultPanel result={result} onClear={clearResult} />
                    </div>
                </div>
            )}

            {/* ══ SEARCH MODE ══ */}
            {mode === 'search' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6">
                                <div className="relative mb-4">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                                        placeholder="Search by athlete name or registration ID..."
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 outline-none transition-all text-sm font-semibold placeholder-gray-300" />
                                    {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                        {searchResults.map(r => (
                                            <div key={r.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.checkedIn ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                                        {r.checkedIn ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-gray-400" />}
                                                    </div>
                                                    <div className="min-w-0"><p className="font-bold text-gray-900 text-sm truncate">{r.name}</p><p className="text-[10px] text-gray-400 font-medium truncate">{r.category || r.belt || '—'} • {r.club || 'Independent'}</p></div>
                                                </div>
                                                {r.checkedIn ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg shrink-0 uppercase tracking-wider"><CheckCircle2 className="w-3 h-3" />Done</span>
                                                ) : (
                                                    <button onClick={() => handleManualCheckIn(r.id)} disabled={isLoading} className="text-[10px] font-black text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50 shrink-0 uppercase tracking-wider shadow-lg shadow-gray-900/10">Check In</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                    <div className="text-center py-12"><div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3"><Search className="w-7 h-7 text-gray-300" /></div><p className="text-sm font-bold text-gray-400">No approved athletes found</p><p className="text-xs text-gray-300 mt-1">Try a different name or ID</p></div>
                                )}
                                {searchQuery.length < 2 && (
                                    <div className="text-center py-12"><div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3"><Users className="w-7 h-7 text-gray-300" /></div><p className="text-sm font-bold text-gray-400">Search for an athlete</p><p className="text-xs text-gray-300 mt-1">Type at least 2 characters</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="w-full lg:w-[400px] flex-shrink-0">
                        <ResultPanel result={result} onClear={clearResult} />
                    </div>
                </div>
            )}

            {/* ══ BOTTOM: SESSION HISTORY & CHECKED-IN LIST ══ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button onClick={() => setBottomTab('history')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${bottomTab === 'history' ? 'border-gray-900 text-gray-900 bg-gray-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        <History className="w-4 h-4" /> Session History
                        {scanHistory.length > 0 && <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{scanHistory.length}</span>}
                    </button>
                    <button onClick={() => { setBottomTab('checkedin'); refreshCheckedIn() }}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${bottomTab === 'checkedin' ? 'border-gray-900 text-gray-900 bg-gray-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        <UserCheck className="w-4 h-4" /> Checked-In Athletes
                        {stats.checkedIn > 0 && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md">{stats.checkedIn}</span>}
                    </button>
                </div>

                {/* Session History Tab */}
                {bottomTab === 'history' && (
                    <div>
                        {scanHistory.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3"><History className="w-7 h-7 text-gray-200" /></div>
                                <p className="text-sm font-bold text-gray-300">No scans yet</p>
                                <p className="text-[10px] text-gray-200 mt-1">Scans from this session will appear here</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-3 flex items-center justify-between bg-gray-50/50 border-b border-gray-50">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{scanHistory.filter(e => e.status === 'checked_in').length} successful • {scanHistory.length} total</span>
                                    <button onClick={() => setScanHistory([])} className="text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"><Trash2 className="w-3 h-3" />Clear</button>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                    {scanHistory.map((entry, i) => (
                                        <div key={entry.id} className={`px-6 py-4 flex items-center gap-3 ${i === 0 ? 'bg-gray-50/30' : ''}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${entry.status === 'checked_in' ? 'bg-emerald-100' : entry.status === 'already' ? 'bg-amber-100' : 'bg-red-100'}`}>
                                                {entry.status === 'checked_in' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : entry.status === 'already' ? <UserCheck className="w-4 h-4 text-amber-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{entry.playerName || 'Unknown'}</p>
                                                <p className="text-[10px] text-gray-400 font-medium truncate">{entry.club || (entry.status === 'error' ? entry.message : '—')}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${entry.status === 'checked_in' ? 'text-emerald-600 bg-emerald-50' : entry.status === 'already' ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50'}`}>{entry.status === 'checked_in' ? '✓ IN' : entry.status === 'already' ? 'DUP' : 'ERR'}</span>
                                                <p className="text-[9px] text-gray-300 font-mono mt-1">{entry.scannedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Checked-In Athletes Tab */}
                {bottomTab === 'checkedin' && (
                    <div>
                        {loadingCheckedIn ? (
                            <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-medium">Loading...</span></div>
                        ) : checkedInAthletes.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3"><UserCheck className="w-7 h-7 text-gray-200" /></div>
                                <p className="text-sm font-bold text-gray-300">No athletes checked in yet</p>
                                <p className="text-[10px] text-gray-200 mt-1">Checked-in athletes will appear here</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-50">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{checkedInAthletes.length} athlete{checkedInAthletes.length !== 1 ? 's' : ''} checked in</span>
                                </div>
                                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                                    {checkedInAthletes.map(athlete => (
                                        <div key={athlete.id} className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{athlete.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium truncate">{[athlete.category || athlete.belt, athlete.club].filter(Boolean).join(' • ') || '—'}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {athlete.checkedInAt && (
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-300">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(athlete.checkedInAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ============================================
// RESULT PANEL
// ============================================

function ResultPanel({ result, onClear }: { result: CheckInResult | null; onClear: () => void }) {
    if (!result) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[260px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4"><ScanLine className="w-8 h-8 text-gray-200" /></div>
                <p className="text-sm font-bold text-gray-300">Waiting for scan</p>
                <p className="text-[10px] text-gray-200 mt-1 uppercase tracking-wider font-medium">Result will appear here</p>
            </div>
        )
    }

    const isSuccess = result.success && !result.alreadyCheckedIn
    const isAlready = result.success && result.alreadyCheckedIn
    const isWarning = ['NOT_APPROVED', 'NOT_PAID'].includes(result.status)

    return (
        <div className={`rounded-3xl shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${isSuccess ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200'
            : isAlready ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200'
                : isWarning ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200'
                    : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200'
            }`}>
            <div className={`px-6 py-5 ${isSuccess ? 'bg-emerald-100/50' : isAlready || isWarning ? 'bg-amber-100/50' : 'bg-red-100/50'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${isSuccess ? 'bg-emerald-500 shadow-emerald-500/30' : isAlready || isWarning ? 'bg-amber-500 shadow-amber-500/30' : 'bg-red-500 shadow-red-500/30'}`}>
                        {isSuccess ? <CheckCircle2 className="w-7 h-7 text-white" /> : isAlready || isWarning ? <AlertTriangle className="w-7 h-7 text-white" /> : <XCircle className="w-7 h-7 text-white" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">
                            {isSuccess ? 'Checked In ✓' : isAlready ? 'Already Checked In' : result.status === 'NOT_APPROVED' ? 'Not Approved' : result.status === 'NOT_PAID' ? 'Payment Pending' : result.status === 'NOT_FOUND' ? 'Not Found' : 'Check-in Failed'}
                        </h3>
                        <p className={`text-xs font-medium mt-0.5 ${isSuccess ? 'text-emerald-600' : isAlready || isWarning ? 'text-amber-600' : 'text-red-600'}`}>
                            {isSuccess ? 'Athlete is now checked in' : isAlready ? 'This athlete was already scanned' : result.error || 'Something went wrong'}
                        </p>
                    </div>
                </div>
            </div>
            <div className="p-6">
                {result.player && (
                    <div className="bg-white rounded-2xl p-5 space-y-4 border border-gray-100 shadow-sm mb-4">
                        <div className="flex items-start justify-between">
                            <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Athlete</p><p className="text-lg font-black text-gray-900 mt-0.5">{result.player.name}</p></div>
                            {result.player.id && <span className="text-[9px] font-mono font-bold text-gray-300 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">#{result.player.id}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {result.player.category && <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</p><p className="text-sm font-bold text-gray-700 mt-0.5">{result.player.category}</p></div>}
                            {result.player.club && <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Club</p><p className="text-sm font-bold text-gray-700 mt-0.5">{result.player.club}</p></div>}
                            {result.player.type && <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p><p className="text-sm font-bold text-gray-700 mt-0.5 capitalize">{result.player.type}</p></div>}
                            {result.player.belt && <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Belt</p><p className="text-sm font-bold text-gray-700 mt-0.5">{result.player.belt}</p></div>}
                        </div>
                        {result.player.checkedInAt && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-50"><Clock className="w-3.5 h-3.5 text-gray-400" /><p className="text-[10px] font-medium text-gray-400">Checked in at {new Date(result.player.checkedInAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p></div>
                        )}
                    </div>
                )}
                <button onClick={onClear} className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-600 transition-all active:scale-95 w-full justify-center shadow-sm"><RotateCcw className="w-4 h-4" />Clear & Scan Next</button>
            </div>
        </div>
    )
}
