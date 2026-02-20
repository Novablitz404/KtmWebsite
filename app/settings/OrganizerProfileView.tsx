import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import OrganizationProfileEditForm from './OrganizationProfileEditForm'

interface OrganizerProfileViewProps {
    dbUser: {
        id: string
        name: string | null
        email: string
        role: string
        clubName: string | null
        belt: string | null
        gender: string | null
        weight: number | null
        height: number | null
        birthDate: Date | null
        organization?: {
            id: string
            name: string
            establishedAt: Date
            logoUrl: string | null
            chairman: string | null
            viceChairman: string | null
            address: string | null
            contactEmail: string | null
            contactPhone: string | null
            website: string | null
            ownerId: string
        } | null
    }
    clerkImageUrl: string | undefined
}

export default async function OrganizerProfileView({ dbUser, clerkImageUrl }: OrganizerProfileViewProps) {
    // Get organizer stats
    const [tournamentsCreated, activeTournaments, totalAthletes] = await Promise.all([
        prisma.tournament.count({
            where: { organizerId: dbUser.id }
        }),
        prisma.tournament.count({
            where: {
                organizerId: dbUser.id,
                startDate: { gte: new Date() }
            }
        }),
        prisma.player.count({
            where: {
                category: {
                    tournament: {
                        organizerId: dbUser.id
                    }
                }
            }
        })
    ]);

    const org = dbUser.organization
    const isOwner = org?.ownerId === dbUser.id

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card - Mobile Optimized */}
            <div className="bg-white sm:rounded-2xl shadow-sm border-b sm:border border-gray-200">
                {/* Cover Image */}
                <div className="h-32 sm:h-48 relative sm:rounded-t-2xl overflow-hidden">
                    {/* Sleek Dark Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

                    {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 opacity-5" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }} />

                    {/* Organization Logo/Icon - Prominently Displayed */}
                    <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 opacity-30">
                        {org?.logoUrl ? (
                            <img
                                src={org.logoUrl}
                                alt="Organization Logo"
                                className="h-20 w-20 sm:h-32 sm:w-32 object-contain drop-shadow-2xl"
                            />
                        ) : (
                            <div className="text-6xl sm:text-8xl">📋</div>
                        )}
                    </div>

                    {/* Accent Line - Indigo for Organizer */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-500" />
                </div>

                {/* Profile Info */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-10 sm:-mt-16">
                        {/* Avatar (User) */}
                        <div className="relative flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Organizer'}
                                    className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-lg object-cover bg-white"
                                />
                            ) : (
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 border-4 border-white shadow-lg flex items-center justify-center text-3xl sm:text-5xl">
                                    🛡️
                                </div>
                            )}
                        </div>

                        {/* Name & Role */}
                        <div className="flex-1 pt-1 sm:pt-0 sm:pb-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Organizer'}</h1>
                                <span className="self-start sm:self-auto inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-indigo-100 text-indigo-700">
                                    {isOwner ? '👑 Owner' : '🛡️ Organizer'}
                                </span>
                            </div>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">{dbUser.email}</p>
                        </div>

                        {/* Edit Profile Button */}
                        <div className="sm:ml-auto mt-2 sm:mt-0 sm:mb-1">
                            <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                        </div>
                    </div>

                    {/* Organization Badge & Stats */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex-1 w-full flex items-center gap-3 sm:gap-4">
                            {org?.logoUrl ? (
                                <img
                                    src={org.logoUrl}
                                    alt="Org Logo"
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                                />
                            ) : (
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-lg flex items-center justify-center text-lg sm:text-xl shadow-sm text-white border border-gray-700">
                                    🏢
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">Organization</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-900 break-words">{org?.name || 'No Organization'}</p>
                            </div>
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
                    href="/organization?tab=events"
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

            {/* Organization Details - Desktop and Mobile */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">
                        Organization Details
                    </h2>
                    {org && <OrganizationProfileEditForm organization={org} isOwner={isOwner} />}
                </div>
                <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Organization Name</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{org?.name || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Chairman</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{org?.chairman || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Vice Chairman</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{org?.viceChairman || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Email</span>
                            <span className="font-medium text-gray-900 text-xs sm:text-sm truncate block">{org?.contactEmail || dbUser.email}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Phone</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{org?.contactPhone || '-'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Address</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">{org?.address || '-'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3">
                            <span className="block text-[10px] sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Website</span>
                            <span className="font-medium text-gray-900 text-sm sm:text-base">
                                {org?.website ? (
                                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                        {org.website}
                                    </a>
                                ) : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout - Mobile Only */}
            <div className="sm:hidden px-4 pb-6 space-y-3">
                <LogoutButton />
            </div>
        </div>
    )
}
