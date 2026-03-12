"use client";

import { useSearchParams } from 'next/navigation';
import Navbar from "@/components/landing/wotf/Navbar";
import Hero from "@/components/landing/wotf/Hero";
import EventsSection from "@/components/landing/wotf/EventsSection";
import PartnersSection from "@/components/landing/wotf/PartnersSection";
import StatsSection from "@/components/landing/wotf/StatsSection";
import WelcomeSection from "@/components/landing/wotf/WelcomeSection";
import AffiliationCTA from "@/components/landing/wotf/AffiliationCTA";
import Footer from "@/components/landing/wotf/Footer";
import AiChatWidget from "@/components/AiChatWidget";

interface WOTFLandingPageProps {
    stats?: { athletes: number; clubs: number; events: number };
    upcomingEvents?: { id: string; name: string; type: string; date: string; venue: string | null }[];
}

export default function WOTFLandingPage({ stats, upcomingEvents }: WOTFLandingPageProps) {
    // Read search params once and pass qs string to children that need it
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    return (
        <main className="min-h-screen bg-white">
            <Navbar animate qs={qs} />
            <Hero />
            <WelcomeSection />
            <StatsSection stats={stats} />
            <PartnersSection />
            <EventsSection events={upcomingEvents} qs={qs} />
            <AffiliationCTA qs={qs} />
            <Footer />
            <AiChatWidget />
        </main>
    );
}
