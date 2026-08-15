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

export default function KTMChangePasswordModal({
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                            <KeyRound className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Password Reset Detected</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Your password was recently reset by an administrator.</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {action === 'idle' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-5">
                                Would you like to keep the temporary password or set your own?
                            </p>
                            <button
                                onClick={onKeep}
                                disabled={isSubmitting}
                                className="w-full flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 group"
                            >
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-500" />
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">Keep current password</p>
                                        <p className="text-xs text-gray-500">Continue using the temporary password</p>
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={() => setAction('change')}
                                disabled={isSubmitting}
                                className="w-full flex items-center px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 group"
                            >
                                <div className="flex items-center gap-3">
                                    <KeyRound className="w-5 h-5 text-blue-500" />
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">Set my own password</p>
                                        <p className="text-xs text-gray-500">Choose a new, personal password</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={() => { setAction('idle'); setError('') }}
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
                            >
                                ← Back
                            </button>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                        className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter password"
                                        className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleChange}
                                disabled={isSubmitting || !newPassword || !confirmPassword}
                                className="w-full py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    )}

                    {error && (
                        <p className="mt-3 text-xs text-red-600 text-center font-medium">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-center gap-2">
                    <Image src="/ktmnav.png" alt="KTM" width={50} height={16} className="opacity-40" />
                </div>
            </div>
        </div>
    )
}
