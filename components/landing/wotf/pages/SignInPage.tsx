"use client";

import * as React from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { createImplicitClient } from "@/lib/supabase/implicit-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function WOTFSignInPage() {
    const supabase = createBrowserClient();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [resetSent, setResetSent] = React.useState(false);
    const [firstLogin, setFirstLogin] = React.useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    // Check if this is a migrated user who hasn't set a password yet
                    try {
                        const checkRes = await fetch('/api/auth/check-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email }),
                        });
                        const checkData = await checkRes.json();

                        if (checkData.exists && checkData.needsPasswordSetup) {
                            // Genuinely migrated user — show password setup form
                            setFirstLogin(true);
                            setIsLoading(false);
                            return;
                        }
                    } catch {
                        // Fall through to generic error
                    }
                    setError('Invalid email or password. Please try again.');
                } else {
                    setError(signInError.message);
                }
                setIsLoading(false);
                return;
            }

            if (data.session) {
                setIsRedirecting(true);
                try {
                    const res = await fetch('/api/me');
                    const meData = await res.json();
                    const role = meData?.data?.role;
                    const redirectTo = role === 'CLUB_MASTER' || role === 'ASSISTANT_CLUB_MASTER' ? `/club${qs}`
                        : role === 'ORGANIZER' || role === 'MANAGER' ? `/organization${qs}`
                            : role === 'ADMIN' ? `/admin${qs}`
                                : `/athlete${qs}`;
                    router.push(redirectTo);
                } catch {
                    router.push(`/athlete${qs}`);
                }
            }
        } catch (err: any) {
            console.error("Sign in error", err);
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Please enter your email address first.");
            return;
        }
        setIsLoading(true);
        setError("");

        try {
            const implicitClient = createImplicitClient();
            const { error: resetError } = await implicitClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/sign-in/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
                setIsLoading(false);
                return;
            }

            setResetSent(true);
            setIsLoading(false);
        } catch {
            setError("Failed to send reset email.");
            setIsLoading(false);
        }
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to set password.');
                setIsLoading(false);
                return;
            }

            // Password set — now sign them in automatically
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: newPassword,
            });

            if (signInError) {
                setError('Password set! Please sign in with your new password.');
                setFirstLogin(false);
                setIsLoading(false);
                return;
            }

            // Redirect based on role
            setIsRedirecting(true);
            try {
                const meRes = await fetch('/api/me');
                const meData = await meRes.json();
                const role = meData?.data?.role;
                const redirectTo = role === 'CLUB_MASTER' || role === 'ASSISTANT_CLUB_MASTER' ? `/club${qs}`
                    : role === 'ORGANIZER' || role === 'MANAGER' ? `/organization${qs}`
                        : role === 'ADMIN' ? `/admin${qs}`
                            : `/athlete${qs}`;
                router.push(redirectTo);
            } catch {
                router.push(`/${qs}`);
            }
        } catch {
            setError('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    if (firstLogin) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="relative hidden w-1/2 lg:block">
                    <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-[#0085C7]/80 mix-blend-multiply" />
                </div>
                <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md space-y-6"
                    >
                        <div className="text-center">
                            <div className="relative h-20 w-20 mx-auto mb-4">
                                <Image src="/wotf/WOTF-Logo-Hero.svg" alt="WOTF Logo" fill className="object-contain" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Welcome Back! 🎉</h2>
                            <p className="text-gray-600 text-sm leading-relaxed mt-2">
                                We&apos;ve upgraded our system. Please set a new password for <span className="font-semibold text-gray-900">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleSetPassword} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:border-[#0085C7] focus:ring-[#0085C7] focus:ring-1 focus:outline-none transition-all text-sm"
                                        placeholder="Minimum 6 characters"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:border-[#0085C7] focus:ring-[#0085C7] focus:ring-1 focus:outline-none transition-all text-sm"
                                        placeholder="Re-enter your password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-[#DF0024]">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base text-white bg-[#0085C7] hover:bg-[#0073ad] transition-all duration-200 shadow-lg shadow-blue-500/20"
                                disabled={isLoading || isRedirecting}
                            >
                                {isLoading || isRedirecting ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Set Password & Sign In
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="text-center">
                            <button
                                onClick={() => { setFirstLogin(false); setPassword(""); setNewPassword(""); setConfirmPassword(""); setError(""); }}
                                className="text-sm font-semibold text-[#0085C7] hover:text-[#006090]"
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (resetSent) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="relative hidden w-1/2 lg:block">
                    <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-[#0085C7]/80 mix-blend-multiply" />
                </div>
                <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <Mail className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
                        <p className="text-gray-500">
                            We sent a password reset link to<br />
                            <span className="font-bold text-gray-900">{email}</span>
                        </p>
                        <button
                            onClick={() => { setResetSent(false); setPassword(""); }}
                            className="text-sm font-semibold text-[#0085C7] hover:text-[#006090]"
                        >
                            ← Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full">
            <div className="relative hidden w-1/2 lg:block">
                <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-[#0085C7]/80 mix-blend-multiply" />
            </div>

            <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                <Link
                    href={`/${qs}`}
                    className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-md space-y-8"
                >
                    <div className="text-center lg:text-left">
                        <div className="relative h-28 w-28 mx-auto mb-6">
                            <Image src="/wotf/WOTF-Logo-Hero.svg" alt="WOTF Logo" fill className="object-contain" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Sign in to your account
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Enter your credentials to access the platform
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Email address
                                </label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 border-gray-300 focus:border-[#0085C7] focus:ring-[#0085C7]"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-sm font-medium text-[#0085C7] hover:text-[#006090]"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 border-gray-300 focus:border-[#0085C7] focus:ring-[#0085C7] pr-11"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-[#DF0024]">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base text-white bg-[#0085C7] hover:bg-[#0073ad] transition-all duration-200 shadow-lg shadow-blue-500/20"
                            disabled={isLoading || isRedirecting}
                        >
                            {isLoading || isRedirecting ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-gray-500">
                            Don&apos;t have an account yet?{" "}
                        </span>
                        <Link
                            href={`/sign-up${qs}`}
                            className="font-bold text-[#DF0024] hover:text-[#b3001d] transition-colors"
                        >
                            Create an account
                        </Link>
                    </div>
                </motion.div>

                {/* Powered by KTM */}
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Powered by</span>
                    <Image src="/ktmnav.png" alt="KTM" width={60} height={20} className="opacity-50" />
                </div>
            </div>
        </div>
    );
}
