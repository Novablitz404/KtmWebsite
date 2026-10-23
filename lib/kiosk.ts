// Check-in kiosks (the helper app at the club door). A kiosk is paired once with a short code from the club master, then
// signs every call with a private token. Only hashes of codes and tokens are stored.
import { createHash, randomBytes, randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'

export const PAIRING_MINUTES = 10
// No 0/O or 1/I, so a code read off the screen is hard to mix up.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_PATTERN = /^[A-Z2-9]{8}$/

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export const normalizeCode = (value: unknown) => String(value ?? '').replace(/[\s-]/g, '').toUpperCase()
export const isValidCode = (code: string) => CODE_PATTERN.test(code) && [...code].every(c => CODE_ALPHABET.includes(c))
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`
export const hashCode = (code: string) => sha256(`kiosk-code:${code}`)
export const hashToken = (token: string) => sha256(`kiosk-token:${token}`)

export const newPairingCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
export const newDeviceToken = () => `kt_${randomBytes(32).toString('hex')}`

// The kiosk making this request, from its `Authorization: Bearer <token>` header. Null when missing, unknown or revoked.
export async function kioskFromRequest(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token || !token.startsWith('kt_') || token.length > 100) return null
    const device = await prisma.kioskDevice.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { club: { select: { id: true, name: true } } },
    })
    if (!device || device.revokedAt) return null
    return device
}

// Swaps a valid, unused pairing code for a new device. The code is claimed atomically so it can only ever be used once.
export async function pairKiosk(code: string, version: string | null) {
    const row = await prisma.kioskPairingCode.findUnique({ where: { codeHash: hashCode(code) } })
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null
    const claimed = await prisma.kioskPairingCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } })
    if (claimed.count === 0) return null
    const token = newDeviceToken()
    const device = await prisma.kioskDevice.create({
        data: { clubId: row.clubId, name: row.name, tokenHash: hashToken(token), appVersion: version, lastSeenAt: new Date() },
        include: { club: { select: { name: true } } },
    })
    return { token, deviceId: device.id, deviceName: device.name, clubName: device.club.name }
}
