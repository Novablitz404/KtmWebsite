"use client";

import { useI18n } from './i18n';
import { Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function GlobalFooter() {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';
    const buildHref = (href: string) => {
        if (!qs) return href;
        return href.includes('?') ? `${href}&tenant=${tenantParam}` : `${href}${qs}`;
    };

    return (
        <footer className="bg-[#0A0A0A] border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 py-14 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <Image
                                src="/wotf-global/WOTF-Logo-Hero.svg"
                                alt="WOTF"
                                width={36}
                                height={36}
                                className="w-10 h-10"
                            />
                            <Image
                                src="/wotf-global/wotf_global.png"
                                alt="WOTF Global"
                                width={100}
                                height={28}
                                className="h-6 w-auto brightness-0 invert"
                            />
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                            World Olympics Taekwondo Federation — Unifying Taekwondo worldwide through excellence, discipline, and sportsmanship.
                        </p>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Contact</h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                                <MapPin size={14} className="text-gray-600 flex-shrink-0" />
                                <span>{t('footer.hq')}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                                <Mail size={14} className="text-gray-600 flex-shrink-0" />
                                <a href={`mailto:${t('footer.email')}`} className="hover:text-white transition-colors">
                                    {t('footer.email')}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-5">Quick Links</h4>
                        <div className="space-y-2.5">
                            {[
                                { key: 'nav.about', href: '/about' },
                                { key: 'nav.seminar', href: '/events?type=seminar' },
                                { key: 'nav.championship', href: '/events?type=championship' },
                                { key: 'nav.members', href: '/wotf-members' },
                            ].map((item) => (
                                <Link key={item.key} href={buildHref(item.href)} className="block text-gray-500 text-sm hover:text-white transition-colors">
                                    {t(item.key)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="mt-14 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0085C7]" />
                        <span className="w-2 h-2 rounded-full bg-[#F4C300]" />
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span className="w-2 h-2 rounded-full bg-[#009F3D]" />
                        <span className="w-2 h-2 rounded-full bg-[#DF0024]" />
                    </div>
                    <p className="text-gray-600 text-xs text-center">
                        {t('footer.copyright')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
