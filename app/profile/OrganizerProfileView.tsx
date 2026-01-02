import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'

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
        <div className="">
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
                {/* Cover Image */}
                <div className="h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 right-8 text-6xl opacity-30">📋</div>
                        <div className="absolute bottom-4 left-8 text-4xl opacity-20">🏆</div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6">
                    <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Organizer'}
                                    className="w-32 h-32 rounded-xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 border-4 border-white shadow-lg flex items-center justify-center text-5xl">
                                    📋
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-4 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{dbUser.name || 'Organizer'}</h1>
                                <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700">
                                    🛡️ Organizer
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mt-0.5">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Organizer Badge / Stats Row */}
                    <div className="mt-6 flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-2xl shadow-sm">
                            🏆
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Role</p>
                            <p className="text-lg font-bold text-gray-900">Tournament Organizer</p>
                        </div>
                        {/* Stats */}
                        <div className="ml-auto flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{tournamentsCreated}</p>
                                <p className="text-xs text-gray-500">Tournaments</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{activeTournaments}</p>
                                <p className="text-xs text-gray-500">Active</p>
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-2xl font-bold text-indigo-600">{totalAthletes}</p>
                                <p className="text-xs text-gray-500">Athletes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Organizer Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[300px]">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">
                        Organizer Details
                    </h2>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Name</span>
                            <span className="font-medium text-gray-900">{dbUser.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Email</span>
                            <span className="font-medium text-gray-900">{dbUser.email}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Role</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {dbUser.role}
                            </span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Status</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Active
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-400">
                            To update your organizer permissions, please contact a Super Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
