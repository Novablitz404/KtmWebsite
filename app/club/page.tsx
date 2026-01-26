import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClubDashboard from './ClubDashboard'
import { Suspense } from 'react'
import ClubMembersTabContent from '@/components/club/ClubMembersTabContent'
import MembersSkeleton from '@/components/skeletons/MembersSkeleton'
import ClubPendingView from '@/components/club/ClubPendingView'

import ClubMasterProfileView from '@/app/settings/ClubMasterProfileView'

// Revalidate every 30 seconds for faster page loads
export const revalidate = 30

export default async function ClubPage(props: { searchParams: Promise<{ page?: string; search?: string }> }) {
    const searchParams = await props.searchParams
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user with minimal data needed (Auth Check)
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            club: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    address: true,
                    phone: true,
                    status: true,
                    organization: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Check if user is a club master or assistant
    let targetClub = dbUser.club
    if (!targetClub && dbUser.role === 'ASSISTANT_CLUB_MASTER' && dbUser.clubName) {
        targetClub = await prisma.club.findFirst({
            where: { name: dbUser.clubName },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                address: true,
                phone: true,
                status: true,
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        })
    }

    // Check for PENDING status first
    if (targetClub && targetClub.status === 'PENDING') {
        return (
            <ClubPendingView
                organizationName={targetClub.organization?.name}
                userEmail={dbUser.email}
            />
        )
    }

    if ((dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER') || !targetClub) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <p className="text-4xl mb-4">🏫</p>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Club Management Access Only</h1>
                        <p className="text-gray-600">
                            This page is only accessible to Club Masters and Assistants.
                        </p>
                        <a href="/profile" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
                            Go to Profile →
                        </a>
                    </div>
                </div>
            </main>
        )
    }

    // Pagination Params
    const currentPage = Number(searchParams.page) || 1
    const searchQuery = searchParams.search || ''
    const pageSize = 10


    // Render Dashboard with Streams
    return (
        <main className="min-h-screen bg-gray-50">
            <div>
                <ClubDashboard
                    // Essential Props
                    clubId={targetClub.id}
                    clubName={targetClub.name}
                    clubLogo={targetClub.logoUrl}
                    clubAddress={targetClub.address}
                    clubPhone={targetClub.phone}
                    userRole={dbUser.role}
                    userData={{
                        ...dbUser,
                        name: dbUser.name,
                        email: dbUser.email,
                        clubName: dbUser.clubName,
                        belt: dbUser.belt,
                        gender: dbUser.gender,
                        weight: dbUser.weight,
                        height: dbUser.height,
                        birthDate: dbUser.birthDate,
                    }}
                    clerkImageUrl={clerkUser.imageUrl}

                    // Legacy Props (Passed as empty/null since new contents supersede them)
                    pendingPlayers={[]}
                    approvedPlayers={[]}
                    clubTournaments={[]}
                    avatars={{}}
                    membersData={undefined}
                    pagination={{ currentPage: 1, pageSize: 8, totalPages: 1 }}

                    // Streamed Content
                    // homeDataPromise removed for client-side fetching


                    settingsContent={
                        <ClubMasterProfileView
                            dbUser={dbUser}
                            clerkImageUrl={clerkUser.imageUrl}
                        />
                    }
                />
            </div>
        </main>
    )
}
