import { getTenant } from '@/lib/tenant'
import WOTFSignInPage from '@/components/landing/wotf/pages/SignInPage'
import GlobalSignInPage from '@/components/landing/wotf-global/pages/SignInPage'
import KtmSignInPage from '@/components/landing/ktm/pages/SignInPage'
import TapEliteSignInPage from '@/components/landing/tap-elite/pages/SignInPage'

export default async function SignInPage() {
    const tenant = await getTenant()

    if (tenant.slug === 'ktm') {
        return <KtmSignInPage />
    }

    if (tenant.slug === 'tap-elite') {
        return <TapEliteSignInPage />
    }

    // WOTF Global: dark-themed sign-in
    if (tenant.slug === 'wotf-global') {
        return <GlobalSignInPage />
    }

    // Non-KTM tenant: show org-specific sign-in page
    return <WOTFSignInPage />
}
