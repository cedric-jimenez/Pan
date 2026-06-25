import Link from "next/link"

/**
 * Site footer — Figma "Design Pan 2", node 1:849. Brand + tagline on the left,
 * link columns on the right. Figma's hardcoded colors mapped to theme tokens.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-secondary border-border border-t">
      <div className="flex w-full flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:justify-between md:px-8">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <span className="text-primary text-2xl font-bold">SalamanTrack</span>
          <p className="text-secondary-foreground max-w-xs leading-6">
            Ensemble, suivons et protégeons les joyaux cachés de nos forêts.
          </p>
          <p className="text-secondary-foreground">
            © {year} SalamanTrack. All rights reserved.
          </p>
        </div>

        {/* Link columns */}
        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-sm font-bold">Plateforme</span>
            <Link href="#" className="text-secondary-foreground hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="#" className="text-secondary-foreground hover:text-foreground transition-colors">
              Research Partners
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-sm font-bold">Légal</span>
            <Link href="#" className="text-secondary-foreground hover:text-foreground transition-colors">
              Data Privacy
            </Link>
            <Link href="#" className="text-secondary-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
