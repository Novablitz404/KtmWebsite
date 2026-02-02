'use client'

import { useState } from 'react'
import { Seminar, SeminarRegistration } from '@prisma/client'
import { LayoutDashboard, Users, Settings, ArrowLeft, Menu, Calendar, MapPin, DollarSign } from 'lucide-react'
import Link from 'next/link'
import SeminarParticipants from './SeminarParticipants'
import SeminarSettings from './SeminarSettings'

type ExtendedSeminar = Seminar & {
    registrations: SeminarRegistration[]
}

interface SeminarTabsProps {
    seminar: ExtendedSeminar
}

export default function SeminarTabs({ seminar }: SeminarTabsProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'settings'>('overview')
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <Link
                            href="/organization?view=events"
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Events
                        </Link>

                        <div>
                            <h2 className="font-bold text-gray-900 truncate" title={seminar.name}>{seminar.name}</h2>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(seminar.startDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any)
                                        setSidebarOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-sky-50 text-sky-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-gray-400'}`} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Footer Info */}
                    <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
                        <p>KTM System v1.0</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 min-w-0 flex flex-col min-h-screen">
                {/* Mobile Header Trigger */}
                <div className="md:hidden flex items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold ml-2 text-gray-900 truncate">{seminar.name}</span>
                </div>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                                <p className="text-gray-500">Quick stats and details about the seminar.</p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Registered</p>
                                            <p className="text-2xl font-bold text-gray-900">{seminar.registrations.length}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Fee</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {seminar.fee ? `₱${seminar.fee.toFixed(0)}` : 'Free'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Status</p>
                                            <p className="text-lg font-bold text-gray-900">{seminar.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details Card */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {seminar.bannerUrl && (
                                    <div className="relative w-full h-48 sm:h-64 bg-gray-100">
                                        <img
                                            src={seminar.bannerUrl}
                                            alt={seminar.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(seminar.startDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        {seminar.venue && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                {seminar.venue}
                                            </div>
                                        )}
                                    </div>

                                    {seminar.description && (
                                        <div className="prose prose-sm max-w-none text-gray-600">
                                            <p className="whitespace-pre-wrap">{seminar.description}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'participants' && (
                        <SeminarParticipants registrations={seminar.registrations} />
                    )}

                    {activeTab === 'settings' && (
                        <SeminarSettings seminar={seminar} />
                    )}
                </div>
            </div>
        </div>
    )
}
