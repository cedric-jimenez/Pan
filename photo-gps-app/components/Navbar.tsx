"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import clsx from "clsx"

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!session) return null

  return (
    <nav
      className={clsx(
        "border-border fixed top-0 right-0 left-0 z-50 border-b transition-all duration-300",
        scrolled ? "bg-background/80 shadow-lg backdrop-blur-md" : "bg-background"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/gallery" className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg md:h-10 md:w-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-white md:h-6 md:w-6"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-foreground text-sm leading-tight font-bold md:text-lg">
                Salamander Gallery
              </span>
              <span className="text-muted-foreground hidden text-[10px] leading-tight sm:block md:text-xs">
                AI-Powered Species Management
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            <div className="flex gap-2">
              <Link
                href="/gallery"
                className={clsx(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === "/gallery"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Gallery
              </Link>

              <Link
                href="/individuals"
                className={clsx(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === "/individuals"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Individuals
              </Link>

              <Link
                href="/map"
                className={clsx(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === "/map"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Map
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">{session.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-muted-foreground hover:text-foreground px-4 py-2 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-muted-foreground hover:text-foreground p-2 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
              >
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-border border-t py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <Link
                href="/gallery"
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  "rounded-md px-4 py-3 text-sm font-medium transition-colors",
                  pathname === "/gallery"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Gallery
              </Link>

              <Link
                href="/individuals"
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  "rounded-md px-4 py-3 text-sm font-medium transition-colors",
                  pathname === "/individuals"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Individuals
              </Link>

              <Link
                href="/map"
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                  pathname === "/map"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Map
              </Link>

              <div className="border-border mt-2 border-t pt-2">
                <div className="text-muted-foreground px-4 py-2 text-sm">{session.user?.email}</div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted w-full rounded-md px-4 py-3 text-left text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
