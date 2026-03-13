"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import { useEffect, useState } from 'react';
import { Calendar, MapPin, Trophy, GraduationCap, ArrowRight, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SeminarPageProps {
    seminars?: { id: string; name: string; date: string; venue: string | null }[];
}

function SeminarPageInner({ seminars }: SeminarPageProps) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'notice' | 'media'>('notice');
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

    return (
        <main className="min-h-screen bg-black text-white">
            <GlobalNavbar />

            {/* Hero */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0085C7]/10 via-transparent to-[#F4C300]/5" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <GraduationCap size={48} className="mx-auto mb-4 text-[#0085C7] opacity-60" />
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        {t('seminar.hero.title')}
                    </h1>
                    <p className="text-gray-500 mt-3 text-base md:text-lg">{t('seminar.hero.subtitle')}</p>
                    <div className="mt-6 flex justify-center gap-1">
                        <span className="block w-3 h-1 bg-[#0085C7] rounded-full" />
                        <span className="block w-3 h-1 bg-[#F4C300] rounded-full" />
                        <span className="block w-3 h-1 bg-white rounded-full" />
                        <span className="block w-3 h-1 bg-[#009F3D] rounded-full" />
                        <span className="block w-3 h-1 bg-[#DF0024] rounded-full" />
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <section className="py-12 md:py-20 bg-[#050505]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="flex justify-center gap-1 mb-10">
                        {(['notice', 'media'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${activeTab === tab ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                            >
                                {tab === 'notice' ? t('seminar.tab.notice') : t('seminar.tab.media')}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'notice' ? (
                        <div className="space-y-4">
                            {seminars && seminars.length > 0 ? (
                                seminars.map((sem, i) => (
                                    <div key={sem.id} className="wotf-card-enter bg-[#0A0A0A] border border-white/5 rounded-xl p-6 flex items-center justify-between gap-4 hover:border-white/10 transition-colors" style={{ animationDelay: `${i * 0.08}s` }}>
                                        <div className="flex items-center gap-4">
                                            <GraduationCap size={20} className="text-[#0085C7] flex-shrink-0" />
                                            <div>
                                                <h3 className="text-white font-bold">{sem.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(sem.date)}</span>
                                                    {sem.venue && <span className="flex items-center gap-1"><MapPin size={12} />{sem.venue}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Link href={`/seminars/${sem.id}${qs}`} className="w-8 h-8 rounded-full bg-[#0085C7] flex items-center justify-center text-white hover:scale-110 transition-transform flex-shrink-0">
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16 text-gray-600">
                                    <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
                                    <p>{t('seminar.empty')}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-600">
                            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
                            <p>Photo · Video content coming soon.</p>
                        </div>
                    )}
                </div>
            </section>

            <GlobalFooter />
        </main>
    );
}

export default function SeminarPage(props: SeminarPageProps) {
    return (
        <I18nProvider>
            <SeminarPageInner {...props} />
        </I18nProvider>
    );
}
