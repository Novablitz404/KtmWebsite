"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

// Length of the one-time code Supabase emails on sign-up. Must match "Email OTP Length" in the Supabase project
// (Authentication settings), and the mobile app uses the same length.
export const EMAIL_CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

interface EmailCodeFormProps {
    email: string;
    /** Called once the code is accepted and the user is signed in. Typically creates the DB row and starts onboarding. */
    onVerified: () => void | Promise<void>;
    onChangeEmail: () => void;
    /** Keeps the "confirm" link in the email working when the code is requested again. */
    emailRedirectTo?: string;
    theme?: "dark" | "light";
    /** Brand color (hex) for the icon, focus ring, button and links. */
    accent?: string;
}

/**
 * "Enter the 6-digit code we emailed you" step shared by every sign-up page (KTM and each tenant).
 * Verifies the code with Supabase, which signs the user in; the page then continues to profile setup.
 */
export default function EmailCodeForm({ email, onVerified, onChangeEmail, emailRedirectTo, theme = "dark", accent = "#DC2626" }: EmailCodeFormProps) {
    const supabase = createBrowserClient();
    const dark = theme === "dark";
    const [digits, setDigits] = useState<string[]>(Array(EMAIL_CODE_LENGTH).fill(""));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [cooldown, setCooldown] = useState(RESEND_SECONDS);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = window.setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    const verify = async (code: string) => {
        if (loading) return;
        setLoading(true);
        setError("");
        setNotice("");
        const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
        if (verifyError) {
            setError(/expired|invalid/i.test(verifyError.message)
                ? "That code is wrong or has expired. Check it or request a new one."
                : verifyError.message);
            setDigits(Array(EMAIL_CODE_LENGTH).fill(""));
            setLoading(false);
            inputs.current[0]?.focus();
            return;
        }
        try {
            // Stay in the loading state on success: the page navigates away.
            await onVerified();
        } catch (err) {
            console.error("Sign up error", err);
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    // Fills the boxes from `start`, so typing, pasting and browser/phone autofill of the whole code all work.
    const fill = (start: number, value: string) => {
        const incoming = value.replace(/\D/g, "").slice(0, EMAIL_CODE_LENGTH - start);
        if (!incoming) return;
        const next = [...digits];
        incoming.split("").forEach((digit, i) => { next[start + i] = digit; });
        setDigits(next);
        setError("");
        const last = Math.min(start + incoming.length, EMAIL_CODE_LENGTH - 1);
        inputs.current[last]?.focus();
        if (next.every(Boolean)) verify(next.join(""));
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            const next = [...digits];
            if (next[index]) {
                next[index] = "";
                setDigits(next);
            } else if (index > 0) {
                next[index - 1] = "";
                setDigits(next);
                inputs.current[index - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            inputs.current[index - 1]?.focus();
        } else if (e.key === "ArrowRight" && index < EMAIL_CODE_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        fill(index, e.clipboardData.getData("text"));
    };

    const resend = async () => {
        if (cooldown > 0) return;
        setError("");
        setNotice("");
        const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
        });
        if (resendError) {
            setError(resendError.message);
            return;
        }
        setNotice("A new code is on its way.");
        setCooldown(RESEND_SECONDS);
    };

    const complete = digits.every(Boolean);

    return (
        <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${accent}1A` }}>
                <Mail className="h-8 w-8" style={{ color: accent }} />
            </div>
            <h2 className={`font-bold text-lg mb-2 ${dark ? "text-white" : "text-2xl text-gray-900"}`}>Enter Your Code</h2>
            <p className={`text-sm mb-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>We sent a {EMAIL_CODE_LENGTH}-digit code to</p>
            <p className={`font-bold text-sm mb-6 break-all ${dark ? "text-white" : "text-gray-900"}`}>{email}</p>

            <div className="flex justify-center gap-2 mb-4">
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { inputs.current[i] = el; }}
                        value={digit}
                        onChange={e => fill(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={e => handlePaste(i, e)}
                        onFocus={e => e.target.select()}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        aria-label={`Digit ${i + 1} of ${EMAIL_CODE_LENGTH}`}
                        disabled={loading}
                        className={`w-11 h-14 text-center text-xl font-bold rounded-lg border focus:outline-none transition-colors disabled:opacity-50 ${
                            error
                                ? "border-red-500"
                                : dark ? "bg-black border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                        } ${dark ? "bg-black text-white" : "bg-white text-gray-900"}`}
                        style={digit && !error ? { borderColor: accent } : undefined}
                    />
                ))}
            </div>

            {error && <p role="alert" className="text-red-500 text-sm mb-4">{error}</p>}
            {notice && !error && <p className={`text-sm mb-4 ${dark ? "text-gray-400" : "text-gray-500"}`}>{notice}</p>}

            <button
                type="button"
                onClick={() => verify(digits.join(""))}
                disabled={!complete || loading}
                className="w-full text-white font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                style={{ backgroundColor: accent }}
            >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Confirm
            </button>

            <div className="mt-5 flex flex-col items-center gap-3">
                <button
                    type="button"
                    onClick={resend}
                    disabled={cooldown > 0}
                    className="text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: accent }}
                >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
                <button
                    type="button"
                    onClick={onChangeEmail}
                    className={`text-sm font-semibold inline-flex items-center gap-2 transition-colors ${dark ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
                >
                    <ArrowLeft size={14} />
                    Change email address
                </button>
            </div>
        </div>
    );
}
