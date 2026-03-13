"use client";

import { I18nProvider, useI18n } from '../i18n';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function SignInPageInner() {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            window.location.href = `/${qs}`;
        }
    };

    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0085C7]/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href={`/${qs}`}>
                        <Image src="/wotf/logo_image.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">{t('signin.title')}</h1>
                    <p className="text-gray-500 text-sm mt-2">{t('signin.subtitle')}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signin.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signin.password')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {t('signin.button')}
                    </button>

                    <div className="text-center pt-2">
                        <p className="text-gray-500 text-sm">
                            {t('signin.noAccount')}{' '}
                            <Link href={`/sign-up${qs}`} className="text-[#0085C7] font-bold hover:text-white transition-colors">
                                {t('signin.register')}
                            </Link>
                        </p>
                    </div>
                </form>

                {/* Accent dots */}
                <div className="flex justify-center gap-1.5 mt-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0085C7]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4C300]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#009F3D]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DF0024]" />
                </div>
            </div>
        </main>
    );
}

export default function GlobalSignInPage() {
    return (
        <I18nProvider>
            <SignInPageInner />
        </I18nProvider>
    );
}
