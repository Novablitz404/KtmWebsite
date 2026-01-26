import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import OrganizationPendingView from '@/components/organization/OrganizationPendingView'

export default async function OrganizationPendingPage() {
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    const userEmail = user.emailAddresses[0]?.emailAddress

    // Get the user and their organization
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
