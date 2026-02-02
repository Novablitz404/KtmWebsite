import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import SeminarStatusActions from '@/components/organization/SeminarStatusActions'
import EventRegistrationButton from '@/components/EventRegistrationButton'
import SeminarTabs from '@/components/seminar/SeminarTabs'
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
            }
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
    const canView = canManage || isPublic || isAffiliated

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
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Private Seminar</h1>
                        <p className="text-gray-500 mb-6">
                            This seminar is private. Only members of affiliated clubs can view and register.
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

    // If manager, return the Tabbed Interface
    if (canManage) {
        // We need to cast the seminar to match the expected type because of how Prisma types work with includes
        // The component expects ExtendedSeminar which matches the query result structure
        return <SeminarTabs seminar={seminar as any} />
    }

    // Public / Athlete View
    const statusConfig: Record<string, { bg: string, text: string }> = {
        UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700' },
        OPEN: { bg: 'bg-green-50', text: 'text-green-700' },
        CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
        COMPLETED: { bg: 'bg-purple-50', text: 'text-purple-700' },
        CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' }
    }
    const statusStyle = statusConfig[seminar.status] || statusConfig.UPCOMING

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Return
                        </Link>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-gray-900">{seminar.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                        {seminar.status}
                                    </span>
                                    {isPublic && (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                                            Public Event
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-gray-600 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>
                                            {new Date(seminar.startDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    {seminar.venue && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>{seminar.venue}</span>
                                        </div>
                                    )}
                                    {seminar.fee && (
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <span>₱{seminar.fee.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                {seminar.description && (
                                    <p className="mt-4 text-gray-600 max-w-2xl">{seminar.description}</p>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <EventRegistrationButton
                                    eventId={seminar.id}
                                    eventType="seminar"
                                    isRegistered={!!seminar.registrations.find(r => r.playerId === dbUser?.id)}
                                    status={seminar.registrations.find(r => r.playerId === dbUser?.id)?.status}
                                    paymentStatus={seminar.registrations.find(r => r.playerId === dbUser?.id)?.paymentStatus}
                                    disabled={seminar.status !== 'OPEN' && seminar.status !== 'UPCOMING'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seminar Banner */}
                {seminar.bannerUrl && (
                    <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                        <img
                            src={seminar.bannerUrl}
                            alt={seminar.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Registered</p>
                                <p className="text-2xl font-bold text-gray-900">{seminar.registrations.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
