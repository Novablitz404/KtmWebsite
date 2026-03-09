"use client";

import * as React from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminSignInPage() {
    const supabase = createBrowserClient();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [error, setError] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const router = useRouter();

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
                setError("Invalid credentials.");
                setIsLoading(false);
                return;
            }

            if (data.session) {
                setIsRedirecting(true);
                try {
                    const res = await fetch('/api/me');
                    const meData = await res.json();
                    const role = meData?.data?.role;

                    if (role === 'ADMIN') {
                        router.push('/admin');
                    } else if (role === 'ORGANIZER' || role === 'MANAGER') {
                        router.push('/organization');
                    } else {
                        // Not an admin — sign them out and show error
                        await supabase.auth.signOut();
                        setError("Access denied. Admin accounts only.");
                        setIsRedirecting(false);
                        setIsLoading(false);
                    }
                } catch {
                    setError("Something went wrong. Please try again.");
                    setIsRedirecting(false);
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            console.error("Sign in error", err);
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '40px 40px'
            }} />

            {/* Subtle glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md px-6"
            >
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="relative h-12 w-auto mx-auto mb-6">
                            <Image src="/ktmnav_white.png" alt="KTM Logo" width={160} height={48} className="mx-auto object-contain" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/10 border border-red-600/20 rounded-full mb-4">
                            <Shield className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Admin Portal</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            Platform Administration
                        </h1>
                        <p className="mt-1.5 text-sm text-gray-500">
                            Authorized personnel only
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 px-4 rounded-lg text-sm text-white placeholder-gray-600 bg-gray-800/50 border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all"
                                placeholder="admin@ktmsports.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 px-4 pr-11 rounded-lg text-sm text-white placeholder-gray-600 bg-gray-800/50 border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 focus:outline-none transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base text-white bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-600/20"
                            disabled={isLoading || isRedirecting}
                        >
                            {isLoading || isRedirecting ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    © {new Date().getFullYear()} KTM Sports Technology
                </p>
            </motion.div>
        </div>
    );
}
