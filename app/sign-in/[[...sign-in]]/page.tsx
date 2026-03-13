import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import WOTFSignInPage from '@/components/landing/wotf/pages/SignInPage'
import GlobalSignInPage from '@/components/landing/wotf-global/pages/SignInPage'

export default async function SignInPage() {
    const tenant = await getTenant()

    // KTM sign-in is disabled — redirect to homepage
    if (tenant.slug === 'ktm') {
        redirect('/')
    }

    // WOTF Global: dark-themed sign-in
    if (tenant.slug === 'wotf-global') {
        return <GlobalSignInPage />
    }

    // Non-KTM tenant: show org-specific sign-in page
    return <WOTFSignInPage />
}
