"use client";

import * as React from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    ArrowRight,
    Eye,
    EyeOff,
    ArrowLeft,
    CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function WOTFSignInPage() {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [verifying, setVerifying] = React.useState(false);
    const [code, setCode] = React.useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    if (!isLoaded && !isRedirecting) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
                <div className="relative w-32 h-32 animate-spin">
                    <Image
                        src="/wotf/WOTF-Logo-Hero.svg"
                        alt="Loading..."
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signIn || !setActive) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                setIsRedirecting(true);
                // Wait for session to propagate
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Client-side nav keeps sign-in page visible until athlete page is ready
                router.push('/athlete');
            } else if (result.status === "needs_second_factor") {
                await signIn.prepareSecondFactor({
                    strategy: "email_code",
                });
                setVerifying(true);
                setIsLoading(false);
            } else {
                console.log(result);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("error", err.errors[0].longMessage);
            setError(err.errors[0].longMessage);
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signIn || !setActive) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.attemptSecondFactor({
                strategy: "email_code",
                code,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                setIsRedirecting(true);
                await new Promise(resolve => setTimeout(resolve, 1000));
                router.push('/athlete');
            } else {
                console.log(result);
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("error", err.errors[0].longMessage);
            setError(err.errors[0].longMessage);
            setIsLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="flex min-h-screen w-full">
                <div className="relative hidden w-1/2 lg:block">
                    <Image src="/wotf/moon-pic.jpg" alt="Taekwondo Action" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-[#0085C7]/80 mix-blend-multiply" />
                </div>

                <div className="relative flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2">
                    <button
                        type="button"
                        onClick={() => setVerifying(false)}
                        className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </button>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md space-y-8"
                    >
                        <div className="text-center lg:text-left">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 lg:mx-0 mb-6">
                                <CheckCircle2 className="h-8 w-8 text-[#0085C7]" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                                2-Step Verification
                            </h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Enter the verification code sent to your email or phone
                            </p>
                        </div>

                        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
                            <div>
                                <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-1">
                                    Verification Code
                                </label>
                                <Input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="h-11 border-gray-300 focus:border-[#0085C7] focus:ring-[#0085C7] text-center text-lg tracking-widest"
                                    placeholder="123456"
                                />
                            </div>

                            {error && (
                                <div className="rounded-md bg-red-50 p-3 text-sm text-[#DF0024]">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base text-white bg-[#0085C7] hover:bg-[#0073ad] transition-all duration-200 shadow-lg shadow-blue-500/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    "Verify"
                                )}
                            </Button>
                        </form>
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
                                    <Link href="#" className="text-sm font-medium text-[#0085C7] hover:text-[#006090]">
                                        Forgot password?
                                    </Link>
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
                            disabled={isLoading}
                        >
                            {isLoading ? (
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
