'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'
import { toast } from 'sonner'
import { getInvoiceData } from '@/app/club/invoicing'
import { buildMemberInvoicePdf } from '@/lib/generateMemberInvoicePDF'
import { useScrollLock } from '@/hooks/useScrollLock'

export type InvoiceRequest = { memberId: string; name: string; periods: string[] } | null

// Shows an invoice as it will print, with a Download button. The page frame is there at once; the PDF fills in when ready.
export default function InvoicePreviewModal({ request, onClose }: { request: InvoiceRequest; onClose: () => void }) {
    useScrollLock(!!request)
    const [pdf, setPdf] = useState<{ url: string; blob: Blob; filename: string } | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!request) return
        let cancelled = false, objectUrl = ''
        setPdf(null); setFailed(false)
        ;(async () => {
            const res = await getInvoiceData(request.memberId, request.periods)
            if (cancelled) return
            if (res.error || !res.invoice) { toast.error(res.error || 'Could not prepare the invoice'); setFailed(true); return }
            try {
                const built = await buildMemberInvoicePdf(res.invoice)
                if (cancelled) return
                objectUrl = URL.createObjectURL(built.blob)
                setPdf({ url: objectUrl, ...built })
            } catch (error) {
                console.error('Invoice PDF error:', error)
                if (!cancelled) { toast.error('Could not create the invoice PDF'); setFailed(true) }
            }
        })()
        return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
    }, [request])

    if (!request) return null

    function download() {
        if (!pdf) return
        const link = document.createElement('a')
        link.href = pdf.url
        link.download = pdf.filename
        link.click()
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Invoice preview</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">{request.name}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="flex-1 min-h-0 bg-gray-100">
                    {pdf ? <iframe title="Invoice" src={`${pdf.url}#toolbar=0&navpanes=0`} className="w-full h-full border-0" />
                        : failed ? <p className="text-center text-sm text-gray-500 py-20">The invoice could not be prepared.</p>
                        : <div className="h-full flex items-center justify-center"><div className="w-[55%] max-w-md aspect-[1/1.35] rounded-md bg-white shadow-sm animate-pulse" aria-busy="true" /></div>}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Close</button>
                    <button onClick={download} disabled={!pdf} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                        <Download size={15} /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    )
}
