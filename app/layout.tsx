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
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Toaster } from 'sonner'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userRole = null
  let userName = null

  try {
    const user = await currentUser()

    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, name: true }
      })
      userRole = dbUser?.role
      userName = dbUser?.name
    }
  } catch (error) {
    console.warn("RootLayout fetch failed (ignoring for static build):", error)
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Toaster position="top-center" richColors />
          <Header role={userRole} userName={userName} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
