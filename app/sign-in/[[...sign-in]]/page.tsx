import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import WOTFSignInPage from '@/components/landing/wotf/pages/SignInPage'

export default async function SignInPage() {
    const tenant = await getTenant()

    // KTM sign-in is disabled — redirect to homepage
    if (tenant.slug === 'ktm') {
        redirect('/')
    }

    // Non-KTM tenant: show org-specific sign-in page
    return <WOTFSignInPage />
}
