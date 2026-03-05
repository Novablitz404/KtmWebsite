'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Loader2, ArrowRight } from 'lucide-react'
import Image from 'next/image'

interface Props {
    token: string
    email: string
    role: 'CO_ORGANIZER' | 'MANAGER'
    contextName: string
    inviteId: string
}

export default function InviteOnboardingClient({ token, email, role, contextName, inviteId }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imgPreview, setImgPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImgPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) return toast.error('Please enter your full name')
        if (password.length < 8) return toast.error('Password must be at least 8 characters long')

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('token', token)
            formData.append('name', name.trim())
            formData.append('password', password)
            formData.append('role', role)
            formData.append('inviteId', inviteId)

            if (selectedFile) {
                formData.append('image', selectedFile)
            }

            const res = await fetch('/api/invite/accept', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to complete registration')
            }

            toast.success('Account created successfully!')

            // Redirect using the provided valid path, otherwise default to home
            if (data.redirectTo) {
                router.push(data.redirectTo)
            } else {
                router.push('/')
            }

        } catch (error: any) {
            toast.error(error.message)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-slate-900 p-6 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Join the Team</h1>
                <p className="text-slate-300 text-sm">
                    You're registering as a <strong className="text-white">{role === 'MANAGER' ? 'Tournament Manager' : 'Co-Organizer'}</strong> for <strong className="text-white">{contextName}</strong>
                </p>
            </div>

            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Profile Image Upload */}
                    <div className="flex flex-col items-center justify-center">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-slate-500 transition-colors group"
                        >
                            {imgPreview ? (
                                <Image src={imgPreview} alt="Preview" fill className="object-cover" />
                            ) : (
                                <Camera className="w-8 h-8 text-gray-400 group-hover:text-slate-500 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-medium">Upload</span>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        <p className="text-xs text-gray-500 mt-2">Optional Profile Picture</p>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    {/* Read-only Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">This is the email you were invited with.</p>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Complete Setup <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
