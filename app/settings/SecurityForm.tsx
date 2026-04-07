'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function SecurityForm() {
    const supabase = createBrowserClient()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [showPasswords, setShowPasswords] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) {
                toast.error(error.message)
            } else {
                toast.success('Password updated successfully!')
                setNewPassword('')
                setConfirmPassword('')
            }
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update password')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-5">

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Change Password</p>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                Confirm New Password
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm font-medium"
                            />
                        </div>

                        {/* Match indicator */}
                        {confirmPassword.length > 0 && (
                            <p className={`text-xs font-bold flex items-center gap-1.5 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${newPassword === confirmPassword ? 'bg-green-500' : 'bg-red-400'}`} />
                                {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                            </p>
                        )}

                        {/* Show/hide */}
                        <button
                            type="button"
                            onClick={() => setShowPasswords(!showPasswords)}
                            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                            {showPasswords ? 'Hide passwords' : 'Show passwords'}
                        </button>

                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={saving || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Security Tips */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security Tips</p>
                </div>
                <div className="p-6">
                    <ul className="space-y-3 text-sm text-gray-600">
                        {[
                            'Use at least 8 characters with a mix of letters, numbers, and symbols',
                            "Don't reuse passwords from other websites",
                            'Change your password regularly for better security',
                        ].map((tip, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5 font-bold">✓</span>
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

        </div>
    )
}
