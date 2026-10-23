'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MonitorSmartphone } from 'lucide-react'
import { toast } from 'sonner'
import { listKiosks, createPairingCode, renameKiosk, revokeKiosk, getKioskSettings, saveKioskSettings, type KioskRow } from '@/app/club/kiosks'
import { inputClass, labelClass, Bar } from '@/components/club/finance-shared'

const ago = (iso: string | null) => {
    if (!iso) return 'Never'
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (minutes < 2) return 'Just now'
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.round(minutes / 60)
    if (hours < 48) return `${hours} hours ago`
    return `${Math.round(hours / 24)} days ago`
}

// Settings tab for the check-in kiosks: pair a new PC with a one-time code, see which PCs are connected, cut one off,
// and the face check-in settings that every kiosk of the club follows.
export default function ClubKioskSettings() {
    const queryClient = useQueryClient()
    const kiosks = useQuery({
        queryKey: ['club-kiosks'],
        queryFn: async () => {
            const res = await listKiosks()
            if (res.error) throw new Error(res.error)
            return res.kiosks || []
        },
    })
    const settings = useQuery({
        queryKey: ['kiosk-settings'],
        queryFn: async () => {
            const res = await getKioskSettings()
            if (res.error || !res.settings) throw new Error(res.error || 'Could not load kiosk settings')
            return res.settings
        },
    })

    const [name, setName] = useState('')
    const [adding, setAdding] = useState(false)
    const [pairing, setPairing] = useState<{ code: string; expiresAt: number } | null>(null)
    const [now, setNow] = useState(Date.now())
    const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

    const [faceEnabled, setFaceEnabled] = useState(true)
    const [strict, setStrict] = useState(50)
    const [filled, setFilled] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!settings.data || filled) return
        setFaceEnabled(settings.data.faceEnabled); setStrict(Math.round(settings.data.antispoofMin * 100)); setFilled(true)
    }, [settings.data, filled])

    useEffect(() => {
        if (!pairing) return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [pairing])
    // Once the kiosk uses the code it shows up in the list; keep the list fresh while a code is waiting.
    useEffect(() => {
        if (!pairing) return
        const timer = setInterval(() => queryClient.invalidateQueries({ queryKey: ['club-kiosks'] }), 5000)
        return () => clearInterval(timer)
    }, [pairing, queryClient])

    const secondsLeft = pairing ? Math.max(0, Math.round((pairing.expiresAt - now) / 1000)) : 0
    const loadingKiosks = !kiosks.data && !kiosks.error
    const loadingSettings = !settings.data && !settings.error

    async function addKiosk(e: React.FormEvent) {
        e.preventDefault()
        setAdding(true)
        const res = await createPairingCode(name)
        setAdding(false)
        if (res.error || !res.code) return toast.error(res.error || 'Could not create a code')
        setPairing({ code: res.code, expiresAt: new Date(res.expiresAt!).getTime() })
        setNow(Date.now())
    }

    async function revoke(k: KioskRow) {
        if (!confirm(`Revoke ${k.name}? It stops working right away and cannot be switched back on. Its recorded check-ins stay.`)) return
        const res = await revokeKiosk(k.id)
        if ('error' in res && res.error) return toast.error(res.error)
        toast.success(`${k.name} revoked`)
        queryClient.invalidateQueries({ queryKey: ['club-kiosks'] })
    }

    async function rename() {
        if (!editing) return
        const res = await renameKiosk(editing.id, editing.name)
        if ('error' in res && res.error) return toast.error(res.error)
        setEditing(null)
        queryClient.invalidateQueries({ queryKey: ['club-kiosks'] })
    }

    async function saveSettings(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const res = await saveKioskSettings({ faceEnabled, antispoofMin: strict / 100 })
        setSaving(false)
        if ('error' in res && res.error) return toast.error(res.error)
        queryClient.invalidateQueries({ queryKey: ['kiosk-settings'] })
        toast.success('Kiosk settings saved')
    }

    const list = kiosks.data || []
    const time = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center flex-shrink-0"><MonitorSmartphone size={14} className="text-white" /></div>
                    <div>
                        <h3 className="text-base font-black text-gray-900">Check-in kiosks</h3>
                        <p className="text-xs text-gray-400 mt-0.5">A kiosk is the KTM check-in app on a PC at your door. Add it here, then enter the code it shows on that PC. Face data stays on the PC and is never sent to the website.</p>
                    </div>
                </div>

                <form onSubmit={addKiosk} className="flex flex-col sm:flex-row gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder='Name this kiosk, for example "Front desk"' className={`${inputClass} sm:flex-1`} />
                    <button type="submit" disabled={adding || !name.trim()} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0">
                        {adding && <Loader2 className="animate-spin w-4 h-4" />} Add kiosk
                    </button>
                </form>

                {pairing && (
                    <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5 text-center" role="status">
                        {secondsLeft > 0 ? (
                            <>
                                <p className="text-xs font-bold text-gray-500">Enter this code in the check-in app</p>
                                <p className="text-3xl font-black tracking-[0.25em] text-gray-900 mt-2 font-mono">{pairing.code}</p>
                                <p className="text-xs text-gray-500 mt-2">Expires in {time}. It works once.</p>
                            </>
                        ) : (
                            <p className="text-sm font-bold text-gray-600">The code expired. Add the kiosk again to get a new one.</p>
                        )}
                    </div>
                )}

                {kiosks.error && <p className="text-sm text-red-500">{(kiosks.error as Error).message}</p>}
                <div className="rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {loadingKiosks ? [0, 1].map(i => <div key={i} className="px-4 py-3"><Bar className="w-48 h-4" /></div>)
                        : list.length === 0 ? <p className="px-4 py-8 text-center text-xs text-gray-400">No kiosks yet. Add your first one above.</p>
                        : list.map(k => (
                            <div key={k.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                                <div className="min-w-0">
                                    {editing?.id === k.id ? (
                                        <form onSubmit={e => { e.preventDefault(); rename() }} className="flex items-center gap-2">
                                            <input autoFocus value={editing.name} onChange={e => setEditing({ id: k.id, name: e.target.value })} maxLength={60} className={`${inputClass} !py-1.5`} />
                                            <button type="submit" className="text-xs font-bold text-red-600">Save</button>
                                            <button type="button" onClick={() => setEditing(null)} className="text-xs font-bold text-gray-400">Cancel</button>
                                        </form>
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-900 truncate">{k.name}
                                            {k.revoked && <span className="ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Revoked</span>}
                                        </p>
                                    )}
                                    <p className="text-[11px] text-gray-400">Last seen: {ago(k.lastSeenAt)}{k.appVersion ? ` · v${k.appVersion}` : ''}</p>
                                </div>
                                {!k.revoked && editing?.id !== k.id && (
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => setEditing({ id: k.id, name: k.name })} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Rename</button>
                                        <button onClick={() => revoke(k)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Revoke</button>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            </section>

            <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div>
                    <h3 className="text-base font-black text-gray-900">Face check-in settings</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Every kiosk of your club follows these. Changes reach a kiosk within a few minutes.</p>
                </div>
                {settings.error && <p className="text-sm text-red-500">{(settings.error as Error).message}</p>}

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <span>
                        <span className="block text-sm font-bold text-gray-900">Face check-in</span>
                        <span className="block text-xs text-gray-400">Turn off to pause face check-in at every kiosk.</span>
                    </span>
                    <input type="checkbox" checked={faceEnabled} disabled={loadingSettings} onChange={e => setFaceEnabled(e.target.checked)} className="w-5 h-5 accent-red-600" />
                </label>

                <div>
                    <label className={labelClass}>Live-face strictness: {loadingSettings ? '' : `${strict}%`}</label>
                    {loadingSettings ? <Bar className="w-full h-3" /> : <input type="range" min={20} max={95} step={5} value={strict} onChange={e => setStrict(Number(e.target.value))} className="w-full accent-red-600" />}
                    <p className="text-xs text-gray-400 mt-1">Higher blocks photos and screens more strictly, but may ask a real person to try again. 50% suits most clubs.</p>
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={saving || loadingSettings || !!settings.error} className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {saving && <Loader2 className="animate-spin w-4 h-4" />} Save settings
                    </button>
                </div>
            </form>
        </div>
    )
}
