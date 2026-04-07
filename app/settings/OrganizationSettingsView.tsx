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

    // ── Profile tab ──────────────────────────────────────────────────
    const profileContent = (
        <div className="space-y-5">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personal Information</p>
                    <ProfileForm user={dbUser} initialImageUrl={clerkImageUrl} />
                </div>
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {clerkImageUrl ? (
                                <img
                                    src={clerkImageUrl}
                                    alt={dbUser.name || 'Admin'}
                                    className="w-20 h-20 rounded-2xl border-2 border-gray-100 shadow-sm object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-black border-2 border-gray-100 shadow-sm text-gray-400">
                                    {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl font-black text-gray-900">{dbUser.name || 'Organization Admin'}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{dbUser.email}</p>
                            <div className="mt-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Organization Administrator
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-5">
                        {[
                            { label: 'Full Name', value: dbUser.name || '—' },
                            { label: 'Email', value: dbUser.email },
                            { label: 'Role', value: dbUser.role === 'ORGANIZER' ? 'Owner' : dbUser.role === 'MANAGER' ? 'Manager' : dbUser.role },
                        ].map(f => (
                            <div key={f.label}>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{f.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Logout — mobile only */}
            <div className="sm:hidden">
                <LogoutButton />
            </div>
        </div>
    )

    // ── Organization tab ─────────────────────────────────────────────
    const organizationContent = (
        <div className="space-y-5">
            {/* Org header card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organization Profile</p>
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
                <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        {organization?.logoUrl ? (
                            <img
                                src={organization.logoUrl}
                                alt={organization.name}
                                className="w-20 h-20 rounded-2xl border border-gray-200 shadow-sm object-contain bg-white p-1.5"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-400 border border-gray-200">
                                {organization.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-black text-gray-900">{organization.name}</h2>
                        {organization.website && (
                            <a href={organization.website} target="_blank" rel="noopener noreferrer"
                                className="text-sm text-red-600 hover:text-red-700 font-medium mt-1 inline-block">
                                {organization.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Details 2-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Leadership */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Leadership</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Chairman',      value: organization.chairman      },
                            { label: 'Vice Chairman', value: organization.viceChairman  },
                        ].map((f, i) => (
                            <div key={f.label}>
                                {i > 0 && <div className="border-t border-gray-100 mb-4" />}
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                <p className="text-sm font-bold text-gray-900">{f.value || <span className="text-gray-400 font-normal">Not set</span>}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Information</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Email',   value: organization.contactEmail },
                            { label: 'Phone',   value: organization.contactPhone },
                            { label: 'Address', value: organization.address      },
                        ].map(f => (
                            <div key={f.label}>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                <p className="text-sm font-bold text-gray-900">{f.value || <span className="text-gray-400 font-normal">Not set</span>}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Email banner */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Banner Preview</p>
                </div>
                <div className="p-6">
                    {organization.emailBannerUrl ? (
                        <img
                            src={organization.emailBannerUrl}
                            alt="Organization Email Banner"
                            className="w-full max-h-64 object-cover rounded-2xl border border-gray-200"
                        />
                    ) : (
                        <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                            <span className="text-sm font-bold">No Email Banner Uploaded</span>
                            <span className="text-xs mt-1 text-gray-400">Upload one using the Edit button above</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    // ── Fees tab ─────────────────────────────────────────────────────
    const feesContent = (
        <div className="space-y-5">
            {/* Promotion test fees */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Promotion Test Default Fees</p>
                    {organization && (
                        <PromotionFeesManager
                            organizationId={organization.id}
                            defaultBeltFees={organization.defaultBeltFees}
                        />
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {[
                        { label: 'White to Purple', value: organization.defaultBeltFees?.whiteToPurple },
                        { label: 'Blue to Maroon',  value: organization.defaultBeltFees?.blueToMaroon  },
                        { label: 'Brown',           value: organization.defaultBeltFees?.brown          },
                    ].map(f => (
                        <div key={f.label} className="p-6 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{f.label}</p>
                            <p className="text-2xl font-black text-gray-900">
                                {f.value
                                    ? `₱${f.value.toLocaleString()}`
                                    : <span className="text-gray-300 text-base font-bold">Not set</span>
                                }
                            </p>
                        </div>
                    ))}
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">Applied automatically to new promotion tests</p>
                </div>
            </div>

            {/* Athlete card fees */}
            {organization && (
                <AthleteCardFeesManager
                    organizationId={organization.id}
                    athleteCardFee={organization.athleteCardFee}
                    athleteCardPaymentMethods={organization.athleteCardPaymentMethods}
                />
            )}

            {/* Club affiliation fees */}
            <OrganizationAffiliationManager organizationId={organization.id} />

            {/* Transfer ownership */}
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
