import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import WOTFSignUpPage from '@/components/landing/wotf/pages/SignUpPage'
import GlobalSignUpPage from '@/components/landing/wotf-global/pages/SignUpPage'

export default async function SignUpPage() {
    const tenant = await getTenant()

    // KTM sign-up is disabled — redirect to homepage
    if (tenant.slug === 'ktm') {
        redirect('/')
    }

    // WOTF Global: dark-themed sign-up
    if (tenant.slug === 'wotf-global') {
        return <GlobalSignUpPage />
    }

    // Non-KTM tenant: show org-specific sign-up page
    return <WOTFSignUpPage />
}

