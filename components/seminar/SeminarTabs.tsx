'use client'

import { useState } from 'react'
import { Seminar, SeminarRegistration } from '@prisma/client'
import { LayoutDashboard, Users, Settings, ArrowLeft, Menu, Calendar, MapPin, DollarSign, QrCode } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import SeminarParticipants from './SeminarParticipants'
import SeminarSettings from './SeminarSettings'
import SeminarScanner from './SeminarScanner'

type ExtendedSeminar = Seminar & {
    registrations: SeminarRegistration[]
}

interface SeminarTabsProps {
    seminar: ExtendedSeminar
    userRole?: string
}

export default function SeminarTabs({ seminar, userRole }: SeminarTabsProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const activeTab = (searchParams.get('tab') as 'overview' | 'participants' | 'check-in' | 'settings') || 'overview'
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'check-in', label: 'Check-In', icon: QrCode },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('tab', tabId)
        router.push(`${pathname}?${params.toString()}`)
        setSidebarOpen(false)
    }


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
                            href={userRole === 'ADMIN' ? `/admin${searchParams.get('tenant') ? `?tenant=${searchParams.get('tenant')}` : ''}` : `/organization?tab=events${searchParams.get('tenant') ? `&tenant=${searchParams.get('tenant')}` : ''}`}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            {userRole === 'ADMIN' ? 'Back to Admin' : 'Back to Events'}
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
                                    onClick={() => handleTabChange(tab.id)}
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
                        <div className="animate-in fade-in duration-300 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Seminar Dashboard</h1>
                                    <p className="text-gray-500 font-medium pt-1">Performance metrics and financial breakdown.</p>
                                </div>
                                <div className="flex items-center gap-2 px-6 py-2 bg-gray-900 rounded-full shadow-lg">
                                    <div className={`w-2 h-2 rounded-full ${seminar.status === 'OPEN' ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
                                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{seminar.status}</span>
                                </div>
                            </div>

                            {/* Main Performance Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Revenue Card */}
                                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue (Approved)</p>
                                            <h3 className="text-4xl font-black text-gray-900 leading-none">
                                                ₱{((seminar.registrations.filter(r => r.status === 'APPROVED').length) * (seminar.fee || 0)).toLocaleString()}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-2 font-medium">
                                                Based on {seminar.registrations.filter(r => r.status === 'APPROVED').length} approved registrations out of ₱{((seminar.registrations.length) * (seminar.fee || 0)).toLocaleString()} potential.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Financial Graph (Visual) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-gray-400">Approval Rate</span>
                                            <span className="text-gray-900">
                                                {seminar.registrations.length > 0
                                                    ? Math.round((seminar.registrations.filter(r => r.status === 'APPROVED').length / seminar.registrations.length) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-gray-900 transition-all duration-1000 ease-out"
                                                style={{ width: `${seminar.registrations.length > 0 ? (seminar.registrations.filter(r => r.status === 'APPROVED').length / seminar.registrations.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 pt-2">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Confirmed</p>
                                                <p className="text-base font-bold text-gray-900">₱{((seminar.registrations.filter(r => r.status === 'APPROVED').length) * (seminar.fee || 0)).toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                                                <p className="text-base font-bold text-gray-300">₱{((seminar.registrations.filter(r => r.status !== 'APPROVED').length) * (seminar.fee || 0)).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Participant Breakdown / Status Bar Graph */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Registration Status</p>

                                    <div className="flex flex-col gap-4 h-[140px] justify-center">
                                        {[
                                            { label: 'Approved', count: seminar.registrations.filter(r => r.status === 'APPROVED').length, color: 'bg-green-500' },
                                            { label: 'Pending', count: seminar.registrations.filter(r => r.status === 'PENDING').length, color: 'bg-amber-500' },
                                            { label: 'Rejected', count: seminar.registrations.filter(r => r.status === 'REJECTED').length, color: 'bg-red-500' }
                                        ].map((stat, i) => {
                                            const percentage = seminar.registrations.length > 0 ? (stat.count / seminar.registrations.length) * 100 : 0;
                                            return (
                                                <div key={i} className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                        <span className="text-gray-600">{stat.label}</span>
                                                        <span className="text-gray-900">{stat.count} ({Math.round(percentage)}%)</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${stat.color} transition-all duration-700`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-3xl font-black text-gray-900 leading-none">{seminar.registrations.length}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Applicants</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Seminar Logistics</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(seminar.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                            <p className="text-sm font-bold text-gray-900 truncate" title={seminar.venue || 'TBA'}>{seminar.venue || 'TBA'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Fee</p>
                                            <p className="text-sm font-bold text-gray-900">₱{seminar.fee?.toLocaleString() || '0'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capacity Used</p>
                                            <p className="text-sm font-bold text-gray-900">{seminar.registrations.length} Participants</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900 p-8 rounded-3xl shadow-xl flex flex-col justify-center relative overflow-hidden">
                                    <div className="relative z-10 text-center">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Event Countdown</p>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <p className="text-6xl font-black text-white">
                                                    {Math.max(0, Math.ceil((new Date(seminar.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                                                </p>
                                                <p className="text-[10px] font-black text-gray-500 uppercase mt-2">Days left</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Abstract background element */}
                                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'participants' && (
                        <SeminarParticipants registrations={seminar.registrations} seminarId={seminar.id} />
                    )}

                    {activeTab === 'check-in' && (
                        <SeminarScanner seminarId={seminar.id} />
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in duration-300">
                            <SeminarSettings seminar={seminar} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
