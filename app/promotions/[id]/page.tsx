import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import PromotionTabs from '@/components/promotion/PromotionTabs'
import WaiverRegistration from '@/components/promotion/WaiverRegistration'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ManagePromotionPage({ params }: PageProps) {
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

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id },
        include: {
            registrations: {
                orderBy: { createdAt: 'desc' }
            },
            organization: {
                select: { defaultBeltFees: true }
            }
        }
    })

    if (!promotionTest) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Promotion Test Not Found</h1>
                    <Link href="/" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                        Return to Home
                    </Link>
                </div>
            </div>
        )
    }

    // Verify ownership or admin access
    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === promotionTest.organizationId

    // Check org family affiliation (parent-child org hierarchy)
    let isAffiliated = false

    // For athletes: club relation only exists for club masters.
    // Athletes connect via clubName, so look up the club by name.
    const userClub = dbUser?.club || (dbUser?.clubName
        ? await prisma.club.findFirst({
            where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
            select: { id: true, organizationId: true }
        })
        : null)

    if (userClub?.organizationId) {
        const clubOrgId = userClub.organizationId

        // Direct match
        if (clubOrgId === promotionTest.organizationId) {
            isAffiliated = true
        } else {
            const clubOrg = await prisma.organization.findUnique({
                where: { id: clubOrgId },
                select: { id: true, parentOrganizationId: true }
            })
            const promotionOrg = await prisma.organization.findUnique({
                where: { id: promotionTest.organizationId },
                select: { id: true, parentOrganizationId: true }
            })

            if (clubOrg && promotionOrg) {
                const clubRoot = clubOrg.parentOrganizationId || clubOrg.id
                const promoRoot = promotionOrg.parentOrganizationId || promotionOrg.id

                if (clubRoot === promoRoot) {
                    isAffiliated = true
                }
            }
        }
    }

    const canManage = isOwner || isAdmin

    // Access Rule: promotions are internal-only
    const canView = canManage || isAffiliated

    if (!canView) {
        if (!user) {
            redirect('/sign-in')
        }
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Private Event</h1>
                        <p className="text-gray-500 mb-6">
                            This promotion test is private. Only members of affiliated clubs can view and register.
                        </p>
                        <div className="space-y-3">
                            <Link href="/" className="block w-full py-2 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                                Return to Home
                            </Link>
                            {!isAffiliated && dbUser?.club && (
                                <p className="text-xs text-gray-400">
                                    Your club ({dbUser.club.name}) is not affiliated with this organization.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // If manager, return the Tabbed Interface (same layout as seminar management)
    if (canManage) {
        return <PromotionTabs promotionTest={promotionTest as any} userRole={dbUser?.role} defaultBeltFees={(promotionTest as any).organization?.defaultBeltFees} />
    }

    // Athlete / Clubmaster View — Professional registration page
    const userRegistration = promotionTest.registrations.find(r => r.playerId === dbUser?.id)
    const registrationCount = promotionTest.registrations.length
    const deadlinePassed = promotionTest.registrationDeadline && new Date() > new Date(promotionTest.registrationDeadline)
    const isOpen = promotionTest.status === 'OPEN' || promotionTest.status === 'UPCOMING'

    return (
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                <Link
                    href="/athlete"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>

                {/* Hero Header */}
                <div className="relative rounded-2xl overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 p-8 md:p-10">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isOpen
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                    }`}>
                                    {promotionTest.status === 'UPCOMING' ? '📋 Upcoming' :
                                        promotionTest.status === 'OPEN' ? '✅ Open for Registration' :
                                            promotionTest.status === 'CLOSED' ? '🔒 Registration Closed' :
                                                promotionTest.status === 'COMPLETED' ? '🏆 Completed' : promotionTest.status}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                                {promotionTest.name}
                            </h1>
                            <p className="text-gray-300 text-sm">Belt Promotion Examination</p>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Date</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                            {new Date(promotionTest.testDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Venue</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{promotionTest.venue || 'TBA'}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Payment</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">Pay to Clubmaster</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Registered</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{registrationCount} athletes</p>
                    </div>
                </div>


                {/* Registration Card — deadline + how-to + waiver combined */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6">
                        <WaiverRegistration
                            eventId={promotionTest.id}
                            isRegistered={!!userRegistration}
                            status={userRegistration?.status}
                            paymentStatus={userRegistration?.paymentStatus}
                            disabled={!isOpen || !!deadlinePassed}
                            isOpen={isOpen}
                            registrationDeadline={promotionTest.registrationDeadline ? new Date(promotionTest.registrationDeadline).toISOString() : undefined}
                            deadlinePassed={!!deadlinePassed}
                        />
                    </div>
                </div>

            </div>
        </main>
    )
}
