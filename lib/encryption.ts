import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set')
    }
    // Hash the key to ensure it's exactly 32 bytes for AES-256
    return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypts a plain-text string using AES-256-CBC.
 * Returns a string in the format: iv:encryptedData (both hex-encoded).
 */
export function encrypt(text: string): string {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a string that was encrypted with the encrypt() function.
 * Expects input in the format: iv:encryptedData (both hex-encoded).
 */
export function decrypt(encryptedText: string): string {
    const key = getKey()
    const [ivHex, encrypted] = encryptedText.split(':')
    if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted text format')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}
