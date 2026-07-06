"use client";

import * as React from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, User, Shield, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { checkEmailAvailability, ensureUserRecord } from "@/app/actions";

export default function WOTFSignUpPage() {
    const supabase = createBrowserClient();
    const [step, setStep] = React.useState<1 | 2>(1);
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [role, setRole] = React.useState<"athlete" | "clubmaster">("athlete");
    const [checkEmail, setCheckEmail] = React.useState(false);
    const [emailError, setEmailError] = React.useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const handleEmailBlur = async () => {
        if (!email) return;
        const { available } = await checkEmailAvailability(email);
        setEmailError(available ? null : 'This email is already registered');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (emailError) { setIsLoading(false); return; }

        const { available } = await checkEmailAvailability(email);
        if (!available) {
            setEmailError('This email is already registered');
            setIsLoading(false);
            return;
        }

        try {
            const supabaseRole = role === 'clubmaster' ? 'CLUB_MASTER' : 'ATHLETE';
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { role: supabaseRole, tenant: tenantParam || 'ktm' },
                    emailRedirectTo: `${window.location.origin}/auth/callback?role=${supabaseRole}${qs ? '&' + qs.slice(1) : ''}`,
                }
            });

            if (signUpError) {
                setError(signUpError.message);
                setIsLoading(false);
                return;
            }

            if (data.session) {
                // Auto-confirmed — create the DB row now so an abandoned
                // onboarding never leaves a "zombie" auth account (Fix B).
                await ensureUserRecord();
                router.push(`/onboarding/complete-profile${qs}`);
            } else {
                // Email confirmation required
                setCheckEmail(true);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Sign up error", err);
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    // --- Check Email Screen ---
    if (checkEmail) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="relative hidden w-1/2 lg:block">
                    <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-[#DF0024]/80 mix-blend-multiply" />
                </div>
                <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <Mail className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
                        <p className="text-gray-500">
                            We sent a confirmation link to<br />
                            <span className="font-bold text-gray-900">{email}</span>
                        </p>
                        <p className="text-sm text-gray-400">
                            Click the link to verify your account and start your profile setup.
                        </p>
                        <button
                            onClick={() => setCheckEmail(false)}
                            className="text-sm font-semibold text-[#DF0024] hover:text-[#b3001d]"
                        >
                            ← Change email address
                        </button>
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                        <span className="text-[11px] text-gray-400 font-medium">Powered by</span>
                        <Image src="/ktmnav.png" alt="KTM" width={60} height={20} className="opacity-50" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Step 1: Role Selection ---
    if (step === 1) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="relative hidden w-1/2 lg:block">
                    <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-[#DF0024]/80 mix-blend-multiply" />
                </div>

                <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                    <Link
                        href={`/sign-in${qs}`}
                        className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md space-y-8"
                    >
                        <div className="text-center">
                            <div className="relative h-28 w-28 mx-auto mb-6">
                                <Image src="/wotf/WOTF-Logo-Hero.svg" alt="WOTF Logo" fill className="object-contain" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                Join WOTF
                            </h1>
                            <p className="mt-2 text-sm text-gray-600">
                                How would you like to register?
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <button
                                type="button"
                                onClick={() => setRole("athlete")}
                                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${role === "athlete"
                                    ? "border-[#DF0024] bg-red-50 shadow-lg shadow-red-100"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                <div className={`flex items-center justify-center h-12 w-12 rounded-full ${role === "athlete" ? "bg-[#DF0024]/10" : "bg-gray-100"}`}>
                                    <User className={`h-6 w-6 ${role === "athlete" ? "text-[#DF0024]" : "text-gray-400"}`} />
                                </div>
                                <div>
                                    <span className={`text-base font-bold ${role === "athlete" ? "text-[#DF0024]" : "text-gray-700"}`}>
                                        Athlete
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Register as a taekwondo athlete
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole("clubmaster")}
                                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${role === "clubmaster"
                                    ? "border-[#0085C7] bg-blue-50 shadow-lg shadow-blue-100"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                <div className={`flex items-center justify-center h-12 w-12 rounded-full ${role === "clubmaster" ? "bg-[#0085C7]/10" : "bg-gray-100"}`}>
                                    <Shield className={`h-6 w-6 ${role === "clubmaster" ? "text-[#0085C7]" : "text-gray-400"}`} />
                                </div>
                                <div>
                                    <span className={`text-base font-bold ${role === "clubmaster" ? "text-[#0085C7]" : "text-gray-700"}`}>
                                        Clubmaster
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Register and manage your club
                                    </p>
                                </div>
                            </button>
                        </div>

                        <Button
                            onClick={() => setStep(2)}
                            className="w-full h-12 text-base text-white bg-[#DF0024] hover:bg-[#b3001d] transition-all duration-200 shadow-lg shadow-red-500/20"
                        >
                            Continue
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <div className="text-center text-sm">
                            <span className="text-gray-500">Already have an account? </span>
                            <Link href={`/sign-in${qs}`} className="font-bold text-[#0085C7] hover:text-[#0073ad] transition-colors">
                                Sign in
                            </Link>
                        </div>
                    </motion.div>

                    <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                        <span className="text-[11px] text-gray-400 font-medium">Powered by</span>
                        <Image src="/ktmnav.png" alt="KTM" width={60} height={20} className="opacity-50" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Step 2: Email & Password ---
    return (
        <div className="flex min-h-screen w-full">
            <div className="relative hidden w-1/2 lg:block">
                <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-[#DF0024]/80 mix-blend-multiply" />
            </div>

            <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
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
                            Create your account
                        </h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Registering as <span className={`font-semibold ${role === "clubmaster" ? "text-[#0085C7]" : "text-[#DF0024]"}`}>{role === "clubmaster" ? "Clubmaster" : "Athlete"}</span>
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
                                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                                    onBlur={handleEmailBlur}
                                    className={`h-11 ${emailError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-300 focus:border-[#DF0024] focus:ring-[#DF0024]'}`}
                                    placeholder="name@example.com"
                                />
                                {emailError && (
                                    <p className="text-red-500 text-xs mt-1 font-semibold">{emailError}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-11 border-gray-300 focus:border-[#DF0024] focus:ring-[#DF0024] pr-11"
                                        placeholder="Create a password"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Must be at least 6 characters long
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-[#DF0024]">{error}</div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base text-white bg-[#DF0024] hover:bg-[#b3001d] transition-all duration-200 shadow-lg shadow-red-500/20"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign up
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-gray-500">Already have an account? </span>
                        <Link href={`/sign-in${qs}`} className="font-bold text-[#0085C7] hover:text-[#0073ad] transition-colors">
                            Sign in
                        </Link>
                    </div>
                </motion.div>

                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium">Powered by</span>
                    <Image src="/ktmnav.png" alt="KTM" width={60} height={20} className="opacity-50" />
                </div>
            </div>
        </div>
    );
}
