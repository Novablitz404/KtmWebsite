'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import { getSidebarStats } from './actions'

interface AdminShellProps {
    children: React.ReactNode
    user: {
        name: string | null
        email: string
    }
}

export default function AdminShell({ children, user }: AdminShellProps) {
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [stats, setStats] = useState({ users: 0, tournaments: 0, apiKeys: 0 })
    const pathname = usePathname()
    const router = useRouter()

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false)
    }, [pathname])

    // Initial Fetch
    useEffect(() => {
        getSidebarStats().then(setStats)
    }, [])

    // Realtime Subscriptions
    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) return

        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)

        const refreshStats = () => {
            getSidebarStats().then(setStats)
            router.refresh() // Soft reload main content
        }

        const channel = supabase.channel('admin-global-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'User' }, refreshStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Tournament' }, refreshStats)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ApiKey' }, refreshStats)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out transform
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between lg:justify-start gap-3">
                    <div className="flex items-center gap-3">
                        <img src="/KTMLogo.png" alt="KTM Logo" className="w-8 h-8 object-contain bg-white rounded-md" />
                        <span className="text-xl font-bold tracking-tight">KTM Admin</span>
                    </div>
                    {/* Close Button (Mobile Only) */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <SidebarItem href="/admin" label="Stats Dashboard" active={pathname === '/admin'} />
                    <SidebarItem href="/admin/users" label="User Management" active={pathname?.startsWith('/admin/users')} count={stats.users} />
                    <SidebarItem href="/admin/tournaments" label="Tournaments" active={pathname?.startsWith('/admin/tournaments')} count={stats.tournaments} />
                    <SidebarItem href="/admin/api-keys" label="Access Keys" active={pathname?.startsWith('/admin/api-keys')} count={stats.apiKeys} />
                    <SidebarItem href="/admin/profile" label="Profile" active={pathname?.startsWith('/admin/profile')} />
                </nav>

                {/* User Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-950/50">
                    <div className="flex items-center gap-3">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-10 h-10 border-2 border-gray-600"
                                }
                            }}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-white truncate">{user.name || 'Admin'}</p>
                                    <p className="text-xs text-gray-400">Super Admin</p>
                                </div>
                                <SignOutButton>
                                    <button className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Log Out">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                    </button>
                                </SignOutButton>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-200 flex items-center px-4 py-3 shadow-sm z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-3 font-semibold text-gray-900">Admin Dashboard</span>
                </header>

                {/* Main Content Scroll Area */}
                <main className="flex-1 overflow-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

function SidebarItem({ href, label, active, count }: { href: string, label: string, active?: boolean, count?: number }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${active
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
        >
            <span className="font-medium flex-1">{label}</span>
            {count !== undefined && count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300 group-hover:bg-gray-600'}`}>
                    {count}
                </span>
            )}
        </Link>
    )
}
