import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import ParticipantsTable from './ParticipantsTable'
import PromotionStatusActions from '../PromotionStatusActions'

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
            include: { organization: true }
        })
    }

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id },
        include: {
            registrations: {
                orderBy: { createdAt: 'desc' }
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

    // Verify ownership or public access
    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === promotionTest.organizationId
    const canManage = isOwner || isAdmin
    const isPublic = promotionTest.visibility === 'PUBLIC'

    if (!canManage && !isPublic) {
        if (!user) {
            redirect('/sign-in')
        }
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                    <Link href="/" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
                        Return to Home
                    </Link>
                </div>
            </div>
        )
    }

    const statusConfig: Record<string, { bg: string, text: string }> = {
        UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700' },
        OPEN: { bg: 'bg-green-50', text: 'text-green-700' },
        CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
        COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
        CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' }
    }
    const statusStyle = statusConfig[promotionTest.status]

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-6">
                    <div>
                        <Link
                            href={canManage ? "/promotions" : "/"}
                            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            {canManage ? "Back to Promotions" : "Back to Home"}
                        </Link>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold text-gray-900">{promotionTest.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                        {promotionTest.status}
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
                                            {new Date(promotionTest.testDate).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    {promotionTest.venue && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>{promotionTest.venue}</span>
                                        </div>
                                    )}
                                    {promotionTest.fee && (
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            <span>₱{promotionTest.fee.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                {promotionTest.description && (
                                    <p className="mt-4 text-gray-600 max-w-2xl">{promotionTest.description}</p>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                {canManage && (
                                    <PromotionStatusActions promotionTestId={promotionTest.id} currentStatus={promotionTest.status} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Promotion Banner */}
                {promotionTest.bannerUrl && (
                    <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                        <img
                            src={promotionTest.bannerUrl}
                            alt={promotionTest.name}
                            className="w-full h-full object-cover"
                        />
                        {/* Optional: Add gradient overlay if you want text over it, but currently design separates text. 
                             Adding subtle gradient for polish anyway or just keeping it clean image.
                             Let's keep it clean image as the title is outside.
                         */}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Participants</p>
                                <p className="text-2xl font-bold text-gray-900">{promotionTest.registrations.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Participants Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">Participants</h2>
                    <ParticipantsTable registrations={promotionTest.registrations} readonly={!canManage} />
                </div>

            </div>
        </main>
    )
}
