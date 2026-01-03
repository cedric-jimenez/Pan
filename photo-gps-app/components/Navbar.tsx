"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import clsx from "clsx"

interface NavbarProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

export default function Navbar({ onSearch, searchQuery = "" }: NavbarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchInput, setSearchInput] = useState(searchQuery)

  if (!session) return null

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchInput(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleSearchClear = () => {
    setSearchInput("")
    if (onSearch) {
      onSearch("")
    }
  }

  return (
    <nav className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20 gap-8">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-4 min-w-fit">
            <Link href="/gallery" className="flex items-center gap-3 group">
              {/* Logo */}
              <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center group-hover:bg-teal-600 transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Title and subtitle */}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white">Pan Gallery</h1>
                <p className="text-xs text-slate-400">GPS Photo Management</p>
              </div>
            </Link>
          </div>

          {/* Center: Search bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative flex items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search by title, location, camera..."
                  className="w-full pl-12 pr-10 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                {searchInput && (
                  <button
                    onClick={handleSearchClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter button */}
              <button className="p-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Navigation and user menu */}
          <div className="flex items-center gap-3 min-w-fit">
            {/* Gallery button */}
            <Link
              href="/gallery"
              className={clsx(
                "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                pathname === "/gallery"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Gallery
            </Link>

            {/* Map button */}
            <Link
              href="/map"
              className={clsx(
                "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                pathname === "/map"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 rounded-full flex items-center justify-center text-sm font-semibold text-white transition-colors"
                title={session.user?.email || "User menu"}
              >
                {session.user?.name?.[0]?.toUpperCase() || session.user?.email?.[0]?.toUpperCase() || "U"}
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="text-sm font-medium text-white truncate">
                        {session.user?.name || "User"}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
