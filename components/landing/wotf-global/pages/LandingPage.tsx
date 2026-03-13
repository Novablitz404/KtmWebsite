"use client";

import { useSearchParams } from 'next/navigation';
import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalHero from '../GlobalHero';
import GlobalFooter from '../GlobalFooter';
import { useRef, useEffect, useState } from 'react';
import { Calendar, MapPin, ArrowRight, Trophy, GraduationCap, Users, Award, Globe } from 'lucide-react';
import Link from 'next/link';

interface WOTFGlobalLandingPageProps {
    stats?: { athletes: number; clubs: number; events: number };
    upcomingEvents?: { id: string; name: string; type: string; date: string; venue: string | null }[];
}

/* ─── Animated Counter ─── */
function Counter({ value, duration = 0.8 }: { value: number; duration?: number }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIsInView(true); ob.disconnect(); } }, { rootMargin: '-20px' });
        ob.observe(el);
        return () => ob.disconnect();
    }, []);

    useEffect(() => {
        if (!isInView) return;
        let start: number, raf: number;
        const tick = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / (duration * 1000), 1);
            setCount(Math.floor((1 - Math.pow(1 - p, 4)) * value));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, duration, isInView]);

    return <span ref={ref}>{count.toLocaleString()}</span>;
}

/* ─── Stats Section (WHITE) ─── */
function StatsSection({ stats }: { stats?: { athletes: number; clubs: number; events: number } }) {
    const { t } = useI18n();
    const items = [
        { value: stats?.athletes ?? 0, label: t('stats.athletes'), color: 'text-[#0085C7]', icon: Users },
        { value: stats?.clubs ?? 0, label: t('stats.clubs'), color: 'text-[#F4C300]', icon: Award },
        { value: stats?.events ?? 0, label: t('stats.events'), color: 'text-[#DF0024]', icon: Globe },
    ];

    return (
        <section className="py-16 md:py-24 bg-white border-b border-gray-100">
            <div className="max-w-5xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {items.map((s, i) => (
                        <div key={i} className="wotf-reveal text-center" style={{ animationDelay: `${i * 0.15}s` }}>
                            <s.icon size={28} className={`mx-auto mb-3 ${s.color} opacity-70`} />
                            <h3 className={`text-4xl md:text-5xl font-black ${s.color} mb-2 tracking-tight`}>
                                <Counter value={s.value} />+
                            </h3>
                            <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── Events Section (DARK) ─── */
function EventsSection({ events, qs }: { events?: { id: string; name: string; type: string; date: string; venue: string | null }[]; qs: string }) {
    const { t } = useI18n();
    const hasEvents = events && events.length > 0;

    const formatMonth = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const formatDay = (d: string) => new Date(d).getDate();
    const formatFull = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

    const palette = [
        { accent: 'text-[#0085C7]', bg: 'bg-[#0085C7]', bgLight: 'bg-[#0085C7]/15', border: 'border-[#0085C7]/20' },
        { accent: 'text-[#F4C300]', bg: 'bg-[#F4C300]', bgLight: 'bg-[#F4C300]/15', border: 'border-[#F4C300]/20' },
        { accent: 'text-white', bg: 'bg-white', bgLight: 'bg-white/10', border: 'border-white/10' },
        { accent: 'text-[#009F3D]', bg: 'bg-[#009F3D]', bgLight: 'bg-[#009F3D]/15', border: 'border-[#009F3D]/20' },
        { accent: 'text-[#DF0024]', bg: 'bg-[#DF0024]', bgLight: 'bg-[#DF0024]/15', border: 'border-[#DF0024]/20' },
    ];

    return (
        <section className="py-16 md:py-24 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="wotf-reveal text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-3">
                        {t('events.title')}
                    </h2>
                    <p className="text-gray-500 max-w-lg mx-auto">{t('events.subtitle')}</p>
                </div>

                {hasEvents ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {events.map((event, i) => {
                            const p = palette[i % palette.length];
                            const isTournament = event.type === 'Tournament';
                            return (
                                <div key={event.id} className={`wotf-card-enter group bg-[#111] rounded-2xl border ${p.border} hover:border-white/20 transition-all duration-300 flex flex-col overflow-hidden`} style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className={`h-1 ${p.bg}`} />
                                    <div className="p-5 pb-0 flex items-start gap-4">
                                        <div className={`${p.bgLight} rounded-xl p-3 text-center min-w-[56px]`}>
                                            <span className={`block text-[10px] font-black uppercase tracking-wider ${p.accent}`}>{formatMonth(event.date)}</span>
                                            <span className="block text-2xl font-black text-white leading-none mt-0.5">{formatDay(event.date)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${p.accent}`}>
                                                {isTournament ? <Trophy size={11} /> : <GraduationCap size={11} />}
                                                {event.type}
                                            </span>
                                            <h3 className="text-base font-bold text-white leading-snug mt-1 group-hover:text-[#0085C7] transition-colors line-clamp-2">{event.name}</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 pt-3 flex-1 flex flex-col">
                                        <div className="space-y-1.5 mb-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2"><Calendar size={13} className="text-gray-600" /><span>{formatFull(event.date)}</span></div>
                                            {event.venue && <div className="flex items-center gap-2"><MapPin size={13} className="text-gray-600" /><span className="truncate">{event.venue}</span></div>}
                                        </div>
                                        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{t('events.open')}</span>
                                            <Link href={isTournament ? `/tournament/${event.id}${qs}` : `/seminars/${event.id}${qs}`} className={`w-8 h-8 rounded-full flex items-center justify-center ${p.bg} text-black shadow-md hover:scale-110 transition-transform`}>
                                                <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 border border-white/5 rounded-xl">
                        <Calendar size={40} className="mx-auto text-gray-700 mb-3" />
                        <h3 className="text-lg font-bold text-gray-500 mb-1">{t('events.noEvents')}</h3>
                        <p className="text-gray-600 text-sm">{t('events.checkBack')}</p>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ─── CTA Section (WHITE) ─── */
function CTASection({ qs }: { qs: string }) {
    const { t } = useI18n();
    return (
        <section className="py-20 md:py-28 bg-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0085C7] blur-[200px]" />
            </div>
            <div className="relative z-10 max-w-3xl mx-auto px-6 text-center wotf-reveal">
                <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tight mb-4">{t('cta.title')}</h2>
                <p className="text-gray-500 mb-8 max-w-xl mx-auto">{t('cta.subtitle')}</p>
                <Link
                    href={`/sign-up${qs}`}
                    className="inline-flex items-center gap-2 bg-black text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                    {t('cta.button')}
                    <ArrowRight size={16} />
                </Link>
            </div>
        </section>
    );
}

/* ─── Main Landing Page ─── */
function LandingPageInner({ stats, upcomingEvents }: WOTFGlobalLandingPageProps) {
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    // Initialize scroll reveal
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
        <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <GlobalNavbar animate />
            <GlobalHero />
            <StatsSection stats={stats} />
            <EventsSection events={upcomingEvents} qs={qs} />
            <CTASection qs={qs} />
            <GlobalFooter />
        </main>
    );
}

export default function WOTFGlobalLandingPage(props: WOTFGlobalLandingPageProps) {
    return (
        <I18nProvider>
            <LandingPageInner {...props} />
        </I18nProvider>
    );
}
