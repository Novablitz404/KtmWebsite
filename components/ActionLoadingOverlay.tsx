'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface ActionLoadingOverlayProps {
    isLoading: boolean
    title?: string
    message?: string
}

import { createPortal } from 'react-dom'

export default function ActionLoadingOverlay({
    isLoading,
    title = "Processing...",
    message = "Please wait, do not refresh or close this page."
}: ActionLoadingOverlayProps) {
    // Prevent hydration mismatch
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    if (!isLoading || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex flex-col items-center max-w-sm text-center p-8 rounded-3xl">
                {/* Taekwondo Kick Animation Placeholder - Using a pulse effect on an icon for now or a spinner */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white p-4 rounded-full shadow-lg border-2 border-indigo-100">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-2">
                    {title}
                </h3>

                <p className="text-gray-500 font-medium mb-8">
                    {message}
                </p>

                {/* Progress Bar */}
                <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-[progress_2s_ease-in-out_infinite] origin-left w-full rounded-full" />
                </div>

                {/* Prevent user interaction hint */}
                <p className="text-xs text-gray-400 mt-8 animate-pulse">
                    Keep this window open
                </p>
            </div>

            <style jsx>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>,
        document.body
    )
}
