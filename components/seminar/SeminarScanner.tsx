'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2, ScanLine, ChevronDown, Keyboard, RotateCcw } from 'lucide-react'
import { verifySeminarQRCode } from '@/app/seminars/actions'

interface SeminarScannerProps {
    seminarId: string
}

type CameraDevice = {
    id: string
    label: string
}

type ScanResult = {
    found: boolean
    registration?: {
        id: string
        playerName: string
        clubName: string | null
        belt: string | null
        status: string
        createdAt: Date
    }
    error?: string
}

export default function SeminarScanner({ seminarId }: SeminarScannerProps) {
    const [cameras, setCameras] = useState<CameraDevice[]>([])
    const [selectedCamera, setSelectedCamera] = useState<string>('')
    const [isScanning, setIsScanning] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<ScanResult | null>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [loadingCameras, setLoadingCameras] = useState(false)
    const [mode, setMode] = useState<'camera' | 'manual'>('camera')
    const [manualToken, setManualToken] = useState('')
    const [lastScannedToken, setLastScannedToken] = useState<string>('')
    const scannerRef = useRef<any>(null)
    const containerId = 'qr-scanner-container'
    const cooldownRef = useRef(false)

    const requestCameraAccess = async () => {
        setLoadingCameras(true)
        setCameraError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(track => track.stop())

            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices
                .filter(d => d.kind === 'videoinput')
                .map(d => ({ id: d.deviceId, label: d.label }))

            if (videoDevices.length > 0) {
                setCameras(videoDevices)
                setSelectedCamera(videoDevices[videoDevices.length - 1].id)
            } else {
                setCameraError('No cameras found on this device.')
            }
        } catch (err: any) {
            console.error('Camera access error:', err)
            if (err.name === 'NotAllowedError') {
                setCameraError('Camera permission denied. Please allow access in browser settings, or use manual entry.')
            } else if (err.name === 'NotFoundError') {
                setCameraError('No camera found. Please connect a camera or use manual entry.')
            } else {
                setCameraError(`Could not access camera: ${err.message}`)
            }
        }
        setLoadingCameras(false)
    }

    const handleQRDetected = useCallback(async (decodedText: string) => {
        // Prevent re-scanning the same token or scanning during cooldown
        if (cooldownRef.current || decodedText === lastScannedToken) return
        cooldownRef.current = true
        setLastScannedToken(decodedText)
        setIsLoading(true)

        const verification = await verifySeminarQRCode(decodedText, seminarId)
        setResult(verification as ScanResult)
        setIsLoading(false)

        // Cooldown: allow new scan after 3 seconds
        setTimeout(() => {
            cooldownRef.current = false
        }, 3000)
    }, [seminarId, lastScannedToken])

    const startScanning = async () => {
        if (!selectedCamera) return

        try {
            setCameraError(null)
            setResult(null)
            setLastScannedToken('')

            const { Html5Qrcode } = await import('html5-qrcode')
            const scanner = new Html5Qrcode(containerId)
            scannerRef.current = scanner

            await scanner.start(
                selectedCamera,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                // Keep scanning — don't stop the camera
                (decodedText) => {
                    handleQRDetected(decodedText)
                },
                () => { }
            )

            setIsScanning(true)
        } catch (err: any) {
            console.error('Scanner start error:', err)
            setCameraError('Failed to start scanner. Try a different camera or use manual entry.')
        }
    }

    const stopScanning = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop() } catch { }
            scannerRef.current = null
        }
        setIsScanning(false)
        setResult(null)
        setLastScannedToken('')
    }

    const clearResult = () => {
        setResult(null)
        setLastScannedToken('')
        cooldownRef.current = false
    }

    const handleManualVerify = async () => {
        if (!manualToken.trim()) return
        setIsLoading(true)
        setResult(null)
        const verification = await verifySeminarQRCode(manualToken.trim(), seminarId)
        setResult(verification as ScanResult)
        setIsLoading(false)
    }

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { })
            }
        }
    }, [])

    const beltColors: Record<string, { bg: string; text: string }> = {
        'White': { bg: 'bg-gray-100', text: 'text-gray-700' },
        'Yellow': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        'Green': { bg: 'bg-green-100', text: 'text-green-800' },
        'Blue': { bg: 'bg-blue-100', text: 'text-blue-800' },
        'Red': { bg: 'bg-red-100', text: 'text-red-800' },
        'Black': { bg: 'bg-gray-900', text: 'text-white' },
        'Poom': { bg: 'bg-red-100', text: 'text-red-800' },
    }

    const getBeltStyle = (belt: string | null) => {
        if (!belt) return { bg: 'bg-gray-100', text: 'text-gray-600' }
        const match = Object.entries(beltColors).find(([key]) => belt.toLowerCase().includes(key.toLowerCase()))
        return match ? match[1] : { bg: 'bg-gray-100', text: 'text-gray-600' }
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Check-In Scanner</h1>
                    <p className="text-gray-500 font-medium pt-1">Scan participant QR codes to verify registration.</p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="max-w-xs mb-6">
                <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => { setMode('camera'); setResult(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Camera className="w-4 h-4" />
                        Camera
                    </button>
                    <button
                        onClick={() => { setMode('manual'); stopScanning(); setResult(null) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Keyboard className="w-4 h-4" />
                        Manual
                    </button>
                </div>
            </div>

            {/* Camera Mode — side-by-side layout */}
            {mode === 'camera' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Camera */}
                    <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6">
                            {/* Request camera access (before cameras loaded) */}
                            {cameras.length === 0 && !loadingCameras && !cameraError && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Camera className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">Click below to allow camera access</p>
                                    <button
                                        onClick={requestCameraAccess}
                                        className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-lg"
                                    >
                                        Allow Camera Access
                                    </button>
                                </div>
                            )}

                            {loadingCameras && (
                                <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Detecting cameras...
                                </div>
                            )}

                            {/* Camera selector */}
                            {cameras.length > 0 && !isScanning && (
                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        Select Camera
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedCamera}
                                            onChange={(e) => setSelectedCamera(e.target.value)}
                                            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-10"
                                        >
                                            {cameras.map((cam, i) => (
                                                <option key={cam.id} value={cam.id}>
                                                    {cam.label || `Camera ${i + 1}`}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Camera viewfinder */}
                            {cameras.length > 0 && (
                                <>
                                    <div className="relative rounded-none overflow-hidden bg-gray-900 aspect-video mx-auto">
                                        <div id={containerId} className="w-full h-full" />

                                        {!isScanning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95">
                                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                                                    <ScanLine className="w-8 h-8 text-white/70" />
                                                </div>
                                                <p className="text-white/60 text-sm font-medium">Start scanning to verify registrations</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex justify-center">
                                        {!isScanning ? (
                                            <button
                                                onClick={startScanning}
                                                disabled={!selectedCamera}
                                                className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                                            >
                                                <Camera className="w-4 h-4" />
                                                Start Scanning
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopScanning}
                                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
                                            >
                                                <CameraOff className="w-4 h-4" />
                                                Stop Camera
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {cameraError && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-800">Camera Error</p>
                                            <p className="text-xs text-red-600 mt-1">{cameraError}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Result Panel */}
                    <div className="w-full lg:w-[380px] flex-shrink-0">
                        {isLoading ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[200px]">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
                                <p className="text-sm font-medium text-gray-500">Verifying registration...</p>
                            </div>
                        ) : result ? (
                            <div className={`rounded-3xl border shadow-sm overflow-hidden ${result.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                <div className="p-6">
                                    {result.found && result.registration ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-green-900">Verified</h3>
                                                    <p className="text-xs font-medium text-green-600">Registration confirmed</p>
                                                </div>
                                            </div>

                                            <div className="bg-white/80 rounded-2xl p-4 space-y-3 border border-green-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Athlete</p>
                                                        <p className="text-base font-bold text-gray-900">{result.registration.playerName}</p>
                                                    </div>
                                                    {result.registration.belt && (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getBeltStyle(result.registration.belt).bg} ${getBeltStyle(result.registration.belt).text}`}>
                                                            {result.registration.belt}
                                                        </span>
                                                    )}
                                                </div>
                                                {result.registration.clubName && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Club</p>
                                                        <p className="text-sm font-semibold text-gray-700">{result.registration.clubName}</p>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${result.registration.status === 'APPROVED'
                                                            ? 'bg-green-100 text-green-700'
                                                            : result.registration.status === 'PENDING'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {result.registration.status}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered</p>
                                                        <p className="text-xs font-semibold text-gray-600">
                                                            {new Date(result.registration.createdAt).toLocaleDateString(undefined, {
                                                                month: 'short', day: 'numeric', year: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <XCircle className="w-7 h-7 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-red-900">Not Found</h3>
                                                <p className="text-sm text-red-600">{result.error}</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={clearResult}
                                        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-semibold text-sm text-gray-700 transition-all active:scale-95 w-full justify-center shadow-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Clear & Scan Next
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                    <ScanLine className="w-7 h-7 text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-400">
                                    {isScanning ? 'Point camera at a QR code' : 'Start camera to begin scanning'}
                                </p>
                                <p className="text-xs text-gray-300 mt-1">Result will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 max-w-md bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    QR Code Token
                                </label>
                                <input
                                    type="text"
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualVerify()}
                                    placeholder="Paste or type the QR code token..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder-gray-400"
                                />
                            </div>
                            <button
                                onClick={handleManualVerify}
                                disabled={isLoading || !manualToken.trim()}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Verify Registration
                            </button>
                        </div>
                    </div>

                    {/* Right: Result */}
                    <div className="w-full lg:w-[380px] flex-shrink-0">
                        {result ? (
                            <div className={`rounded-3xl border shadow-sm overflow-hidden ${result.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                <div className="p-6">
                                    {result.found && result.registration ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-green-900">Verified</h3>
                                                    <p className="text-xs font-medium text-green-600">Registration confirmed</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-2xl p-4 space-y-3 border border-green-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Athlete</p>
                                                    <p className="text-base font-bold text-gray-900">{result.registration.playerName}</p>
                                                </div>
                                                {result.registration.clubName && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Club</p>
                                                        <p className="text-sm font-semibold text-gray-700">{result.registration.clubName}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${result.registration.status === 'APPROVED' ? 'bg-green-100 text-green-700'
                                                        : result.registration.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>{result.registration.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <XCircle className="w-7 h-7 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-red-900">Not Found</h3>
                                                <p className="text-sm text-red-600">{result.error}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                    <ScanLine className="w-7 h-7 text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-400">Enter a token to verify</p>
                                <p className="text-xs text-gray-300 mt-1">Result will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
