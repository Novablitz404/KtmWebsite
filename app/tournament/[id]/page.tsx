import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TournamentTabs from '@/components/TournamentTabs'

import { currentUser } from '@clerk/nextjs/server'

export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await currentUser()
    let currentUserId = undefined

    if (user) {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { id: true }
        })
        currentUserId = dbUser?.id
    }

    // Optimized query: include relations but only select needed fields where possible
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            categories: {
                include: {
                    matches: {
                        orderBy: { round: 'asc' }
                    }
                },
                orderBy: { name: 'asc' }
            },
            guidelineTemplate: true,
            managers: true
        }
    })

    if (!tournament) return notFound()

    // Pass data to client component with managers and currentUserId
    const tournamentWithData = {
        ...tournament,
        currentUserId
    }

    // Fetch players - use select for nested relations
    const players = await prisma.player.findMany({
        where: {
            category: {
                tournamentId: id
            }
        },
        include: {
            category: {
                select: { id: true, name: true, type: true, tournamentId: true, court: true }
            },
            club: {
                select: { id: true, name: true }
            }
        },
        orderBy: {
            category: {
                name: 'asc'
            }
        }
    })

    // Fetch available guideline templates (minimal fields)
    const availableTemplates = await prisma.guidelineTemplate.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <header className="mb-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <a href="/" className="hover:text-blue-600">Home</a>
                        <span>/</span>
                        <span>Tournament</span>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {tournament.name}
                            </h1>
                            <p className="mt-2 text-lg text-gray-600">
                                {new Date(tournament.startDate).toLocaleDateString()}
                            </p>
                            {tournament.guidelineTemplate && (
                                <p className="mt-1 text-sm text-indigo-600">
                                    📋 {tournament.guidelineTemplate.name}
                                </p>
                            )}
                        </div>
                    </div>
                </header>

                <TournamentTabs
                    tournament={tournamentWithData}
                    players={players}
                    availableTemplates={availableTemplates}
                />
            </div>
        </main>
    )
}
