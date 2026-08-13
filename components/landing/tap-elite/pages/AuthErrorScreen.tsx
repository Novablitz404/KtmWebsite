"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface AuthErrorScreenProps {
    errorCode: string | null;
    description: string;
    qs: string;
}

const TITLES: Record<string, string> = {
    otp_expired: "Link Expired",
    access_denied: "Access Denied",
};

export default function AuthErrorScreen({ errorCode, description, qs }: AuthErrorScreenProps) {
    const title = (errorCode && TITLES[errorCode]) || "Something Went Wrong";

    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E10600]/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center">
                <Link href={`/${qs}`}>
                    <Image
                        src="/tap-elite/tap_elite_horizontal_transparent.png"
                        alt="Tap Elite"
                        width={240}
                        height={96}
                        className="mx-auto mb-5 h-auto"
                    />
                </Link>

                <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{title}</h1>
                    <p className="text-gray-500 text-sm mb-6">{description}</p>

                    <div className="space-y-3">
                        <Link
                            href={`/sign-in/forgot-password${qs}`}
                            className="w-full flex items-center justify-center gap-2 bg-[#E10600] text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-[#FF2A21] transition-colors"
                        >
                            Request New Reset Link
                        </Link>
                        <Link
                            href={`/sign-in${qs}`}
                            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2">
                    <span className="text-[11px] text-gray-500 font-medium">Powered by</span>
                    <Image src="/ktmnav_white.png" alt="KTM Sports" width={54} height={18} className="opacity-60" />
                </div>
            </div>
        </main>
    );
}
