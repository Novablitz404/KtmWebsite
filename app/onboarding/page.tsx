import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
    })

    if (existingUser) {
        redirect('/')
    }

    // Fetch all clubs for dropdown
    const clubs = await prisma.club.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    return <OnboardingForm clubs={clubs} />
}
