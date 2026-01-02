'use client'

import { useState } from 'react'
import { Plus, ListFilter } from 'lucide-react'

interface OrganizerTabsProps {
    createTabContent: React.ReactNode
    manageTabContent: React.ReactNode
}

export default function OrganizerTabs({ createTabContent, manageTabContent }: OrganizerTabsProps) {
    const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage')

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'manage'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <ListFilter className={`
                            -ml-0.5 mr-2 h-5 w-5
                            ${activeTab === 'manage' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `} />
                        Active Tournaments
                    </button>

                    <button
                        onClick={() => setActiveTab('create')}
                        className={`
                            group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'create'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        <Plus className={`
                            -ml-0.5 mr-2 h-5 w-5
                            ${activeTab === 'create' ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `} />
                        Create New Tournament
                    </button>
                </nav>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'manage' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {manageTabContent}
                    </div>
                )}
                {activeTab === 'create' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {createTabContent}
                    </div>
                )}
            </div>
        </div>
    )
}
