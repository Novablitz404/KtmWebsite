import ProfileForm from './ProfileForm'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'
import LogoutButton from '@/components/LogoutButton'
import ClubSettingsSubTabs from './ClubSettingsSubTabs'
import SecurityForm from './SecurityForm'
import AffiliationCardLoader from '@/components/AffiliationCardLoader'


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
    club: {
        id: string
        name: string
        logoUrl: string | null
        address: string | null
        phone: string | null
    } | null
    clerkImageUrl: string | undefined
}

export default async function ClubMasterProfileView({ dbUser, club, clerkImageUrl }: ClubMasterProfileViewProps) {

    const profileContent = (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                    <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                </div>
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Club Master'}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-gray-100 shadow-sm object-cover bg-gray-100"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-3xl sm:text-4xl border-2 border-gray-100 shadow-sm text-gray-400 font-bold">
                                    {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Club Master'}</h3>
                            <p className="text-gray-500 text-sm mt-1">{dbUser.email}</p>

                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    Club Master
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details Grid */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Full Name</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Email</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{dbUser.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Belt Rank</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.belt || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Gender</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.gender || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Role</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {dbUser.role === 'CLUB_MASTER' ? 'Club Master' : dbUser.role === 'ASSISTANT_CLUB_MASTER' ? 'Assistant' : dbUser.role}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout - Mobile Only */}
            <div className="sm:hidden px-4 pb-6">
                <LogoutButton />
            </div>
        </div>
    )

    const clubContent = (
        <div className="space-y-6">
            {/* Club Header Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
                    {/* Club Logo */}
                    <div className="flex-shrink-0">
                        {club?.logoUrl ? (
                            <img
                                src={club.logoUrl}
                                alt={club.name}
                                className="w-24 h-24 rounded-xl border border-gray-200 shadow-sm object-contain bg-white p-1.5"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 border border-gray-200">
                                {club?.name?.charAt(0) || '🏫'}
                            </div>
                        )}
                    </div>

                    {/* Club Name */}
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{club?.name || dbUser.clubName || 'No Club'}</h2>
                        <p className="text-gray-500 text-sm mt-1">Managed by {dbUser.name || 'Club Master'}</p>
                    </div>

                    {/* Edit Button */}
                    <div className="flex-shrink-0 self-start">
                        {club && (
                            <ClubSettingsButton
                                clubId={club.id}
                                clubLogo={club.logoUrl}
                                address={club.address}
                                phone={club.phone}
                                buttonText="Edit"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Club Details - Two Column Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Club Info */}
                <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Club Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Club Name</span>
                            <span className="text-sm font-semibold text-gray-900">{club?.name || dbUser.clubName || '-'}</span>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Club Master</span>
                            <span className="text-sm font-semibold text-gray-900">{dbUser.name || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Email</p>
                            <p className="text-sm font-medium text-gray-900">{dbUser.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{club?.phone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Address</p>
                            <p className="text-sm font-medium text-gray-900">{club?.address || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <ClubSettingsSubTabs
            profileContent={profileContent}
            clubContent={clubContent}
            securityContent={<SecurityForm />}
            affiliationContent={club ? <AffiliationTabContent clubId={club.id} /> : undefined}
        />
    )
}

// Client-side wrapper that fetches affiliation data for the settings tab
function AffiliationTabContent({ clubId }: { clubId: string }) {
    // This is rendered inside a client component (ClubSettingsSubTabs),
    // so we need to use the 'use client' wrapper approach.
    // The actual data fetching happens in ClubAffiliationCard via useQuery in ClubDashboard.
    // We'll render a placeholder that tells the user to check the component.
    return (
        <div className="space-y-4">
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Organization Affiliation</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your club&apos;s affiliation status and payment</p>
                </div>
                <div className="p-6">
                    <AffiliationCardLoader clubId={clubId} />
                </div>
            </div>
        </div>
    )
}
