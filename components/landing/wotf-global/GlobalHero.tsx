"use client";

import Image from 'next/image';
import { useI18n } from './i18n';
import { ChevronDown } from 'lucide-react';

export default function GlobalHero() {
    const { t } = useI18n();

    return (
        <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
            {/* Background Image */}
            <div className="absolute inset-0 wotf-global-parallax">
                <Image
                    src="/wotf-global/hero_wotf_global.png"
                    alt="WOTF Global"
                    fill
                    className="object-cover object-center opacity-70"
                    priority
                    sizes="100vw"
                />
                {/* Gradient: dark top for navbar readability, fades to clean white at bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-white" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-5xl mx-auto -mt-16">
                {/* Logo */}
                <div className="animate-hero-fade-in mb-8">
                    <Image
                        src="/wotf-global/WOTF-Logo-Hero.svg"
                        alt="WOTF Global Logo"
                        width={140}
                        height={140}
                        className="mx-auto w-48 h-48 md:w-[280px] md:h-[280px]"
                        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5)) drop-shadow(0 8px 30px rgba(0,0,0,0.3))' }}
                    />
                </div>

                {/* Title — wordmark image */}
                <div className="animate-hero-fade-in-delayed-1">
                    <Image
                        src="/wotf-global/wotf_global.png"
                        alt="World Olympics Taekwondo Federation"
                        width={600}
                        height={120}
                        className="mx-auto w-[200px] sm:w-[260px] md:w-[340px] lg:w-[400px] h-auto brightness-0 invert drop-shadow-lg"
                    />
                </div>

                {/* Subtitle */}
                <p className="animate-hero-fade-in-delayed-2 mt-4 md:mt-6 text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto font-light tracking-wide">
                    {t('hero.subtitle')}
                </p>

            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-medium">
                    {t('hero.scroll')}
                </span>
                <ChevronDown size={18} className="text-gray-500" />
            </div>
        </section>
    );
}
