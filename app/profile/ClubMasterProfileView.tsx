import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'
import LogoutButton from '@/components/LogoutButton'

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
    // Get club stats using optimized count queries
    const [playersCount, uniqueTournaments, club] = await Promise.all([
        dbUser.clubName ? prisma.player.count({
            where: { club: { name: dbUser.clubName } }
        }) : 0,
        dbUser.clubName ? prisma.category.groupBy({
            by: ['tournamentId'],
            where: {
                players: { some: { club: { name: dbUser.clubName } } }
            }
        }).then(results => results.length) : 0,
        dbUser.clubName ? prisma.club.findFirst({
            where: { name: dbUser.clubName }
        }) : null
    ])

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card - Mobile Optimized */}
            <div className="bg-white sm:rounded-2xl shadow-sm border-b sm:border border-gray-200">
                {/* Cover Image */}
                <div className="h-32 sm:h-48 relative sm:rounded-t-2xl overflow-hidden">
                    {club?.logoUrl ? (
                        <>
                            {/* Sleek Dark Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

                            {/* Subtle Grid Pattern */}
                            <div className="absolute inset-0 opacity-5" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }} />

                            {/* Club Logo - Prominently Displayed */}
                            <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 opacity-30">
                                <img
                                    src={club.logoUrl}
                                    alt="Club Logo"
                                    className="h-20 w-20 sm:h-32 sm:w-32 object-contain drop-shadow-2xl"
                                />
                            </div>

                            {/* Accent Line - Orange for Club Master */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-4 right-8 text-4xl sm:text-6xl opacity-30">🥋</div>
                                <div className="absolute bottom-4 left-8 text-2xl sm:text-4xl opacity-20">🏆</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Info */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-16">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Club Master'}
                                    className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 border-4 border-white shadow-lg flex items-center justify-center text-3xl sm:text-5xl">
                                    🏫
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Club Master'}</h1>
                                <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-orange-100 text-orange-700">
                                    👑 Club Master
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mt-2 sm:mt-0 sm:mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Club Badge */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 w-full flex items-center gap-3 sm:gap-4">
                            {club?.logoUrl && (
                                <img
                                    src={club.logoUrl}
                                    alt="Club Logo"
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                                />
                            )}
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Club</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-900 break-words">{dbUser.clubName || 'Not Assigned'}</p>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="sm:ml-auto flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-1 sm:mt-0 justify-around sm:justify-start">
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{playersCount}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Athletes</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{uniqueTournaments}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Events</p>
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-xl sm:text-2xl font-bold text-amber-500">0</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Medals</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Club Details - Desktop and Mobile */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">
                        Club Details
                    </h2>
                    {club && (
                        <ClubSettingsButton
                            clubId={club.id}
                            clubLogo={club.logoUrl}
                            address={club.address}
                            phone={club.phone}
                            buttonText="Edit Club"
                        />
                    )}
                </div>
                <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Club Name</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.clubName || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Club Master</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Status</span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-50 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Active
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Email</span>
                            <span className="font-medium text-gray-900 text-xs sm:text-sm truncate block">{dbUser.email}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Phone</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{club?.phone || '-'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Address</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{club?.address || '-'}</span>
                        </div>
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
