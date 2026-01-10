'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function MobileSplashScreen() {
    const router = useRouter()
    const [fadingOut, setFadingOut] = useState(false)

    useEffect(() => {
        // Wait for 2.5 seconds before redirecting
        const timer = setTimeout(() => {
            setFadingOut(true)
            setTimeout(() => {
                router.push('/sign-in')
            }, 500) // Wait for fade out animation
        }, 2500)

        return () => clearTimeout(timer)
    }, [router])

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-800 transition-opacity duration-500 ${fadingOut ? 'opacity-0' : 'opacity-100'
                }`}
        >
            <div className="flex flex-col items-center">
                {/* Pulsing Logo Container */}
                <div className="relative w-40 h-40 mb-8 animate-pulse">
                    <Image
                        src="/KTMLogo.png"
                        alt="KTM Logo"
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                    />
                </div>

                {/* Loading Bar */}
                <div className="w-48 h-1 bg-red-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 animate-[loading_2s_ease-in-out_infinite]" />
                </div>

                <p className="mt-8 text-white/80 font-medium tracking-widest text-sm uppercase">
                    Tournament Manager
                </p>

                <style jsx>{`
          @keyframes loading {
            0% { width: 0%; transform: translateX(-100%); }
            50% { width: 100%; transform: translateX(0); }
            100% { width: 100%; transform: translateX(100%); }
          }
        `}</style>
            </div>
        </div>
    )
}
