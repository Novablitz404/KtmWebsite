'use client'

import { useState } from 'react'
import { KeyRound, Check, Loader2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

interface ChangePasswordModalProps {
    onKeep: () => Promise<void>
    onChange: (newPassword: string) => Promise<void>
    error: string
    setError: (error: string) => void
    isSubmitting: boolean
}

export default function WOTFGlobalChangePasswordModal({
    onKeep, onChange, error, setError, isSubmitting,
}: ChangePasswordModalProps) {
    const [action, setAction] = useState<'idle' | 'change'>('idle')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = () => {
        if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
        onChange(newPassword)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Logo */}
                <div className="text-center mb-6">
                    <Image
                        src="/wotf-global/Wotf_logo_Final.png"
                        alt="WOTF Global"
                        width={56}
                        height={56}
                        className="mx-auto"
                    />
                </div>

                {/* Card */}
                <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <KeyRound className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white tracking-tight">Password Reset Detected</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Your password was recently reset by an administrator.</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {action === 'idle' ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-400 mb-5">
                                    Would you like to keep the temporary password or set your own?
                                </p>

                                {/* Keep option */}
                                <button
                                    onClick={onKeep}
                                    disabled={isSubmitting}
                                    className="w-full flex items-center px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all disabled:opacity-50 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-white">Keep current password</p>
                                            <p className="text-[11px] text-gray-500">Continue using the temporary password</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Change option */}
                                <button
                                    onClick={() => setAction('change')}
                                    disabled={isSubmitting}
                                    className="w-full flex items-center px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all disabled:opacity-50 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[#0085C7]/10 border border-[#0085C7]/20 flex items-center justify-center">
                                            <KeyRound className="w-4 h-4 text-[#0085C7]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-white">Set my own password</p>
                                            <p className="text-[11px] text-gray-500">Choose a new, personal password</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={() => { setAction('idle'); setError('') }}
                                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1 mb-2 transition-colors"
                                >
                                    ← Back
                                </button>

                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min 6 characters"
                                            className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
                                            autoFocus
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

                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            className="w-full bg-black border border-white/10 text-white rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#0085C7] transition-colors placeholder:text-gray-700"
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
                                    onClick={handleChange}
                                    disabled={isSubmitting || !newPassword || !confirmPassword}
                                    className="w-full bg-white text-black font-bold text-sm uppercase tracking-widest py-3.5 rounded-full hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                    {isSubmitting ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg px-4 py-2.5 text-center">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Olympic accent dots */}
                <div className="flex justify-center gap-1.5 mt-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0085C7]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4C300]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#009F3D]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DF0024]" />
                </div>
            </div>
        </div>
    )
}
