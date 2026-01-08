import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'
import ClubMasterOnboardingForm from './ClubMasterOnboardingForm'

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

    const userEmail = clerkUser.emailAddresses[0].emailAddress

    // Check for Club Master Invite first - they get a different onboarding flow
    const clubMasterInvite = await prisma.clubMasterInvite.findUnique({ where: { email: userEmail } })
    if (clubMasterInvite) {
        return <ClubMasterOnboardingForm />
    }

    // Fetch all clubs for dropdown (for athletes)
    const clubs = await prisma.club.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    // Check for other Invites to pre-fill content
    const clubAssistantInvite = await prisma.clubAssistantInvite.findUnique({ where: { email: userEmail } })

    let prefilledClubName = undefined
    let lockedRole = undefined

    if (clubAssistantInvite) {
        prefilledClubName = clubAssistantInvite.clubName
        lockedRole = 'ASSISTANT_CLUB_MASTER'
    }

    return <OnboardingForm
        clubs={clubs}
        prefilledClubName={prefilledClubName}
        lockedRole={lockedRole}
    />
}

