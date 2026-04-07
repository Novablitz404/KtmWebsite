import ProfileForm from './ProfileForm'
import ClubSettingsButton from '@/app/components/ClubSettingsButton'
import LogoutButton from '@/components/LogoutButton'
import ClubSettingsSubTabs from './ClubSettingsSubTabs'
import SecurityForm from './SecurityForm'
import AffiliationCardLoader from '@/components/AffiliationCardLoader'
import UserAvatar from '@/components/UserAvatar'

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

    const roleLabel = dbUser.role === 'CLUB_MASTER' ? 'Club Master'
        : dbUser.role === 'ASSISTANT_CLUB_MASTER' ? 'Assistant'
        : dbUser.role

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
                                    alt={dbUser.name || 'Club Master'}
                                    className="w-20 h-20 rounded-2xl border-2 border-gray-100 shadow-sm object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-black border-2 border-gray-100 shadow-sm text-gray-400">
                                    {dbUser.name ? dbUser.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                            )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl font-black text-gray-900">{dbUser.name || 'Club Master'}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{dbUser.email}</p>
                            <div className="mt-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-5">
                        {[
                            { label: 'Full Name',  value: dbUser.name || '—' },
                            { label: 'Email',      value: dbUser.email },
                            { label: 'Belt Rank',  value: dbUser.belt || '—' },
                            { label: 'Gender',     value: dbUser.gender || '—' },
                            { label: 'Role',       value: roleLabel },
                            { label: 'Club',       value: dbUser.clubName || '—' },
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

    // ── Club tab ─────────────────────────────────────────────────────
    const clubContent = (
        <div className="space-y-5">
            {/* Club header card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Club Profile</p>
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
                <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        {club?.logoUrl ? (
                            <img
                                src={club.logoUrl}
                                alt={club.name}
                                className="w-20 h-20 rounded-2xl border border-gray-200 shadow-sm object-contain bg-white p-1.5"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-400 border border-gray-200">
                                {club?.name?.charAt(0) || '🏫'}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-xl font-black text-gray-900">{club?.name || dbUser.clubName || 'No Club'}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Managed by {dbUser.name || 'Club Master'}</p>
                    </div>
                </div>
            </div>

            {/* Details 2-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Club Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Club Information</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Club Name',   value: club?.name || dbUser.clubName },
                            { label: 'Club Master', value: dbUser.name },
                        ].map((f, i) => (
                            <div key={f.label}>
                                {i > 0 && <div className="border-t border-gray-100 mb-4" />}
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {f.value || <span className="text-gray-400 font-normal">Not set</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Information</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {[
                            { label: 'Email',   value: dbUser.email },
                            { label: 'Phone',   value: club?.phone },
                            { label: 'Address', value: club?.address },
                        ].map(f => (
                            <div key={f.label}>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {f.value || <span className="text-gray-400 font-normal">Not set</span>}
                                </p>
                            </div>
                        ))}
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

// ── Affiliation Tab ───────────────────────────────────────────────
function AffiliationTabContent({ clubId }: { clubId: string }) {
    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organization Affiliation</p>
                    <p className="text-sm text-gray-500 mt-1">Manage your club&apos;s affiliation status and payment</p>
                </div>
                <div className="p-6">
                    <AffiliationCardLoader clubId={clubId} />
                </div>
            </div>
        </div>
    )
}
