'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'

export default function ResetPasswordPage() {
    const supabase = createBrowserClient()
    const router = useRouter()
    const tenant = useTenant()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Supabase automatically picks up the recovery token from the URL hash
        // when the user clicks the reset link. No manual token handling needed.
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            })

            if (updateError) {
                setError(updateError.message)
                setLoading(false)
                return
            }

            setSuccess(true)
            // Redirect to home after a short delay
            setTimeout(() => {
                window.location.replace('/')
            }, 2000)
        } catch (err: any) {
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="w-full max-w-md text-center bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
                    <p className="text-gray-500 text-sm">Redirecting you to the dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                        <Image
                            src={tenant.logoUrl}
                            alt={`${tenant.name} Logo`}
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Set Your Password</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Choose a new password for your account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[36px] text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-lg"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" /> Updating...</>
                        ) : (
                            'Set Password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
