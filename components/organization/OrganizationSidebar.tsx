'use client'

import { useAuth } from '@/app/providers/AuthProvider'
import { useTenant } from '@/app/providers/TenantProvider'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard, Building2, Calendar, Settings,
    LogOut, IdCard, DollarSign, Users, ChevronRight, LifeBuoy
} from 'lucide-react'

interface OrganizationSidebarProps {
    activeView: 'home' | 'clubs' | 'events' | 'athletes' | 'financials' | 'team' | 'settings' | 'support'
    onNavigate: (view: 'home' | 'clubs' | 'events' | 'athletes' | 'financials' | 'team' | 'settings' | 'support') => void
    orgName?: string
}

const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { id: 'home',       label: 'Dashboard',  icon: LayoutDashboard },
            // { id: 'financials', label: 'Financials',  icon: DollarSign },  // Hidden for now
        ],
    },
    {
        label: 'Management',
        items: [
            { id: 'clubs',    label: 'Affiliates', icon: Building2  },
            { id: 'events',   label: 'Events',     icon: Calendar   },
            { id: 'athletes', label: 'Athletes',   icon: IdCard     },
            { id: 'team',     label: 'Team',       icon: Users      },
        ],
    },
    {
        label: 'Admin',
        items: [
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'support', label: 'Support', icon: LifeBuoy },
        ],
    },
] as const

export default function OrganizationSidebar({
    activeView, onNavigate
}: OrganizationSidebarProps) {
    const { signOut } = useAuth()
    const router      = useRouter()
    const tenant      = useTenant()

    const handleLogout = async () => {
        await signOut()
        router.push('/')
    }

    return (
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-200/80 flex-col z-50">

            {/* Identity */}
            <div className="px-4 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                    {tenant.logoUrl ? (
                        <img
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            className="w-9 h-9 rounded-xl object-contain flex-shrink-0 border border-gray-100"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white font-black text-sm">
                                {(tenant.name || 'O').charAt(0)}
                            </span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 truncate leading-tight" title={tenant.name}>
                            {tenant.name}
                        </h2>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Organization Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Nav groups */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
                {NAV_SECTIONS.map(section => (
                    <div key={section.label}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1">
                            {section.label}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map(({ id, label, icon: Icon }) => {
                                const isActive = activeView === id
                                return (
                                    <button
                                        key={id}
                                        onClick={() => onNavigate(id as any)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all group ${
                                            isActive
                                                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon
                                            size={15}
                                            className={isActive ? 'text-white/90' : 'text-gray-400 group-hover:text-gray-600 transition-colors'}
                                        />
                                        <span className="flex-1 text-left">{label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-2 py-3 border-t border-gray-100 space-y-0.5">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all group"
                >
                    <LogOut size={15} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span>Log Out</span>
                </button>
                <p className="text-[9px] text-gray-300 font-medium px-3 pt-1">KTM System v1.0</p>
            </div>
        </aside>
    )
}
