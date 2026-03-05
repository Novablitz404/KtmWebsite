import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import InviteOnboardingClient from './InviteOnboardingClient'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'

export default async function InvitePage({ params }: { params: { token: string } }) {
    const token = params.token
    if (!token) redirect('/')

    // 1. Check Co-Organizer Invites
    const coOrganizerInvite = await prisma.coOrganizerInvite.findUnique({
        where: { token },
        include: {
            organization: { select: { name: true } }
        }
    })

    if (coOrganizerInvite) {
        return (
            <div className="min-h-screen flex flex-col pt-20">
                <Navbar />
                <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
                    <InviteOnboardingClient
                        token={token}
                        email={coOrganizerInvite.email}
                        role="CO_ORGANIZER"
                        contextName={coOrganizerInvite.organization.name}
                        inviteId={coOrganizerInvite.id}
                    />
                </main>
                <Footer />
            </div>
        )
    }

    // 2. Check Tournament Manager Invites
    const managerInvite = await prisma.tournamentManagerInvite.findUnique({
        where: { token },
        include: {
            tournament: { select: { name: true } }
        }
    })

    if (managerInvite) {
        return (
            <div className="min-h-screen flex flex-col pt-20">
                <Navbar />
                <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
                    <InviteOnboardingClient
                        token={token}
                        email={managerInvite.email}
                        role="MANAGER"
                        contextName={managerInvite.tournament.name}
                        inviteId={managerInvite.id}
                    />
                </main>
                <Footer />
            </div>
        )
    }

    // 3. Invalid Token
    return (
        <div className="min-h-screen flex flex-col pt-20">
            <Navbar />
            <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite Link</h1>
                    <p className="text-gray-500 mb-6">
                        This invite link has expired or never existed. Please ask the organizer to invite you again.
                    </p>
                    <a href="/" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors">
                        Return Home
                    </a>
                </div>
            </main>
            <Footer />
        </div>
    )
}
