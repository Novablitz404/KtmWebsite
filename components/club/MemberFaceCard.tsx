'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ScanFace } from 'lucide-react'
import { toast } from 'sonner'
import { getFaceStatus, clearMemberFace } from '@/app/club/faces'
import { Bar } from '@/components/club/finance-shared'

// Face check-in status for one member. Faces are enrolled at the check-in kiosk; this only shows the result and can ask kiosks to forget a face.
export default function MemberFaceCard({ memberId }: { memberId: string }) {
    const queryClient = useQueryClient()
    const [busy, setBusy] = useState(false)
    const { data, error } = useQuery({
        queryKey: ['member-face', memberId],
        queryFn: async () => {
            const res = await getFaceStatus(memberId)
            if (res.error || !res.status) throw new Error(res.error || 'Could not load face status')
            return res.status
        },
    })
    const loading = !data && !error

    async function clear() {
        if (!confirm('Clear this member’s face? Check-in kiosks delete it the next time they sync (within a few minutes), and the member will need to enroll again.')) return
        setBusy(true)
        const res = await clearMemberFace(memberId)
        setBusy(false)
        if ('error' in res && res.error) return toast.error(res.error)
        toast.success('Face cleared')
        queryClient.invalidateQueries({ queryKey: ['member-face', memberId] })
    }

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><ScanFace size={15} className="text-gray-500" /></div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Face check-in</p>
                    <p className="text-xs text-gray-400 mt-0.5 min-h-4">
                        {loading ? <Bar className="w-56 h-3.5" />
                            : error ? (error as Error).message
                            : data!.enrolled ? `Enrolled on ${data!.kiosks.join(', ')}`
                            : data!.clearPending ? 'Being cleared from the kiosks'
                            : 'Not enrolled. Enroll the face on a check-in kiosk.'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!loading && !error && <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${data!.enrolled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{data!.enrolled ? 'Face enrolled' : 'Not enrolled'}</span>}
                {data?.enrolled && <button type="button" disabled={busy} onClick={clear} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50">Clear face</button>}
            </div>
        </div>
    )
}
