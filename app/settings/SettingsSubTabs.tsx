'use client'

import { useState } from 'react'
import { User, Building2, DollarSign, Wifi, Shield } from 'lucide-react'

interface SettingsSubTabsProps {
    profileContent: React.ReactNode
    organizationContent: React.ReactNode
    feesContent?: React.ReactNode
    securityContent: React.ReactNode
    networkContent?: React.ReactNode
}

const BASE_TABS = [
    { id: 'profile',      label: 'Profile',       Icon: User       },
    { id: 'organization', label: 'Organization',   Icon: Building2  },
    { id: 'fees',         label: 'Fees',           Icon: DollarSign },
    { id: 'network',      label: 'Network',        Icon: Wifi       },
    { id: 'security',     label: 'Security',       Icon: Shield     },
] as const

type TabId = typeof BASE_TABS[number]['id']

export default function SettingsSubTabs({ profileContent, organizationContent, feesContent, securityContent, networkContent }: SettingsSubTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    const tabs = BASE_TABS.filter(t => {
        if (t.id === 'fees'    && !feesContent)    return false
        if (t.id === 'network' && !networkContent) return false
        return true
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your profile, organization details, and platform preferences.</p>
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
                {activeTab === 'profile'      && <div key="profile">{profileContent}</div>}
                {activeTab === 'organization' && <div key="organization">{organizationContent}</div>}
                {activeTab === 'fees'         && <div key="fees">{feesContent}</div>}
                {activeTab === 'network'      && <div key="network">{networkContent}</div>}
                {activeTab === 'security'     && <div key="security">{securityContent}</div>}
            </div>
        </div>
    )
}
