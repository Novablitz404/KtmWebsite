import ProfileForm from './ProfileForm'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import PushNotificationToggle from '@/components/PushNotificationToggle'

interface Player {
    id: string
    belt: string | null
    category: {
        id: string
        name: string
        tournament: {
            id: string
            name: string
            startDate: Date
        }
    }
}

interface AthleteProfileViewProps {
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
        players: Player[]
    }
    clerkImageUrl: string | undefined
    clubLogoUrl?: string
}

export default function AthleteProfileView({ dbUser, clerkImageUrl, clubLogoUrl }: AthleteProfileViewProps) {
    // Unique tournaments joined
    const tournamentCount = new Set(dbUser.players.map(p => p.category.tournament.id)).size

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card - Mobile Optimized */}
            <div className="bg-white sm:rounded-2xl shadow-sm border-b sm:border border-gray-200">
                {/* Cover Image */}
                <div className="h-32 sm:h-48 relative sm:rounded-t-2xl overflow-hidden">
                    {clubLogoUrl ? (
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
                                    src={clubLogoUrl}
                                    alt="Club Logo"
                                    className="h-20 w-20 sm:h-32 sm:w-32 object-contain drop-shadow-2xl"
                                />
                            </div>

                            {/* Accent Line */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-4 right-8 text-4xl sm:text-6xl opacity-30">🥋</div>
                                <div className="absolute bottom-4 left-8 text-2xl sm:text-4xl opacity-20">🏅</div>
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
                                    alt={dbUser.name || 'Athlete'}
                                    className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border-4 border-white shadow-lg flex items-center justify-center text-3xl sm:text-5xl">
                                    🥋
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Athlete'}</h1>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                        #{dbUser.id}
                                    </span>
                                    {dbUser.belt && (
                                        <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide shadow-sm border ${dbUser.belt === 'Black' ? 'bg-black text-white border-gray-800' :
                                            dbUser.belt === 'Red' ? 'bg-red-600 text-white border-red-700' :
                                                dbUser.belt === 'Blue' ? 'bg-blue-600 text-white border-blue-700' :
                                                    dbUser.belt === 'Yellow' ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                                                        dbUser.belt === 'Green' ? 'bg-green-600 text-white border-green-700' :
                                                            dbUser.belt === 'White' ? 'bg-white text-gray-800 border-gray-300' :
                                                                dbUser.belt === 'Brown' ? 'bg-amber-700 text-white border-amber-800' :
                                                                    dbUser.belt === 'Orange' ? 'bg-orange-500 text-white border-orange-600' :
                                                                        dbUser.belt === 'Purple' ? 'bg-purple-600 text-white border-purple-700' :
                                                                            'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}>
                                            {dbUser.belt}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mt-2 sm:mt-0 sm:mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Stats & Club Badge */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 w-full flex items-center gap-3 sm:gap-4">
                            {clubLogoUrl && (
                                <img
                                    src={clubLogoUrl}
                                    alt={dbUser.clubName || 'Club'}
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                                />
                            )}
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Club</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-900 break-words">{dbUser.clubName || 'Independent'}</p>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="sm:ml-auto flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-1 sm:mt-0 justify-around sm:justify-start">
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{tournamentCount}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Events</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-amber-500">0</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Medals</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tournament History - Mobile Optimized */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">
                        Tournament History
                    </h2>
                    {dbUser.players.length > 0 && (
                        <span className="text-xs text-gray-500">{dbUser.players.length} entries</span>
                    )}
                </div>
                <div className="divide-y divide-gray-100">
                    {dbUser.players.length === 0 ? (
                        <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-gray-500">
                            <div className="text-4xl mb-3">🏆</div>
                            <p className="mb-2 font-medium">No tournaments yet</p>
                            <p className="text-sm text-gray-400 mb-4">Register for upcoming events to start your journey.</p>
                            <Link href="/tournaments" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 active:scale-95 transition-transform">
                                Browse Tournaments →
                            </Link>
                        </div>
                    ) : (
                        dbUser.players.map((player) => (
                            <div key={player.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between active:bg-gray-50 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 text-sm sm:text-lg truncate">
                                        {player.category.tournament.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800">
                                            {player.category.name}
                                        </span>
                                        <span className="text-[10px] sm:text-sm text-gray-400">•</span>
                                        <span className="text-[10px] sm:text-sm text-gray-500">
                                            {player.belt} Belt
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                                        {new Date(player.category.tournament.startDate).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                                        Registered
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Push Notifications & Logout - Mobile Only */}
            <div className="sm:hidden px-4 pb-6 space-y-3">
                <PushNotificationToggle />
                <LogoutButton />
            </div>
        </div>
    )
}
