'use client'


import { useAuth } from '@/app/providers/AuthProvider'
import ProfileForm from '@/app/settings/ProfileForm'
import { Settings, Bell, LogOut, Shield, ChevronRight, User, Edit2 } from 'lucide-react'

interface SettingsViewProps {
    dbUser: {
        id: string
        name: string | null
        email: string
        clubName: string | null
        belt: string | null
        gender: string | null
        weight: number | null
        height: number | null
        birthDate: Date | null
        role: string
    }
    clerkImageUrl: string | undefined
    club?: {
        id: string
        name: string
        logoUrl?: string | null
        address?: string | null
        phone?: string | null
    } | null
}

export default function SettingsView({ dbUser, clerkImageUrl, club }: SettingsViewProps) {
    const { signOut } = useAuth()

        
    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30 shadow-sm">
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your account</p>
            </div>

            {/* Content */}
            <div className="bg-gray-50 pb-4">
                {/* User Info Header */}
                <div className="bg-white border-b border-gray-100 mb-3">
                    <div className="px-4 py-5 flex flex-col items-center justify-center text-center">
                        <div className="relative mb-2">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Profile'}
                                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl border-4 border-white shadow-md">
                                    🥋
                                </div>
                            )}
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white whitespace-nowrap">
                                {dbUser.role.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                            </span>
                        </div>
                        <h2 className="text-base font-bold text-gray-900">{dbUser.name || 'Athlete'}</h2>
                        <p className="text-xs text-gray-500">{dbUser.email}</p>
                    </div>
                </div>

                {/* Settings Options */}
                <div className="space-y-3">


                    {/* Account Actions */}
                    <div>
                        <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account</h3>
                        <div className="bg-white border-y border-gray-100">
                            <ProfileForm
                                user={dbUser}
                                initialImageUrl={clerkImageUrl}
                                customTrigger={
                                    <div className="px-4 py-2.5 flex items-center justify-between w-full hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                                <User size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Edit Profile</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="px-4 pb-4 space-y-3 mt-6">
                    <button
                        onClick={() => signOut().then(() => window.location.href = '/')} // Force hard reload after sign out
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 active:scale-[0.98] transition-all border border-red-100 text-sm"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                    <p className="text-[10px] text-gray-400 font-medium text-center">KTM PWA v1.0.0</p>
                </div>
            </div>
        </div>
    )
}
