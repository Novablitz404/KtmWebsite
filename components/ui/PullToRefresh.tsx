'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PullToRefreshProps {
    children: React.ReactNode
    onRefresh?: () => Promise<void>
    className?: string
    mode?: 'push' | 'overlay'
}

export default function PullToRefresh({ children, onRefresh, className = '', mode = 'push' }: PullToRefreshProps) {
    const [startPoint, setStartPoint] = useState<number>(0)
    const [pullChange, setPullChange] = useState<number>(0)
    const [refreshing, setRefreshing] = useState(false)
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)

    const pullStartY = useRef(0)

    // Thresholds
    const MAX_PULL = 120
    const REFRESH_THRESHOLD = 80

    const initTouch = (e: React.TouchEvent) => {
        // Only enable pull if at the top of the page
        if (window.scrollY > 0) return

        setStartPoint(e.targetTouches[0].clientY)
        pullStartY.current = e.targetTouches[0].clientY
    }

    const touchMove = (e: React.TouchEvent) => {
        if (window.scrollY > 0 || refreshing) return

        const touch = e.targetTouches[0]
        const currentY = touch.clientY
        const diff = currentY - pullStartY.current

        if (diff > 0) {
            // Add resistance
            const pullDistance = Math.pow(diff, 0.8) // resistance logic
            setPullChange(Math.min(pullDistance, MAX_PULL))

            // Prevent native scrolling if we are pulling down
            // Note: This needs careful handling to not block normal scrolling
            // e.preventDefault() // Cannot assume passive false here, so we don't preventDefault
        }
    }

    const endTouch = async () => {
        if (refreshing) return

        if (pullChange > REFRESH_THRESHOLD) {
            setRefreshing(true)
            setPullChange(60) // Snap to loading height

            try {
                if (onRefresh) {
                    await onRefresh()
                } else {
                    router.refresh()
                    // Add artificial delay if router.refresh is instant or undetectable
                    await new Promise(resolve => setTimeout(resolve, 1500))
                }
            } finally {
                setRefreshing(false)
                setPullChange(0)
            }
        } else {
            setPullChange(0)
        }
    }

    return (
        <div
            ref={containerRef}
            onTouchStart={initTouch}
            onTouchMove={touchMove}
            onTouchEnd={endTouch}
            style={{
                // In push mode, move container. In overlay mode, keep container static.
                transform: mode === 'push'
                    ? `translate3d(0, ${pullChange}px, 0)`
                    : 'none',
                transition: mode === 'push'
                    ? (refreshing ? 'transform 0.2s' : pullChange === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none')
                    : 'none'
            }}
            className={`pb-20 ${className}`}
        >
            {/* Loading Indicator */}
            <div
                className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-50"
                style={{
                    marginTop: '-40px', // Start hidden above
                    // In overlay mode, we translate the spinner DOWN independently
                    transform: mode === 'overlay'
                        ? `translate3d(0, ${pullChange}px, 0)`
                        : 'none',
                    opacity: Math.min(pullChange / 40, 1),
                    transition: mode === 'overlay'
                        ? (refreshing ? 'transform 0.2s' : pullChange === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none')
                        : 'none'
                }}
            >
                <div className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 ${refreshing ? 'animate-spin' : ''}`}>
                    <svg
                        className={`w-5 h-5 text-indigo-600 ${refreshing ? '' : 'transform transition-transform duration-300'}`}
                        style={{ transform: `rotate(${pullChange * 2}deg)` }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
            </div>

            {children}
        </div>
    )
}
