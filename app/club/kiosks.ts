'use server'

// Club Manager: the club master's side of check-in kiosks. Add a kiosk (a one-time code), see which are paired and when they
// last checked in, revoke one, and the club-wide kiosk settings. The kiosk itself talks to /api/kiosk/*.
import { prisma } from '@/lib/prisma'
import { requireClubManagement } from '@/app/club/manager'
import { PAIRING_MINUTES, formatCode, hashCode, newPairingCode } from '@/lib/kiosk'
import { revalidatePath } from 'next/cache'

export type KioskRow = {
    id: string
    name: string
    lastSeenAt: string | null
    appVersion: string | null
    revoked: boolean
    createdAt: string
}

export type KioskSettings = {
    faceEnabled: boolean
    antispoofMin: number
}

const fail = (error: any, fallback: string) => ({ error: (error?.message as string) || fallback })
const DEFAULTS: KioskSettings = { faceEnabled: true, antispoofMin: 0.5 }

export async function listKiosks(): Promise<{ kiosks?: KioskRow[]; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const rows = await prisma.kioskDevice.findMany({ where: { clubId: club.id }, orderBy: { createdAt: 'desc' } })
        return {
            kiosks: rows.map(r => ({
                id: r.id, name: r.name, appVersion: r.appVersion, revoked: !!r.revokedAt,
                lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null, createdAt: r.createdAt.toISOString(),
            })),
        }
    } catch (error) {
        return fail(error, 'Failed to load kiosks')
    }
}

// A fresh one-time code for a new kiosk. Unused codes from earlier clicks are discarded so only the latest works.
export async function createPairingCode(name: string): Promise<{ code?: string; expiresAt?: string; error?: string }> {
    try {
        const { club } = await requireClubManagement(true)
        const label = String(name ?? '').trim().slice(0, 60)
        if (!label) return { error: 'Give the kiosk a name, for example "Front desk"' }

        const live = await prisma.kioskDevice.count({ where: { clubId: club.id, revokedAt: null } })
        if (live >= 10) return { error: 'This club already has 10 kiosks. Revoke one you no longer use first.' }

        const code = newPairingCode()
        const expiresAt = new Date(Date.now() + PAIRING_MINUTES * 60 * 1000)
        await prisma.$transaction([
            prisma.kioskPairingCode.deleteMany({ where: { clubId: club.id, usedAt: null } }),
            prisma.kioskPairingCode.create({ data: { clubId: club.id, codeHash: hashCode(code), name: label, expiresAt } }),
        ])
        return { code: formatCode(code), expiresAt: expiresAt.toISOString() }
    } catch (error) {
        return fail(error, 'Failed to create a pairing code')
    }
}

export async function renameKiosk(id: string, name: string) {
    try {
        const { club } = await requireClubManagement(true)
        const label = String(name ?? '').trim().slice(0, 60)
        if (!label) return { error: 'Enter a name' }
        const res = await prisma.kioskDevice.updateMany({ where: { id, clubId: club.id }, data: { name: label } })
        if (res.count === 0) return { error: 'Kiosk not found' }
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to rename the kiosk')
    }
}

// Cuts a kiosk off at once (a stolen or retired PC). Its recorded check-ins stay.
export async function revokeKiosk(id: string) {
    try {
        const { club } = await requireClubManagement(false)
        const res = await prisma.kioskDevice.updateMany({ where: { id, clubId: club.id, revokedAt: null }, data: { revokedAt: new Date() } })
        if (res.count === 0) return { error: 'Kiosk not found' }
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to revoke the kiosk')
    }
}

export async function getKioskSettings(): Promise<{ settings?: KioskSettings; error?: string }> {
    try {
        const { club } = await requireClubManagement(false)
        const row = await prisma.clubKioskSettings.findUnique({ where: { clubId: club.id } })
        return { settings: row ? { faceEnabled: row.faceEnabled, antispoofMin: row.antispoofMin } : DEFAULTS }
    } catch (error) {
        return fail(error, 'Failed to load kiosk settings')
    }
}

export async function saveKioskSettings(input: { faceEnabled: boolean; antispoofMin: number }) {
    try {
        const { club } = await requireClubManagement(true)
        const antispoofMin = Number(input.antispoofMin)
        if (!Number.isFinite(antispoofMin) || antispoofMin < 0.2 || antispoofMin > 0.95) return { error: 'Strictness must be between 20% and 95%' }

        const data = { faceEnabled: !!input.faceEnabled, antispoofMin: Math.round(antispoofMin * 100) / 100 }
        await prisma.clubKioskSettings.upsert({ where: { clubId: club.id }, create: { clubId: club.id, ...data }, update: data })
        return { success: true }
    } catch (error) {
        return fail(error, 'Failed to save kiosk settings')
    }
}
