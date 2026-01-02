"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import clsx from "clsx"

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  return (
    <nav className="bg-card border-border border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/gallery" className="text-primary text-xl font-bold">
              PhotoMap
            </Link>

            <div className="flex gap-4">
              <Link
                href="/gallery"
                className={clsx(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/map"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Map View
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
