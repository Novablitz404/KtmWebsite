'use client'

import { useState } from 'react'
import { User, Building2, Link2, Shield } from 'lucide-react'

interface ClubSettingsSubTabsProps {
    profileContent: React.ReactNode
    clubContent: React.ReactNode
    securityContent: React.ReactNode
    affiliationContent?: React.ReactNode
}

const BASE_TABS = [
    { id: 'profile',     label: 'Profile',     Icon: User     },
    { id: 'club',        label: 'Club',        Icon: Building2 },
    { id: 'affiliation', label: 'Affiliation', Icon: Link2    },
    { id: 'security',    label: 'Security',    Icon: Shield   },
] as const

type TabId = typeof BASE_TABS[number]['id']

export default function ClubSettingsSubTabs({ profileContent, clubContent, securityContent, affiliationContent }: ClubSettingsSubTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    const tabs = BASE_TABS.filter(t => {
        if (t.id === 'affiliation' && !affiliationContent) return false
        return true
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your profile, club details, and account preferences.</p>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-2xl shadow-sm p-1 w-fit">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                isActive
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <tab.Icon size={13} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ── Tab content ── */}
            <div>
                {activeTab === 'profile'     && <div key="profile">{profileContent}</div>}
                {activeTab === 'club'        && <div key="club">{clubContent}</div>}
                {activeTab === 'affiliation' && <div key="affiliation">{affiliationContent}</div>}
                {activeTab === 'security'    && <div key="security">{securityContent}</div>}
            </div>
        </div>
    )
}
