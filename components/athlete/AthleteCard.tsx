'use client'

import Image from 'next/image'
import { useRef, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

interface AthleteCardProps {
    name?: string | null
    athleteId?: string | null
    imageUrl?: string | null
    createdAt?: string | null
    isVerified?: boolean
    cardPaymentStatus?: string | null
    onActivateClick?: () => void
}

function formatValidityDate(createdAt: string): string {
    const date = new Date(createdAt)
    date.setFullYear(date.getFullYear() + 1)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export default function AthleteCard({ name, athleteId, imageUrl, createdAt, isVerified = false, cardPaymentStatus, onActivateClick }: AthleteCardProps) {
    const fullName = (name || 'ATHLETE').toUpperCase()
    const validUntil = createdAt ? formatValidityDate(createdAt) : '—'

    // Auto-fit name font size
    const nameContainerRef = useRef<HTMLDivElement>(null)
    const nameTextRef = useRef<HTMLHeadingElement>(null)
    const [nameFontSize, setNameFontSize] = useState(28)

    useEffect(() => {
        const fitText = () => {
            const container = nameContainerRef.current
            const text = nameTextRef.current
            if (!container || !text) return

            let size = 22
            text.style.fontSize = `${size}px`

            while (text.scrollWidth > container.clientWidth && size > 6) {
                size -= 0.5
                text.style.fontSize = `${size}px`
            }

            setNameFontSize(size)
        }

        const timer = setTimeout(fitText, 50)
        const observer = new ResizeObserver(fitText)
        if (nameContainerRef.current) observer.observe(nameContainerRef.current)

        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [fullName])

    return (
        <div className="w-full">
            <div
                className={`relative w-full overflow-hidden rounded-2xl transition-shadow duration-500 ${isVerified
                    ? 'shadow-2xl shadow-gray-300/60 hover:shadow-[0_25px_60px_-10px_rgba(220,38,38,0.2)]'
                    : 'shadow-lg shadow-gray-200/40'
                    }`}
                style={{ aspectRatio: '4843 / 3443' }}
            >
                {/* SVG Background */}
                <Image
                    src="/wotf/athlete_card.svg"
                    alt="Athlete Card Background"
                    fill
                    className={`object-cover ${!isVerified ? 'grayscale opacity-50' : ''}`}
                    priority
                />

                {/* Text info */}
                <div ref={nameContainerRef} className="absolute flex flex-col items-end text-right" style={{ top: '37%', left: '21%', right: '30%', gap: '2px' }}>
                    {/* Name */}
                    <h2
                        ref={nameTextRef}
                        className={`font-black tracking-tight leading-tight whitespace-nowrap ${isVerified ? 'text-[#DC2626]' : 'text-gray-400'
                            }`}
                        style={{ fontSize: `${nameFontSize}px` }}
                    >
                        {fullName || '\u00A0'}
                    </h2>

                    {/* ATHLETE ID NO. label */}
                    <p
                        className={`font-semibold uppercase tracking-[0.08em] ${isVerified ? 'text-[#333]' : 'text-gray-300'}`}
                        style={{ fontSize: `${nameFontSize * 0.65}px` }}
                    >
                        Athlete ID No.
                    </p>

                    {/* ID Number */}
                    <p
                        className={`font-black tracking-wide leading-tight ${isVerified ? 'text-[#DC2626]' : 'text-gray-300'}`}
                        style={{ fontSize: `${nameFontSize * 0.9}px` }}
                    >
                        {isVerified ? (athleteId || '—') : '—'}
                    </p>

                    {/* Valid Until */}
                    <p
                        className={`font-medium italic ${isVerified ? 'text-[#444]' : 'text-gray-300'}`}
                        style={{ fontSize: `${nameFontSize * 0.65}px` }}
                    >
                        Valid Until: {isVerified ? validUntil : '—'}
                    </p>
                </div>

                {/* Profile Photo */}
                <div
                    className={`absolute overflow-hidden rounded-lg ${isVerified ? 'bg-gray-200' : 'bg-gray-100'}`}
                    style={{
                        top: '30%',
                        right: '3%',
                        width: '23%',
                        aspectRatio: '10 / 13',
                    }}
                >
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt="Athlete Photo"
                            fill
                            className={`object-cover ${!isVerified ? 'grayscale opacity-40' : ''}`}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-1/3 h-1/3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Inactive Overlay — shown when NOT verified */}
                {!isVerified && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[1px]">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 shadow-lg border border-gray-200 flex flex-col items-center gap-1.5 min-w-[200px]">
                            {cardPaymentStatus === 'PENDING_ACTIVATION' ? (
                                <>
                                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Approval</p>
                                    <p className="text-[10px] text-gray-500 text-center max-w-[180px]">
                                        Your payment is under review
                                    </p>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-6 h-6 text-gray-400" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Not Activated</p>
                                    {onActivateClick ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onActivateClick(); }}
                                            className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 transition-colors pointer-events-auto"
                                        >
                                            Activate Card
                                        </button>
                                    ) : (
                                        <p className="text-[10px] text-gray-400 text-center max-w-[180px]">
                                            Contact your organization to activate your athlete card
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
