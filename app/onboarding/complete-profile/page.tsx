'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Camera, Ruler, Weight, CheckCircle, Upload, ArrowRight, User } from 'lucide-react'
import Image from 'next/image'
import GlobalDropdown from '@/components/GlobalDropdown'

export default function CompleteProfilePage() {
    const { user, isLoaded } = useUser()
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        weight: '',
        height: '',
        belt: ''
    })
    const [role, setRole] = useState<string | null>(null)
    const [imgPreview, setImgPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Pre-fill existing data
    useEffect(() => {
        if (!isLoaded || !user) return

        // Fetch current DB data
        fetch('/api/user/role')
            .then(res => res.json())
            .then(data => {
                setFormData({
                    weight: data.weight ? String(data.weight) : '',
                    height: data.height ? String(data.height) : '',
                    belt: data.belt || ''
                })
                if (data.role) {
                    setRole(data.role)
                }
            })

        if (user.imageUrl) {
            setImgPreview(user.imageUrl)
        }
    }, [isLoaded, user])

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
        if (!user) return

        if (!user.hasImage && !selectedFile) {
            toast.error('Please upload a profile picture')
            return
        }

        if (role === 'ATHLETE') {
            if (role === 'ATHLETE') {
                if (!formData.weight || !formData.height || !formData.belt) {
                    toast.error('Please enter your weight, height, and belt')
                    return
                }
            }
        }

        setIsSubmitting(true)

        try {
            const submitData = new FormData()
            submitData.append('name', user.fullName || user.firstName || 'Athlete') // API requires name
            submitData.append('name', user.fullName || user.firstName || 'Athlete') // API requires name
            submitData.append('weight', formData.weight)
            submitData.append('height', formData.height)
            submitData.append('belt', formData.belt)

            if (selectedFile) {
                submitData.append('image', selectedFile)
            }

            const res = await fetch('/api/v1/athlete/profile', {
                method: 'PUT',
                body: submitData
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || 'Failed to update profile')
            }

            toast.success('Profile completed successfully!')

            // Force re-check and redirect
            window.location.href = '/'

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Something went wrong')
            setIsSubmitting(false)
        }
    }

    if (!isLoaded) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">



            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-gray-100">
                    <div className="h-full bg-red-600 w-[90%] rounded-r-full"></div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10">

                    {/* Profile Picture Section */}
                    <div className="space-y-6 text-center">
                        <div className="inline-block relative group">
                            <div className="w-40 h-40 rounded-full overflow-hidden border-[6px] border-white shadow-2xl bg-gray-100 relative mx-auto ring-1 ring-gray-100">
                                {imgPreview ? (
                                    <Image
                                        src={imgPreview}
                                        alt="Profile"
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50">
                                        <User className="w-16 h-16 mb-2 opacity-50" />
                                    </div>
                                )}

                                <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                                    <Camera className="w-10 h-10 text-white mb-2" />
                                    <span className="text-white text-xs font-bold uppercase tracking-wider">Change Photo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {!imgPreview && (
                                <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-2.5 rounded-full shadow-lg border-4 border-white animate-bounce">
                                    <Camera className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900">Profile Photo</h2>
                            <p className="text-gray-500 text-sm">
                                Upload a clear photo for your athlete ID. <br />
                                <span className="text-red-500 font-bold text-xs uppercase tracking-wide">Required</span>
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    {/* Measurements Section - Only for Athletes */}
                    {role === 'ATHLETE' && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                                {/* Weight Input */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        Weight (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Weight className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.1"
                                            required
                                            value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                            className="block w-full pl-12 pr-12 py-4 bg-gray-50 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-lg"
                                            placeholder="0.0"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-gray-400 font-bold text-sm">KG</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Height Input */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                        Height (cm) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Ruler className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                        </div>
                                        <input
                                            type="number"
                                            step="1"
                                            required
                                            value={formData.height}
                                            onChange={e => setFormData({ ...formData, height: e.target.value })}
                                            className="block w-full pl-12 pr-12 py-4 bg-gray-50 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold text-lg"
                                            placeholder="0"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-gray-400 font-bold text-sm">CM</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Belt Input */}
                            <div className="space-y-3">
                                <GlobalDropdown
                                    label="Current Belt Rank"
                                    value={formData.belt}
                                    onChange={(val) => setFormData({ ...formData, belt: val })}
                                    options={[
                                        'White',
                                        'Low Yellow', 'High Yellow',
                                        'Low Blue', 'High Blue',
                                        'Low Red', 'High Red',
                                        'Low Brown', 'High Brown',
                                        'Black'
                                    ]}
                                    required
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-400 ml-1">
                                    <span className="font-bold text-red-500">Note:</span> You can only set your belt once. Future updates must be done by your Club Master.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-600/30 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg group"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Saving Profile...</span>
                                </div>
                            ) : (
                                <>
                                    <span>Complete Profile</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            By clicking "Complete Profile", you confirm that your details are accurate.
                        </p>
                    </div>

                </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-sm text-gray-400">
                    &copy; {new Date().getFullYear()} Taekwondo Management System
                </p>
            </div>
        </div>
    )
}
