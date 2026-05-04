"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import { useEffect, useState, useRef } from 'react';
import { Calendar, MapPin, Trophy, GraduationCap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface EventsPageProps {
    tournaments?: { id: string; name: string; date: string; venue: string | null; imageUrl?: string | null }[];
    seminars?: { id: string; name: string; date: string; venue: string | null; imageUrl?: string | null }[];
}

/* ─── Event Banner Helper ─── */
function EventBanner({ imageUrl, colorClass }: { imageUrl: string | null | undefined, colorClass: string }) {
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalHeight === 0) {
            setHasError(true);
        }
    }, [imageUrl]);

    if (!imageUrl || imageUrl === 'null' || hasError) {
        return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center overflow-hidden transition-transform duration-700 group-hover:scale-105 ${colorClass}`}>
                <div className="absolute inset-0 bg-black/40 mix-blend-overlay" />
                <div className="relative z-10 flex items-center gap-1.5">
                    <img src="/wotf-global/Wotf_logo_Final.png" alt="WOTF" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-xl" />
                    <img src="/wotf-global/wotf_global.png" alt="WOTF Global" className="h-8 md:h-11 w-auto object-contain drop-shadow-xl brightness-0 invert opacity-90" />
                </div>
            </div>
        );
    }

    return (
        <img 
            ref={imgRef}
            src={imageUrl} 
            alt="Event Banner" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            onError={() => setHasError(true)} 
        />
    );
}

function EventsPageInner({ tournaments, seminars }: EventsPageProps) {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    useEffect(() => {
        const els = document.querySelectorAll('.wotf-reveal');
        if (!els.length) return;
        const ob = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('wotf-visible', 'wotf-dir-up'); ob.unobserve(e.target); } });
        }, { rootMargin: '-40px' });
        els.forEach((el) => ob.observe(el));
        return () => ob.disconnect();
    }, []);

    const formatFull = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

    const palette = [
        { accent: 'text-[#0085C7]', bg: 'bg-[#0085C7]', border: 'border-[#0085C7]/20' },
        { accent: 'text-[#F4C300]', bg: 'bg-[#F4C300]', border: 'border-[#F4C300]/20' },
        { accent: 'text-white', bg: 'bg-white', border: 'border-white/10' },
        { accent: 'text-[#009F3D]', bg: 'bg-[#009F3D]', border: 'border-[#009F3D]/20' },
        { accent: 'text-[#DF0024]', bg: 'bg-[#DF0024]', border: 'border-[#DF0024]/20' },
    ];

    const renderEventCard = (event: any, i: number, type: 'Tournament' | 'Seminar') => {
        const p = palette[i % palette.length];
        const isTournament = type === 'Tournament';
        
        return (
            <Link key={event.id} href={isTournament ? `/tournament/${event.id}${qs}` : `/seminars/${event.id}${qs}`} className={`wotf-card-enter group block relative bg-[#111] rounded-2xl overflow-hidden border ${p.border} hover:border-white/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]`} style={{ animationDelay: `${i * 0.1}s` }}>
                
                {/* Banner Image Area */}
                <div className="relative h-48 w-full bg-[#1A1A1A] overflow-hidden">
                    <EventBanner imageUrl={event.imageUrl} colorClass={p.bg} />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent" />

                    {/* Type Badge */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
                        {isTournament ? <Trophy size={12} className={p.accent} /> : <GraduationCap size={12} className={p.accent} />}
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{type}</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-5 relative z-10 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-white leading-snug mb-3 group-hover:text-white/80 transition-colors">{event.name}</h3>
                    
                    <div className="space-y-2 mt-auto text-sm text-gray-400 mb-5">
                        <div className="flex items-center gap-2.5"><Calendar size={14} className="text-gray-500" /><span>{formatFull(event.date)}</span></div>
                        {event.venue && <div className="flex items-center gap-2.5"><MapPin size={14} className="text-gray-500" /><span className="truncate">{event.venue}</span></div>}
                    </div>

                    <div className={`mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold uppercase tracking-widest ${p.accent}`}>
                        <span>View Details</span>
                        <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
                
                {/* Bottom Accent Line */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${p.bg} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300`} />
            </Link>
        );
    };

    return (
        <main className="min-h-screen bg-[#050505] text-white">
            <GlobalNavbar />

            {/* Hero */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-black relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0085C7]/10 via-transparent to-[#DF0024]/5" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        {t('events.title')}
                    </h1>
                    <p className="text-gray-500 mt-3 text-base md:text-lg">{t('events.subtitle')}</p>
                    <div className="mt-6 flex justify-center gap-1">
                        <span className="block w-3 h-1 bg-[#0085C7] rounded-full" />
                        <span className="block w-3 h-1 bg-[#F4C300] rounded-full" />
                        <span className="block w-3 h-1 bg-white rounded-full" />
                        <span className="block w-3 h-1 bg-[#009F3D] rounded-full" />
                        <span className="block w-3 h-1 bg-[#DF0024] rounded-full" />
                    </div>
                </div>
            </section>

            {/* Events List */}
            <section className="py-16 md:py-24 bg-[#0A0A0A]">
                <div className="max-w-7xl mx-auto px-6 space-y-20">
                    
                    {/* Tournaments */}
                    <div>
                        <div className="flex items-center gap-3 mb-8 wotf-reveal">
                            <Trophy size={28} className="text-[#DF0024]" />
                            <h2 className="text-3xl font-black uppercase tracking-tight text-white">Tournaments</h2>
                        </div>
                        {tournaments && tournaments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tournaments.map((tourney, i) => renderEventCard(tourney, i, 'Tournament'))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-600 border border-white/5 rounded-2xl bg-[#111]">
                                <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                                <p>{t('championship.empty')}</p>
                            </div>
                        )}
                    </div>

                    {/* Seminars */}
                    <div>
                        <div className="flex items-center gap-3 mb-8 wotf-reveal">
                            <GraduationCap size={32} className="text-[#0085C7]" />
                            <h2 className="text-3xl font-black uppercase tracking-tight text-white">Seminars</h2>
                        </div>
                        {seminars && seminars.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {seminars.map((sem, i) => renderEventCard(sem, i, 'Seminar'))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-600 border border-white/5 rounded-2xl bg-[#111]">
                                <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
                                <p>{t('seminar.empty')}</p>
                            </div>
                        )}
                    </div>

                </div>
            </section>

            <GlobalFooter />
        </main>
    );
}

export default function GlobalEventsPage(props: EventsPageProps) {
    return (
        <I18nProvider>
            <EventsPageInner {...props} />
        </I18nProvider>
    );
}
