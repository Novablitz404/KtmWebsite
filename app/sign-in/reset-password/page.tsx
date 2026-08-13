import { getTenant } from '@/lib/tenant'
import GenericResetPasswordPage from '@/components/auth/GenericResetPasswordPage'
import TapEliteResetPasswordPage from '@/components/landing/tap-elite/pages/ResetPasswordPage'

export default async function ResetPasswordRoute() {
    const tenant = await getTenant()

    if (tenant.slug === 'tap-elite') {
        return <TapEliteResetPasswordPage />
    }

    return <GenericResetPasswordPage />
}
