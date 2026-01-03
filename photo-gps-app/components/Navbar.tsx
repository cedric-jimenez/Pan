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
        "fixed top-0 left-0 right-0 z-50 border-b border-border transition-all duration-300",
        scrolled ? "bg-background/80 backdrop-blur-md shadow-lg" : "bg-background"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/gallery" className="flex items-center gap-3">
              <div className="bg-primary rounded-lg w-10 h-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-foreground text-lg font-bold leading-tight">
                  Salamander Gallery
                </span>
                <span className="text-muted-foreground text-xs leading-tight">
                  AI-Powered Species Management
                </span>
              </div>
            </Link>

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
                href="/map"
                className={clsx(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  pathname === "/map"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Map
              </Link>
            </div>
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
      </div>
    </nav>
  )
}
