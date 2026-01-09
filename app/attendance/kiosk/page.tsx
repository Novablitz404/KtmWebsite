'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { validateKiosk, getClubFaceData, checkInByFace } from '@/app/actions/attendance'
import * as faceapi from 'face-api.js'

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

    // Camera refs
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const isProcessingRef = useRef(false)

    // Validate token on load
    useEffect(() => {
        if (!token) {
            setStep('error')
            setStatusMessage('Invalid kiosk link. Please contact your Club Master.')
            return
        }
        setStep('pin')
    }, [token])

    // Handle PIN submission
    const handlePinSubmit = async () => {
        if (pin.length !== 6) {
            setPinError('PIN must be 6 digits')
            return
        }

        setPinError(null)
        setStatusMessage('Validating...')

        const result = await validateKiosk(token!, pin)

        if (!result.valid) {
            setPinError(result.error || 'Invalid PIN')
            return
        }

        setClubData({
            id: result.clubId!,
            name: result.clubName!,
            logo: result.clubLogo || null
        })

        // Load face data
        setStatusMessage('Loading member faces...')
        const faceData = await getClubFaceData(result.clubId!)
        setMembers(faceData)

        setStep('camera')
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
                    ctx.strokeStyle = '#22C55E'
                    ctx.lineWidth = 4
                    ctx.strokeRect(x, y, width, height)

                    // Match face
                    if (!isProcessingRef.current) {
                        isProcessingRef.current = true
                        const matchedMember = findMatch(detection.descriptor)

                        if (matchedMember) {
                            const result = await checkInByFace(
                                clubData!.id,
                                matchedMember.id,
                                matchedMember.confidence
                            )

                            if (result.success) {
                                setLastCheckIn({ name: result.userName || 'Member', time: new Date() })
                                setTodayCount(c => c + 1)
                                setStatusMessage(`✓ Welcome, ${result.userName}!`)

                                // Show success briefly
                                ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
                                ctx.fillRect(x, y, width, height)

                                // Reset after delay
                                setTimeout(() => {
                                    setStatusMessage('Ready - Look at the camera')
                                    isProcessingRef.current = false
                                }, 3000)
                            } else {
                                setStatusMessage(result.error || 'Already checked in today')
                                setTimeout(() => {
                                    setStatusMessage('Ready - Look at the camera')
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
            }

            requestAnimationFrame(detect)
        }

        detect()
    }, [clubData, members])

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
                <img src="/KTMLogo.png" alt="KTM" className="w-24 h-24 mb-8" />
                <h1 className="text-3xl font-bold text-white mb-2">Attendance Kiosk</h1>
                <p className="text-gray-400 mb-8">Enter the 6-digit PIN to continue</p>

                <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-sm">
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="● ● ● ● ● ●"
                        className="w-full text-center text-4xl tracking-[0.5em] bg-transparent border-b-2 border-white/30 text-white py-4 focus:outline-none focus:border-white placeholder:text-white/30"
                    />

                    {pinError && (
                        <p className="text-red-400 text-sm text-center mt-4">{pinError}</p>
                    )}

                    <button
                        onClick={handlePinSubmit}
                        disabled={pin.length !== 6}
                        className="w-full mt-6 py-4 bg-red-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition"
                    >
                        Enter Kiosk
                    </button>
                </div>
            </div>
        )
    }

    // Camera view (kiosk mode)
    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <header className="bg-gray-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {clubData?.logo ? (
                        <img src={clubData.logo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-2xl">🥋</div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-white">{clubData?.name}</h1>
                        <p className="text-gray-400 text-sm">Face Check-In</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-white">{todayCount}</p>
                    <p className="text-gray-400 text-sm">Checked In Today</p>
                </div>
            </header>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="relative w-full max-w-3xl aspect-[4/3] rounded-3xl overflow-hidden bg-gray-900 shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                        className="absolute inset-0 w-full h-full"
                    />

                    {/* Overlay guides */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-4 border-dashed border-white/30 rounded-[40%]" />
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <footer className="bg-gray-900/80 backdrop-blur px-6 py-6 text-center">
                <p className={`text-2xl font-medium ${statusMessage.includes('✓') ? 'text-green-400' : 'text-white'
                    }`}>
                    {statusMessage}
                </p>

                {lastCheckIn && (
                    <p className="text-gray-400 mt-2">
                        Last: {lastCheckIn.name} at {lastCheckIn.time.toLocaleTimeString()}
                    </p>
                )}
            </footer>
        </div>
    )
}
