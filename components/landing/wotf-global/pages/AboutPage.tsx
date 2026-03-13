"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';
import Image from 'next/image';
import { useEffect } from 'react';
import { Target, Eye, Heart } from 'lucide-react';

function AboutPageInner() {
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
        <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <GlobalNavbar />

            {/* Page Header */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-[#0A0A0A] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <Image src="/wotf-global/hero_wotf_global.png" alt="" fill className="object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#0A0A0A]" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        {t('about.about.title')}
                    </h1>
                    <p className="mt-4 text-gray-400 text-sm md:text-base max-w-lg mx-auto">
                        Learn more about the World Olympics Taekwondo Federation
                    </p>
                </div>
            </section>

            {/* Welcome — White Section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-4xl mx-auto px-6 wotf-reveal">
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight mb-6 text-gray-900">
                        {t('about.welcome.title')}
                    </h2>
                    <p className="text-gray-500 leading-relaxed text-base md:text-lg">
                        {t('about.welcome.text')}
                    </p>
                </div>
            </section>

            {/* About WOTF — Light Gray Section */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="wotf-reveal">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
                            <Image src="/wotf-global/hero_wotf_global.png" alt="About WOTF" fill className="object-cover" />
                        </div>
                    </div>
                    <div className="wotf-reveal">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4 text-gray-900">
                            {t('about.about.title')}
                        </h2>
                        <p className="text-gray-500 leading-relaxed">
                            {t('about.about.text')}
                        </p>
                    </div>
                </div>
            </section>

            {/* With WOTF — White Section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="wotf-reveal order-2 md:order-1">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4 text-gray-900">
                            {t('about.withWotf.title')}
                        </h2>
                        <p className="text-gray-500 leading-relaxed">
                            {t('about.withWotf.text')}
                        </p>
                    </div>
                    <div className="wotf-reveal order-1 md:order-2">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
                            <Image src="/wotf-global/hero_wotf_global.png" alt="With WOTF" fill className="object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Mission / Vision / Core Values — Dark Band */}
            <section className="py-16 md:py-24 bg-[#0A0A0A]">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-12 wotf-reveal">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white">{t('about.activity.title')}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Target, color: '#0085C7', titleKey: 'about.mission.title', textKey: 'about.mission.text' },
                            { icon: Eye, color: '#F4C300', titleKey: 'about.vision.title', textKey: 'about.vision.text' },
                            { icon: Heart, color: '#DF0024', titleKey: 'about.values.title', textKey: 'about.values.text' },
                        ].map((item, i) => (
                            <div key={i} className="wotf-reveal bg-[#111] border border-white/5 rounded-2xl p-8 text-center hover:border-white/10 transition-colors" style={{ animationDelay: `${i * 0.15}s` }}>
                                <item.icon size={32} className="mx-auto mb-4" style={{ color: item.color }} />
                                <h3 className="text-lg font-black uppercase tracking-wider mb-3" style={{ color: item.color }}>
                                    {t(item.titleKey)}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{t(item.textKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Chairman Message — White Section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-10 wotf-reveal">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-gray-900">{t('about.chairman.title')}</h2>
                        <p className="text-gray-400 mt-2">{t('about.chairman.subtitle')}</p>
                    </div>
                    <div className="wotf-reveal bg-gray-50 border border-gray-100 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        <div className="flex-shrink-0">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-100">
                                <Image
                                    src="/wotf/master_moon.webp"
                                    alt={t('about.chairman.name')}
                                    width={160}
                                    height={160}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="text-center md:text-left flex-1">
                            <blockquote className="text-gray-500 italic text-base md:text-lg leading-relaxed mb-6">
                                &ldquo;{t('about.chairman.message')}&rdquo;
                            </blockquote>
                            <div>
                                <p className="text-gray-900 font-bold">{t('about.chairman.name')}</p>
                                <p className="text-gray-400 text-sm">{t('about.chairman.role')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Organization Chart — Light Gray */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-5xl mx-auto px-6 text-center wotf-reveal">
                    <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-gray-900 mb-8">{t('about.orgChart.title')}</h2>
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 shadow-sm">
                        <div className="flex flex-col items-center gap-6">
                            {/* Chairman */}
                            <div className="bg-[#0085C7]/10 border border-[#0085C7]/20 rounded-xl px-8 py-4">
                                <p className="text-[#0085C7] font-bold text-sm uppercase tracking-wider">Chairman</p>
                                <p className="text-gray-900 font-bold mt-1">{t('about.chairman.name')}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            {/* Departments */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                                {['Administration', 'Competition', 'Education', 'International'].map((dept) => (
                                    <div key={dept} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-center">
                                        <p className="text-gray-600 font-bold text-xs uppercase tracking-wider">{dept}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <GlobalFooter />
        </main>
    );
}

export default function AboutPage() {
    return (
        <I18nProvider>
            <AboutPageInner />
        </I18nProvider>
    );
}
