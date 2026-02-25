'use client'

import { useState } from 'react'

interface SettingsSubTabsProps {
    profileContent: React.ReactNode
    organizationContent: React.ReactNode
}

const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'organization', label: 'Organization' },
] as const

type TabId = typeof tabs[number]['id']

export default function SettingsSubTabs({ profileContent, organizationContent }: SettingsSubTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="bg-white sm:rounded-xl border border-gray-200 shadow-sm">
                <div className="flex">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    relative flex-1 sm:flex-none px-6 py-3.5 text-sm font-semibold transition-colors
                                    ${isActive
                                        ? 'text-gray-900'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }
                                `}
                            >
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-t-full" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'profile' && profileContent}
                {activeTab === 'organization' && organizationContent}
            </div>
        </div>
    )
}
