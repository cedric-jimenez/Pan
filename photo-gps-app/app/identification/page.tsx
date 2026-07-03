"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import ShootingGuide from "@/components/identification/ShootingGuide"
import BulkImportDropzone, {
  type BulkImportResult,
} from "@/components/identification/BulkImportDropzone"
import BulkIdentifyReview from "@/components/identification/BulkIdentifyReview"
import ImportResultSummary from "@/components/identification/ImportResultSummary"

export default function IdentificationPage() {
  const { status } = useSession()
  const router = useRouter()

  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [batchId, setBatchId] = useState(0)
  const [attachedCount, setAttachedCount] = useState(0)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const handleComplete = (r: BulkImportResult) => {
    setAttachedCount(0)
    setResult(r)
    setBatchId((b) => b + 1)
  }

  const reset = () => {
    setResult(null)
    setAttachedCount(0)
  }

  if (status === "loading" || status === "unauthenticated") {
    return null
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen w-full px-4 pt-20 pb-12 md:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Import / summary column */}
          <div className="flex h-full flex-col gap-6 lg:col-span-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-foreground text-3xl font-semibold">Importer et identifier</h1>
              <p className="text-secondary-foreground text-base">
                Importez un lot de photos : chacune est comparée à votre catalogue pour la rattacher
                à un individu existant ou en créer un nouveau.
              </p>
            </div>

            {result === null ? (
              <BulkImportDropzone onComplete={handleComplete} className="flex-1" />
            ) : (
              <ImportResultSummary result={result} attachedCount={attachedCount} onReset={reset} />
            )}
          </div>

          {/* Shooting guide sidebar */}
          <div className="lg:col-span-4">
            <ShootingGuide />
          </div>
        </div>

        {/* Guided identification review */}
        {result !== null && result.detected.length > 0 && (
          <div className="mt-10">
            <BulkIdentifyReview
              key={batchId}
              detected={result.detected}
              onAttached={() => setAttachedCount((c) => c + 1)}
            />
          </div>
        )}
      </main>
    </>
  )
}
