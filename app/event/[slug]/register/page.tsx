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
            status: true,
            regularPrice: true,
            earlyBirdPrice: true,
            earlyBirdDeadline: true,
            registrationStart: true,
            registrationEnd: true,
            headerImageUrl: true,
            categoryPricing: true,
            currency: true,
        }
    })

    if (!tournament) notFound()

    // Check registration window/status — this mirrors app/tournament/[id]/register's
    // own guard. The API route enforces this too (a direct POST can't bypass it),
    // but without this the form would stay live and misleadingly usable here.
    const registrationCheckNow = new Date()
    if (tournament.status === 'CANCELLED' || tournament.status === 'COMPLETED') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-red-900 mb-2">Registration Not Available</h2>
                        <p className="text-red-700">
                            {tournament.status === 'CANCELLED'
                                ? 'This tournament has been cancelled.'
                                : 'This tournament is already completed.'}
                        </p>
                    </div>
                </div>
            </main>
        )
    }
    if (tournament.registrationStart && registrationCheckNow < tournament.registrationStart) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-blue-900 mb-2">Opening Soon</h2>
                        <p className="text-blue-700 mb-4">Registration for this tournament has not started yet.</p>
                        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-blue-100 text-blue-800 font-medium">
                            Opens: {tournament.registrationStart.toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </main>
        )
    }
    if (tournament.registrationEnd && registrationCheckNow > tournament.registrationEnd) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2 flex flex-col items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-red-900 mb-2">Registration Closed</h2>
                        <p className="text-red-700 mb-4">The deadline for this tournament has passed.</p>
                        <div className="inline-block bg-white px-4 py-2 rounded-lg border border-red-100 text-red-800 font-medium">
                            Closed: {tournament.registrationEnd.toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // Fetch clubs for the searchable dropdown
    const clubs = await prisma.club.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    })

    // Fetch categories for manual selection
    const categories = await prisma.category.findMany({
        where: { tournamentId: tournament.id },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
    })

    // Determine current price tier
    const now = new Date()
    const isEarlyBird = !!(tournament.earlyBirdDeadline && now < tournament.earlyBirdDeadline)

    // Resolve a "default" display price for the payment step.
    // If the tournament uses per-category pricing (categoryPricing JSON), pick the
    // KYORUGI_INDIVIDUAL entry as a baseline; the form will recalculate the real
    // price after category detection.
    let currentPrice = 0
    if (tournament.regularPrice) {
        currentPrice = isEarlyBird ? (tournament.earlyBirdPrice ?? tournament.regularPrice) : tournament.regularPrice
    } else if (tournament.categoryPricing) {
        const catMap = tournament.categoryPricing as Record<string, { regular: number; earlyBird?: number }>
        const defaultEntry = catMap['KYORUGI_INDIVIDUAL'] ?? Object.values(catMap)[0]
        if (defaultEntry) {
            currentPrice = isEarlyBird && defaultEntry.earlyBird ? defaultEntry.earlyBird : defaultEntry.regular
        }
    }

    const paymentConfirmed = search.payment === 'success'

    return (
        <GuestRegistrationForm
            tournament={{
                id: tournament.id,
                name: tournament.name,
                currentPrice,
                isEarlyBird,
                regularPrice: tournament.regularPrice,
                earlyBirdPrice: tournament.earlyBirdPrice,
                categoryPricing: tournament.categoryPricing as Record<string, { regular: number; earlyBird?: number }> | null,
                currency: tournament.currency ?? 'PHP',
            }}
            clubs={clubs}
            categories={categories}
            eventSlug={slug}
            paymentConfirmed={paymentConfirmed}
            registrationId={search.registrationId}
        />
    )
}
