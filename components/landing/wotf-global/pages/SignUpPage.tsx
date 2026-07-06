"use client";

import { I18nProvider, useI18n } from '../i18n';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, User, Shield, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkEmailAvailability, ensureUserRecord } from '@/app/actions';

function SignUpPageInner() {
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [role, setRole] = useState<'athlete' | 'clubmaster'>('athlete');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [checkEmail, setCheckEmail] = useState(false);

    // OTP state
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const supabase = createBrowserClient();

    const handleEmailBlur = async () => {
        if (!email) return;
        const { available } = await checkEmailAvailability(email);
        setEmailError(available ? null : 'This email is already registered');
    };

    // Step 2 submit: validate form, then send OTP
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (emailError) { return; }

        setLoading(true);
        setError('');

        // Check email availability
        const { available } = await checkEmailAvailability(email);
        if (!available) {
            setEmailError('This email is already registered');
            setLoading(false);
            return;
        }

        // Send OTP to email
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: firstName }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to send verification code');
                setLoading(false);
                return;
            }

            setResendCooldown(60);
            setOtpDigits(['', '', '', '', '', '']);
            setOtpError('');
            setStep(3);
            setLoading(false);
        } catch (err) {
            console.error('Send OTP error:', err);
            setError('Failed to send verification code. Please try again.');
            setLoading(false);
        }
    };

    // Step 3: Verify OTP then create the Supabase account
    const handleVerifyOTP = async () => {
        const code = otpDigits.join('');
        if (code.length !== 6) {
            setOtpError('Please enter all 6 digits');
            return;
        }

        setOtpLoading(true);
        setOtpError('');

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();

            if (!res.ok) {
                setOtpError(data.error || 'Verification failed');
                setOtpLoading(false);
                return;
            }

            // OTP verified — now create the Supabase account
            const supabaseRole = role === 'clubmaster' ? 'CLUB_MASTER' : 'ATHLETE';
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`,
                        first_name: firstName,
                        last_name: lastName,
                        role: supabaseRole,
                        tenant: tenantParam || 'wotf-global',
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?role=${supabaseRole}${qs ? '&' + qs.slice(1) : ''}`,
                }
            });

            if (authError) {
                setOtpError(authError.message);
                setOtpLoading(false);
                return;
            }

            if (authData.session) {
                // Fix B — create the DB row now so the account is never a
                // "zombie" (auth user with no DB row) if onboarding is abandoned.
                await ensureUserRecord();
                router.push(`/onboarding/complete-profile${qs}`);
            } else {
                setCheckEmail(true);
                setOtpLoading(false);
            }
        } catch (err: any) {
            console.error('Verify OTP error:', err);
            setOtpError('Something went wrong. Please try again.');
            setOtpLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;
        setOtpError('');
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name: firstName }),
            });
            if (res.ok) {
                setResendCooldown(60);
                setOtpDigits(['', '', '', '', '', '']);
            } else {
                const data = await res.json();
                setOtpError(data.error || 'Failed to resend code');
            }
        } catch {
            setOtpError('Failed to resend code');
        }
    };

    // Handle OTP input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);
        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter' && otpDigits.join('').length === 6) {
            handleVerifyOTP();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtpDigits(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    // --- Accent dots component ---
    const AccentDots = () => (
        <div className="flex justify-center gap-1.5 mt-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0085C7]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#F4C300]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#009F3D]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#DF0024]" />
        </div>
    );

    // --- Check Email Screen ---
    if (checkEmail) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#009F3D]/5 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md">
                    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#009F3D]/10 flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-8 w-8 text-[#009F3D]" />
                        </div>
                        <h2 className="text-white font-bold text-lg mb-2">Check Your Email</h2>
                        <p className="text-gray-500 text-sm mb-2">
                            We sent a confirmation link to
                        </p>
                        <p className="text-white font-bold text-sm mb-6">{email}</p>
                        <p className="text-gray-600 text-xs mb-6">
                            Click the link to verify your account and start your profile setup.
                        </p>
                        <button
                            onClick={() => setCheckEmail(false)}
                            className="text-sm font-semibold text-[#0085C7] hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                            <ArrowLeft size={14} />
                            Change email address
                        </button>
                    </div>
                    <AccentDots />
                </div>
            </main>
        );
    }

    // --- Step 3: OTP Verification ---
    if (step === 3) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#F4C300]/5 rounded-full blur-[150px]" />
                </div>
                <div className="relative z-10 w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link href={`/${qs}`}>
                            <Image src="/wotf/logo_image.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Verify Email</h1>
                        <p className="text-gray-500 text-sm mt-2">
                            Enter the 6-digit code sent to
                        </p>
                        <p className="text-white font-bold text-sm mt-1">{email}</p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                            {/* Back button */}
                            <button
                                type="button"
                                onClick={() => { setStep(2); setOtpError(''); }}
                                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={14} />
                                Back
                            </button>

                            {/* OTP Inputs */}
                            <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                                {otpDigits.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className={`w-12 h-14 text-center text-xl font-bold bg-black border rounded-lg text-white focus:outline-none transition-colors ${
                                            digit ? 'border-[#0085C7]' : 'border-white/10'
                                        } focus:border-[#0085C7]`}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            {otpError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 text-center">
                                    {otpError}
                                </div>
                            )}

                            {/* Verify Button */}
                            <button
                                onClick={handleVerifyOTP}
                                disabled={otpLoading || otpDigits.join('').length !== 6}
                                className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {otpLoading && <Loader2 size={16} className="animate-spin" />}
                                Verify & Create Account
                            </button>

                            {/* Resend */}
                            <div className="text-center">
                                <p className="text-gray-600 text-xs mb-2">Didn't receive the code?</p>
                                <button
                                    onClick={handleResendOTP}
                                    disabled={resendCooldown > 0}
                                    className="text-sm font-semibold text-[#0085C7] hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    <AccentDots />
                </div>
            </main>
        );
    }

    // --- Step 1: Role Selection ---
    if (step === 1) {
        return (
            <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0085C7]/5 rounded-full blur-[150px]" />
                </div>

                <div className="relative z-10 w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href={`/${qs}`}>
                            <Image src="/wotf/logo_image.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                            {t('signup.title')}
                        </h1>
                        <p className="text-gray-500 text-sm mt-2">
                            How would you like to register?
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                    >
                        {/* Athlete Card */}
                        <button
                            type="button"
                            onClick={() => setRole('athlete')}
                            className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                                role === 'athlete'
                                    ? 'border-[#DF0024] bg-[#DF0024]/5 shadow-lg shadow-[#DF0024]/10'
                                    : 'border-white/10 bg-[#0A0A0A] hover:border-white/20 hover:bg-white/5'
                            }`}
                        >
                            <div className={`flex items-center justify-center h-12 w-12 rounded-full transition-colors ${
                                role === 'athlete' ? 'bg-[#DF0024]/15' : 'bg-white/5'
                            }`}>
                                <User className={`h-6 w-6 transition-colors ${
                                    role === 'athlete' ? 'text-[#DF0024]' : 'text-gray-500'
                                }`} />
                            </div>
                            <div>
                                <span className={`text-base font-bold transition-colors ${
                                    role === 'athlete' ? 'text-[#DF0024]' : 'text-gray-300'
                                }`}>
                                    Athlete
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Register as a taekwondo athlete
                                </p>
                            </div>
                        </button>

                        {/* Clubmaster Card */}
                        <button
                            type="button"
                            onClick={() => setRole('clubmaster')}
                            className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                                role === 'clubmaster'
                                    ? 'border-[#0085C7] bg-[#0085C7]/5 shadow-lg shadow-[#0085C7]/10'
                                    : 'border-white/10 bg-[#0A0A0A] hover:border-white/20 hover:bg-white/5'
                            }`}
                        >
                            <div className={`flex items-center justify-center h-12 w-12 rounded-full transition-colors ${
                                role === 'clubmaster' ? 'bg-[#0085C7]/15' : 'bg-white/5'
                            }`}>
                                <Shield className={`h-6 w-6 transition-colors ${
                                    role === 'clubmaster' ? 'text-[#0085C7]' : 'text-gray-500'
                                }`} />
                            </div>
                            <div>
                                <span className={`text-base font-bold transition-colors ${
                                    role === 'clubmaster' ? 'text-[#0085C7]' : 'text-gray-300'
                                }`}>
                                    Clubmaster
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Register and manage your club
                                </p>
                            </div>
                        </button>

                        {/* Continue Button */}
                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            Continue
                            <ArrowRight size={16} />
                        </button>

                        {/* Sign In Link */}
                        <div className="text-center pt-2">
                            <p className="text-gray-500 text-sm">
                                {t('signup.hasAccount')}{' '}
                                <Link href={`/sign-in${qs}`} className="text-[#0085C7] font-bold hover:text-white transition-colors">
                                    {t('signup.signIn')}
                                </Link>
                            </p>
                        </div>
                    </motion.div>

                    <AccentDots />
                </div>
            </main>
        );
    }

    // --- Step 2: Account Details ---
    return (
        <main className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute inset-0">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#009F3D]/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href={`/${qs}`}>
                        <Image src="/wotf/logo_image.png" alt="WOTF" width={64} height={64} className="mx-auto mb-4" />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Create Account</h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Registering as{' '}
                        <span className={`font-bold ${role === 'clubmaster' ? 'text-[#0085C7]' : 'text-[#DF0024]'}`}>
                            {role === 'clubmaster' ? 'Clubmaster' : 'Athlete'}
                        </span>
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 md:p-8 space-y-4">
                        {/* Back button */}
                        <button
                            type="button"
                            onClick={() => setStep(1)}
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signup.firstName')}</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signup.lastName')}</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signup.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                                onBlur={handleEmailBlur}
                                required
                                className={`w-full bg-black border text-white rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-gray-700 ${
                                    emailError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#0085C7]'
                                }`}
                                placeholder="name@example.com"
                            />
                            {emailError && (
                                <p className="text-red-400 text-xs mt-1.5 font-semibold">{emailError}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signup.password')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
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

                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{t('signup.confirmPassword')}</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {t('signup.button')}
                        </button>

                        <div className="text-center pt-2">
                            <p className="text-gray-500 text-sm">
                                {t('signup.hasAccount')}{' '}
                                <Link href={`/sign-in${qs}`} className="text-[#0085C7] font-bold hover:text-white transition-colors">
                                    {t('signup.signIn')}
                                </Link>
                            </p>
                        </div>
                    </form>
                </motion.div>

                <AccentDots />
            </div>
        </main>
    );
}

export default function GlobalSignUpPage() {
    return (
        <I18nProvider>
            <SignUpPageInner />
        </I18nProvider>
    );
}
