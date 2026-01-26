'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { LogOut, Shield } from 'lucide-react'

interface AdminSettingsViewProps {
    user: {
        id: string
        name: string | null
        email: string
        role: string
        imageUrl: string | null
    }
}

export default function AdminSettingsView({ user }: AdminSettingsViewProps) {
    const { signOut } = useClerk()
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Admin Profile</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 h-32"></div>
                        <div className="px-6 pb-6 text-center">
                            <div className="relative -mt-16 mb-4 inline-block">
                                {user.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        alt={user.name || 'Admin'}
                                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-6xl">
                                        🛡️
                                    </div>
                                )}
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h2>
                            <p className="text-gray-500 text-sm mb-4">{user.email}</p>

                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                    <Shield className="w-3 h-3 mr-1" /> Super Admin
                                </span>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Account Details Panel */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                            Account Information
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Role</dt>
                                <dd className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">Administrator</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">User ID</dt>
                                <dd className="text-gray-900 font-medium font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-xs sm:text-sm truncate" title={user.id}>
                                    {user.id}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Email Address</dt>
                                <dd className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{user.email}</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    )
}
