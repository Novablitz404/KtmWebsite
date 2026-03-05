import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrganizationPendingView from '@/components/organization/OrganizationPendingView'

export default async function OrganizationPendingPage() {
    const user = await getAuthUser()

    if (!user) {
        redirect('/sign-in')
    }

    const userEmail = user.email

    // Get the user and their organization
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
    })

    if (!dbUser || dbUser.role !== 'ORGANIZER') {
        redirect('/')
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
        where: { ownerId: dbUser.id },
        select: { name: true, status: true }
    })

    // If already approved, redirect to dashboard
    if (organization?.status === 'APPROVED') {
        redirect('/organization')
    }

    return (
        <OrganizationPendingView
            organizationName={organization?.name || 'Your Organization'}
            userEmail={userEmail || ''}
        />
    )
}
