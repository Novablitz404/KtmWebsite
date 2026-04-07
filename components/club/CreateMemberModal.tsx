import { compressImage } from '@/lib/compress-image'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { X, UserPlus, Loader2, Check, Camera, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClubMember, uploadMemberAvatar } from '@/app/club/actions'
import { useQueryClient } from '@tanstack/react-query'
import GlobalDropdown from '@/components/GlobalDropdown'
import GlobalCalendar from '@/components/GlobalCalendar'
import { useScrollLock } from '@/hooks/useScrollLock'
import { COUNTRIES } from '@/lib/countries'

interface CreateMemberModalProps {
    isOpen: boolean
    onClose: () => void
}

const BELT_OPTIONS = [
    'White', 'Yellow', 'Orange', 'Green',
    'Purple', 'Blue', 'Maroon', 'Red', 'Brown', 'Black',
]

const GENDER_OPTIONS = ['Male', 'Female']

export default function CreateMemberModal({ isOpen, onClose }: CreateMemberModalProps) {
    useScrollLock(isOpen)

    const [submitting, setSubmitting] = useState(false)
    const [successData, setSuccessData] = useState<{ name: string; email?: string } | null>(null)
    const queryClient = useQueryClient()

    // Form state
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [gender, setGender] = useState('')
    const [belt, setBelt] = useState('')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [country, setCountry] = useState('')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const avatarInputRef = useRef<HTMLInputElement>(null)

    const resetForm = () => {
        setEmail('')
        setName('')
        setGender('')
        setBelt('')
        setWeight('')
        setHeight('')
        setBirthDate('')
        setCountry('')
        setAvatarFile(null)
        setAvatarPreview(null)
        setSuccessData(null)
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('File must be an image')
            return
        }
        try {
            const compressed = await compressImage(file, { maxDimension: 800, quality: 0.8 })
            setAvatarFile(compressed)
            setAvatarPreview(URL.createObjectURL(compressed))
        } catch {
            toast.error('Failed to process image')
        }
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) { toast.error('Name is required'); return }
        if (!gender) { toast.error('Gender is required'); return }
        if (!belt) { toast.error('Belt is required'); return }
        if (!weight) { toast.error('Weight is required'); return }
        if (!height) { toast.error('Height is required'); return }
        if (!birthDate) { toast.error('Birth date is required'); return }
        if (!country) { toast.error('Country is required'); return }

        setSubmitting(true)
        try {
            const result = await createClubMember({
                email: email || undefined,
                name,
                gender,
                belt,
                weight: parseFloat(weight),
                height: parseFloat(height),
                birthDate: (() => {
                    const [y, m, d] = birthDate.split('-').map(Number)
                    return new Date(Date.UTC(y, m - 1, d))
                })(),
                country,
            })

            if ('error' in result) {
                toast.error(result.error)
            } else if (result.success && result.member) {
                if (avatarFile) {
                    try {
                        const formData = new FormData()
                        formData.append('avatar', avatarFile)
                        formData.append('memberId', result.member.id)
                        await uploadMemberAvatar(formData)
                    } catch (err) {
                        console.error('Avatar upload failed:', err)
                    }
                }
                setSuccessData({ name, email: email || undefined })
                toast.success('Member added successfully!')
                queryClient.invalidateQueries({ queryKey: ['club-members'] })
                queryClient.invalidateQueries({ queryKey: ['club-dashboard'] })
            }
        } catch {
            toast.error('Failed to create member')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-gray-900">Create Member</h2>
                            <p className="text-[11px] text-gray-400 font-medium">Add a new athlete to your club roster</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Body ── */}
                {successData ? (
                    /* Success State */
                    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center gap-5">
                        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                            <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Member Added!</h3>
                            <p className="text-sm text-gray-500 mt-1">Their profile is now live in your club roster.</p>
                        </div>

                        {successData.email ? (
                            <div className="w-full bg-blue-50 rounded-2xl p-4 border border-blue-100 text-left">
                                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Account Link Ready</p>
                                <p className="text-sm text-blue-800">
                                    <strong>{successData.name}</strong> can sign up using{' '}
                                    <strong>{successData.email}</strong> and will be automatically linked to your club.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left">
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">No Email Provided</p>
                                <p className="text-sm text-gray-700">
                                    <strong>{successData.name}</strong> has been added to your roster. You can register them for events directly, or add their email later to link a user account.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={resetForm}
                                className="flex-1 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                            >
                                Add Another
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                Done <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Form State */
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">

                        {/* Two-column body */}
                        <div className="flex gap-0 divide-x divide-gray-100 flex-1 overflow-y-auto">

                            {/* ── Left: Avatar column ── */}
                            <div className="flex flex-col items-center gap-4 px-6 py-6 w-52 flex-shrink-0 bg-gray-50/60">
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="w-28 h-28 rounded-2xl overflow-hidden bg-white shadow-md ring-2 ring-gray-200 group-hover:ring-red-400 transition-all relative flex items-center justify-center"
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-50">
                                                <Camera className="w-7 h-7 text-gray-300 group-hover:text-red-400 transition-colors" />
                                            </div>
                                        )}
                                        {avatarPreview && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </button>
                                    {avatarPreview && (
                                        <button
                                            type="button"
                                            onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                                        >
                                            ×
                                        </button>
                                    )}
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-700">Profile Photo</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Click to upload</p>
                                </div>

                                {/* Required hint */}
                                <div className="mt-auto w-full">
                                    <div className="text-[10px] text-gray-400 space-y-1 bg-white rounded-xl border border-gray-100 p-3">
                                        <p className="font-black text-gray-500 uppercase tracking-widest text-[9px] mb-1.5">Required fields</p>
                                        {['Name', 'Gender', 'Belt', 'Weight', 'Height', 'Birth Date', 'Country'].map(f => (
                                            <div key={f} className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                <span>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── Right: Fields column ── */}
                            <div className="flex-1 px-6 py-6 space-y-5">

                                {/* Row 1: Name + Email */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Email <span className="font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="athlete@example.com"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Birth Date + Gender */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Birth Date <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalCalendar
                                            value={birthDate}
                                            onChange={(date: Date) => setBirthDate(format(date, 'yyyy-MM-dd'))}
                                            placeholder="Select birth date..."
                                            fullWidth
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Gender <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalDropdown
                                            label="Select..."
                                            value={gender}
                                            onChange={setGender}
                                            options={GENDER_OPTIONS.map(g => ({ label: g, value: g }))}
                                            fullWidth
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Belt + Country */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Belt Rank <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalDropdown
                                            label="Select..."
                                            value={belt}
                                            onChange={setBelt}
                                            options={BELT_OPTIONS.map(b => ({ label: b, value: b }))}
                                            fullWidth
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Country <span className="text-red-500">*</span>
                                        </label>
                                        <GlobalDropdown
                                            label="Select country..."
                                            value={country}
                                            onChange={setCountry}
                                            options={COUNTRIES.map(c => ({ label: c, value: c }))}
                                            fullWidth
                                            searchable
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Weight + Height */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Weight <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                placeholder="0.0"
                                                required
                                                className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900"
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-gray-400 pointer-events-none">kg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                            Height <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                                placeholder="0.0"
                                                required
                                                className="w-full px-3.5 py-2.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none transition-all text-sm font-medium text-gray-900"
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-bold text-gray-400 pointer-events-none">cm</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Sticky footer ── */}
                        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="animate-spin w-4 h-4" />
                                        Creating…
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={15} />
                                        Create Member
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
