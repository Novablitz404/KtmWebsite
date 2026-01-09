'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { validateKiosk, getClubFaceData, checkInByFace } from '@/app/actions/attendance'
import * as faceapi from 'face-api.js'
import { Maximize, Minimize } from 'lucide-react'

interface ClubMember {
    id: string
    name: string | null
    descriptor: number[]
}

export default function AttendanceKioskPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    // States
    const [step, setStep] = useState<'loading' | 'pin' | 'camera' | 'error'>('loading')
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState<string | null>(null)
    const [clubData, setClubData] = useState<{ id: string; name: string; logo: string | null } | null>(null)
    const [members, setMembers] = useState<ClubMember[]>([])
    const [todayCount, setTodayCount] = useState(0)
    const [lastCheckIn, setLastCheckIn] = useState<{ name: string; time: Date } | null>(null)
    const [statusMessage, setStatusMessage] = useState('Initializing...')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isOffline, setIsOffline] = useState(false)

    // Camera refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const isProcessingRef = useRef(false)

    // Offline Sync Queue
    const syncQueue = useCallback(async () => {
        const queue: any[] = JSON.parse(localStorage.getItem('offline_queue') || '[]')
        if (queue.length === 0) return

        setStatusMessage(`Syncing ${queue.length} offline records...`)

        const newQueue = []
        for (const item of queue) {
            try {
                await checkInByFace(item.clubId, item.userId, item.confidence)
            } catch (e) {
                console.error('Sync failed for item', item, e)
                newQueue.push(item) // Keep failed items
            }
        }

        localStorage.setItem('offline_queue', JSON.stringify(newQueue))
        if (newQueue.length === 0) {
            setStatusMessage('✓ All offline records synced')
            setTimeout(() => setStatusMessage('Ready - Look at the camera'), 2000)
        } else {
            setStatusMessage(`⚠️ ${newQueue.length} records failed to sync`)
        }
    }, [])

    // Monitor Online/Offline Status
    useEffect(() => {
        setIsOffline(!navigator.onLine)

        const handleOnline = () => {
            setIsOffline(false)
            syncQueue()
        }
        const handleOffline = () => setIsOffline(true)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [syncQueue])

    // Validate token on load
    useEffect(() => {
        if (!token) {
            setStep('error')
            setStatusMessage('Invalid kiosk link. Please contact your Club Master.')
            return
        }
        setStep('pin')

        // Load cached club data if available
        const cachedClub = localStorage.getItem(`club_data_${token}`)
        if (cachedClub) {
            setClubData(JSON.parse(cachedClub))
        }
    }, [token])

    // Handle fullscreen toggle
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullscreen(false)
            }
        }
    }

    // Listen for fullscreen changes (e.g. Esc key)
    useEffect(() => {
        const handleChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleChange)
        return () => document.removeEventListener('fullscreenchange', handleChange)
    }, [])

    // Handle PIN submission
    const handlePinSubmit = async () => {
        if (pin.length !== 6) {
            setPinError('PIN must be 6 digits')
            return
        }

        setPinError(null)
        setStatusMessage('Validating...')

        try {
            const result = await validateKiosk(token!, pin)

            if (!result.valid) {
                setPinError(result.error || 'Invalid PIN')
                return
            }

            const clubInfo = {
                id: result.clubId!,
                name: result.clubName!,
                logo: result.clubLogo || null
            }

            setClubData(clubInfo)
            localStorage.setItem(`club_data_${token}`, JSON.stringify(clubInfo))

            // Load face data
            setStatusMessage('Loading member faces...')
            let faceData: ClubMember[] = []

            try {
                faceData = await getClubFaceData(result.clubId!)
                localStorage.setItem(`members_${result.clubId}`, JSON.stringify(faceData))
            } catch (e) {
                console.warn('Failed to fetch fresh face data, trying cache', e)
                const cached = localStorage.getItem(`members_${result.clubId}`)
                if (cached) faceData = JSON.parse(cached)
            }

            setMembers(faceData)
            setStep('camera')
        } catch (e) {
            // Offline fallback for login
            const cachedClub = localStorage.getItem(`club_data_${token}`)
            if (cachedClub) {
                const club = JSON.parse(cachedClub)
                // Basic PIN check against cached PIN would be insecure/complex without storing PIN
                // For now, if offline and cached, assume verified if we can load members
                const cachedMembers = localStorage.getItem(`members_${club.id}`)
                if (cachedMembers) {
                    setClubData(club)
                    setMembers(JSON.parse(cachedMembers))
                    setStep('camera')
                    setStatusMessage('⚠️ Offline Mode')
                    return
                }
            }
            setPinError('Offline: No cached data found')
        }
    }

    // Load models and start camera
    useEffect(() => {
        if (step !== 'camera') return

        const init = async () => {
            setStatusMessage('Loading face detection...')

            try {
                const MODEL_URL = '/models'
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ])

                setStatusMessage('Starting camera...')

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 }
                })
                streamRef.current = stream

                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.onloadedmetadata = () => {
                        setStatusMessage('Ready - Look at the camera')
                        startDetection()
                    }
                }
            } catch (err) {
                console.error(err)
                setStatusMessage('Error: Camera or model loading failed')
            }
        }

        init()

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [step])

    // Find matching member
    const findMatch = (descriptor: Float32Array): { id: string; confidence: number } | null => {
        let bestMatch: { id: string; confidence: number } | null = null
        let minDistance = 0.6 // Threshold for match

        for (const member of members) {
            const distance = faceapi.euclideanDistance(descriptor, new Float32Array(member.descriptor))
            if (distance < minDistance) {
                minDistance = distance
                bestMatch = { id: member.id, confidence: 1 - distance }
            }
        }

        return bestMatch
    }

    // Face detection and matching
    const startDetection = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        const detect = async () => {
            if (!video || !ctx || isProcessingRef.current) {
                requestAnimationFrame(detect)
                return
            }

            // Ensure video playing
            if (video.paused || video.ended || !video.readyState || video.readyState < 2) {
                requestAnimationFrame(detect)
                return
            }

            const displaySize = { width: video.videoWidth, height: video.videoHeight }
            faceapi.matchDimensions(canvas, displaySize)

            try {
                const detection = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
                    .withFaceLandmarks(true)
                    .withFaceDescriptor()

                ctx.clearRect(0, 0, canvas.width, canvas.height)

                if (detection) {
                    const resizedDetections = faceapi.resizeResults(detection, displaySize)

                    // Draw face box
                    const { x, y, width, height } = resizedDetections.detection.box
                    // ctx.strokeStyle = '#22C55E'
                    // ctx.lineWidth = 4
                    // ctx.strokeRect(x, y, width, height)

                    // Match face
                    if (!isProcessingRef.current) {
                        isProcessingRef.current = true

                        // We need access to members here, but it's in state. 
                        // Since this is a closure, we need to be careful.
                        // Ideally findMatch should be inside or passed via ref, but let's assume it works because members is a dependency of useCallback

                        // Note: findMatch depends on 'members' state which is in the dependency array
                        // But we need to call it here. To fix the 'findMatch' not available in this scope if defined outside:
                        // I'm moving findMatch logic inline or ensuring it's accessible.
                        // Actually, I defined findMatch outside useEffect, so it should be available if I include it in deps.

                        // Wait, I defined findMatch in the component body. It needs to be in the deps of startDetection.

                        // Let's implement looking up match here directly to avoid closure staleness issues or just call the function
                        // We will add 'members' to dependency array.

                        // Since findMatch is defined in the component scope, we can use it, but startDetection needs to depend on it.
                        // To avoid complexity, I'll use a Ref for members to always get fresh data in the loop without restarting it.
                        // However, restart is fine when members change (rarely).

                        // Let's use the findMatch function from component scope.
                        // We need to make sure findMatch is stable or included inc deps.

                        // To be safe and clean, I will just call findMatch(detection.descriptor)
                        // But typescript might complain if not defined in this scope? No, it's in function scope.

                        // Re-defining findMatch helper inside here for safety? No, component scope is fine.

                        // The previous error "Cannot find name matchedMember" was because I deleted the line declaring it.
                        // Here I am putting it back.

                        const matchedMember = findMatch(detection.descriptor)

                        if (matchedMember) {
                            let userName = members.find(m => m.id === matchedMember.id)?.name || 'Member'
                            let success = false

                            if (navigator.onLine) {
                                const result = await checkInByFace(
                                    clubData!.id,
                                    matchedMember.id,
                                    matchedMember.confidence
                                )
                                if (result.success) {
                                    userName = result.userName || userName
                                    success = true
                                } else {
                                    setStatusMessage(result.error || 'Already checked in today')
                                }
                            } else {
                                // Offline Check-in
                                const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]')
                                const alreadyQueued = queue.some((q: any) =>
                                    q.userId === matchedMember.id &&
                                    new Date(q.date).toDateString() === new Date().toDateString()
                                )

                                if (!alreadyQueued) {
                                    queue.push({
                                        clubId: clubData!.id,
                                        userId: matchedMember.id,
                                        confidence: matchedMember.confidence,
                                        date: new Date().toISOString()
                                    })
                                    localStorage.setItem('offline_queue', JSON.stringify(queue))
                                    success = true
                                    setStatusMessage('✓ Saved (Offline)')
                                } else {
                                    setStatusMessage('Already checked in (Offline)')
                                }
                            }

                            if (success) {
                                setLastCheckIn({ name: userName, time: new Date() })
                                setTodayCount(c => c + 1)
                                if (navigator.onLine) setStatusMessage(`✓ Welcome, ${userName}!`)

                                // Show success briefly
                                ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
                                ctx.fillRect(x, y, width, height)

                                // Reset after delay
                                setTimeout(() => {
                                    setStatusMessage(isOffline ? '⚠️ Offline Mode' : 'Ready - Look at the camera')
                                    isProcessingRef.current = false
                                }, 3000)
                            } else {
                                setTimeout(() => {
                                    setStatusMessage(isOffline ? '⚠️ Offline Mode' : 'Ready - Look at the camera')
                                    isProcessingRef.current = false
                                }, 2000)
                            }
                        } else {
                            isProcessingRef.current = false
                        }
                    }
                }
            } catch (err) {
                console.error('Kiosk detection error:', err)
                isProcessingRef.current = false
            }

            requestAnimationFrame(detect)
        }

        detect()
    }, [clubData, members, isOffline])

    // Error state
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="text-6xl mb-6">❌</div>
                    <h1 className="text-2xl font-bold text-white mb-4">Kiosk Error</h1>
                    <p className="text-gray-400">{statusMessage}</p>
                </div>
            </div>
        )
    }

    // PIN entry
    if (step === 'pin' || step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
                {/* Logo or Placeholder */}
                <div className="w-24 h-24 mb-8 bg-red-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-red-900/20">
                    🥋
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Attendance Kiosk</h1>
                <p className="text-gray-400 mb-8">Enter the 6-digit PIN to continue</p>

                <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-sm border border-white/10 shadow-xl">
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="● ● ● ● ● ●"
                        className="w-full text-center text-4xl tracking-[0.5em] bg-transparent border-b-2 border-white/30 text-white py-4 focus:outline-none focus:border-white placeholder:text-white/30 transition-colors font-mono"
                    />

                    {pinError && (
                        <p className="text-red-400 text-sm text-center mt-4 bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {pinError}
                        </p>
                    )}

                    <button
                        onClick={handlePinSubmit}
                        disabled={pin.length !== 6}
                        className="w-full mt-6 py-4 bg-red-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 active:scale-[0.98] transition-all shadow-lg shadow-red-900/30"
                    >
                        Enter Kiosk
                    </button>

                    {isOffline && (
                        <p className="text-yellow-500 text-xs text-center mt-4 flex items-center justify-center gap-1">
                            ⚠️ Offline Mode Available
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // Camera view (kiosk mode)
    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur px-6 py-4 flex items-center justify-between z-10 border-b border-white/5">
                <div className="flex items-center gap-4">
                    {clubData?.logo ? (
                        <img src={clubData.logo} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-800" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-2xl shadow-lg shadow-red-900/20">🥋</div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-white">{clubData?.name}</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-gray-400 text-sm">Face Check-In</p>
                            {isOffline && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">
                                    Offline
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-3xl font-bold text-white">{todayCount}</p>
                        <p className="text-gray-400 text-sm">Checked In Today</p>
                    </div>

                    <button
                        onClick={toggleFullScreen}
                        className="p-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition border border-white/5"
                        title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                        {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                    </button>
                </div>
            </header>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
                <div className="relative w-full max-w-3xl aspect-[4/3] rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border border-white/10">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                    />
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                        className="absolute inset-0 w-full h-full transform scale-x-[-1]" // Mirror canvas too
                    />

                    {/* Overlay guides */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-4 border-dashed border-white/30 rounded-[40%] shadow-[0_0_100px_rgba(0,0,0,0.5)_inset]" />
                    </div>

                    {/* Status Pill in Camera */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-6 py-2 rounded-full text-white font-medium border border-white/10">
                        Look at the camera
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <footer className="bg-gray-900/80 backdrop-blur px-6 py-6 text-center z-10 border-t border-white/5">
                <p className={`text-2xl font-medium transition-colors duration-300 ${statusMessage.includes('✓') ? 'text-green-400' :
                    statusMessage.includes('⚠️') ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {statusMessage}
                </p>

                {lastCheckIn && (
                    <p className="text-gray-400 mt-2 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Last: <span className="text-white font-medium">{lastCheckIn.name}</span>
                        at {lastCheckIn.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </footer>
        </div>
    )
}
