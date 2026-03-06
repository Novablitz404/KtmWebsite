'use client'

import { useState } from 'react'

interface ClubSettingsSubTabsProps {
    profileContent: React.ReactNode
    clubContent: React.ReactNode
    securityContent: React.ReactNode
    affiliationContent?: React.ReactNode
}

const baseTabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'club', label: 'Club' },
    { id: 'affiliation', label: 'Affiliation' },
    { id: 'security', label: 'Security' },
] as const

type TabId = typeof baseTabs[number]['id']

export default function ClubSettingsSubTabs({ profileContent, clubContent, securityContent, affiliationContent }: ClubSettingsSubTabsProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    // Only show the Affiliation tab if content is provided
    const tabs = affiliationContent
        ? baseTabs
        : baseTabs.filter(t => t.id !== 'affiliation')

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
                {activeTab === 'profile' && profileContent}
                {activeTab === 'club' && clubContent}
                {activeTab === 'affiliation' && affiliationContent}
                {activeTab === 'security' && securityContent}
            </div>
        </div>
    )
}
