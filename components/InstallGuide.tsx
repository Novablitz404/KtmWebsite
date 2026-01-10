'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Share, PlusSquare, MoreVertical, Download } from 'lucide-react'

export default function InstallGuide() {
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios')
        } else if (/android/.test(userAgent)) {
            setPlatform('android')
        }
    }, [])

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center">
            {/* Brand */}
            <div className="relative w-24 h-24 mb-6">
                <Image
                    src="/KTMLogo.png"
                    alt="KTM Logo"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            <h1 className="text-2xl font-black text-gray-900 mb-2">
                Install App to Continue
            </h1>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">
                KTM Tournament Manager is designed to be used as a native app.
            </p>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-2xl p-6 w-full max-w-sm border border-gray-100 shadow-sm">
                {platform === 'ios' && (
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-900">For iOS (Safari):</p>
                        <ol className="text-left space-y-4 text-sm text-gray-600">
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">1</span>
                                <span>Tap the <Share className="inline w-4 h-4 mx-1 text-blue-500" /> <span className="font-medium text-gray-900">Share</span> button in the toolbar.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">2</span>
                                <span>Scroll down and select <span className="font-medium text-gray-900">Add to Home Screen</span> <PlusSquare className="inline w-4 h-4 mx-1" />.</span>
                            </li>
                        </ol>
                    </div>
                )}

                {platform === 'android' && (
                    <div className="space-y-4">
                        <p className="font-semibold text-gray-900">For Android (Chrome):</p>
                        <ol className="text-left space-y-4 text-sm text-gray-600">
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">1</span>
                                <span>Tap the <MoreVertical className="inline w-4 h-4 mx-1 text-gray-600" /> <span className="font-medium text-gray-900">Menu</span> button (three dots).</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">2</span>
                                <span>Select <span className="font-medium text-gray-900">Install App</span> or <span className="font-medium text-gray-900">Add to Home Screen</span>.</span>
                            </li>
                        </ol>
                    </div>
                )}

                {platform === 'other' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Please open this website on your mobile device (iOS/Android) and add it to your Home Screen to continue.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-8">
                <p className="text-xs text-gray-400">
                    Already installed? Open the app from your home screen.
                </p>
            </div>
        </div>
    )
}
