import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import ErrorBoundary from "@/components/ErrorBoundary"
import CsrfTokenInitializer from "@/components/CsrfTokenInitializer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Salamander Gallery - AI-Powered Species Management",
  description: "Upload and explore your salamander photos with GPS mapping and AI-powered species identification",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <SessionProvider>
            <CsrfTokenInitializer />
            {children}
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
