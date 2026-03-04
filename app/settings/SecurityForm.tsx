'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import LoadingButton from '@/components/ui/LoadingButton'

export default function SecurityForm() {
    const { user } = useUser()
    const [currentPassword, setCurrentPassword] = useState('')
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

        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setSaving(true)
        try {
            await user?.updatePassword({
                currentPassword,
                newPassword,
            })
            toast.success('Password updated successfully!')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            const msg = error?.errors?.[0]?.longMessage || error?.message || 'Failed to update password'
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                    <p className="text-sm text-gray-500 mt-1">Update your password to keep your account secure.</p>
                </div>
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                placeholder="Enter current password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50 focus:bg-white"
                            />
                        </div>

                        {/* Show/Hide toggle */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showPasswords}
                                onChange={() => setShowPasswords(!showPasswords)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-600">Show passwords</span>
                        </label>

                        <div className="pt-2">
                            <LoadingButton
                                type="submit"
                                isLoading={saving}
                                loadingText="Updating..."
                                variant="warning"
                                className="px-6 bg-gradient-to-r from-orange-500 to-amber-600 border-0 hover:opacity-90 hover:shadow-lg"
                            >
                                Update Password
                            </LoadingButton>
                        </div>
                    </form>
                </div>
            </div>

            {/* Security Tips */}
            <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Security Tips</h3>
                </div>
                <div className="p-6">
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Use at least 8 characters with a mix of letters, numbers, and symbols
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Don&apos;t reuse passwords from other websites
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            Change your password regularly for better security
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
