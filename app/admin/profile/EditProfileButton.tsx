'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { updateAdminProfile } from '../actions'

export default function EditProfileButton() {
    const { user } = useUser()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [name, setName] = useState(user?.fullName || '')
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsLoading(true)
        try {
            // 1. Update Profile Image (if changed)
            if (file) {
                await user.setProfileImage({ file })
            }

            // 2. Sync Name to Database (Prisma)
            // We do NOT update Clerk name as the App uses the Internal Database for names
            await updateAdminProfile(name)

            setIsOpen(false)
            setFile(null)
            setPreview(null)
            // Optional: Toast success
        } catch (error) {
            console.error(error)
            alert('Failed to update profile.')
        } finally {
            setIsLoading(false)
        }
    }

    if (!user) return null

    return (
        <>
            <button
                onClick={() => {
                    setName(user.fullName || '')
                    setIsOpen(true)
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
            >
                Edit Profile
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Edit Profile</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Image Section */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group cursor-pointer">
                                    <img
                                        src={preview || user.imageUrl}
                                        alt="Preview"
                                        className="w-24 h-24 rounded-full object-cover border-2 border-indigo-100"
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-medium">Change</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Click image to upload new photo</p>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center"
                                >
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
