'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Save, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { updatePromotionTest, deletePromotionTest } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import GlobalCalendar from '@/components/GlobalCalendar'
import { PromotionTest } from '@prisma/client'

interface PromotionSettingsProps {
    promotionTest: PromotionTest
}

export default function PromotionSettings({ promotionTest }: PromotionSettingsProps) {
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Date State
    const [testDate, setTestDate] = useState<Date | undefined>(promotionTest.testDate ? new Date(promotionTest.testDate) : undefined)
    const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(promotionTest.registrationDeadline ? new Date(promotionTest.registrationDeadline) : undefined)

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSaving(true)

        const formData = new FormData(e.currentTarget)
        formData.append('promotionTestId', promotionTest.id)

        const result = await updatePromotionTest(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Promotion test updated successfully!')
            router.refresh()
        }
        setIsSaving(false)
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this promotion test? This action cannot be undone.')) return

        setIsDeleting(true)
        const result = await deletePromotionTest(promotionTest.id)

        if (result.error) {
            toast.error(result.error)
            setIsDeleting(false)
        } else {
            toast.success('Promotion test deleted')
            router.push('/organization?tab=events')
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 font-medium pt-1">Manage promotion test details and configuration.</p>
            </div>

            <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">General Information</p>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Name */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Test Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={promotionTest.name}
                                required
                                className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium text-gray-900"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea
                                name="description"
                                defaultValue={promotionTest.description || ''}
                                rows={4}
                                className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all resize-none font-medium text-gray-900"
                            />
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <GlobalCalendar
                                    label="Test Date"
                                    value={testDate}
                                    onChange={(date) => {
                                        setTestDate(date)
                                        const input = document.getElementById('settings-testDate') as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Test date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" id="settings-testDate" name="testDate" defaultValue={testDate ? format(testDate, 'yyyy-MM-dd') : ''} required />
                            </div>
                            <div>
                                <GlobalCalendar
                                    label="Reg. Deadline"
                                    value={registrationDeadline}
                                    onChange={(date) => {
                                        setRegistrationDeadline(date)
                                        const input = document.getElementById('settings-registrationDeadline') as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Deadline..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" id="settings-registrationDeadline" name="registrationDeadline" defaultValue={registrationDeadline ? format(registrationDeadline, 'yyyy-MM-dd') : ''} />
                            </div>
                        </div>

                        {/* Venue */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Venue
                            </label>
                            <input
                                name="venue"
                                type="text"
                                defaultValue={promotionTest.venue || ''}
                                className="w-full px-5 py-3 rounded-xl border border-gray-100 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-medium text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-gray-50">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center px-8 py-4 border border-transparent rounded-full shadow-xl text-sm font-black uppercase tracking-widest text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-900/10 disabled:opacity-50 transition-all hover:-translate-y-0.5"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-3" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <div className="bg-white p-8 rounded-3xl border border-red-50 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-50/50 rounded-full blur-3xl" />

                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Danger Zone
                </p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900">Delete Promotion Test</h4>
                        <p className="text-sm font-medium text-gray-500 mt-1 max-w-md">Permanently remove this promotion test and all associated registrations. This action is irreversible.</p>
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center px-8 py-4 border-2 border-red-100 rounded-full text-sm font-black uppercase tracking-widest text-red-600 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 transition-all"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5 mr-3" />
                                Delete Promotion Test
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
