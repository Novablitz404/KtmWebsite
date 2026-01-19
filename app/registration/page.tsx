import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getClubHomeData } from '../club/data'
import ClubRegistrationView from '@/components/club/ClubRegistrationView'

export default async function ClubRegistrationPage() {
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user and club
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            clubName: true,
            club: {
                select: {
                    id: true,
                    name: true,
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    let targetClub = dbUser.club
    if (!targetClub && dbUser.role === 'ASSISTANT_CLUB_MASTER' && dbUser.clubName) {
        targetClub = await prisma.club.findFirst({
            where: { name: dbUser.clubName },
            select: { id: true, name: true }
        })
    }

    if ((dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER') || !targetClub) {
        redirect('/club')
    }

    // Fetch Data
    // We now fetch data client-side via TanStack Query in ClubRegistrationView
    // const data = await getClubHomeData(targetClub.id, targetClub.name)

    return (
        <ClubRegistrationView
            clubId={targetClub.id}
            clubName={targetClub.name}
            avatars={{}}
        />
    )
}
