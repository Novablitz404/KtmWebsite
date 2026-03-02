import { getTenant } from '@/lib/tenant'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'

export default async function TournamentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const tenant = await getTenant()

    // Non-KTM tenants: wrap with org Navbar + Footer
    if (tenant.slug !== 'ktm') {
        return (
            <div className="min-h-screen bg-gray-50/50">
                <Navbar variant="dark" />
                <div className="pt-20">
                    {children}
                </div>
                <Footer />
            </div>
        )
    }

    // KTM: just render children (KTM has its own Header in root layout)
    return <>{children}</>
}
