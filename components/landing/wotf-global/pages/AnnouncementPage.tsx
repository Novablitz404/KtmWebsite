"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import { useEffect } from 'react';
import { Calendar, MapPin, Trophy, GraduationCap, ArrowRight, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface AnnouncementPageProps {
    events?: { id: string; name: string; type: string; date: string; venue: string | null }[];
}

function AnnouncementPageInner({ events }: AnnouncementPageProps) {
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

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const palette: Record<string, { icon: typeof Trophy; color: string; bg: string }> = {
        Tournament: { icon: Trophy, color: 'text-[#DF0024]', bg: 'bg-[#DF0024]' },
        Seminar: { icon: GraduationCap, color: 'text-[#0085C7]', bg: 'bg-[#0085C7]' },
    };

    return (
        <main className="min-h-screen bg-black text-white">
            <GlobalNavbar />

            {/* Header */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F4C300]/5 via-transparent to-[#009F3D]/5" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <Megaphone size={48} className="mx-auto mb-4 text-[#F4C300] opacity-60" />
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        {t('announcement.title')}
                    </h1>
                    <p className="text-gray-500 mt-3">{t('announcement.subtitle')}</p>
                    <div className="mt-6 flex justify-center gap-1">
                        <span className="block w-3 h-1 bg-[#0085C7] rounded-full" />
                        <span className="block w-3 h-1 bg-[#F4C300] rounded-full" />
                        <span className="block w-3 h-1 bg-white rounded-full" />
                        <span className="block w-3 h-1 bg-[#009F3D] rounded-full" />
                        <span className="block w-3 h-1 bg-[#DF0024] rounded-full" />
                    </div>
                </div>
            </section>

            {/* Listings */}
            <section className="py-12 md:py-20 bg-[#050505]">
                <div className="max-w-5xl mx-auto px-6">
                    {events && events.length > 0 ? (
                        <div className="space-y-4">
                            {events.map((event, i) => {
                                const p = palette[event.type] || palette.Tournament;
                                const Icon = p.icon;
                                const href = event.type === 'Tournament' ? `/tournament/${event.id}${qs}` : `/seminars/${event.id}${qs}`;
                                return (
                                    <div key={event.id} className="wotf-card-enter bg-[#0A0A0A] border border-white/5 rounded-xl p-6 flex items-center justify-between gap-4 hover:border-white/10 transition-colors" style={{ animationDelay: `${i * 0.06}s` }}>
                                        <div className="flex items-center gap-4">
                                            <Icon size={20} className={`${p.color} flex-shrink-0`} />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${p.color}`}>{event.type}</span>
                                                </div>
                                                <h3 className="text-white font-bold">{event.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(event.date)}</span>
                                                    {event.venue && <span className="flex items-center gap-1"><MapPin size={12} />{event.venue}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={href} className={`w-8 h-8 rounded-full ${p.bg} flex items-center justify-center text-white hover:scale-110 transition-transform flex-shrink-0`}>
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-600">
                            <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                            <p>{t('announcement.empty')}</p>
                        </div>
                    )}
                </div>
            </section>

            <GlobalFooter />
        </main>
    );
}

export default function AnnouncementPage(props: AnnouncementPageProps) {
    return (
        <I18nProvider>
            <AnnouncementPageInner {...props} />
        </I18nProvider>
    );
}
