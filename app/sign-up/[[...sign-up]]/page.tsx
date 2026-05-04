import { redirect } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import WOTFSignUpPage from '@/components/landing/wotf/pages/SignUpPage'
import GlobalSignUpPage from '@/components/landing/wotf-global/pages/SignUpPage'
import Link from 'next/link'

// ⚡ Flip to false when sign-up is ready to go live
const SIGNUP_MAINTENANCE = true

function MaintenancePage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <div className="flex flex-col items-center gap-4 mb-10">
                    <img src="/wotf-global/Wotf_logo_Final.png" alt="WOTF Logo" className="h-28 w-auto" />
                    <img src="/wotf-global/wotf_global.png" alt="WOTF" className="h-12 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Registration Under Maintenance</h1>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    We&apos;re currently improving our registration system. Please check back shortly.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-full hover:bg-gray-200 transition-colors"
                >
                    ← Back to Home
                </Link>
            </div>
        </div>
    )
}

export default async function SignUpPage() {
    const tenant = await getTenant()

    // 🚧 Maintenance gate — flip SIGNUP_MAINTENANCE to false when ready
    if (SIGNUP_MAINTENANCE) {
        return <MaintenancePage />
    }

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
