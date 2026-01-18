"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { logger } from "@/lib/logger"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch and handle React errors
 * Prevents the entire app from crashing when a component throws an error
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details to monitoring service
    logger.error("Error Boundary caught an error:", {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
          <div className="border-border bg-card max-w-md rounded-lg border p-6 text-center shadow-lg">
            <h2 className="text-destructive mb-4 text-2xl font-bold">Oops! Something went wrong</h2>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="text-muted-foreground mb-6 text-left text-sm">
                <summary className="cursor-pointer font-medium">Error details</summary>
                <pre className="bg-muted mt-2 overflow-auto rounded p-2 text-xs">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
            >
              Refresh page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
