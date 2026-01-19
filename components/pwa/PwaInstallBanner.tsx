'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare, MoreVertical, Download } from 'lucide-react'
import Image from 'next/image'

export default function PwaInstallBanner() {
    const [show, setShow] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
    const [isPWA, setIsPWA] = useState(false)

    useEffect(() => {
        // Check if already installed as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isIOSStandalone = (window.navigator as any).standalone === true
        setIsPWA(isStandalone || isIOSStandalone)

        // Check if already dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

        // Detect platform
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios')
        } else if (/android/.test(userAgent)) {
            setPlatform('android')
        }

        // Show banner if not installed and not recently dismissed (show again after 24h)
        if (!isStandalone && !isIOSStandalone && dismissedTime < oneDayAgo) {
            // Delay showing to avoid interrupting initial load
            const timer = setTimeout(() => setShow(true), 2000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleDismiss = () => {
        setShow(false)
        localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }

    // Don't show for PWA users or if already dismissed
    if (isPWA || !show) {
        return null
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-4 shadow-xl border border-indigo-500/20">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1.5 text-white/60 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-3">
                    {/* App icon */}
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl p-1 shadow-sm">
                        <Image
                            src="/KTMLogo.png"
                            alt="KTM"
                            width={48}
                            height={48}
                            className="object-contain"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-bold text-white text-sm mb-1">
                            Install KTM App
                        </h3>

                        {platform === 'ios' && (
                            <p className="text-indigo-100 text-xs leading-relaxed">
                                Tap <Share className="inline w-3.5 h-3.5 mx-0.5" /> then <span className="font-medium">"Add to Home Screen"</span>
                            </p>
                        )}

                        {platform === 'android' && (
                            <p className="text-indigo-100 text-xs leading-relaxed">
                                Tap <MoreVertical className="inline w-3.5 h-3.5 mx-0.5" /> then <span className="font-medium">"Install App"</span>
                            </p>
                        )}

                        {platform === 'other' && (
                            <p className="text-indigo-100 text-xs leading-relaxed">
                                Add to home screen for the best experience
                            </p>
                        )}
                    </div>
                </div>

                {/* "Got it" button (secondary action) */}
                <button
                    onClick={handleDismiss}
                    className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                >
                    Maybe Later
                </button>
            </div>
        </div>
    )
}
