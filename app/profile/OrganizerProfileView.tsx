import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

interface OrganizerProfileViewProps {
    dbUser: {
        id: string
        name: string | null
        email: string
        clubName: string | null
        belt: string | null
        gender: string | null
        weight: number | null
        height: number | null
        birthDate: Date | null
        role: string
    }
    clerkImageUrl: string | undefined
}

export default async function OrganizerProfileView({ dbUser, clerkImageUrl }: OrganizerProfileViewProps) {
    // Get organizer stats
    const tournamentsCreated = await prisma.tournament.count({
        where: { organizerId: dbUser.id }
    })

    const activeTournaments = await prisma.tournament.count({
        where: {
            organizerId: dbUser.id,
            startDate: { gte: new Date() }
        }
    })

    // Calculate total athletes across all tournaments managed by this organizer
    const totalAthletes = await prisma.player.count({
        where: {
            category: {
                tournament: {
                    organizerId: dbUser.id
                }
            }
        }
    })

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card - Mobile Optimized */}
            <div className="bg-white sm:rounded-2xl shadow-sm border-b sm:border border-gray-200">
                {/* Cover Image */}
                <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative sm:rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 right-8 text-4xl sm:text-6xl opacity-30">📋</div>
                        <div className="absolute bottom-4 left-8 text-2xl sm:text-4xl opacity-20">🏆</div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-16">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Organizer'}
                                    className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border-4 border-white shadow-lg flex items-center justify-center text-3xl sm:text-5xl">
                                    📋
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Organizer'}</h1>
                                <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-indigo-100 text-indigo-700">
                                    🛡️ Organizer
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mt-2 sm:mt-0 sm:mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Organizer Badge / Stats Row */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gray-900 flex items-center justify-center text-xl sm:text-2xl shadow-sm">
                            🏆
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Role</p>
                            <p className="text-sm sm:text-lg font-bold text-gray-900">Tournament Organizer</p>
                        </div>
                        {/* Stats */}
                        <div className="sm:ml-auto flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-1 sm:mt-0 justify-around sm:justify-start">
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{tournamentsCreated}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Tournaments</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-green-600">{activeTournaments}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Active</p>
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-xl sm:text-2xl font-bold text-indigo-600">{totalAthletes}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Athletes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions - Mobile Only */}
            <div className="sm:hidden px-4 space-y-3">
                <Link
                    href="/manage"
                    className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition-transform"
                >
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">
                        📊
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">Dashboard</h3>
                        <p className="text-xs text-gray-500">Manage tournaments</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {/* Organizer Details - Desktop and Mobile */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">
                        Organizer Details
                    </h2>
                </div>
                <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Name</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Email</span>
                            <span className="font-medium text-gray-900 text-xs sm:text-base truncate block">{dbUser.email}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Role</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700">
                                {dbUser.role}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Status</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-50 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Active
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-50">
                        <p className="text-[10px] sm:text-xs text-gray-400">
                            To update your organizer permissions, please contact a Super Admin.
                        </p>
                    </div>
                </div>
            </div>

            {/* Logout Button - Mobile Only */}
            <div className="sm:hidden px-4 pb-6">
                <LogoutButton />
            </div>
        </div>
    )
}
