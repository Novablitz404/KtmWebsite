import { getTenant } from '@/lib/tenant'
import WOTFMembershipPage from '@/components/landing/wotf/pages/MembershipPage'
import { redirect } from 'next/navigation'

export default async function MembershipPage() {
    const tenant = await getTenant()

    // Only WOTF (non-KTM) tenants have a membership page
    if (tenant.slug !== 'ktm') {
        return <WOTFMembershipPage />
    }

    // KTM doesn't have a membership page — redirect home
    redirect('/')
}
