"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createImplicitClient } from '@/lib/supabase/implicit-client';
import { Loader2, ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { I18nProvider } from '../i18n';

function ForgotPasswordInner() {
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);

    // Use the implicit-flow client so the recovery link returns hash tokens
    // (#access_token...&type=recovery) that the reset-password page can consume.
    // This must match the client used in /sign-in/reset-password and enables
    // cross-device recovery (request on one device, open link on another).
    const supabase = createImplicitClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/sign-in/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
        } else {
            setSent(true);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F4C300]/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href={`/${qs}`}>
                        <Image src="/wotf-global/Wotf_logo_Final.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                        {sent ? 'Check Your Email' : 'Forgot Password'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        {sent
                            ? `We've sent a reset link to ${email}`
                            : "Enter your email and we'll send you a reset link"}
                    </p>
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8">
                    {sent ? (
                        /* Success state */
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto bg-[#F4C300]/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-[#F4C300]" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    If an account exists for <span className="text-white font-semibold">{email}</span>, you will receive a password reset link shortly.
                                </p>
                                <p className="text-gray-600 text-xs">
                                    Check your spam folder if you don't see it within a few minutes.
                                </p>
                            </div>
                            <div className="pt-2 space-y-3">
                                <button
                                    onClick={() => { setSent(false); setEmail(''); }}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2"
                                >
                                    <Mail size={15} />
                                    Resend with a different email
                                </button>
                                <Link
                                    href={`/sign-in${qs}`}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    Back to Sign In
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Form state */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#F4C300]/50 transition-colors placeholder:text-gray-700"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center pt-1">
                                <Link
                                    href={`/sign-in${qs}`}
                                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Back to Sign In
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                {/* Olympic dots */}
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

export default function WOTFForgotPasswordPage() {
    return (
        <I18nProvider>
            <ForgotPasswordInner />
        </I18nProvider>
    );
}
