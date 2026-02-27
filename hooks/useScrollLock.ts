'use client'

import { useEffect } from 'react'

/**
 * Locks body scroll when `isLocked` is true.
 * Useful for modals and overlays to prevent background scrolling on mobile.
 */
export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (!isLocked) return

        const originalOverflow = document.body.style.overflow
        const originalPosition = document.body.style.position
        const originalWidth = document.body.style.width
        const originalTop = document.body.style.top
        const scrollY = window.scrollY

        // Lock body scroll
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        document.body.style.top = `-${scrollY}px`

        return () => {
            // Restore original styles
            document.body.style.overflow = originalOverflow
            document.body.style.position = originalPosition
            document.body.style.width = originalWidth
            document.body.style.top = originalTop
            // Restore scroll position
            window.scrollTo(0, scrollY)
        }
    }, [isLocked])
}
