'use server'

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

// Admin-only management of the athlete app's home-carousel advertisements.
// The app reads them through GET /api/v1/advertisements.

const BUCKET = 'advertisements'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const APP_SCREENS = new Set(['/', '/events', '/rankings', '/club', '/profile', '/notifications'])
const POSITIONS = new Set(['left', 'center', 'right'])

const storage = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!).storage

async function checkAdmin() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')
}

export type AdvertisementRow = Awaited<ReturnType<typeof listAdvertisements>>[number]

export async function listAdvertisements() {
    await checkAdmin()
    return prisma.advertisement.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
}

function text(form: FormData, key: string, max: number) {
    const value = String(form.get(key) ?? '').trim()
    return value.length > max ? value.slice(0, max) : value
}

function validLink(value: string) {
    if (!value) return null
    if (value.startsWith('/')) return APP_SCREENS.has(value) ? value : undefined
    try {
        return new URL(value).protocol === 'https:' ? value : undefined
    } catch {
        return undefined
    }
}

function day(value: string, end: boolean) {
    if (!value) return null
    const date = new Date(`${value}T${end ? '23:59:59' : '00:00:00'}Z`)
    return Number.isNaN(date.getTime()) ? null : date
}

// Best-effort removal of an image this feature uploaded earlier.
async function removeImage(url?: string | null) {
    const path = url?.split(`/${BUCKET}/`)[1]?.split('?')[0]
    if (path) await storage().from(BUCKET).remove([decodeURIComponent(path)]).catch(() => undefined)
}

async function uploadImage(file: File) {
    const ext = IMAGE_TYPES[file.type]
    if (!ext) throw new Error('Use a JPG, PNG or WebP image.')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('The image is larger than 5 MB.')
    const bucket = storage()
    // The bucket is created on first use so a fresh environment needs no manual setup.
    await bucket.createBucket(BUCKET, { public: true }).catch(() => undefined)
    const path = `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await bucket.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type })
    if (error) throw new Error(`Image upload failed: ${error.message}`)
    return bucket.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Creates an advertisement, or updates it when the form carries an `id`.
export async function saveAdvertisement(form: FormData): Promise<{ error?: string }> {
    try {
        await checkAdmin()
        const id = text(form, 'id', 64)
        const eyebrow = text(form, 'eyebrow', 40)
        const title = text(form, 'title', 80)
        if (!eyebrow || !title) return { error: 'A label and a title are required.' }

        const linkUrl = validLink(text(form, 'linkUrl', 500))
        if (linkUrl === undefined) return { error: 'The link must be an app screen or an https:// address.' }
        const ctaLabel = text(form, 'ctaLabel', 30) || null
        if (ctaLabel && !linkUrl) return { error: 'A button needs a destination. Pick where it should go, or clear the button text.' }

        const startsAt = day(text(form, 'startsAt', 10), false)
        const endsAt = day(text(form, 'endsAt', 10), true)
        if (startsAt && endsAt && endsAt < startsAt) return { error: 'The end date is before the start date.' }

        const position = text(form, 'imagePosition', 10)
        const data = {
            eyebrow, title,
            description: text(form, 'description', 160) || null,
            ctaLabel, linkUrl: ctaLabel ? linkUrl : null,
            imagePosition: POSITIONS.has(position) ? position : 'center',
            isActive: form.get('isActive') === 'true',
            startsAt, endsAt,
        }

        const existing = id ? await prisma.advertisement.findUnique({ where: { id } }) : null
        if (id && !existing) return { error: 'This advertisement no longer exists.' }

        let imageUrl = existing?.imageUrl ?? null
        const file = form.get('image')
        if (file instanceof File && file.size > 0) {
            imageUrl = await uploadImage(file)
            await removeImage(existing?.imageUrl)
        } else if (form.get('removeImage') === 'true') {
            await removeImage(existing?.imageUrl)
            imageUrl = null
        }

        if (existing) {
            await prisma.advertisement.update({ where: { id }, data: { ...data, imageUrl } })
        } else {
            const last = await prisma.advertisement.aggregate({ _max: { sortOrder: true } })
            await prisma.advertisement.create({ data: { ...data, imageUrl, sortOrder: (last._max.sortOrder ?? -1) + 1 } })
        }
        return {}
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not save the advertisement.' }
    }
}

export async function setAdvertisementActive(id: string, isActive: boolean) {
    await checkAdmin()
    await prisma.advertisement.update({ where: { id }, data: { isActive } })
}

export async function deleteAdvertisement(id: string) {
    await checkAdmin()
    const ad = await prisma.advertisement.findUnique({ where: { id } })
    if (!ad) return
    await prisma.advertisement.delete({ where: { id } })
    await removeImage(ad.imageUrl)
}

// Swaps an advertisement with its neighbour in the display order.
export async function moveAdvertisement(id: string, direction: 'up' | 'down') {
    await checkAdmin()
    const all = await prisma.advertisement.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true } })
    const from = all.findIndex(ad => ad.id === id)
    const to = direction === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= all.length) return
    const order = all.map(ad => ad.id)
    ;[order[from], order[to]] = [order[to], order[from]]
    // Rewrite the whole order so ties and gaps never leave it ambiguous.
    await prisma.$transaction(order.map((adId, index) => prisma.advertisement.update({ where: { id: adId }, data: { sortOrder: index } })))
}
