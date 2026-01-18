"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import IndividualList from "@/components/IndividualList"
import IndividualModal from "@/components/IndividualModal"
import { IndividualWithCount, IndividualWithPhotos } from "@/types/individual"

export default function IndividualsPage() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualWithPhotos | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateIndividual = () => {
    setIsModalOpen(true)
  }

  const handleSelectIndividual = async (individual: IndividualWithCount) => {
    try {
      const response = await fetch(`/api/individuals/${individual.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch individual details")
      }
      const data = await response.json()
      setSelectedIndividual(data.individual)
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleModalSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Individuals</h1>
          <p className="text-muted-foreground">
            Manage individuals and organize your photos by assigning them to specific individuals.
          </p>
        </div>

        <IndividualList
          key={refreshKey}
          onSelectIndividual={handleSelectIndividual}
          onCreateIndividual={handleCreateIndividual}
        />

        <IndividualModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
        />

        {selectedIndividual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">{selectedIndividual.name}</h2>
                <button
                  onClick={() => setSelectedIndividual(null)}
                  className="text-2xl hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <p className="text-muted-foreground mb-6">
                {selectedIndividual.photoCount} photo{selectedIndividual.photoCount !== 1 ? "s" : ""}
              </p>

              {selectedIndividual.photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedIndividual.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => router.push(`/gallery?photo=${photo.id}`)}
                    >
                      <Image
                        src={photo.croppedUrl || photo.url}
                        alt={photo.title || "Photo"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {photo.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                          {photo.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No photos assigned to this individual yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
