"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { useTenant } from "@/app/providers/TenantProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function PoweredByKtm() {
    return (
        <div className="mt-8 flex items-center justify-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium">Powered by</span>
            <Image src="/ktmnav_white.png" alt="KTM Sports" width={54} height={18} className="opacity-60" />
        </div>
    );
}

export default function TapEliteSignInPage() {
    const supabase = createBrowserClient();
    const tenant = useTenant();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [firstLogin, setFirstLogin] = useState(false);

    const qs = tenant.isMappedDomain ? "" : "?tenant=tap-elite";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            if (authError.message.includes("Invalid login credentials")) {
                try {
                    const checkRes = await fetch("/api/auth/check-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email }),
                    });
                    const checkData = await checkRes.json();

                    if (checkData.exists && checkData.needsPasswordSetup) {
                        setFirstLogin(true);
                        setLoading(false);
                        return;
                    }
                } catch {
                    // Fall through to generic error
                }
                setError("Invalid email or password. Please try again.");
            } else {
                setError(authError.message);
            }
            setLoading(false);
            return;
        }

        if (data.session) {
            window.location.replace(`/${qs}`);
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

        setLoading(true);

        try {
            const res = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to set password.");
                setLoading(false);
                return;
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: newPassword,
            });

            if (signInError) {
                setError("Password set! Please sign in with your new password.");
                setFirstLogin(false);
                setLoading(false);
                return;
            }

            window.location.replace(`/${qs}`);
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    // FIRST LOGIN (migrated user) — inline set password
    if (firstLogin) {
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
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Welcome Back!</h1>
                        <p className="text-gray-500 text-sm mt-2">
                            We&apos;ve upgraded our system. Please set a new password for{" "}
                            <span className="text-white font-semibold">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSetPassword} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">New Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                                placeholder="Minimum 6 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                                    placeholder="Re-enter your password"
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
                            className="w-full bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Set Password & Sign In
                        </button>

                        <div className="text-center pt-1">
                            <button
                                type="button"
                                onClick={() => { setFirstLogin(false); setPassword(""); setNewPassword(""); setConfirmPassword(""); setError(""); }}
                                className="text-sm text-gray-500 hover:text-white transition-colors"
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </form>

                    <PoweredByKtm />
                </div>
            </main>
        );
    }

    // CREDENTIALS
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
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Sign In</h1>
                    <p className="text-gray-500 text-sm mt-2">Sign in to manage your tournaments</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#E10600] transition-colors placeholder:text-gray-700"
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

                    <div className="flex justify-end -mt-1">
                        <Link
                            href={`/sign-in/forgot-password${qs}`}
                            className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Sign In
                    </button>

                    <div className="text-center pt-2">
                        <p className="text-gray-500 text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href={`/sign-up${qs}`} className="text-[#E10600] font-bold hover:text-white transition-colors">
                                Sign Up
                            </Link>
                        </p>
                    </div>
                </form>

                <p className="text-center text-xs text-gray-600 mt-5">
                    Need help?{" "}
                    <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
                        Contact Support
                    </Link>
                </p>

                <PoweredByKtm />
            </div>
        </main>
    );
}
