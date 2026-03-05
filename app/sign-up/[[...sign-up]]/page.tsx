import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import WOTFSignUpPage from '@/components/landing/wotf/pages/SignUpPage'

export default async function SignUpPage() {
    const tenant = await getTenant()

    // KTM sign-up is disabled — redirect to homepage
    if (tenant.slug === 'ktm') {
        redirect('/')
    }

    // Non-KTM tenant: show org-specific sign-up page
    return <WOTFSignUpPage />
}

