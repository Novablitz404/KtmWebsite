'use client'

import { useState } from 'react'

interface SettingsSubTabsProps {
    profileContent: React.ReactNode
    organizationContent: React.ReactNode
    feesContent?: React.ReactNode
    securityContent: React.ReactNode
    networkContent?: React.ReactNode
}

const baseTabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'organization', label: 'Organization' },
    { id: 'fees', label: 'Fees' },
    { id: 'network', label: 'Network' },
    { id: 'security', label: 'Security' },
] as const

type TabId = typeof baseTabs[number]['id']

export default function SettingsSubTabs({ profileContent, organizationContent, feesContent, securityContent, networkContent }: SettingsSubTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    // Filter tabs based on what content is provided
    let tabs = [...baseTabs]
    if (!networkContent) tabs = tabs.filter(t => t.id !== 'network')
    if (!feesContent) tabs = tabs.filter(t => t.id !== 'fees')

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="bg-white sm:rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 p-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    px-5 py-2.5 text-sm font-semibold rounded-lg transition-all
                                    ${isActive
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'profile' && <div key="profile">{profileContent}</div>}
                {activeTab === 'organization' && <div key="organization">{organizationContent}</div>}
                {activeTab === 'fees' && <div key="fees">{feesContent}</div>}
                {activeTab === 'network' && <div key="network">{networkContent}</div>}
                {activeTab === 'security' && <div key="security">{securityContent}</div>}
            </div>
        </div>
    )
}
