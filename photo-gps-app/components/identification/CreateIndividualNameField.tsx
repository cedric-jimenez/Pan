import Input from "@/components/Input"

interface CreateIndividualNameFieldProps {
  name: string
  nameLoading: boolean
  submitting: boolean
  onNameChange: (name: string) => void
  onRegenerate: () => void
}

export default function CreateIndividualNameField({
  name,
  nameLoading,
  submitting,
  onNameChange,
  onRegenerate,
}: CreateIndividualNameFieldProps) {
  return (
    <div>
      <div className="flex items-end gap-2">
        <Input
          label="Nom du nouvel individu"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={nameLoading ? "Génération…" : "Nom"}
          disabled={submitting}
        />
        <button
          type="button"
          onClick={onRegenerate}
          disabled={nameLoading || submitting}
          className="text-secondary-foreground hover:text-foreground hover:bg-muted mb-px rounded-lg p-2.5 transition-colors disabled:opacity-50"
          aria-label="Suggérer un autre nom"
          title="Suggérer un autre nom"
        >
          <svg
            className={`h-5 w-5 ${nameLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">Nom suggéré automatiquement — modifiable.</p>
    </div>
  )
}
