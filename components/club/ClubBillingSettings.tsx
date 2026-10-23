'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { getBillingSettings, saveBillingSettings } from '@/app/club/invoicing'
import { inputClass, labelClass, Bar } from '@/components/club/finance-shared'

const QR_SIDE = 800 // the picture is shrunk to fit inside this square before it is saved; PNG keeps a QR code scannable

// Settings card for what appears on invoices besides the club's name, address, phone and logo: contact email, tax number,
// a note, and the club's bank or e-wallet QR code so members can scan it to pay.
export default function ClubBillingSettings() {
    const queryClient = useQueryClient()
    const { data, error } = useQuery({
        queryKey: ['billing-settings'],
        queryFn: async () => {
            const res = await getBillingSettings()
            if (res.error || !res.settings) throw new Error(res.error || 'Could not load billing settings')
            return res
        },
    })
    const loading = !data && !error

    const [contactEmail, setContactEmail] = useState('')
    const [taxId, setTaxId] = useState('')
    const [invoiceNote, setInvoiceNote] = useState('')
    const [payQrLabel, setPayQrLabel] = useState('')
    const [payQrImage, setPayQrImage] = useState('')
    const [filled, setFilled] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!data?.settings || filled) return
        setContactEmail(data.settings.contactEmail); setTaxId(data.settings.taxId); setInvoiceNote(data.settings.invoiceNote)
        setPayQrLabel(data.settings.payQrLabel); setPayQrImage(data.settings.payQrImage)
        setFilled(true)
    }, [data, filled])

    async function pickImage(file: File | undefined) {
        if (!file) return
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
            toast.error('Choose a JPG, PNG or WebP picture up to 8 MB'); if (fileRef.current) fileRef.current.value = ''; return
        }
        const url = URL.createObjectURL(file)
        try {
            const image = new Image(); image.src = url; await image.decode()
            const scale = Math.min(1, QR_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
            canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/png')
            if (dataUrl.length > 850 * 1024) throw new Error('too large')
            setPayQrImage(dataUrl)
        } catch {
            toast.error('This picture could not be used. Try another image.')
        } finally { URL.revokeObjectURL(url) }
    }

    async function save(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const res = await saveBillingSettings({ contactEmail, taxId, invoiceNote, payQrLabel, payQrImage })
        setSaving(false)
        if ('error' in res && res.error) return toast.error(res.error)
        queryClient.invalidateQueries({ queryKey: ['billing-settings'] })
        toast.success('Billing settings saved')
    }

    const club = data?.club
    return (
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
                <h3 className="text-base font-black text-gray-900">Billing &amp; invoices</h3>
                <p className="text-xs text-gray-400 mt-0.5">Printed on every invoice you create from the Finance tab, along with your club name, address, phone and logo.</p>
                <p className="text-xs text-gray-500 mt-2 h-4">
                    {loading ? <Bar className="w-72 h-3.5" /> : `Invoice header: ${[club?.name, club?.address, club?.phone].filter(Boolean).join(' · ')}`}
                </p>
            </div>
            {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Contact email (optional)</label>
                    {loading ? <Bar className="w-full h-[42px] rounded-xl" /> : <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} maxLength={120} placeholder="billing@yourclub.com" className={inputClass} />}
                </div>
                <div>
                    <label className={labelClass}>Registration or tax number (optional)</label>
                    {loading ? <Bar className="w-full h-[42px] rounded-xl" /> : <input value={taxId} onChange={e => setTaxId(e.target.value)} maxLength={60} className={inputClass} />}
                </div>
            </div>
            <div>
                <label className={labelClass}>Note at the bottom of invoices (optional)</label>
                {loading ? <Bar className="w-full h-[72px] rounded-xl" /> : <textarea value={invoiceNote} onChange={e => setInvoiceNote(e.target.value)} rows={2} maxLength={300} placeholder="For example: how to pay, or a thank-you line" className={`${inputClass} resize-none`} />}
            </div>

            <div className="flex flex-col sm:flex-row gap-5 pt-2 border-t border-gray-100">
                <div className="w-40 h-40 flex-shrink-0 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {payQrImage ? <img src={payQrImage} alt="Payment QR code preview" className="max-w-full max-h-full object-contain" />
                        : <span className="flex flex-col items-center gap-1 text-xs text-gray-400"><QrCode size={22} />No QR code</span>}
                </div>
                <div className="flex-1 space-y-3">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Payment QR code</p>
                        <p className="text-xs text-gray-400 mt-0.5">Your bank or e-wallet QR code (GCash, Maya, bank app). It is printed on invoices so members can scan it to pay. Upload the QR image as saved from your app.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => pickImage(e.target.files?.[0])} />
                        <button type="button" disabled={loading} onClick={() => fileRef.current?.click()} className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors disabled:opacity-50">Choose QR image</button>
                        <button type="button" disabled={!payQrImage} onClick={() => { setPayQrImage(''); if (fileRef.current) fileRef.current.value = '' }} className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold rounded-xl transition-colors disabled:opacity-50">Remove</button>
                    </div>
                    <div>
                        <label className={labelClass}>QR label (optional)</label>
                        {loading ? <Bar className="w-full h-[42px] rounded-xl" /> : <input value={payQrLabel} onChange={e => setPayQrLabel(e.target.value)} maxLength={120} placeholder="e.g. GCash · Juan Dela Cruz · 0917 123 4567" className={inputClass} />}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" disabled={saving || loading || !!error} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin w-4 h-4" />} Save billing settings
                </button>
            </div>
        </form>
    )
}
