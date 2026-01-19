import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTM Tournament Manager",
  description: "Taekwondo tournament management platform",
};

import { ClerkProvider } from '@clerk/nextjs'
import Header from '@/components/Header'
import { Toaster } from 'sonner'
import AuthLoadingWrapper from '@/components/AuthLoadingWrapper'
import MobileShellWrapper from '@/components/MobileShellWrapper'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import QueryProvider from '@/app/providers/QueryProvider'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/KTMLogo.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#000000" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <QueryProvider>
            <Toaster position="top-center" richColors />
            <ServiceWorkerRegistration />
            <AuthLoadingWrapper>
              <Header />
              <MobileShellWrapper>
                {children}
              </MobileShellWrapper>
            </AuthLoadingWrapper>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

