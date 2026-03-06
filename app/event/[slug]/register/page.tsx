import { prisma } from '@/lib/prisma'
import { getEventConfig } from '@/lib/event-config'
import { notFound } from 'next/navigation'
import GuestRegistrationForm from './GuestRegistrationForm'

interface PageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ payment?: string; registrationId?: string }>
}

export default async function EventRegisterPage({ params, searchParams }: PageProps) {
    const { slug } = await params
    const search = await searchParams

    const config = getEventConfig(slug)
    if (!config) notFound()

    // Fetch tournament data
    const tournament = await prisma.tournament.findUnique({
        where: { id: config.tournamentId },
        select: {
            id: true,
            name: true,
            xenditEnabled: true,
            regularPrice: true,
            earlyBirdPrice: true,
            earlyBirdDeadline: true,
            registrationEnd: true,
            headerImageUrl: true,
        }
    })

    if (!tournament) notFound()

    // Fetch clubs for the searchable dropdown
    const clubs = await prisma.club.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    // Determine current price tier
    const now = new Date()
    const isEarlyBird = tournament.earlyBirdDeadline && now < tournament.earlyBirdDeadline
    const currentPrice = isEarlyBird ? (tournament.earlyBirdPrice || tournament.regularPrice || 0) : (tournament.regularPrice || 0)

    // Check if payment just completed (redirect from Xendit)
    const paymentConfirmed = search.payment === 'success'

    return (
        <GuestRegistrationForm
            tournament={{
                id: tournament.id,
                name: tournament.name,
                xenditEnabled: tournament.xenditEnabled,
                currentPrice,
                isEarlyBird: !!isEarlyBird,
                regularPrice: tournament.regularPrice,
                earlyBirdPrice: tournament.earlyBirdPrice,
            }}
            clubs={clubs}
            eventSlug={slug}
            paymentConfirmed={paymentConfirmed}
            registrationId={search.registrationId}
        />
    )
}
