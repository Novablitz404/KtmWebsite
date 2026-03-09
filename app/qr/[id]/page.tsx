'use client'

import { useState, useEffect, useRef, use } from 'react'
import { generatePlayerQRCode } from '@/app/actions'
import { generateSeminarQRCode } from '@/app/seminars/actions'
import { Download, Loader2, QrCode, AlertTriangle } from 'lucide-react'

export default function QRCardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [player, setPlayer] = useState<any>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        async function loadQR() {
            // Try tournament first, then seminar
            let result: any = await generatePlayerQRCode(id)
            if (result.error) {
                result = await generateSeminarQRCode(id)
            }
            if ('error' in result && result.error) {
                setError(result.error)
                setLoading(false)
                return
            }
            if ('success' in result && result.success) {
                setQrDataUrl(result.qrDataUrl!)
                setPlayer(result.player)
            }
            setLoading(false)
        }
        loadQR()
    }, [id])

    useEffect(() => {
        if (!qrDataUrl || !player || !canvasRef.current) return
        drawCard()
    }, [qrDataUrl, player])

    const drawCard = async () => {
        const canvas = canvasRef.current
        if (!canvas || !qrDataUrl || !player) return

        const scale = 2
        const ctx = canvas.getContext('2d')!
        const w = 400, h = 520
        canvas.width = w * scale
        canvas.height = h * scale
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        ctx.scale(scale, scale)

        // White card
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)

        // Header
        ctx.fillStyle = '#1e1b4b'
        ctx.fillRect(0, 0, w, 56)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('CHECK-IN QR CODE', w / 2, 36)

        // QR
        const qrImg = new Image()
        qrImg.crossOrigin = 'anonymous'
        await new Promise<void>(resolve => { qrImg.onload = () => resolve(); qrImg.src = qrDataUrl })
        const qrSize = 240
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(qrImg, (w - qrSize) / 2, 76, qrSize, qrSize)
        ctx.imageSmoothingEnabled = true

        // Player info
        ctx.fillStyle = '#111827'
        ctx.font = 'bold 20px system-ui, sans-serif'
        ctx.fillText(player.name || 'Unknown', w / 2, 350)

        ctx.fillStyle = '#6b7280'
        ctx.font = '13px system-ui, sans-serif'
        if (player.event) ctx.fillText(player.event, w / 2, 378)

        const details = [player.category || player.belt, player.club].filter(Boolean).join(' \u2022 ')
        if (details) {
            ctx.fillStyle = '#9ca3af'
            ctx.font = '12px system-ui, sans-serif'
            ctx.fillText(details, w / 2, 400)
        }

        ctx.fillStyle = '#d1d5db'
        ctx.font = '10px monospace'
        ctx.fillText(`ID: ${player.id}`, w / 2, 430)

        // Footer
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, h - 44, w, 44)
        ctx.fillStyle = '#9ca3af'
        ctx.font = '10px system-ui, sans-serif'
        ctx.fillText('Scan this code at the event check-in station', w / 2, h - 18)

        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 1
        ctx.strokeRect(0, 0, w, h)
    }

    const handleDownload = () => {
        if (!canvasRef.current || !player) return
        const link = document.createElement('a')
        link.download = `QR-${(player.name || 'athlete').replace(/\s+/g, '-')}.png`
        link.href = canvasRef.current.toDataURL('image/png')
        link.click()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">Loading QR card...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-lg font-bold text-gray-900 mb-2">QR Code Not Found</h1>
                    <p className="text-sm text-gray-500">{error}</p>
                    <p className="text-xs text-gray-400 mt-4">If you believe this is an error, please contact your club administrator.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden max-w-md w-full">
                {/* Header */}
                <div className="bg-gray-900 px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Check-In Card</span>
                    </div>
                    <h1 className="text-xl font-black text-white">{player?.name}</h1>
                    {player?.event && <p className="text-sm text-gray-400 mt-1">{player.event}</p>}
                </div>

                {/* Canvas */}
                <div className="flex justify-center p-6 bg-gray-50">
                    <canvas ref={canvasRef} className="rounded-xl shadow-sm border border-gray-200" />
                </div>

                {/* Download Button */}
                <div className="px-6 pb-6">
                    <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2.5 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-xl shadow-gray-900/20"
                    >
                        <Download className="w-5 h-5" />
                        Download QR Card
                    </button>
                    <p className="text-[10px] text-gray-400 text-center mt-3 font-medium">
                        Save this card and present it at the event check-in station
                    </p>
                </div>
            </div>

            {/* Branding */}
            <p className="text-[10px] text-gray-300 mt-6 font-medium">
                © {new Date().getFullYear()} World Olympics Taekwondo Federation Philippines
            </p>
        </div>
    )
}
