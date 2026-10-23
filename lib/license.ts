// Helpers for the Club management subscriptions (the rules themselves are in lib/club-subscription.ts).
import { randomInt } from 'crypto'

// No 0/O or 1/I, so a key read out over the phone is hard to mix up. Each subscription row keeps one; it is not used to sign in.
const KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export const dateOnly = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null)

export function generateLicenseKey() {
    const body = Array.from({ length: 16 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]).join('')
    return `KTM-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`
}
