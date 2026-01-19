import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'
import LogoutButton from '@/components/LogoutButton'
import PushNotificationToggle from '@/components/PushNotificationToggle'

// Belt color configuration
const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'White': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    'Yellow': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
    'Green': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
    'Blue': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    'Red': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
    'Black': { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
    'Poom': { bg: 'bg-gradient-to-r from-red-100 to-gray-900', text: 'text-white', border: 'border-red-500' },
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
        players: Array<{
            id: string
            belt: string | null
            category: {
                id: string
                name: string
                tournament: {
                    id: string
                    name: string
                    startDate: Date | null
                }
            }
        }>
    }
    clerkImageUrl: string | undefined
}

export default async function AthleteProfileView({ dbUser, clerkImageUrl }: AthleteProfileViewProps) {
    // Get club info for logo
    const club = dbUser.clubName ? await prisma.club.findFirst({
        where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
        select: { id: true, logoUrl: true }
    }) : null

    // Count registrations and unique tournaments
    const totalRegistrations = dbUser.players.length
    const uniqueTournaments = new Set(dbUser.players.map(p => p.category.tournament.id)).size

    const beltStyle = BELT_COLORS[dbUser.belt || ''] || BELT_COLORS['White']

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card */}
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

                            {/* Accent Line - Red for Athlete */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-500">
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
                                    alt={dbUser.name || 'Athlete'}
                                    className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 border-4 border-white shadow-lg flex items-center justify-center text-3xl sm:text-5xl">
                                    🥋
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Athlete'}</h1>
                                <span className={`self-start sm:self-auto inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold ${beltStyle.bg} ${beltStyle.text} border ${beltStyle.border}`}>
                                    🥋 {dbUser.belt || 'No Belt'}
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mt-2 sm:mt-0 sm:mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Club & Stats Badge */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 w-full flex items-center gap-3 sm:gap-4">
                            {club?.logoUrl ? (
                                <img
                                    src={club.logoUrl}
                                    alt="Club Logo"
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                                />
                            ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                                    🏫
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Club</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-900 break-words">{dbUser.clubName || 'No Club'}</p>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="sm:ml-auto flex items-center gap-6 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 pt-3 sm:pt-0 mt-1 sm:mt-0 justify-around sm:justify-start">
                            <div className="text-center">
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalRegistrations}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500">Registrations</p>
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

            {/* Athlete Details */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">
                        Athlete Details
                    </h2>
                </div>
                <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Full Name</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Belt</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${beltStyle.bg} ${beltStyle.text}`}>
                                {dbUser.belt || 'Not Set'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Gender</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.gender || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Weight</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.weight ? `${dbUser.weight} kg` : '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Height</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.height ? `${dbUser.height} cm` : '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Birth Date</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                                {dbUser.birthDate ? new Date(dbUser.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                            </span>
                        </div>
                    </div>
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
