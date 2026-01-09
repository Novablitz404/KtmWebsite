'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

interface FaceCameraProps {
    onCapture: (descriptor: number[]) => void
    onCancel: () => void
    mode?: 'enrollment' | 'detection'
}

export default function FaceCamera({ onCapture, onCancel, mode = 'enrollment' }: FaceCameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [faceDetected, setFaceDetected] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Load face-api models
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models'
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ])
                setIsLoading(false)
            } catch (err) {
                setError('Failed to load face detection models')
                console.error(err)
            }
        }
        loadModels()
    }, [])

    // Start camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 }
                })
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                setError('Camera access denied. Please enable camera permissions.')
                console.error(err)
            }
        }

        if (!isLoading) {
            startCamera()
        }

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [isLoading])

    // Face detection loop
    useEffect(() => {
        if (isLoading || !videoRef.current || !canvasRef.current) return

        let animationId: number
        let isDetecting = false

        const detectFace = async () => {
            if (!videoRef.current || !canvasRef.current) return
            const video = videoRef.current

            // Ensure video is ready
            if (video.paused || video.ended || !video.readyState || video.readyState < 2) {
                animationId = requestAnimationFrame(detectFace)
                return
            }

            if (isDetecting) return
            isDetecting = true

            try {
                // Configure detector
                const options = new faceapi.TinyFaceDetectorOptions({
                    inputSize: 512, // Higher resolution for better accuracy (default 416)
                    scoreThreshold: 0.5
                })

                const detection = await faceapi
                    .detectSingleFace(video, options)
                    .withFaceLandmarks(true)

                const canvas = canvasRef.current
                if (!canvas) return
                const ctx = canvas.getContext('2d')

                if (ctx) {
                    // Match dimensions
                    const displaySize = { width: video.videoWidth, height: video.videoHeight }
                    faceapi.matchDimensions(canvas, displaySize)

                    ctx.clearRect(0, 0, canvas.width, canvas.height)

                    if (detection) {
                        setFaceDetected(true)
                        const resizedDetections = faceapi.resizeResults(detection, displaySize)

                        // Draw face rectangle
                        const { x, y, width, height } = resizedDetections.detection.box
                        ctx.strokeStyle = '#22C55E'
                        ctx.lineWidth = 3
                        ctx.strokeRect(x, y, width, height)

                        // Draw corner accents
                        const cornerSize = 20
                        ctx.beginPath()
                        ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y)
                        ctx.moveTo(x + width - cornerSize, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerSize)
                        ctx.moveTo(x + width, y + height - cornerSize); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width - cornerSize, y + height)
                        ctx.moveTo(x + cornerSize, y + height); ctx.lineTo(x, y + height); ctx.lineTo(x, y + height - cornerSize)
                        ctx.stroke()
                    } else {
                        setFaceDetected(false)
                    }
                }
            } catch (err) {
                console.error('Detection error:', err)
            } finally {
                isDetecting = false
                animationId = requestAnimationFrame(detectFace)
            }
        }

        detectFace()

        return () => {
            if (animationId) cancelAnimationFrame(animationId)
        }
    }, [isLoading])

    // Capture face descriptor
    const captureFace = useCallback(async () => {
        if (!videoRef.current || !faceDetected) return

        setCountdown(3)
        for (let i = 3; i > 0; i--) {
            setCountdown(i)
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
        setCountdown(null)

        const detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor()

        if (detection) {
            const descriptor = Array.from(detection.descriptor)
            onCapture(descriptor)
        } else {
            setError('Face lost during capture. Please try again.')
        }
    }, [faceDetected, onCapture])

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">❌</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            {isLoading ? (
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Loading face detection...</p>
                </div>
            ) : (
                <>
                    {/* Camera View */}
                    <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden bg-gray-900">
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

                        {/* Countdown overlay */}
                        {countdown !== null && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-8xl font-bold text-white animate-pulse">
                                    {countdown}
                                </span>
                            </div>
                        )}

                        {/* Status indicator */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                            <div className={`px-4 py-2 rounded-full text-sm font-medium ${faceDetected
                                ? 'bg-green-500 text-white'
                                : 'bg-yellow-500 text-black'
                                }`}>
                                {faceDetected ? '✓ Face Detected' : 'Position your face in frame'}
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <p className="text-white/80 text-center mt-4 max-w-md">
                        {mode === 'enrollment'
                            ? 'Look directly at the camera. Make sure your face is clearly visible and well-lit.'
                            : 'Position your face in the frame for check-in.'
                        }
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={onCancel}
                            className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={captureFace}
                            disabled={!faceDetected || countdown !== null}
                            className={`px-8 py-3 rounded-xl font-medium transition ${faceDetected && countdown === null
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {mode === 'enrollment' ? 'Capture Face' : 'Check In'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
