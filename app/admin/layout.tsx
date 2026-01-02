import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { UserButton, SignOutButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (dbUser?.role !== 'ADMIN') redirect('/')

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-56 bg-gray-900 text-white flex flex-col shadow-xl">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <img src="/KTMLogo.png" alt="KTM Logo" className="w-8 h-8 object-contain bg-white rounded-md" />
                    <span className="text-xl font-bold tracking-tight">KTM Admin</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <SidebarItem href="/admin" label="Stats Dashboard" />
                    <SidebarItem href="/admin/users" label="User Management" />
                    <SidebarItem href="/admin/tournaments" label="Tournaments" />
                    <SidebarItem href="/admin/profile" label="Profile" />
                </nav>

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
                                    <p className="text-sm font-medium text-white truncate">{dbUser.name}</p>
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

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}

function SidebarItem({ href, label }: { href: string, label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all group"
        >
            <span className="font-medium">{label}</span>
        </Link>
    )
}
