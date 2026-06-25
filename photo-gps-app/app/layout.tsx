import type { Metadata } from "next"
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google"
import "./globals.css"
import SessionProvider from "@/components/SessionProvider"
import ErrorBoundary from "@/components/ErrorBoundary"
import CsrfTokenInitializer from "@/components/CsrfTokenInitializer"
import ThemeProvider from "@/components/ThemeProvider"
import Footer from "@/components/Footer"

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Salamander Gallery - AI-Powered Species Management",
  description:
    "Upload and explore your salamander photos with GPS mapping and AI-powered species identification",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${beVietnamPro.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <ThemeProvider>
            <SessionProvider>
              <CsrfTokenInitializer />
              {children}
              <Footer />
            </SessionProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
