import { prisma } from '@/lib/prisma'
import ProfileForm from './ProfileForm'
import OrganizationSettingsButton from '@/app/components/OrganizationSettingsButton'
import LogoutButton from '@/components/LogoutButton'
import PushNotificationToggle from '@/components/PushNotificationToggle'

interface OrganizationSettingsViewProps {
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
    organization: {
        id: string
        name: string
        logoUrl: string | null
        address: string | null
        contactPhone: string | null
        contactEmail: string | null
        website: string | null
        chairman: string | null
        viceChairman: string | null
    }
    clerkImageUrl: string | undefined
}

export default async function OrganizationSettingsView({ dbUser, organization, clerkImageUrl }: OrganizationSettingsViewProps) {

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Header Card - Mobile Optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {clerkImageUrl ? (
                            <img
                                src={clerkImageUrl}
                                alt={dbUser.name || 'Organization Admin'}
                                className="w-24 h-24 rounded-full border-4 border-white shadow-sm object-cover bg-gray-100"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-4xl border-4 border-white shadow-sm">
                                🏢
                            </div>
                        )}
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1 text-center sm:text-left pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-center sm:justify-start">
                            <h1 className="text-2xl font-bold text-gray-900">{dbUser.name || 'Organization Admin'}</h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700">
                                🏢 Organization Admin
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{dbUser.email}</p>

                        <div className="mt-4 flex flex-wrap gap-4 justify-center sm:justify-start">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                {organization?.logoUrl ? (
                                    <img src={organization.logoUrl} alt="Organization" className="w-5 h-5 object-contain" />
                                ) : (
                                    <span>🏢</span>
                                )}
                                <span>{organization.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Edit Profile Button */}
                    <div className="mt-4 sm:mt-0">
                        <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                    </div>
                </div>
            </div>

            {/* Organization Details - Desktop and Mobile */}
            <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-200">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">
                        Organization Details
                    </h2>
                    {organization && (
                        <OrganizationSettingsButton
                            organizationId={organization.id}
                            orgName={organization.name}
                            orgLogo={organization.logoUrl}
                            address={organization.address}
                            phone={organization.contactPhone}
                            email={organization.contactEmail}
                            website={organization.website}
                            chairman={organization.chairman}
                            viceChairman={organization.viceChairman}
                            buttonText="Edit Organization"
                        />
                    )}
                </div>
                <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Organization Name</span>
                                <span className="font-medium text-gray-900 text-sm sm:text-base">{organization.name}</span>
                            </div>
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Website</span>
                                {organization.website ? (
                                    <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base truncate block">
                                        {organization.website}
                                    </a>
                                ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Contact Email</span>
                                <span className="font-medium text-gray-900 text-sm sm:text-base truncate block">{organization.contactEmail || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Contact Phone</span>
                                <span className="font-medium text-gray-900 text-sm sm:text-base">{organization.contactPhone || '-'}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Chairman</span>
                                <span className="font-medium text-gray-900 text-sm sm:text-base">{organization.chairman || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-xs sm:text-sm text-gray-500 mb-1">Vice Chairman</span>
                                <span className="font-medium text-gray-900 text-sm sm:text-base">{organization.viceChairman || '-'}</span>
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-3 pt-2 border-t border-gray-50 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <span className="block text-xs sm:text-sm text-gray-500 mb-1">Address</span>
                                    <span className="font-medium text-gray-900 text-sm sm:text-base">{organization.address || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs sm:text-sm text-gray-500 mb-1">Admin</span>
                                    <span className="font-medium text-gray-900 text-sm sm:text-base">{dbUser.name || '-'}</span>
                                </div>
                            </div>
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
