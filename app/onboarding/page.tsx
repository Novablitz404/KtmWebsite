import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './OnboardingForm'
import ClubMasterOnboardingForm from './ClubMasterOnboardingForm'

export default async function OnboardingPage(props: { searchParams: Promise<{ role?: string }> }) {
    const searchParams = await props.searchParams
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

    // Fetch all clubs for dropdown (for athletes)
    const clubs = await prisma.club.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    // Fetch all organizations for dropdown (for club masters)
    const organizations = await prisma.organization.findMany({
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

    // Allow manual navigation or invite based access
    if (clubMasterInvite || searchParams.role === 'club_master') {
        return <ClubMasterOnboardingForm organizations={organizations} />
    }

    return <OnboardingForm
        clubs={clubs}
        prefilledClubName={prefilledClubName}
        lockedRole={lockedRole}
    />
}

