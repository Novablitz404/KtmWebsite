'use client'

import { useEffect } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PendingApprovalPageProps {
    user: {
        name?: string | null
        clubName?: string | null
        imageUrl?: string | null
    }
}

export default function PendingApprovalPage({ user }: PendingApprovalPageProps) {
    const supabase = createBrowserClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/sign-in')
    }

    // Auto sign-out when user closes the tab/browser without clicking sign out
    useEffect(() => {
        const handleBeforeUnload = () => {
            navigator.sendBeacon('/api/auth/sign-out')
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [])

    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F4C300]/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image src="/wotf-global/Wotf_logo_Final.png" alt="WOTF" width={120} height={120} className="mx-auto mb-4" />
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 text-center space-y-6">
                        {/* Animated status icon */}
                        <div className="relative mx-auto w-20 h-20">
                            <div className="absolute inset-0 rounded-full bg-[#F4C300]/10 animate-ping opacity-30" />
                            <div className="relative w-20 h-20 rounded-full bg-[#F4C300]/10 flex items-center justify-center">
                                <Clock className="h-10 w-10 text-[#F4C300]" />
                            </div>
                        </div>

                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-wider mb-2">
                                Application Under Review
                            </h1>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Your profile has been submitted and is awaiting approval from your clubmaster.
                            </p>
                        </div>

                        {/* User info card */}
                        <div className="bg-black border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                {user.imageUrl ? (
                                    <Image src={user.imageUrl} alt="" width={40} height={40} className="rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 text-sm font-bold">
                                        {user.name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div className="text-left">
                                    <p className="text-white font-bold text-sm">{user.name || 'Athlete'}</p>
                                    <p className="text-gray-500 text-xs">{user.clubName || 'No club selected'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4C300] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F4C300]" />
                                </span>
                                <span className="text-[#F4C300] font-semibold uppercase tracking-wider">Pending Approval</span>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Your clubmaster will verify your information and assign your <strong className="text-gray-300">belt rank</strong>, <strong className="text-gray-300">weight</strong>, and <strong className="text-gray-300">height</strong>. You'll get access to the athlete dashboard once approved.
                            </p>
                        </div>

                        {/* Sign out */}
                        <button
                            onClick={handleSignOut}
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            <LogOut size={14} />
                            Sign out
                        </button>
                    </div>
                </motion.div>

                {/* Accent dots */}
                <div className="flex justify-center gap-1.5 mt-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0085C7]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4C300]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#009F3D]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DF0024]" />
                </div>
            </div>
        </main>
    )
}
