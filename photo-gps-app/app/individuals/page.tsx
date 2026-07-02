"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import IndividualList from "@/components/IndividualList"
import IndividualModal from "@/components/IndividualModal"
import { IndividualWithCount, Individual } from "@/types/individual"

export default function IndividualsPage() {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndividual, setEditingIndividual] = useState<Individual | null>(null)
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

  const handleSelectIndividual = (individual: IndividualWithCount) => {
    router.push(`/individuals/${individual.id}`)
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
      <main className="w-full px-4 py-8 pt-24 md:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Catalogue des individus</h1>
          <p className="text-muted-foreground">
            Parcourez les individus répertoriés et organisez vos photos en les rattachant à chacun.
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
      </main>
    </div>
  )
}
