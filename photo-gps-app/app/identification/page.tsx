"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import ShootingGuide from "@/components/identification/ShootingGuide"
import BulkImportDropzone, {
  type BulkImportResult,
} from "@/components/identification/BulkImportDropzone"
import BulkIdentifyReview from "@/components/identification/BulkIdentifyReview"

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
              <div className="flex flex-col gap-4">
                {/* Import tallies */}
                <div className="bg-card border-border flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border px-4 py-3 text-sm">
                  <span className="text-accent font-medium">
                    ✓ {result.detected.length} détectée{result.detected.length > 1 ? "s" : ""}
                  </span>
                  {result.noDetection.length > 0 && (
                    <span className="text-secondary-foreground">
                      ⚠ {result.noDetection.length} sans salamandre
                    </span>
                  )}
                  {result.errors.length > 0 && (
                    <span className="text-destructive">
                      ✗ {result.errors.length} en échec
                    </span>
                  )}
                </div>

                {attachedCount > 0 && (
                  <div className="bg-accent/10 border-accent text-foreground rounded-lg border px-4 py-3 text-sm">
                    {attachedCount} photo{attachedCount > 1 ? "s" : ""} rattachée
                    {attachedCount > 1 ? "s" : ""} à un individu.{" "}
                    <Link href="/individuals" className="text-primary font-medium hover:underline">
                      Voir le catalogue
                    </Link>
                  </div>
                )}

                {result.detected.length === 0 && (
                  <p className="text-secondary-foreground text-sm">
                    Aucune photo exploitable pour l&apos;identification dans ce lot.
                  </p>
                )}

                {result.noDetection.length > 0 && (
                  <div className="bg-muted/50 border-border rounded-lg border px-4 py-3 text-sm">
                    <p className="text-foreground font-medium">
                      Aucune salamandre détectée sur {result.noDetection.length} photo
                      {result.noDetection.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-secondary-foreground mt-1">
                      {result.noDetection.join(", ")} — bien importée
                      {result.noDetection.length > 1 ? "s" : ""} mais non comparable
                      {result.noDetection.length > 1 ? "s" : ""} aux individus connus. Utilisez une
                      photo nette du dos de l&apos;animal, prise de dessus et bien éclairée.
                    </p>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="bg-destructive/10 border-destructive rounded-lg border px-4 py-3 text-sm">
                    <p className="text-destructive font-medium">
                      {result.errors.length} fichier{result.errors.length > 1 ? "s" : ""} non
                      importé{result.errors.length > 1 ? "s" : ""}
                    </p>
                    <ul className="text-secondary-foreground mt-1 list-inside list-disc">
                      {result.errors.map((e) => (
                        <li key={e.filename}>
                          {e.filename} : {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={reset}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
                  >
                    Importer d&apos;autres photos
                  </button>
                </div>
              </div>
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
