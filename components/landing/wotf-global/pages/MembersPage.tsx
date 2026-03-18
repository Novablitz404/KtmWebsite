"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import { useEffect, useState, useRef } from 'react';
import { MapPin, Mail, Globe, Building2, Users, Flag, Award, ChevronRight } from 'lucide-react';

interface MembersPageProps {
    clubs?: { id: string; name: string; city: string | null; province: string | null; country: string | null }[];
    stats?: { totalClubs: number; totalAthletes: number; totalCountries: number };
}

/* ─── Region data ─── */
const REGIONAL_OFFICES = [
    {
        region: 'Asia',
        color: '#DF0024',
        offices: [
            { name: 'WOTF Korea (Headquarters)', location: 'Seoul, South Korea', isHQ: true },
            { name: 'WOTF Philippines', location: 'Manila, Philippines' },
            { name: 'WOTF Indonesia', location: 'Jakarta, Indonesia' },
            { name: 'WOTF India', location: 'New Delhi, India' },
            { name: 'WOTF Bangladesh', location: 'Dhaka, Bangladesh' },
        ]
    },
    {
        region: 'Europe',
        color: '#0085C7',
        offices: [
            { name: 'WOTF United Kingdom', location: 'London, UK' },
            { name: 'WOTF Germany', location: 'Berlin, Germany' },
        ]
    },
    {
        region: 'Americas',
        color: '#009F3D',
        offices: [
            { name: 'WOTF USA', location: 'Los Angeles, USA' },
            { name: 'WOTF Canada', location: 'Toronto, Canada' },
            { name: 'WOTF Mexico', location: 'Mexico City, Mexico' },
        ]
    },
    {
        region: 'Africa & Oceania',
        color: '#F4C300',
        offices: [
            { name: 'WOTF Nigeria', location: 'Lagos, Nigeria' },
            { name: 'WOTF Australia', location: 'Sydney, Australia' },
        ]
    }
];

