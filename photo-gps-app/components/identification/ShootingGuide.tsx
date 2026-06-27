// Static "Guide de prise de vue" sidebar from the identification design.
// Thumbnails use neutral icon placeholders; swap in real reference photos under
// /public when available.

const TIPS = [
  {
    title: "Vue de dessus",
    description: "Photographiez l'animal bien à plat, de manière perpendiculaire au dos.",
  },
  {
    title: "Lumière diffuse",
    description:
      "Évitez les reflets du flash ou la lumière directe du soleil qui masquent les motifs.",
  },
  {
    title: "Mise au point",
    description: "Assurez-vous que le milieu du corps (région dorsale) est parfaitement net.",
  },
]

function CameraIcon() {
  return (
    <svg
      className="text-muted-foreground h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <circle cx="12" cy="13" r="3" strokeWidth={1.5} />
    </svg>
  )
}

export default function ShootingGuide() {
  return (
    <aside className="bg-card border-border flex flex-col gap-6 rounded-xl border p-6 shadow-sm">
      <h2 className="text-foreground flex items-center gap-2 text-2xl font-semibold">
        <svg
          className="text-primary h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeWidth={1.5} d="M12 11v5M12 8h.01" />
        </svg>
        Guide de prise de vue
      </h2>

      <div className="flex flex-col gap-6">
        {TIPS.map((tip) => (
          <div key={tip.title} className="flex gap-4">
            <div className="bg-muted flex h-24 w-24 shrink-0 items-center justify-center rounded-lg">
              <CameraIcon />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-sm font-medium">{tip.title}</p>
              <p className="text-secondary-foreground text-sm leading-5">{tip.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Animal welfare reminder callout */}
      <div className="bg-warning text-warning-foreground flex items-start gap-3 rounded-lg p-4">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
          />
        </svg>
        <p className="text-xs font-medium leading-4">
          Rappel : Ne manipulez jamais l&apos;animal sans gants et veillez à son bien-être
          immédiat.
        </p>
      </div>
    </aside>
  )
}
