import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getTenant } from '@/lib/tenant'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'
import GlobalNavbar from '@/components/landing/wotf-global/GlobalNavbar'
import GlobalFooter from '@/components/landing/wotf-global/GlobalFooter'
import { I18nProvider } from '@/components/landing/wotf-global/i18n'
import { TapEliteFooter, TapEliteNavbar } from '@/components/landing/tap-elite/pages/LandingPage'
import MatchesView from './MatchesView'

export default async function MatchesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const tenant = await getTenant()

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        select: { id: true, name: true, headerImageUrl: true },
    })

    if (!tournament) return notFound()

    if (tenant.slug === 'wotf-global') {
        return (
            <I18nProvider>
                <GlobalNavbar forceSolid={true} />
                <div className="pt-20 bg-black min-h-screen">
                    <MatchesView tournament={tournament} theme="dark" />
                </div>
                <GlobalFooter />
            </I18nProvider>
        )
    }

    return (
        <>
            {tenant.slug === 'tap-elite'
                ? <TapEliteNavbar qs={tenant.isMappedDomain ? '' : '?tenant=tap-elite'} light />
                : tenant.slug !== 'ktm' && <Navbar variant="dark" />}
            <div className="pt-20 bg-gray-50 min-h-screen">
                <MatchesView tournament={tournament} theme="light" accentColor={tenant.primaryColor} />
            </div>
            {tenant.slug === 'tap-elite'
                ? <TapEliteFooter qs={tenant.isMappedDomain ? '' : '?tenant=tap-elite'} standalone />
                : tenant.slug !== 'ktm' && <Footer />}
        </>
    )
}
