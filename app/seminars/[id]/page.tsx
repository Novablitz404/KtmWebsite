import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import SeminarStatusActions from '@/components/organization/SeminarStatusActions'
// import EventRegistrationButton from '@/components/EventRegistrationButton'
import SeminarTabs from '@/components/seminar/SeminarTabs'
import PublicSeminarView from '@/components/PublicSeminarView'
// import ParticipantsTable from './ParticipantsTable' // I'll need to create this or make it generic later

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ManageSeminarPage({ params }: PageProps) {
    const { id } = await params
    const user = await currentUser()
    let dbUser = null

    if (user) {
        dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: {
                organization: true,
                club: true
            }
        })
    }

    // Optimized query with relations for the management tabs
    const seminar = await prisma.seminar.findUnique({
        where: { id },
        include: {
            registrations: {
                orderBy: { createdAt: 'desc' }
            },
            paymentMethods: true
        }
    })

    if (!seminar) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Seminar Not Found</h1>
                    <Link href="/" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                        Return to Home
                    </Link>
                </div>
            </div>
        )
    }

    // Verify ownership or public access
    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === seminar.organizationId
    const isAffiliatedClub = dbUser?.club?.organizationId === seminar.organizationId
    const isAffiliated = isAffiliatedClub

    const canManage = isOwner || isAdmin
    const isPublic = seminar.visibility === 'PUBLIC'
    // const canView = canManage || isPublic || isAffiliated // Allow everyone to view, but restrict actions

    // If manager, return the Tabbed Interface
    if (canManage) {
        // We need to cast the seminar to match the expected type because of how Prisma types work with includes
        // The component expects ExtendedSeminar which matches the query result structure
        return <SeminarTabs seminar={seminar as any} userRole={dbUser?.role} />
    }

    const isRestricted = !isPublic && !isAffiliated && !canManage

    // Public / Athlete View
    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <PublicSeminarView
                    seminar={seminar as any}
                    currentUserId={dbUser?.id}
                    isRestricted={isRestricted}
                    userRole={dbUser?.role}
                />
            </div>
        </main>
    )
}
