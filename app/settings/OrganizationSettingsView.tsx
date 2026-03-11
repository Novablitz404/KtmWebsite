import ProfileForm from './ProfileForm'
import OrganizationSettingsButton from '@/app/components/OrganizationSettingsButton'
import LogoutButton from '@/components/LogoutButton'
import OrganizationTransferOwnership from '@/components/organization/OrganizationTransferOwnership'
import SettingsSubTabs from './SettingsSubTabs'
import SecurityForm from './SecurityForm'
import NetworkSettingsContent from './NetworkSettingsContent'
import OrganizationAffiliationManager from '@/components/OrganizationAffiliationManager'
import PromotionFeesManager from '@/app/components/PromotionFeesManager'
import AthleteCardFeesManager from '@/app/components/AthleteCardFeesManager'

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
        emailBannerUrl: string | null
        address: string | null
        contactPhone: string | null
        contactEmail: string | null
        website: string | null
        chairman: string | null
        viceChairman: string | null
        defaultBeltFees?: any
        athleteCardFee?: number | null
        athleteCardPaymentInstructions?: string | null
        athleteCardPaymentMethods?: any
    }
    clerkImageUrl: string | undefined
}

export default async function OrganizationSettingsView({ dbUser, organization, clerkImageUrl }: OrganizationSettingsViewProps) {

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
                                    alt={dbUser.name || 'Admin'}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-gray-100 shadow-sm object-cover bg-gray-100"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl sm:text-4xl border-2 border-gray-100 shadow-sm text-gray-400 font-bold">
                                    {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{dbUser.name || 'Organization Admin'}</h3>
                            <p className="text-gray-500 text-sm mt-1">{dbUser.email}</p>

                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    Organization Administrator
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
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Role</p>
                                <p className="text-sm font-medium text-gray-900">{dbUser.role === 'ORGANIZER' ? 'Owner' : dbUser.role === 'MANAGER' ? 'Manager' : dbUser.role}</p>
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

    const organizationContent = (
        <div className="space-y-6">
            {/* Organization Header Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
                    {/* Org Logo */}
                    <div className="flex-shrink-0">
                        {organization?.logoUrl ? (
                            <img
                                src={organization.logoUrl}
                                alt={organization.name}
                                className="w-24 h-24 rounded-xl border border-gray-200 shadow-sm object-contain bg-white p-1.5"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 border border-gray-200">
                                {organization.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Name & Website */}
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{organization.name}</h2>
                        {organization.website && (
                            <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium mt-1 inline-block">
                                {organization.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>

                    {/* Edit Button */}
                    <div className="flex-shrink-0 self-start">
                        {organization && (
                            <OrganizationSettingsButton
                                organizationId={organization.id}
                                orgName={organization.name}
                                orgLogo={organization.logoUrl}
                                emailBanner={organization.emailBannerUrl}
                                address={organization.address}
                                phone={organization.contactPhone}
                                email={organization.contactEmail}
                                website={organization.website}
                                chairman={organization.chairman}
                                viceChairman={organization.viceChairman}
                                defaultBeltFees={organization.defaultBeltFees}
                                athleteCardFee={organization.athleteCardFee}
                                athleteCardPaymentInstructions={organization.athleteCardPaymentInstructions}
                                buttonText="Edit"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Organization Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Leadership */}
                <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Leadership</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Chairman</span>
                            <span className="text-sm font-semibold text-gray-900">{organization.chairman || '-'}</span>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Vice Chairman</span>
                            <span className="text-sm font-semibold text-gray-900">{organization.viceChairman || '-'}</span>
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
                            <p className="text-sm font-medium text-gray-900">{organization.contactEmail || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{organization.contactPhone || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Address</p>
                            <p className="text-sm font-medium text-gray-900">{organization.address || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Banner Preview */}
            <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Email Banner Preview</h3>
                </div>
                <div className="p-6">
                    {organization.emailBannerUrl ? (
                        <img
                            src={organization.emailBannerUrl}
                            alt="Organization Email Banner"
                            className="w-full max-h-64 object-cover rounded-xl border border-gray-200"
                        />
                    ) : (
                        <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                            <span className="text-sm font-medium">No Email Banner Uploaded</span>
                            <span className="text-xs mt-1 text-gray-500">Upload one using the Edit button above</span>
                        </div>
                    )}
                </div>
            </div>

        </div>
    )

    const feesContent = (
        <div className="space-y-6">
            {/* Promotion Test Fees */}
            <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Promotion Test Default Fees</h3>
                    {organization && (
                        <PromotionFeesManager
                            organizationId={organization.id}
                            defaultBeltFees={organization.defaultBeltFees}
                        />
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    <div className="p-6 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">White to Purple</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {organization.defaultBeltFees?.whiteToPurple
                                ? `₱${organization.defaultBeltFees.whiteToPurple.toLocaleString()}`
                                : <span className="text-gray-300 text-base font-medium">Not set</span>
                            }
                        </p>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Blue to Maroon</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {organization.defaultBeltFees?.blueToMaroon
                                ? `₱${organization.defaultBeltFees.blueToMaroon.toLocaleString()}`
                                : <span className="text-gray-300 text-base font-medium">Not set</span>
                            }
                        </p>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Brown</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {organization.defaultBeltFees?.brown
                                ? `₱${organization.defaultBeltFees.brown.toLocaleString()}`
                                : <span className="text-gray-300 text-base font-medium">Not set</span>
                            }
                        </p>
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100">
                    <p className="text-xs text-gray-500 text-center">Applied automatically to new promotion tests</p>
                </div>
            </div>

            {/* Athlete Card Activation Setttings */}
            {organization && (
                <AthleteCardFeesManager
                    organizationId={organization.id}
                    athleteCardFee={organization.athleteCardFee}
                    athleteCardPaymentMethods={organization.athleteCardPaymentMethods}
                />
            )}

            {/* Club Affiliation Fees */}
            <OrganizationAffiliationManager organizationId={organization.id} />

            {/* Transfer Ownership */}
            {organization && (
                <OrganizationTransferOwnership organizationId={organization.id} />
            )}
        </div>
    )

    return (
        <SettingsSubTabs
            profileContent={profileContent}
            organizationContent={organizationContent}
            feesContent={feesContent}
            securityContent={<SecurityForm />}
            networkContent={<NetworkSettingsContent />}
        />
    )
}
