import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

import { AuthProvider } from '@/app/providers/AuthProvider'
import Header from '@/components/Header'
import { Toaster } from 'sonner'
import AuthLoadingWrapper from '@/components/AuthLoadingWrapper'
import QueryProvider from '@/app/providers/QueryProvider'
import PageTransition from '@/components/PageTransition'
import RecoveryRedirect from '@/components/RecoveryRedirect'
import { TenantProvider } from '@/app/providers/TenantProvider'
import { getTenant } from '@/lib/tenant'
import { getEventConfig } from '@/lib/event-config'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant()
  const headersList = await import('next/headers').then(mod => mod.headers())
  const eventSlug = headersList.get('x-event-slug')

  // Event-specific metadata
  if (eventSlug) {
    const eventConfig = getEventConfig(eventSlug)
    if (eventConfig) {
      return {
        title: eventConfig.title || eventConfig.name,
        description: eventConfig.description || `Register for ${eventConfig.name}`,
        icons: { icon: eventConfig.faviconUrl || '/favicon.ico' },
        openGraph: eventConfig.ogImageUrl ? {
          images: [{ url: eventConfig.ogImageUrl }],
        } : undefined,
      }
    }
  }

  const siteUrl = tenant.slug === 'wotf-global'
    ? 'https://www.wo-tf.com'
    : 'https://www.wo-tf.com'

  const description = (tenant as any).description || tenant.tagline || 'Taekwondo management platform'
  const ogImage = (tenant as any).ogImageUrl
    ? `${siteUrl}${(tenant as any).ogImageUrl}`
    : `${siteUrl}${tenant.logoUrl}`

  return {
    title: {
      default: `${tenant.name} — ${tenant.tagline}`,
      template: `%s | ${tenant.name}`,
    },
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      type: 'website',
      url: siteUrl,
      siteName: tenant.name,
      title: `${tenant.name} — ${tenant.tagline}`,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: tenant.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tenant.name} — ${tenant.tagline}`,
      description,
      images: [ogImage],
    },
    icons: {
      icon: tenant.faviconUrl || '/favicon.ico',
      apple: tenant.faviconUrl || '/favicon.ico',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'theme-color': tenant.primaryColor,
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await getTenant()
  const headersList = await import('next/headers').then(mod => mod.headers())
  const isEventPage = !!headersList.get('x-event-slug')

  return (
    <AuthProvider>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} antialiased`}
          suppressHydrationWarning
          style={{
            '--tenant-primary': tenant.primaryColor,
            '--tenant-secondary': tenant.secondaryColor,
            '--tenant-accent': tenant.accentColor,
          } as React.CSSProperties}
        >
          <QueryProvider>
            <TenantProvider tenant={tenant}>
              <Toaster position="top-center" richColors />
              <RecoveryRedirect />
              {isEventPage || tenant.slug === 'wotf-global' ? (
                // Event pages & WOTF Global: no header, no auth wrapper, no page transition
                children
              ) : (
                <AuthLoadingWrapper>
                  {tenant.slug === 'ktm' && <Header />}
                  <PageTransition>
                    {children}
                  </PageTransition>
                </AuthLoadingWrapper>
              )}
            </TenantProvider>
          </QueryProvider>
        </body>
      </html>
    </AuthProvider>
  );
}

