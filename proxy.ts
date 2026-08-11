import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { EVENT_DOMAIN_MAP } from '@/lib/event-config'

const PUBLIC_ROUTES = new Set([
    '/',
    '/sign-in',
    '/sign-up',
    '/admin-sign-in',
    '/about',
    '/membership',
    '/clubs',
    '/affiliation',
    '/events',
    '/privacy',
    '/terms',
    '/announcement',
    '/wotf-members',

    '/manifest.json',
])

const PUBLIC_PREFIXES = [
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/api/auth',
    '/api/webhooks',
    '/api/tournament',
    '/api/poomsae',
    '/api/clubs',
    '/api/v1/onboarding',
    '/api/event',
    '/api/checkout',   // Guest registration payment flow (no auth required)
    '/api/cron',
    '/api/ai',
    '/tournaments',
    '/tournament/',
    '/rankings',
    '/seminars',
    '/promotions/',
    '/event/',
    '/qr/',
]

function isPublicRoute(pathname: string): boolean {
    if (PUBLIC_ROUTES.has(pathname)) return true
    return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

// Security headers configuration
const securityHeaders: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()',
    ...(process.env.NODE_ENV === 'production' && {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }),
}

// Content Security Policy — Clerk references removed
const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.ktmsports.com https://challenges.cloudflare.com https://*.google.com https://*.googleapis.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com https://*.gstatic.com",
    `img-src 'self' data: blob: https://*.ktmsports.com https://*.supabase.co https://images.unsplash.com https://*.google.com https://*.googleapis.com https://*.gstatic.com${process.env.NODE_ENV === 'development' ? ' http://127.0.0.1:54321 http://localhost:54321' : ''}`,
    "font-src 'self' https://fonts.gstatic.com https://*.gstatic.com data:",
    `connect-src 'self' https://*.ktmsports.com https://*.supabase.co wss://*.supabase.co https://*.googleapis.com${process.env.NODE_ENV === 'development' ? ' http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:54321' : ''}`,
    "frame-ancestors 'none'",
    "frame-src 'self' https://challenges.cloudflare.com https://*.google.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
]

const cspHeader = cspDirectives.join('; ')

export default async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // Refresh the session (this also handles token refresh)
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protected route checks
    if (!isPublicRoute(pathname)) {
        if (!user) {
            // For API routes, return 401
            if (pathname.startsWith('/api/')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            // For pages, redirect to sign-in
            const url = request.nextUrl.clone()
            url.pathname = '/sign-in'
            return NextResponse.redirect(url)
        }
    }

    // ========================================
    // TENANT DETECTION
    // Priority: 1) ?tenant= query param  2) Custom domain  3) KTM default
    // ========================================
    const hostname = request.headers.get('host') || ''
    const { searchParams } = request.nextUrl

    // Retired domains — no longer serve any tenant here (in use by a different project)
    const RETIRED_DOMAINS = new Set(['wo-tf.com', 'www.wo-tf.com'])
    if (RETIRED_DOMAINS.has(hostname)) {
        return new NextResponse(null, { status: 404 })
    }

    // Static tenant map for known domains
    const TENANT_MAP: Record<string, string> = {
        'tap-elite.com': 'tap-elite',
        'www.tap-elite.com': 'tap-elite',
    }

    // KTM admin domains
    const KTM_DOMAINS = ['ktmsports.com', 'www.ktmsports.com', 'ktm-website.vercel.app']

    const tenantParam = searchParams.get('tenant')
    const tenantFromDomain = TENANT_MAP[hostname]
    const isKtmDomain = KTM_DOMAINS.includes(hostname) || hostname.startsWith('localhost')

    let orgSlug = 'ktm'
    if (tenantParam) {
        orgSlug = tenantParam
    } else if (tenantFromDomain) {
        orgSlug = tenantFromDomain
    } else if (isKtmDomain) {
        orgSlug = 'ktm'
    } else {
        orgSlug = hostname
    }

    console.log('[Proxy] path:', pathname, '| orgSlug:', orgSlug)

    // Set tenant header
    response.headers.set('x-org-slug', orgSlug)

    // ========================================
    // EVENT DOMAIN DETECTION
    // If the hostname matches a custom event domain, set the event slug header
    // Also detect /event/ paths for path-based access (e.g. localhost)
    // ========================================
    const eventSlug = EVENT_DOMAIN_MAP[hostname]
    const pathEventMatch = pathname.match(/^\/event\/([^/]+)/)
    const resolvedEventSlug = eventSlug || (pathEventMatch ? pathEventMatch[1] : null)

    if (resolvedEventSlug) {
        // Set on request headers so server components can read via headers()
        request.headers.set('x-event-slug', resolvedEventSlug)
        // Recreate response with updated request headers
        response = NextResponse.next({ request: { headers: request.headers } })
        response.headers.set('x-org-slug', orgSlug)
        response.headers.set('x-event-slug', resolvedEventSlug)
        console.log('[Proxy] event detected:', resolvedEventSlug)
    }

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
        if (value) response.headers.set(key, value)
    })

    // Add CSP header
    response.headers.set('Content-Security-Policy', cspHeader)

    return response
}

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
