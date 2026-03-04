import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
    '/api/tournament(.*)',
    '/api/poomsae(.*)',
    '/api/clubs',
    '/api/v1/onboarding(.*)',
    '/tournaments(.*)',
    '/tournament/(.*)',
    '/about',
    '/membership',
    '/events',
    '/rankings(.*)', // Allow detailed views if added later
    '/seminars(.*)',
    '/privacy',
    '/terms',
    '/terms',
    '/manifest.json',   // PWA Manifest
])

// Security headers configuration
const securityHeaders = {
    // Prevent clickjacking - don't allow framing
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Restrict browser features
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()',
    // Force HTTPS (only in production)
    ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }),
}

// Content Security Policy
// Note: Clerk requires 'unsafe-inline' for styles and specific script sources
const cspDirectives = [
    // Default: only same origin
    "default-src 'self'",
    // Scripts: self, Clerk, and inline (required for Next.js)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.ktmsports.com https://*.wotf-ph.com https://challenges.cloudflare.com",
    // Styles: self, inline (required for Clerk and many React libs), Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self, data URIs, Clerk, Supabase, Unsplash, blob for image processing
    "img-src 'self' data: blob: https://*.clerk.com https://*.ktmsports.com https://*.wotf-ph.com https://*.supabase.co https://img.clerk.com https://images.unsplash.com",
    // Fonts: self, Google Fonts, data URIs
    "font-src 'self' https://fonts.gstatic.com data:",
    // Connect: API calls to self, Clerk, Supabase
    "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.ktmsports.com https://*.wotf-ph.com https://*.supabase.co wss://*.supabase.co",
    // Frame ancestors: prevent embedding
    "frame-ancestors 'none'",
    // Frame src: allow Clerk iframe for auth
    "frame-src 'self' https://*.clerk.accounts.dev https://*.ktmsports.com https://*.wotf-ph.com https://challenges.cloudflare.com",
    // Form actions: only self
    "form-action 'self'",
    // Base URI: only self
    "base-uri 'self'",
    // Object src: none (no plugins)
    "object-src 'none'",
    // Worker src: self for service workers
    "worker-src 'self' blob:",
    // Manifest src: self for PWA
    "manifest-src 'self'",
]

const cspHeader = cspDirectives.join('; ')

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        // For API routes, return 401 instead of redirecting
        if (request.nextUrl.pathname.startsWith('/api/')) {
            const { userId } = await auth()
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }
        await auth.protect()
    }


    // ========================================
    // TENANT DETECTION
    // Priority: 1) ?tenant= query param  2) Custom domain  3) Clerk session metadata  4) KTM default
    // Requires Clerk session token template to include publicMetadata.
    // ========================================
    const hostname = request.headers.get('host') || ''
    const { searchParams } = request.nextUrl

    // Static tenant map for known domains
    const TENANT_MAP: Record<string, string> = {
        // Custom domains → org slug
        'wotf-ph.com': 'wotf',
        'www.wotf-ph.com': 'wotf',
    }

    // KTM admin domains (no tenant — serves KTM super admin)
    const KTM_DOMAINS = ['ktmsports.com', 'www.ktmsports.com', 'ktm-website.vercel.app']

    const tenantParam = searchParams.get('tenant')
    const tenantFromDomain = TENANT_MAP[hostname]
    const isKtmDomain = KTM_DOMAINS.includes(hostname) || hostname.startsWith('localhost')

    // Read tenant from Clerk session (catches RSC requests without ?tenant= param)
    let tenantFromSession: string | null = null
    try {
        const { sessionClaims } = await auth()
        tenantFromSession = (sessionClaims?.publicMetadata as any)?.tenant || null
    } catch { }

    let orgSlug = 'ktm'
    if (tenantParam) {
        orgSlug = tenantParam
    } else if (tenantFromDomain) {
        orgSlug = tenantFromDomain
    } else if (tenantFromSession && tenantFromSession !== 'ktm') {
        orgSlug = tenantFromSession
    } else if (isKtmDomain) {
        orgSlug = 'ktm'
    } else {
        orgSlug = hostname
    }

    console.log('[Proxy] path:', request.nextUrl.pathname, '| tenantParam:', tenantParam, '| tenantFromSession:', tenantFromSession, '| orgSlug:', orgSlug)

    // Clone the request headers and add the tenant slug
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-org-slug', orgSlug)

    // Get the response, passing the modified request headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        if (value) response.headers.set(key, value)
    })

    // Add CSP header
    response.headers.set('Content-Security-Policy', cspHeader)

    return response
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
