"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createImplicitClient } from "@/lib/supabase/implicit-client";
import { useTenant } from "@/app/providers/TenantProvider";
import { Loader2, ArrowLeft, CheckCircle, Mail } from "lucide-react";

export default function TapEliteForgotPasswordPage() {
    const tenant = useTenant();
    const qs = tenant.isMappedDomain ? "" : "?tenant=tap-elite";
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const supabase = createImplicitClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

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
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href={`/${qs}`}>
                        <Image
                            src="/tap-elite/tap_elite_horizontal_transparent.png"
                            alt="Tap Elite"
                            width={180}
                            height={72}
                            className="mx-auto mb-5 h-auto"
                        />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                        {sent ? "Check Your Email" : "Forgot Password"}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        {sent ? `We've sent a reset link to ${email}` : "Enter your email and we'll send you a reset link"}
                    </p>
                </div>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8">
                    {sent ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto bg-[#E10600]/10 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-[#E10600]" />
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
                                    onClick={() => { setSent(false); setEmail(""); }}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2"
                                >
                                    <Mail size={15} />
                                    Resend with a different email
                                </button>
                                <Link
                                    href={`/sign-in${qs}`}
                                    className="w-full flex items-center justify-center gap-2 bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] transition-colors"
                                >
                                    Back to Sign In
                                </Link>
                            </div>
                        </div>
                    ) : (
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
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {loading ? "Sending..." : "Send Reset Link"}
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

                <div className="mt-8 flex items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-500 font-medium">Powered by</span>
                    <Image src="/ktmnav_white.png" alt="KTM Sports" width={54} height={18} className="opacity-60" />
                </div>
            </div>
        </main>
    );
}
