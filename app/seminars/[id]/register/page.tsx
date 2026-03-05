
import { getAuthUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, XCircle, Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import SeminarRegistrationForm from '@/components/seminars/SeminarRegistrationForm'
import SeminarQRCode from '@/components/seminars/SeminarQRCode'

interface Props {
    params: Promise<{ id: string }>
}

export default async function SeminarRegisterPage({ params }: Props) {
    const { id: seminarId } = await params

    const dbUser = await getAuthUser()
    if (!dbUser) {
        redirect('/sign-in')
    }

    // Fetch seminar with registration count
    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId },
        include: {
            _count: { select: { registrations: true } }
        }
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

    const isOpen = seminar.status === 'OPEN' || seminar.status === 'UPCOMING'
    const deadlinePassed = seminar.registrationDeadline && new Date() > new Date(seminar.registrationDeadline)
    const registrationCount = seminar._count.registrations

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
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 p-8 md:p-10">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isOpen
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                                    }`}>
                                    {seminar.status === 'UPCOMING' ? '📋 Upcoming' :
                                        seminar.status === 'OPEN' ? '✅ Open for Registration' :
                                            seminar.status === 'CLOSED' ? '🔒 Registration Closed' :
                                                seminar.status === 'COMPLETED' ? '🏆 Completed' : seminar.status}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
                                {seminar.name}
                            </h1>
                            <p className="text-gray-300 text-sm">Seminar Registration</p>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
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
                            {new Date(seminar.startDate).toLocaleDateString(undefined, {
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
                        <p className="text-sm font-bold text-gray-900">{seminar.venue || 'TBA'}</p>
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
                        <p className="text-sm font-bold text-gray-900">{registrationCount} participants</p>
                    </div>
                </div>

                {/* Registration Card — description, deadline, and form combined */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 space-y-5">

                        {/* Deadline Notice */}
                        {seminar.registrationDeadline && (
                            <div className={`rounded-xl border p-4 flex items-center gap-3 ${deadlinePassed
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                                }`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${deadlinePassed ? 'bg-red-100' : 'bg-amber-100'
                                    }`}>
                                    <span className="text-lg">{deadlinePassed ? '⏰' : '📅'}</span>
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${deadlinePassed ? 'text-red-800' : 'text-amber-800'}`}>
                                        {deadlinePassed ? 'Registration Deadline Passed' : 'Registration Deadline'}
                                    </p>
                                    <p className={`text-xs ${deadlinePassed ? 'text-red-600' : 'text-amber-600'}`}>
                                        {new Date(seminar.registrationDeadline).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        {(seminar.description || seminar.registrationDeadline) && (
                            <hr className="border-gray-100" />
                        )}

                        {/* Registration Form */}
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
                            disabled={!isOpen || !!deadlinePassed}
                        />
                    </div>
                </div>

            </div>
        </main>
    )
}
