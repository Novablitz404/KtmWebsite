import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/tournaments(.*)',
    '/tournament/(.*)',
    '/about',
    '/events',
    '/ranking',
    '/privacy',
    '/terms',
    '/terms',
    '/manifest.json',   // PWA Manifest
    '/sw.js',           // PWA Service Worker
    '/workbox-(.*)',    // Workbox assets
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
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.ktmsports.com https://challenges.cloudflare.com",
    // Styles: self, inline (required for Clerk and many React libs), Google Fonts
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self, data URIs, Clerk, Supabase, Unsplash, blob for image processing
    "img-src 'self' data: blob: https://*.clerk.com https://*.ktmsports.com https://*.supabase.co https://img.clerk.com https://images.unsplash.com",
    // Fonts: self, Google Fonts, data URIs
    "font-src 'self' https://fonts.gstatic.com data:",
    // Connect: API calls to self, Clerk, Supabase
    "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.dev https://*.ktmsports.com https://*.supabase.co wss://*.supabase.co",
    // Frame ancestors: prevent embedding
    "frame-ancestors 'none'",
    // Frame src: allow Clerk iframe for auth
    "frame-src 'self' https://*.clerk.accounts.dev https://*.ktmsports.com https://challenges.cloudflare.com",
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
        await auth.protect()
    }

    // Get the response from NextResponse
    const response = NextResponse.next()

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
