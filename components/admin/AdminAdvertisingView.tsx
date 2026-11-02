'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
    deleteAdvertisement,
    listAdvertisements,
    moveAdvertisement,
    saveAdvertisement,
    setAdvertisementActive,
    type AdvertisementRow,
} from '@/app/admin/actions/advertisements'

const SCREENS = [
    { value: '', label: 'No button' },
    { value: '/events', label: 'App: Events' },
    { value: '/rankings', label: 'App: Rankings' },
    { value: '/club', label: 'App: My Club' },
    { value: '/profile', label: 'App: Profile' },
    { value: '/notifications', label: 'App: Notifications' },
    { value: '/', label: 'App: Home' },
    { value: 'web', label: 'Web link (https://…)' },
]
const isScreen = (url: string) => SCREENS.some(s => s.value && s.value !== 'web' && s.value === url)
const toDay = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '')

type Draft = {
    id: string; eyebrow: string; title: string; description: string; ctaLabel: string
    destination: string; webUrl: string; imagePosition: string; isActive: boolean
    startsAt: string; endsAt: string; imageUrl: string | null
}

const emptyDraft: Draft = {
    id: '', eyebrow: 'KTM SPORTS', title: '', description: '', ctaLabel: '', destination: '', webUrl: '',
    imagePosition: 'center', isActive: true, startsAt: '', endsAt: '', imageUrl: null,
}

function toDraft(ad: AdvertisementRow): Draft {
    const url = ad.linkUrl ?? ''
    return {
        id: ad.id, eyebrow: ad.eyebrow, title: ad.title, description: ad.description ?? '', ctaLabel: ad.ctaLabel ?? '',
        destination: !url ? '' : isScreen(url) ? url : 'web', webUrl: url && !isScreen(url) ? url : '',
        imagePosition: ad.imagePosition, isActive: ad.isActive, startsAt: toDay(ad.startsAt), endsAt: toDay(ad.endsAt), imageUrl: ad.imageUrl,
    }
}

function status(ad: AdvertisementRow) {
    const now = Date.now()
    if (!ad.isActive) return { label: 'Hidden', style: 'bg-gray-100 text-gray-500' }
    if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return { label: 'Scheduled', style: 'bg-amber-50 text-amber-600' }
    if (ad.endsAt && new Date(ad.endsAt).getTime() < now) return { label: 'Ended', style: 'bg-gray-100 text-gray-500' }
    return { label: 'Live', style: 'bg-green-50 text-green-600' }
}

