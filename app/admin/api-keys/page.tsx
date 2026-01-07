import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ApiKeyList from './ApiKeyList'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function ApiKeysPage() {
    const user = await currentUser()
    if (!user) return redirect('/sign-in')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id }
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
        return redirect('/')
    }

    // 1. Fetch Keys
    const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            owner: {
                select: { id: true, name: true, email: true }
            }
        }
    })

    // 2. Fetch Potential Owners (Organizers & Admins)
    const organizers = await prisma.user.findMany({
        where: {
            OR: [
                { role: 'ORGANIZER' },
                { role: 'ADMIN' }
            ]
        },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' }
    })

    // 3. Format keys for client
    const serializedKeys = keys.map(k => ({
        ...k,
        // Ensure serialization of dates
        createdAt: k.createdAt, // passed as Date, Client components handle it or serialize automatically in Next.js 13+?
        // Actually Next.js Server Components -> Client Components passes Date as Date? No, JSON serializable.
        // But recent Next.js versions are smarter. Let's pass as Date.
        // If it errors with "Date cannot be passed to Client Component", we fix.
        // Usually safer to .toISOString() or similar if unsure.
        // But keys.map returns new objects. The props interface expects Date.
        // Let's try passing Date.
    }))

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link href="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-4 transition">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Admin Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Access Key Management</h1>
                    <p className="mt-2 text-slate-600 max-w-2xl">
                        Manage API keys for external applications (e.g. Electron Scoring App).
                        These keys allow Organizers to connect securely without logging in.
                    </p>
                </div>

                <ApiKeyList initialKeys={serializedKeys} users={organizers} />
            </div>
        </div>
    )
}
