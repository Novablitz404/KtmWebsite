// Lightweight in-memory rate limiter for public, unauthenticated server actions.
// Single-process only — resets on redeploy/restart, doesn't coordinate across
// multiple server instances. That's an acceptable tradeoff here: it deters
// casual scripted abuse of a public search, not a hard security boundary.
const buckets = new Map<string, { count: number; resetAt: number }>()

function sweepExpired(now: number) {
    if (buckets.size < 5000) return
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) buckets.delete(key)
    }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now()
    sweepExpired(now)

    const bucket = buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true, retryAfterSeconds: 0 }
    }
    if (bucket.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
    }
    bucket.count++
    return { allowed: true, retryAfterSeconds: 0 }
}
