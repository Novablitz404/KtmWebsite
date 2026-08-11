import { getTenant } from '@/lib/tenant'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'
import { TapEliteFooter, TapEliteNavbar } from '@/components/landing/tap-elite/pages/LandingPage'

export default async function EventsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const tenant = await getTenant()

    // WOTF Global: pages include their own navbar/footer
    if (tenant.slug === 'wotf-global') {
        return <>{children}</>
    }

    if (tenant.slug === 'tap-elite') {
        const qs = tenant.isMappedDomain ? '' : '?tenant=tap-elite'
        return (
            <main className="min-h-screen bg-gray-50/50">
                <TapEliteNavbar qs={qs} light />
                {children}
                <TapEliteFooter qs={qs} standalone />
            </main>
        )
    }

    // Non-KTM tenants: wrap with org Navbar + Footer
    if (tenant.slug !== 'ktm') {
        return (
            <main className="min-h-screen bg-gray-50/50">
                <Navbar variant="dark" />
                {children}
                <Footer />
            </main>
        )
    }

    // KTM: just render children (KTM has its own Header in root layout)
    return <>{children}</>
}
