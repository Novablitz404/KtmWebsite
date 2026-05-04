"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useI18n, GoogleTranslate } from './i18n';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
    { key: 'nav.home', href: '/' },
    { key: 'nav.about', href: '/about' },
    { key: 'nav.events', href: '/events' },
    { key: 'nav.rankings', href: '/rankings' },
    { key: 'nav.announcement', href: '/announcement' },
    { key: 'nav.members', href: '/wotf-members' },
];

export default function GlobalNavbar({ animate = true, forceSolid = false }: { animate?: boolean, forceSolid?: boolean }) {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const [scrolled, setScrolled] = useState(forceSolid);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(forceSolid || window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [forceSolid]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const buildHref = (href: string) => {
        if (!qs) return href;
        return href.includes('?') ? `${href}&tenant=${tenantParam}` : `${href}${qs}`;
    };

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${animate ? 'wotf-nav-slide-down' : ''} ${
                    scrolled
                        ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]'
                        : 'bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link href={buildHref('/')} className="flex items-center gap-2 flex-shrink-0">
                            <Image
                                src="/wotf-global/Wotf_logo_Final.png"
                                alt="WOTF Logo"
                                width={36}
                                height={36}
                                className="h-10 w-10 md:h-12 md:w-12"
                            />
                            <Image
                                src="/wotf-global/wotf_global.png"
                                alt="WOTF Global"
                                width={120}
                                height={32}
                                className={`h-6 md:h-8 w-auto transition-all duration-500 ${scrolled ? '' : 'brightness-0 invert'}`}
                            />
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden lg:flex items-center gap-1">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.key}
                                    href={buildHref(item.href)}
                                    className={`text-xs font-bold uppercase tracking-widest px-3 py-2 transition-colors relative group ${
                                        scrolled
                                            ? 'text-gray-600 hover:text-black'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    {t(item.key)}
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-black group-hover:w-3/4 transition-all duration-300" />
                                </Link>
                            ))}
                        </div>

                        {/* Right actions */}
                        <div className="flex items-center gap-3">
                            <GoogleTranslate className="hidden md:block" />
                            <Link
                                href={buildHref('/sign-in')}
                                className={`hidden md:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-all duration-300 ${
                                    scrolled
                                        ? 'text-white bg-black hover:bg-gray-800'
                                        : 'text-black bg-white hover:bg-gray-200'
                                }`}
                            >
                                {t('nav.login')}
                            </Link>

                            {/* Mobile toggle */}
                            <button
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className={`lg:hidden p-2 transition-colors ${scrolled ? 'text-black hover:text-gray-600' : 'text-white hover:text-gray-300'}`}
                                aria-label="Toggle menu"
                            >
                                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 bg-white/98 backdrop-blur-lg lg:hidden">
                    <div className="pt-24 px-6 pb-8 flex flex-col items-center gap-2 h-full overflow-y-auto">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.key}
                                href={buildHref(item.href)}
                                onClick={() => setMobileOpen(false)}
                                className="text-gray-900 text-lg font-bold uppercase tracking-widest py-3 border-b border-gray-100 w-full text-center hover:text-[#0085C7] transition-colors"
                            >
                                {t(item.key)}
                            </Link>
                        ))}

                        <div className="mt-6 flex flex-col items-center gap-4">
                            <GoogleTranslate />
                            <Link
                                href={buildHref('/sign-in')}
                                onClick={() => setMobileOpen(false)}
                                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white bg-black hover:bg-gray-800 px-8 py-3 rounded-full transition-colors"
                            >
                                {t('nav.login')}
                            </Link>
                            <Link
                                href={buildHref('/sign-up')}
                                onClick={() => setMobileOpen(false)}
                                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black border border-gray-300 hover:border-black px-8 py-3 rounded-full transition-colors"
                            >
                                {t('nav.register')}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
