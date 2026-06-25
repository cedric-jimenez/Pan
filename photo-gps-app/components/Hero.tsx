import Image from "next/image"
import Link from "next/link"

/**
 * Landing-page hero ("partie haute" de l'accueil) — Figma "Design Pan 2",
 * node 1:680. Title + hook text on the left, salamander photo on the right.
 * Figma's hardcoded colors are mapped to the app's semantic theme tokens.
 */
export default function Hero() {
  return (
    <section className="flex flex-col items-center gap-12 py-16 md:flex-row md:justify-center">
      <div className="flex w-full flex-1 flex-col items-start gap-6">
        <h1 className="text-foreground text-[2.5rem] leading-[1.2] font-bold">
          Protégez la faune, une observation à la fois.
        </h1>

        <p className="text-secondary-foreground max-w-lg text-lg leading-7">
          Rejoignez la communauté SalamanTrack pour identifier et cartographier les populations de
          salamandres dans votre région. Votre contribution aide les chercheurs à préserver ces
          espèces essentielles.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/gallery#upload"
            className="bg-primary text-primary-foreground rounded-lg px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-primary/90"
          >
            Commencer l&apos;identification
          </Link>
          <a
            href="#en-savoir-plus"
            className="border-border text-foreground hover:bg-secondary rounded-lg border px-8 py-3 text-sm font-medium transition-colors"
          >
            En savoir plus
          </a>
        </div>
      </div>

      <div className="relative aspect-[584/500] w-full flex-1 overflow-hidden rounded-xl shadow-lg">
        <Image
          src="/hero-salamander.jpg"
          alt="Salamandre tachetée (Salamandra salamandra) sur de la mousse"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        {/* Subtle bottom-up gradient, matching the Figma overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    </section>
  )
}
