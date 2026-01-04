"use client"

import { useEffect } from "react"
import { initializeCsrfToken } from "@/lib/fetch-with-csrf"

/**
 * Component to initialize CSRF token on app load
 * This ensures the token is ready before any POST requests
 */
export default function CsrfTokenInitializer() {
  useEffect(() => {
    // Initialize CSRF token when the app loads
    initializeCsrfToken().catch((error) => {
      console.error("Failed to initialize CSRF token:", error)
    })
  }, [])

  // This component doesn't render anything
  return null
}
