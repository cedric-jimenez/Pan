import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import InteractiveMapSection from "@/components/InteractiveMapSection"
import LatestIdentifications from "@/components/LatestIdentifications"

/**
 * Landing page ("Accueil"). Built section by section from the Figma
 * "Design Pan 2" — currently the hero (partie haute).
 */
export default function AccueilPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="w-full px-4 pt-24 pb-8 md:px-8">
        <Hero />
        <InteractiveMapSection />
        <LatestIdentifications />
      </main>
    </div>
  )
}
