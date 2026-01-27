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
    }
    clerkImageUrl: string | undefined
    clubLogoUrl?: string | null
    stats?: {
        registrations: number
        events: number
        medals: number
    }
}

export default function AthleteProfileView({ dbUser, clerkImageUrl, clubLogoUrl, stats = { registrations: 0, events: 0, medals: 0 } }: AthleteProfileViewProps) {
    const beltStyle = BELT_COLORS[dbUser.belt || ''] || BELT_COLORS['White']

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card */}
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {clerkImageUrl ? (
                            <img
                                src={clerkImageUrl}
                                alt={dbUser.name || 'Athlete'}
                                className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover bg-gray-100"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                                🥋
                            </div>
                        )}
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1 text-center sm:text-left pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start">
                            <h1 className="text-2xl font-bold text-gray-900">{dbUser.name || 'Athlete'}</h1>
                        </div>
                        <p className="text-gray-500 mt-1">{dbUser.email}</p>

                        <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                {clubLogoUrl ? (
                                    <img src={clubLogoUrl} alt="Club" className="w-5 h-5 object-contain" />
                                ) : (
                                    <span>🏫</span>
                                )}
                                <span>{dbUser.clubName || 'No Club'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile Button */}
                    <div className="mt-4 sm:mt-0">
                        <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                    </div>
                </div>
            </div>

            {/* Athlete Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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


        </div>
    )
}
