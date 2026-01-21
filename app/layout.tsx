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
import QueryProvider from '@/app/providers/QueryProvider'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head />
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <QueryProvider>
            <Toaster position="top-center" richColors />
            <AuthLoadingWrapper>
              <Header />
              {children}
            </AuthLoadingWrapper>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

