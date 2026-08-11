import { getTenant } from '@/lib/tenant'
import WOTFForgotPasswordPage from '@/components/landing/wotf-global/pages/ForgotPasswordPage'
import KtmForgotPasswordPage from '@/components/landing/ktm/pages/ForgotPasswordPage'
import TapEliteForgotPasswordPage from '@/components/landing/tap-elite/pages/ForgotPasswordPage'

export default async function ForgotPasswordRoute() {
    const tenant = await getTenant()

    if (tenant.slug === 'ktm') {
        return <KtmForgotPasswordPage />
    }

    if (tenant.slug === 'tap-elite') {
        return <TapEliteForgotPasswordPage />
    }

    return <WOTFForgotPasswordPage />
}