export default function AdminAdvertisingView() {
    const [ads, setAds] = useState<AdvertisementRow[] | null>(null)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState<Draft | null>(null)
    const [busy, startTransition] = useTransition()

    const load = useCallback(async () => {
        try {
            setAds(await listAdvertisements())
            setError('')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load advertisements.')
        }
    }, [])
    useEffect(() => { load() }, [load])

    const run = (action: () => Promise<unknown>) => startTransition(async () => {
        try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
        await load()
    })

    return (
        <div className="p-4 md:p-6 lg:p-8 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Athlete app advertising</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            These appear in the carousel on the athlete app home screen, in the order below. Only ads that are switched on and inside their dates are shown.
                        </p>
                    </div>
                    <button onClick={() => setEditing({ ...emptyDraft })}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                        <Plus size={16} /> New ad
                    </button>
                </div>

                {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

                {ads === null ? (
                    <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : ads.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl py-14 px-6 text-center">
                        <Megaphone className="mx-auto text-gray-300" size={34} />
                        <p className="mt-3 font-medium text-gray-900">No advertisements yet</p>
                        <p className="text-sm text-gray-500 mt-1">With none live, the athlete app hides the carousel. Add one to show it.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {ads.map((ad, index) => {
                            const s = status(ad)
                            return (
                                <li key={ad.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 items-center">
                                    <div className="w-24 h-16 rounded-lg bg-gray-900 overflow-hidden flex-shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">Default image</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-semibold tracking-wider text-red-600 truncate">{ad.eyebrow}</span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${s.style}`}>{s.label}</span>
                                        </div>
                                        <p className="font-semibold text-gray-900 truncate">{ad.title.replace(/\n/g, ' ')}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {ad.linkUrl ? `${ad.ctaLabel} → ${ad.linkUrl}` : 'No button'}
                                            {(ad.startsAt || ad.endsAt) && ` · ${ad.startsAt ? toDay(ad.startsAt) : 'now'} to ${ad.endsAt ? toDay(ad.endsAt) : 'no end'}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <IconButton label="Move up" disabled={busy || index === 0} onClick={() => run(() => moveAdvertisement(ad.id, 'up'))}><ArrowUp size={16} /></IconButton>
                                        <IconButton label="Move down" disabled={busy || index === ads.length - 1} onClick={() => run(() => moveAdvertisement(ad.id, 'down'))}><ArrowDown size={16} /></IconButton>
                                        <IconButton label={ad.isActive ? 'Hide' : 'Show'} disabled={busy} onClick={() => run(() => setAdvertisementActive(ad.id, !ad.isActive))}>{ad.isActive ? <Eye size={16} /> : <EyeOff size={16} />}</IconButton>
                                        <IconButton label="Edit" disabled={busy} onClick={() => setEditing(toDraft(ad))}><Pencil size={16} /></IconButton>
                                        <IconButton label="Delete" danger disabled={busy} onClick={() => { if (confirm(`Delete “${ad.title.replace(/\n/g, ' ')}”? This cannot be undone.`)) run(() => deleteAdvertisement(ad.id)) }}><Trash2 size={16} /></IconButton>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            {editing && <AdForm draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
        </div>
    )
}

function IconButton({ label, danger, children, ...props }: { label: string; danger?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" aria-label={label} title={label} {...props}
            className={`p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}>
            {children}
        </button>
    )
}

const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all'

function AdForm({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
    const [d, setD] = useState(draft)
    const [file, setFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD(prev => ({ ...prev, [key]: value }))

    const preview = file ? URL.createObjectURL(file) : removeImage ? null : d.imageUrl
    const hasButton = d.ctaLabel.trim() && d.destination

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        const form = new FormData()
        form.set('id', d.id)
        form.set('eyebrow', d.eyebrow)
        form.set('title', d.title)
        form.set('description', d.description)
        form.set('ctaLabel', d.ctaLabel)
        form.set('linkUrl', d.destination === 'web' ? d.webUrl : d.destination)
        form.set('imagePosition', d.imagePosition)
        form.set('isActive', String(d.isActive))
        form.set('startsAt', d.startsAt)
        form.set('endsAt', d.endsAt)
        if (file) form.set('image', file)
        if (removeImage) form.set('removeImage', 'true')
        const result = await saveAdvertisement(form).catch(() => ({ error: 'Could not save. Try again.' }))
        setSaving(false)
        if (result.error) setError(result.error)
        else onSaved()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true">
            <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-xl my-8 shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{d.id ? 'Edit advertisement' : 'New advertisement'}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Approximation of the app card */}
                    <div className="relative h-40 rounded-xl overflow-hidden bg-gray-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {preview && <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: d.imagePosition }} />}
                        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,.94) 0%, rgba(0,0,0,.74) 44%, rgba(0,0,0,.12) 100%)' }} />
                        <div className="relative p-4 text-white space-y-1">
                            <p className="text-[8px] tracking-[0.2em] text-gray-400">ADVERTISEMENT</p>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-red-500">{d.eyebrow || 'LABEL'}</p>
                            <p className="text-xl font-black leading-tight whitespace-pre-line">{d.title || 'Title'}</p>
                            {d.description && <p className="text-xs text-gray-300">{d.description}</p>}
                            {hasButton ? <span className="inline-block mt-1 px-3 py-1.5 rounded-lg bg-red-600 text-xs font-semibold">{d.ctaLabel} →</span> : null}
                        </div>
                        {!preview && <p className="absolute right-3 bottom-2 text-[10px] text-gray-500">Default arena image</p>}
                    </div>

                    <Field label="Label" hint="Small red text above the title.">
                        <input className={input} value={d.eyebrow} maxLength={40} required onChange={e => set('eyebrow', e.target.value)} />
                    </Field>
                    <Field label="Title" hint="Press Enter for a second line.">
                        <textarea className={input} rows={2} value={d.title} maxLength={80} required onChange={e => set('title', e.target.value)} />
                    </Field>
                    <Field label="Description (optional)">
                        <input className={input} value={d.description} maxLength={160} onChange={e => set('description', e.target.value)} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Button text">
                            <input className={input} value={d.ctaLabel} maxLength={30} placeholder="e.g. Explore events" onChange={e => set('ctaLabel', e.target.value)} />
                        </Field>
                        <Field label="Button goes to">
                            <select className={input} value={d.destination} onChange={e => set('destination', e.target.value)}>
                                {SCREENS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    {d.destination === 'web' && (
                        <Field label="Web address" hint="Must start with https://">
                            <input className={input} type="url" value={d.webUrl} placeholder="https://www.ktmsports.com/…" required onChange={e => set('webUrl', e.target.value)} />
                        </Field>
                    )}

                    <Field label="Background image (optional)" hint="JPG, PNG or WebP up to 5 MB. Wide images work best. Leave empty to use the default arena image.">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <ImagePlus size={16} /> {file ? file.name : 'Choose image'}
                                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { setFile(e.target.files?.[0] ?? null); setRemoveImage(false) }} />
                            </label>
                            {(file || (d.imageUrl && !removeImage)) && (
                                <button type="button" className="text-sm text-gray-500 hover:text-red-600" onClick={() => { setFile(null); setRemoveImage(true) }}>Remove image</button>
                            )}
                        </div>
                    </Field>
                    <Field label="Image focus" hint="Which part of the image stays visible.">
                        <div className="flex gap-2">
                            {['left', 'center', 'right'].map(p => (
                                <button key={p} type="button" onClick={() => set('imagePosition', p)}
                                    className={`px-4 py-1.5 rounded-lg text-sm capitalize border ${d.imagePosition === p ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
                            ))}
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Show from (optional)"><input className={input} type="date" value={d.startsAt} onChange={e => set('startsAt', e.target.value)} /></Field>
                        <Field label="Show until (optional)"><input className={input} type="date" value={d.endsAt} onChange={e => set('endsAt', e.target.value)} /></Field>
                    </div>

                    <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input type="checkbox" checked={d.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 accent-red-600" />
                        Show this ad in the athlete app
                    </label>

                    {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                        {saving && <Loader2 size={14} className="animate-spin" />} {d.id ? 'Save changes' : 'Create ad'}
                    </button>
                </div>
            </form>
        </div>
    )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">{label}</span>
            {children}
            {hint && <span className="block text-xs text-gray-400">{hint}</span>}
        </div>
    )
}
