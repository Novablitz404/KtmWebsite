"use client";

import Navbar from "@/components/landing/wotf/Navbar";
import Hero from "@/components/landing/wotf/Hero";
import EventsSection from "@/components/landing/wotf/EventsSection";
import PartnersSection from "@/components/landing/wotf/PartnersSection";
import StatsSection from "@/components/landing/wotf/StatsSection";
import WelcomeSection from "@/components/landing/wotf/WelcomeSection";
import Footer from "@/components/landing/wotf/Footer";

export default function WOTFLandingPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar animate />
            <Hero />
            <WelcomeSection />
            <StatsSection />
            <PartnersSection />
            <EventsSection />
            <Footer />
        </main>
    );
}
