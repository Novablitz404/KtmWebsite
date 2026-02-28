'use client'

import { useState } from 'react'
import { PromotionTest, PromotionTestRegistration } from '@prisma/client'
import { LayoutDashboard, Users, Settings, ArrowLeft, Menu, Calendar, MapPin, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import ParticipantsTable from '@/app/promotions/[id]/ParticipantsTable'
import PromotionSettings from '@/components/promotion/PromotionSettings'

type ExtendedPromotionTest = PromotionTest & {
    registrations: PromotionTestRegistration[]
}

interface PromotionTabsProps {
    promotionTest: ExtendedPromotionTest
    userRole?: string
    defaultBeltFees?: any
}

// Belt tiers: Grouping belts for fee calculation
const WHITE_TO_PURPLE_BELTS = ['white', 'yellow', 'orange', 'green', 'purple']
const BLUE_TO_BROWN_BELTS = ['blue', 'maroon', 'red', 'brown']

function getRegistrationFee(currentBelt: string | null | undefined, defaultBeltFees: any): number {
    if (!currentBelt || !defaultBeltFees) return 0
    const belt = currentBelt.toLowerCase()
    if (WHITE_TO_PURPLE_BELTS.includes(belt)) return Number(defaultBeltFees.whiteToPurple) || 0
    if (BLUE_TO_BROWN_BELTS.includes(belt)) return Number(defaultBeltFees.blueToBrown) || 0
    return 0
}

function calculateTotalFees(registrations: any[], defaultBeltFees: any): number {
    return registrations.reduce((sum, r) => sum + getRegistrationFee(r.currentBelt, defaultBeltFees), 0)
}

export default function PromotionTabs({ promotionTest, userRole, defaultBeltFees }: PromotionTabsProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const activeTab = (searchParams.get('tab') as 'overview' | 'participants' | 'settings') || 'overview'
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams)
        params.set('tab', tabId)
        router.push(`${pathname}?${params.toString()}`)
        setSidebarOpen(false)
    }

    const approvedCount = promotionTest.registrations.filter(r => r.status === 'APPROVED').length
    const pendingCount = promotionTest.registrations.filter(r => r.status === 'PENDING').length
    const passedCount = promotionTest.registrations.filter(r => r.status === 'PASSED').length
    const failedCount = promotionTest.registrations.filter(r => r.status === 'FAILED').length
    const totalCount = promotionTest.registrations.length

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
                            href={userRole === 'ADMIN' ? '/admin' : '/organization?tab=events'}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            {userRole === 'ADMIN' ? 'Back to Admin' : 'Back to Events'}
                        </Link>

                        <div>
                            <h2 className="font-bold text-gray-900 truncate" title={promotionTest.name}>{promotionTest.name}</h2>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(promotionTest.testDate).toLocaleDateString()}
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
                                        ? 'bg-amber-50 text-amber-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
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
                    <span className="font-semibold ml-2 text-gray-900 truncate">{promotionTest.name}</span>
                </div>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in duration-300 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Promotion Dashboard</h1>
                                    <p className="text-gray-500 font-medium pt-1">Registration metrics and test details.</p>
                                </div>
                                <div className="flex items-center gap-2 px-6 py-2 bg-gray-900 rounded-full shadow-lg">
                                    <div className={`w-2 h-2 rounded-full ${promotionTest.status === 'OPEN' ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
                                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{promotionTest.status}</span>
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
                                                ₱{calculateTotalFees(
                                                    promotionTest.registrations.filter(r => ['APPROVED', 'PASSED', 'FAILED'].includes(r.status)),
                                                    defaultBeltFees
                                                ).toLocaleString()}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-2 font-medium">
                                                Based on {approvedCount} approved registrations out of ₱{calculateTotalFees(
                                                    promotionTest.registrations,
                                                    defaultBeltFees
                                                ).toLocaleString()} potential.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Approval Rate */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-gray-400">Approval Rate</span>
                                            <span className="text-gray-900">
                                                {totalCount > 0
                                                    ? Math.round((approvedCount / totalCount) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-gray-900 transition-all duration-1000 ease-out"
                                                style={{ width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 pt-2">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Confirmed</p>
                                                <p className="text-base font-bold text-gray-900">₱{calculateTotalFees(
                                                    promotionTest.registrations.filter(r => ['APPROVED', 'PASSED', 'FAILED'].includes(r.status)),
                                                    defaultBeltFees
                                                ).toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
                                                <p className="text-base font-bold text-gray-300">₱{calculateTotalFees(
                                                    promotionTest.registrations.filter(r => r.status === 'PENDING'),
                                                    defaultBeltFees
                                                ).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Registration Status Breakdown */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Registration Status</p>

                                    <div className="flex flex-col gap-4 h-[140px] justify-center">
                                        {[
                                            { label: 'Approved', count: approvedCount, color: 'bg-green-500' },
                                            { label: 'Pending', count: pendingCount, color: 'bg-amber-500' },
                                            { label: 'Passed', count: passedCount, color: 'bg-blue-500' },
                                            { label: 'Failed', count: failedCount, color: 'bg-red-500' }
                                        ].map((stat, i) => {
                                            const percentage = totalCount > 0 ? (stat.count / totalCount) * 100 : 0;
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
                                            <p className="text-3xl font-black text-gray-900 leading-none">{totalCount}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Applicants</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Promotion Details</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Test Date</p>
                                            <p className="text-sm font-bold text-gray-900">{new Date(promotionTest.testDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                            <p className="text-sm font-bold text-gray-900 truncate" title={promotionTest.venue || 'TBA'}>{promotionTest.venue || 'TBA'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">White → Purple Fee</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {defaultBeltFees?.whiteToPurple ? `₱${Number(defaultBeltFees.whiteToPurple).toLocaleString()}` : 'Not set'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Blue → Brown Fee</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {defaultBeltFees?.blueToBrown ? `₱${Number(defaultBeltFees.blueToBrown).toLocaleString()}` : 'Not set'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registrants</p>
                                            <p className="text-sm font-bold text-gray-900">{totalCount} Participants</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-900 p-8 rounded-3xl shadow-xl flex flex-col justify-center relative overflow-hidden">
                                    <div className="relative z-10 text-center">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Event Countdown</p>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <p className="text-6xl font-black text-white">
                                                    {Math.max(0, Math.ceil((new Date(promotionTest.testDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
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
                        <div className="animate-in fade-in duration-300 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Participants</h1>
                                    <p className="text-gray-500 font-medium pt-1">View registrations and participant status.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/promotions/${promotionTest.id}/examiner`
                                        navigator.clipboard.writeText(url)
                                        alert('Examiner link copied to clipboard!')
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    Copy Examiner Link
                                </button>
                            </div>
                            <ParticipantsTable registrations={promotionTest.registrations as any} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-in fade-in duration-300">
                            <PromotionSettings promotionTest={promotionTest} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
