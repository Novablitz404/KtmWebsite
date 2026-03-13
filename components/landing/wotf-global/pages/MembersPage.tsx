"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import { useEffect } from 'react';
import { MapPin, Mail, Globe, Building2, Users } from 'lucide-react';

interface MembersPageProps {
    clubs?: { id: string; name: string; city: string | null; province: string | null; country: string | null }[];
}

/* ─── Dotted World Map (inline SVG) ─── */
function WorldMapDots() {
    return (
        <div className="relative w-full max-w-4xl mx-auto opacity-20">
            <svg viewBox="0 0 1000 500" className="w-full h-auto" fill="currentColor">
                {/* Simplified dotted map — key continental outlines */}
                {Array.from({ length: 40 }, (_, row) =>
                    Array.from({ length: 80 }, (_, col) => {
                        const x = col * 12.5 + 6;
                        const y = row * 12.5 + 6;
                        // Simple land-mass approximation
                        const isLand =
                            // North America
                            (x > 100 && x < 350 && y > 50 && y < 250 && Math.random() > 0.4) ||
                            // South America
                            (x > 200 && x < 370 && y > 250 && y < 450 && Math.random() > 0.5) ||
                            // Europe
                            (x > 400 && x < 600 && y > 50 && y < 200 && Math.random() > 0.4) ||
                            // Africa
                            (x > 420 && x < 600 && y > 200 && y < 420 && Math.random() > 0.5) ||
                            // Asia
                            (x > 550 && x < 850 && y > 50 && y < 300 && Math.random() > 0.4) ||
                            // Australia
                            (x > 750 && x < 900 && y > 300 && y < 420 && Math.random() > 0.5);
                        if (!isLand) return null;
                        return <circle key={`${row}-${col}`} cx={x} cy={y} r={2} className="text-gray-500" />;
                    })
                )}
            </svg>
        </div>
    );
}

/* ─── Region data from current WOTF site ─── */
const REGIONAL_OFFICES = [
    {
        region: 'Asia',
        offices: [
            { name: 'WOTF Korea (Headquarters)', location: 'Seoul, South Korea' },
            { name: 'WOTF Philippines', location: 'Manila, Philippines' },
            { name: 'WOTF Indonesia', location: 'Jakarta, Indonesia' },
            { name: 'WOTF India', location: 'New Delhi, India' },
            { name: 'WOTF Bangladesh', location: 'Dhaka, Bangladesh' },
        ]
    },
    {
        region: 'Europe',
        offices: [
            { name: 'WOTF United Kingdom', location: 'London, UK' },
            { name: 'WOTF Germany', location: 'Berlin, Germany' },
        ]
    },
    {
        region: 'Americas',
        offices: [
            { name: 'WOTF USA', location: 'Los Angeles, USA' },
            { name: 'WOTF Canada', location: 'Toronto, Canada' },
            { name: 'WOTF Mexico', location: 'Mexico City, Mexico' },
        ]
    },
    {
        region: 'Africa & Oceania',
        offices: [
            { name: 'WOTF Nigeria', location: 'Lagos, Nigeria' },
            { name: 'WOTF Australia', location: 'Sydney, Australia' },
        ]
    }
];

function MembersPageInner({ clubs }: MembersPageProps) {
    const { t } = useI18n();

    useEffect(() => {
        const els = document.querySelectorAll('.wotf-reveal');
        if (!els.length) return;
        const ob = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('wotf-visible', 'wotf-dir-up'); ob.unobserve(e.target); } });
        }, { rootMargin: '-40px' });
        els.forEach((el) => ob.observe(el));
        return () => ob.disconnect();
    }, []);

    return (
        <main className="min-h-screen bg-black text-white">
            <GlobalNavbar />

            {/* Header */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#009F3D]/5 via-transparent to-[#0085C7]/5" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <Globe size={48} className="mx-auto mb-4 text-[#009F3D] opacity-60" />
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        {t('members.title')}
                    </h1>
                    <p className="text-gray-500 mt-3">{t('members.subtitle')}</p>
                    <div className="mt-6 flex justify-center gap-1">
                        <span className="block w-3 h-1 bg-[#0085C7] rounded-full" />
                        <span className="block w-3 h-1 bg-[#F4C300] rounded-full" />
                        <span className="block w-3 h-1 bg-white rounded-full" />
                        <span className="block w-3 h-1 bg-[#009F3D] rounded-full" />
                        <span className="block w-3 h-1 bg-[#DF0024] rounded-full" />
                    </div>
                </div>
            </section>

            {/* National Chapters + Map */}
            <section className="py-16 md:py-24 bg-[#050505]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12 wotf-reveal">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{t('members.chapters.title')}</h2>
                        <p className="text-gray-500 mt-2">{t('members.chapters.subtitle')}</p>
                    </div>

                    <div className="wotf-reveal mb-16">
                        <WorldMapDots />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {REGIONAL_OFFICES.map((region, i) => (
                            <div key={region.region} className="wotf-reveal bg-[#0A0A0A] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors" style={{ animationDelay: `${i * 0.1}s` }}>
                                <h3 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Building2 size={14} className="text-[#0085C7]" />
                                    {region.region}
                                </h3>
                                <div className="space-y-3">
                                    {region.offices.map((office) => (
                                        <div key={office.name} className="border-l-2 border-white/5 pl-3">
                                            <p className="text-white text-sm font-medium">{office.name}</p>
                                            <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} />{office.location}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Member Organizations (from DB) */}
            <section className="py-16 md:py-24 bg-black">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12 wotf-reveal">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{t('members.directory.title')}</h2>
                        <p className="text-gray-500 mt-2">{t('members.directory.subtitle')}</p>
                    </div>

                    {clubs && clubs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clubs.map((club, i) => (
                                <div key={club.id} className="wotf-card-enter bg-[#0A0A0A] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors flex items-center gap-4" style={{ animationDelay: `${(i % 12) * 0.05}s` }}>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                                        <Users size={16} className="text-gray-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-medium text-sm truncate">{club.name}</p>
                                        {(club.city || club.province || club.country) && (
                                            <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin size={10} className="flex-shrink-0" />
                                                {[club.city, club.province, club.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-600">
                            <Users size={40} className="mx-auto mb-3 opacity-30" />
                            <p>Member directory coming soon.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Contact */}
            <section className="py-16 md:py-24 bg-[#050505]">
                <div className="max-w-3xl mx-auto px-6 text-center wotf-reveal">
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2">{t('members.contact.title')}</h2>
                    <p className="text-gray-500 mb-8">{t('members.contact.subtitle')}</p>
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 inline-flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Building2 size={16} className="text-[#0085C7]" />
                            <span className="font-medium">{t('members.hq.label')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                            <MapPin size={14} />
                            <span>{t('members.hq.address')}</span>
                        </div>
                        <a href={`mailto:${t('members.hq.email')}`} className="flex items-center gap-2 text-[#0085C7] hover:text-white transition-colors">
                            <Mail size={14} />
                            <span>{t('members.hq.email')}</span>
                        </a>
                    </div>
                </div>
            </section>

            <GlobalFooter />
        </main>
    );
}

export default function MembersPage(props: MembersPageProps) {
    return (
        <I18nProvider>
            <MembersPageInner {...props} />
        </I18nProvider>
    );
}
