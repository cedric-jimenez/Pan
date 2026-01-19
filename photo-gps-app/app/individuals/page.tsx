"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Dialog } from "@headlessui/react"
import Navbar from "@/components/Navbar"
import IndividualList from "@/components/IndividualList"
import IndividualModal from "@/components/IndividualModal"
import { IndividualWithCount, IndividualWithPhotos, Individual } from "@/types/individual"

export default function IndividualsPage() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndividual, setEditingIndividual] = useState<Individual | null>(null)
  const [selectedIndividual, setSelectedIndividual] = useState<IndividualWithPhotos | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreateIndividual = () => {
    setEditingIndividual(null)
    setIsModalOpen(true)
  }

  const handleEditIndividual = (individual: IndividualWithCount) => {
    setEditingIndividual({
      id: individual.id,
      name: individual.name,
      userId: "",
      createdAt: individual.createdAt,
      updatedAt: individual.updatedAt,
    })
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
    setEditingIndividual(null)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingIndividual(null)
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Individuals</h1>
          <p className="text-muted-foreground">
            Manage individuals and organize your photos by assigning them to specific individuals.
          </p>
        </div>

        <IndividualList
          onSelectIndividual={handleSelectIndividual}
          onCreateIndividual={handleCreateIndividual}
          onEditIndividual={handleEditIndividual}
          refreshTrigger={refreshKey}
        />

        <IndividualModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          individual={editingIndividual || undefined}
        />

        <Dialog
          open={selectedIndividual !== null}
          onClose={() => setSelectedIndividual(null)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-card mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl shadow-xl">
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-3xl font-bold">
                      {selectedIndividual?.name}
                    </Dialog.Title>
                    <p className="text-muted-foreground mt-2">
                      {selectedIndividual?.photoCount} photo
                      {selectedIndividual?.photoCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedIndividual(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {selectedIndividual && selectedIndividual.photos.length > 0 ? (
                  <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {selectedIndividual.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-80"
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
                          <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-2 text-sm text-white">
                            {photo.title}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-12 text-center">
                    No photos assigned to this individual yet.
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </main>
    </div>
  )
}
