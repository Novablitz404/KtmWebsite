import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import OrganizationDashboard from './OrganizationDashboard'

export default async function OrganizationPage() {
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    // Role verification
    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id }, select: { role: true } })

    if (!dbUser || (dbUser.role !== 'ORGANIZER' && dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
        redirect('/')
    }

    return (
        <OrganizationDashboard
            initialData={null}
            userRole={dbUser?.role}
        />
    )
}

