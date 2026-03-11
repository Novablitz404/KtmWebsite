import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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
import AiChatWidget from '@/components/AiChatWidget'

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
        icons: {
          icon: eventConfig.faviconUrl || '/favicon.ico',
        },
        openGraph: eventConfig.ogImageUrl ? {
          images: [{ url: eventConfig.ogImageUrl }],
        } : undefined,
      }
    }
  }

  // Default tenant metadata
  return {
    title: tenant.name,
    description: tenant.tagline || 'Taekwondo management platform',
    icons: {
      icon: tenant.faviconUrl || '/favicon.ico',
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
          className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
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
              {isEventPage ? (
                // Event pages: no header, no auth wrapper, no page transition
                children
              ) : (
                <AuthLoadingWrapper>
                  {tenant.slug === 'ktm' && <Header />}
                  <PageTransition>
                    {children}
                  </PageTransition>
                  {tenant.slug !== 'ktm' && <AiChatWidget />}
                </AuthLoadingWrapper>
              )}
            </TenantProvider>
          </QueryProvider>
        </body>
      </html>
    </AuthProvider>
  );
}

