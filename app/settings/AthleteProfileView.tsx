import ProfileForm from './ProfileForm'
import LogoutButton from '@/components/LogoutButton'
import AthleteSettingsSubTabs from './AthleteSettingsSubTabs'
import SecurityForm from './SecurityForm'

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
    }
    clerkImageUrl: string | undefined
    clubLogoUrl?: string | null
    stats?: {
        registrations: number
        events: number
        medals: number
    }
}

export default function AthleteProfileView({ dbUser, clerkImageUrl, clubLogoUrl }: AthleteProfileViewProps) {

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
                                    alt={dbUser.name || 'Athlete'}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-gray-100 shadow-sm object-cover bg-gray-100"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-3xl sm:text-4xl border-2 border-gray-100 shadow-sm text-gray-400 font-bold">
                                    {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Athlete'}</h3>
                            <p className="text-gray-500 text-sm mt-1">{dbUser.email}</p>

                            <div className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    Athlete
                                </span>
                                {dbUser.clubName && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                                        {clubLogoUrl ? (
                                            <img src={clubLogoUrl} alt="Club" className="w-4 h-4 object-contain" />
                                        ) : (
                                            <span>🏫</span>
                                        )}
                                        {dbUser.clubName}
                                    </span>
                                )}
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
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Weight</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.weight ? `${dbUser.weight} kg` : '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Height</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.height ? `${dbUser.height} cm` : '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Birth Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {dbUser.birthDate ? new Date(dbUser.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Role</p>
                                <p className="text-sm font-medium text-gray-900">Athlete</p>
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

    return (
        <AthleteSettingsSubTabs
            profileContent={profileContent}
            securityContent={<SecurityForm />}
        />
    )
}
