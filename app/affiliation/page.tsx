import { getTenant } from '@/lib/tenant'
import ClubAffiliationPage from '@/components/landing/wotf/pages/ClubAffiliationPage'

export default async function AffiliationPage() {
    const tenant = await getTenant()

    return <ClubAffiliationPage tenantName={tenant.name || 'Organization'} />
}
