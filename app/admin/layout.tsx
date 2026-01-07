import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AdminShell from './AdminShell'

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
        <AdminShell
            user={{
                name: dbUser.name,
                email: dbUser.email
            }}
        >
            {children}
        </AdminShell>
    )
}
