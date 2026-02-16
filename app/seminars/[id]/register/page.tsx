
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import SeminarRegistrationForm from '@/components/seminars/SeminarRegistrationForm'
import SeminarQRCode from '@/components/seminars/SeminarQRCode'

interface Props {
    params: Promise<{ id: string }>
}

export default async function SeminarRegisterPage({ params }: Props) {
    const { id: seminarId } = await params

    const clerkUser = await currentUser()
    if (!clerkUser) {
        redirect('/sign-in')
    }

    // Get user profile
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Fetch seminar
    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId }
    })

    if (!seminar) {
        notFound()
    }

    // Check if user already registered
    const players = await prisma.player.findMany({
        where: { userId: dbUser.id },
        select: { id: true }
    })

    if (players.length > 0) {
        const existing = await prisma.seminarRegistration.findFirst({
            where: {
                seminarId,
                playerId: { in: players.map(p => p.id) }
            }
        })

        if (existing) {
            const statusConfig = existing.status === 'APPROVED'
                ? { icon: <CheckCircle className="w-8 h-8" />, color: 'green', label: 'Approved', bg: 'bg-green-100 text-green-600' }
                : existing.status === 'REJECTED'
                    ? { icon: <XCircle className="w-8 h-8" />, color: 'red', label: 'Rejected', bg: 'bg-red-100 text-red-600' }
                    : { icon: <Clock className="w-8 h-8" />, color: 'amber', label: 'Pending Approval', bg: 'bg-amber-100 text-amber-600' }

            return (
                <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
                        <div className={`w-16 h-16 ${statusConfig.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                            {statusConfig.icon}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Registration {statusConfig.label}</h1>

                        {existing.status === 'APPROVED' && existing.qrCodeToken ? (
                            <div className="space-y-4">
                                <p className="text-gray-500 text-sm">Your registration has been approved! Present this QR code at the event.</p>
                                <SeminarQRCode
                                    token={existing.qrCodeToken}
                                    playerName={existing.playerName}
                                    seminarName={seminar.name}
                                />
                            </div>
                        ) : existing.status === 'PENDING' ? (
                            <p className="text-gray-500 mb-6">Your registration is pending approval from your club master. You&apos;ll receive a QR code once approved.</p>
                        ) : (
                            <p className="text-gray-500 mb-6">Your registration has been reviewed. Please contact your club master for details.</p>
                        )}

                        <Link
                            href="/athlete"
                            className="inline-block mt-4 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </main>
            )
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 py-12 relative">
            <div className="absolute top-6 left-6 md:top-12 md:left-12">
                <Link
                    href="/athlete"
                    className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-0">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{seminar.name}</h1>
                    <p className="text-gray-500">Registration</p>
                </div>

                <SeminarRegistrationForm
                    seminar={{
                        id: seminar.id,
                        name: seminar.name,
                        fee: seminar.fee,
                    }}
                    user={{
                        name: dbUser.name,
                        email: dbUser.email
                    }}
                />
            </div>
        </main>
    )
}
