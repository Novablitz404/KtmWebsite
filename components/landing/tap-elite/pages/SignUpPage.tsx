"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, User, Shield, Building2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { checkEmailAvailability, ensureUserRecord } from "@/app/actions";

type Step = "role-selection" | "account" | "check-email";
type Role = "ATHLETE" | "CLUB_MASTER" | "ORGANIZER";

function PoweredByKtm() {
    return (
        <div className="mt-8 flex items-center justify-center gap-2">
            <span className="text-[11px] text-gray-500 font-medium">Powered by</span>
            <Image src="/ktmnav_white.png" alt="KTM Sports" width={54} height={18} className="opacity-60" />
        </div>
    );
}

export default function TapEliteSignUpPage() {
    const router = useRouter();
    const supabase = createBrowserClient();
    const qs = "?tenant=tap-elite";

    const [step, setStep] = useState<Step>("role-selection");
    const [role, setRole] = useState<Role>("ATHLETE");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const roleParam = searchParams.get("role");
        const emailParam = searchParams.get("email");

        const initialization = window.setTimeout(() => {
            if (roleParam === "MANAGER" || roleParam === "CO_ORGANIZER") {
                setStep("account");
            }
            if (emailParam) {
                setEmail(emailParam);
            }
        }, 0);

        return () => window.clearTimeout(initialization);
    }, []);

    const handleEmailBlur = async () => {
        if (!email) return;
        const { available } = await checkEmailAvailability(email);
        setEmailError(available ? null : "This email is already registered");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (emailError) return;

        setLoading(true);

        const { available } = await checkEmailAvailability(email);
        if (!available) {
            setEmailError("This email is already registered");
            setLoading(false);
            return;
        }

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { role, tenant: "tap-elite" },
                    emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}${qs ? "&" + qs.slice(1) : ""}`,
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
                return;
            }

            if (data.session) {
                await ensureUserRecord();
                router.push(`/onboarding/complete-profile${qs}`);
            } else {
                setStep("check-email");
                setLoading(false);
            }
        } catch (err) {
            console.error("Sign up error", err);
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    // CHECK EMAIL
    if (step === "check-email") {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md">
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#E10600]/10 flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-8 w-8 text-[#E10600]" />
                        </div>
                        <h2 className="text-white font-bold text-lg mb-2">Check Your Email</h2>
                        <p className="text-gray-500 text-sm mb-2">We sent a confirmation link to</p>
                        <p className="text-white font-bold text-sm mb-6">{email}</p>
                        <p className="text-gray-600 text-xs mb-6">
                            Click the link to verify your account and start your profile setup.
                        </p>
                        <button
                            onClick={() => setStep("account")}
                            className="text-sm font-semibold text-[#E10600] hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                            <ArrowLeft size={14} />
                            Change email address
                        </button>
                    </div>
                    <PoweredByKtm />
                </div>
            </main>
        );
    }

    // ROLE SELECTION
    if (step === "role-selection") {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Create Account</h1>
                        <p className="text-gray-500 text-sm mt-2">How would you like to register?</p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                    >
                        <button
                            type="button"
                            onClick={() => { setRole("ATHLETE"); setStep("account"); }}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-white/10 bg-[#0A0A0A] hover:border-[#E10600]/50 hover:bg-[#E10600]/5 transition-all duration-200 text-left"
                        >
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/5">
                                <User className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                                <span className="text-base font-bold text-gray-300">Athlete</span>
                                <p className="text-xs text-gray-500 mt-0.5">Register as a taekwondo athlete</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setRole("CLUB_MASTER"); setStep("account"); }}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-white/10 bg-[#0A0A0A] hover:border-[#E10600]/50 hover:bg-[#E10600]/5 transition-all duration-200 text-left"
                        >
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/5">
                                <Shield className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                                <span className="text-base font-bold text-gray-300">Club Master</span>
                                <p className="text-xs text-gray-500 mt-0.5">Register and manage your club</p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setRole("ORGANIZER"); setStep("account"); }}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-white/10 bg-[#0A0A0A] hover:border-white/30 hover:bg-white/5 transition-all duration-200 text-left"
                        >
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-white/5">
                                <Building2 className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                                <span className="text-base font-bold text-gray-300">Organization</span>
                                <p className="text-xs text-gray-500 mt-0.5">Register and manage tournaments</p>
                            </div>
                        </button>

                        <div className="text-center pt-2">
                            <p className="text-gray-500 text-sm">
                                Already have an account?{" "}
                                <Link href={`/sign-in${qs}`} className="text-[#E10600] font-bold hover:text-white transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </motion.div>

                    <PoweredByKtm />
                </div>
            </main>
        );
    }

    // ACCOUNT DETAILS
    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
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
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Create Account</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Registering as{" "}
                        <span className="font-bold text-[#E10600]">
                            {role === "CLUB_MASTER" ? "Club Master" : role === "ORGANIZER" ? "Organization" : "Athlete"}
                        </span>
                    </p>
                </div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                    <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-4">
                        <button
                            type="button"
                            onClick={() => setStep("role-selection")}
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-2"
                        >
                            <ArrowLeft size={14} />
                            Change role
                        </button>

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
                                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                                onBlur={handleEmailBlur}
                                required
                                className={`w-full bg-black border text-white rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700 ${
                                    emailError ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-[#E10600]"
                                }`}
                                placeholder="name@example.com"
                            />
                            {emailError && <p className="text-red-400 text-xs mt-1.5 font-semibold">{emailError}</p>}
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
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
                            <p className="mt-1.5 text-xs text-gray-600">Must be at least 6 characters</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Sign Up
                            {!loading && <ArrowRight size={16} />}
                        </button>

                        <div className="text-center pt-2">
                            <p className="text-gray-500 text-sm">
                                Already have an account?{" "}
                                <Link href={`/sign-in${qs}`} className="text-[#E10600] font-bold hover:text-white transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>

                <PoweredByKtm />
            </div>
        </main>
    );
}
