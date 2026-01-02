import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'

interface ClubMasterProfileViewProps {
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

export default async function ClubMasterProfileView({ dbUser, clerkImageUrl }: ClubMasterProfileViewProps) {
    // Get club stats
    const clubStats = dbUser.clubName ? await prisma.player.aggregate({
        where: { club: { name: dbUser.clubName } },
        _count: true
    }) : { _count: 0 }

    const tournamentCount = dbUser.clubName ? await prisma.player.findMany({
        where: { club: { name: dbUser.clubName } },
        select: { category: { select: { tournamentId: true } } },
        distinct: ['categoryId']
    }) : []

    const uniqueTournaments = new Set(tournamentCount.map(p => p.category.tournamentId)).size

    return (
        <div className="">
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6">
                {/* Cover Image */}
                <div className="h-48 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 relative rounded-t-2xl overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 right-8 text-6xl opacity-30">🥋</div>
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
                                    alt={dbUser.name || 'Club Master'}
                                    className="w-32 h-32 rounded-xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 border-4 border-white shadow-lg flex items-center justify-center text-5xl">
                                    🏫
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-4 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{dbUser.name || 'Club Master'}</h1>
                                <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700">
                                    👑 Club Master
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm mt-0.5">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Club Badge */}
                    <div className="mt-6 flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center text-2xl shadow-sm">
                            🥋
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Club</p>
                            <p className="text-lg font-bold text-gray-900">{dbUser.clubName || 'Not Assigned'}</p>
                        </div>
                        {/* Stats */}
                        <div className="ml-auto flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{clubStats._count}</p>
                                <p className="text-xs text-gray-500">Athletes</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{uniqueTournaments}</p>
                                <p className="text-xs text-gray-500">Events</p>
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-2xl font-bold text-amber-500">0</p>
                                <p className="text-xs text-gray-500">Medals</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Club Details Only */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[300px]">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">
                        Club Details
                    </h2>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Club Name</span>
                            <span className="font-medium text-gray-900">{dbUser.clubName || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Club Master</span>
                            <span className="font-medium text-gray-900">{dbUser.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-sm text-gray-500 mb-1">Contact</span>
                            <span className="font-medium text-gray-900 text-sm">{dbUser.email}</span>
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
                            Contact admin to modify club information
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