function ProfessionalWorldMap({ activeRegion }: { activeRegion: string | null }) {
    const [hovered, setHovered] = useState<string | null>(null);

    /* Pin positions as left% and top% of the image container.
       Visually calibrated to match the wotf-world-map.png dotted map. */
    const pins = [
        // Asia
        { name: 'Seoul (HQ)',  left: 82.5, top: 45,   region: 'Asia', isHQ: true },
        { name: 'Manila',      left: 80.5, top: 57,   region: 'Asia' },
        { name: 'Jakarta',     left: 77,   top: 69,   region: 'Asia' },
        { name: 'New Delhi',   left: 69,   top: 50,   region: 'Asia' },
        { name: 'Dhaka',       left: 72,   top: 52,   region: 'Asia' },
        // Europe
        { name: 'London',      left: 47, top: 34,   region: 'Europe' },
        { name: 'Berlin',      left: 50, top: 33, region: 'Europe' },
        // Americas
        { name: 'Los Angeles', left: 14,   top: 45,   region: 'Americas' },
        { name: 'Toronto',     left: 24,   top: 40,   region: 'Americas' },
        { name: 'Mexico City', left: 20,   top: 55,   region: 'Americas' },
        // Africa & Oceania
        { name: 'Lagos',       left: 51,   top: 49,   region: 'Africa & Oceania' },
        { name: 'Sydney',      left: 91,   top: 76,   region: 'Africa & Oceania' },
    ];

    return (
        <div className="relative w-full">
            {/* Map Image — defines the layout */}
            <img
                src="/wotf-global/wotf-world-map.png"
                alt="World Map"
                className="w-full h-auto block select-none pointer-events-none"
                draggable={false}
            />

            {/* CSS-positioned pins */}
            {pins.map((pin, i) => {
                const isActive = !activeRegion || activeRegion === pin.region;
                const isHQ = !!pin.isHQ;
                const pinColor = isHQ ? '#DF0024' : '#0085C7';
                const isHov = hovered === pin.name;

                return (
                    <div
                        key={pin.name}
                        className="absolute group cursor-pointer"
                        style={{
                            left: `${pin.left}%`,
                            top: `${pin.top}%`,
                            transform: 'translate(-50%, -50%)',
                            opacity: isActive ? 1 : 0.15,
                            transition: 'opacity 0.3s ease',
                        }}
                        onMouseEnter={() => setHovered(pin.name)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {/* Pulse ring */}
                        <div
                            className="absolute rounded-full"
                            style={{
                                width: isHQ ? 28 : 20,
                                height: isHQ ? 28 : 20,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                border: `1.5px solid ${pinColor}`,
                                animation: `wotf-pin-pulse ${2 + i * 0.2}s ease-in-out infinite`,
                                opacity: 0.4,
                            }}
                        />
                        {/* Outer glow */}
                        <div
                            className="absolute rounded-full"
                            style={{
                                width: isHQ ? 14 : 10,
                                height: isHQ ? 14 : 10,
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: pinColor,
                                opacity: 0.2,
                            }}
                        />
                        {/* Main dot */}
                        <div
                            className="rounded-full relative"
                            style={{
                                width: isHQ ? 10 : 7,
                                height: isHQ ? 10 : 7,
                                backgroundColor: pinColor,
                                boxShadow: `0 0 8px 2px ${pinColor}60`,
                            }}
                        >
                            {/* Center bright dot */}
                            <div
                                className="absolute rounded-full bg-white"
                                style={{
                                    width: isHQ ? 4 : 3,
                                    height: isHQ ? 4 : 3,
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: 0.9,
                                }}
                            />
                        </div>

                        {/* Hover tooltip */}
                        {isHov && isActive && (
                            <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-2 py-1 rounded text-[10px] md:text-xs font-bold text-white z-10"
                                style={{ backgroundColor: isHQ ? '#DF0024' : 'rgba(17,17,17,0.95)', border: isHQ ? 'none' : '1px solid rgba(255,255,255,0.15)' }}
                            >
                                {pin.name}
                            </div>
                        )}

                        {/* HQ Label (always visible) */}
                        {isHQ && (
                            <div
                                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap px-2 py-0.5 rounded text-[9px] md:text-[11px] font-black text-white"
                                style={{ backgroundColor: '#DF0024', opacity: !activeRegion || activeRegion === 'Asia' ? 0.95 : 0.15, transition: 'opacity 0.3s' }}
                            >
                                HQ Seoul
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}


function MembersPageInner({ clubs, stats }: MembersPageProps) {
    const { t } = useI18n();
    const [activeRegion, setActiveRegion] = useState<string | null>(null);

    const totalOffices = REGIONAL_OFFICES.reduce((sum, r) => sum + r.offices.length, 0);

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
        <main className="min-h-screen bg-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <GlobalNavbar />

            {/* ═══════════════ HERO SECTION ═══════════════ */}
            <section className="pt-28 pb-8 md:pt-36 md:pb-12 bg-black relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#DF0024]/5 via-transparent to-[#0085C7]/5" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-6">
                        <Globe size={14} className="text-[#0085C7]" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">World Olympics Taekwondo Federation</span>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-wider">
                        <span className="bg-gradient-to-r from-[#0085C7] via-white to-[#DF0024] bg-clip-text text-transparent">National Chapter</span>
                    </h1>

                    <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                        Our presence around the world
                    </p>
                </div>
            </section>

            {/* ═══════════════ WORLD MAP SECTION ═══════════════ */}
            <section className="pt-0 pb-16 md:pb-24 bg-[#030303] relative">
                <div className="max-w-6xl mx-auto px-6">

                    {/* Region Filter Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8 wotf-reveal">
                        <button
                            onClick={() => setActiveRegion(null)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!activeRegion
                                ? 'bg-white text-black'
                                : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                                }`}
                        >
                            All Regions
                        </button>
                        {REGIONAL_OFFICES.map((r) => (
                            <button
                                key={r.region}
                                onClick={() => setActiveRegion(activeRegion === r.region ? null : r.region)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeRegion === r.region
                                    ? 'text-white'
                                    : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                                    }`}
                                style={activeRegion === r.region ? { backgroundColor: r.color } : undefined}
                            >
                                {r.region}
                            </button>
                        ))}
                    </div>

                    {/* Map */}
                    <div className="wotf-reveal relative rounded-2xl border border-white/[0.06] bg-[#080808] overflow-hidden p-2 md:p-6">
                        <ProfessionalWorldMap activeRegion={activeRegion} />

                        {/* Map Legend */}
                        <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 flex items-center gap-4">
                            <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                                <span className="w-2 h-2 rounded-full bg-[#DF0024]" />
                                <span className="text-[10px] text-gray-400 font-medium">Headquarters</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                                <span className="w-2 h-2 rounded-full bg-[#0085C7]" />
                                <span className="text-[10px] text-gray-400 font-medium">National Chapter</span>
                            </div>
                        </div>

                        {/* Pin count badge */}
                        <div className="absolute top-3 right-3 md:top-6 md:right-6 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                            <span className="text-[10px] text-gray-400 font-bold">
                                {activeRegion
                                    ? `${REGIONAL_OFFICES.find(r => r.region === activeRegion)?.offices.length || 0} offices in ${activeRegion}`
                                    : `${totalOffices} offices worldwide`}
                            </span>
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════ MEMBER ORGANIZATIONS (from DB) ═══════════════ */}
            <section className="py-16 md:py-24 bg-[#030303]">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12 wotf-reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] mb-4">
                            <Award size={12} className="text-[#F4C300]" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Affiliated Organizations</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight">{t('members.directory.title')}</h2>
                        <p className="text-gray-500 mt-2 text-sm">{t('members.directory.subtitle')}</p>
                    </div>

                    {clubs && clubs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {clubs.map((club, i) => (
                                <div
                                    key={club.id}
                                    className="wotf-card-enter group bg-[#0A0A0A] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-all duration-300 flex items-center gap-4"
                                    style={{ animationDelay: `${(i % 12) * 0.05}s` }}
                                >
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0085C7]/10 to-[#009F3D]/10 border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:border-white/10 transition-colors">
                                        <Users size={16} className="text-[#0085C7]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate group-hover:text-[#0085C7] transition-colors">{club.name}</p>
                                        {(club.city || club.province || club.country) && (
                                            <p className="text-gray-600 text-xs flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin size={10} className="flex-shrink-0 text-gray-700" />
                                                {[club.city, club.province, club.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                                <Users size={24} className="text-gray-700" />
                            </div>
                            <p className="text-gray-600 font-medium">Member directory coming soon.</p>
                            <p className="text-gray-700 text-sm mt-1">Affiliated clubs and schools will appear here.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════ CONTACT / HQ ═══════════════ */}
            <section className="py-16 md:py-24 bg-black">
                <div className="max-w-3xl mx-auto px-6 text-center wotf-reveal">
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-2">{t('members.contact.title')}</h2>
                    <p className="text-gray-500 mb-8 text-sm">{t('members.contact.subtitle')}</p>
                    <div className="bg-[#0A0A0A] border border-white/[0.06] rounded-2xl p-8 inline-flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#DF0024]/10 flex items-center justify-center mb-1">
                            <Building2 size={20} className="text-[#DF0024]" />
                        </div>
                        <div className="flex items-center gap-2 text-gray-300 font-semibold">
                            {t('members.hq.label')}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <MapPin size={14} />
                            <span>{t('members.hq.address')}</span>
                        </div>
                        <a href={`mailto:${t('members.hq.email')}`} className="flex items-center gap-2 text-[#0085C7] hover:text-white transition-colors text-sm font-medium">
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
