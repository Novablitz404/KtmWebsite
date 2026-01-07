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

    // Check for Invites to pre-fill content
    const userEmail = clerkUser.emailAddresses[0].emailAddress
    const clubAssistantInvite = await prisma.clubAssistantInvite.findUnique({ where: { email: userEmail } })
    const clubMasterInvite = await prisma.clubMasterInvite.findUnique({ where: { email: userEmail } })
    // We could check Organizer invite too to lock role, but usually Admin invites imply trust.

    let prefilledClubName = undefined
    let lockedRole = undefined

    if (clubAssistantInvite) {
        prefilledClubName = clubAssistantInvite.clubName
        lockedRole = 'ASSISTANT_CLUB_MASTER'
    } else if (clubMasterInvite) {
        prefilledClubName = clubMasterInvite.clubName
        lockedRole = 'CLUB_MASTER'
    }

    return <OnboardingForm
        clubs={clubs}
        prefilledClubName={prefilledClubName}
        lockedRole={lockedRole}
    />
}
