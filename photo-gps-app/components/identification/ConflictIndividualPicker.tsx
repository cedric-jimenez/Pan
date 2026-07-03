import { ConflictIndividual } from "@/types/identification"

interface ConflictIndividualPickerProps {
  options: ConflictIndividual[]
  chosenId: string | null
  onChoose: (id: string) => void
}

export default function ConflictIndividualPicker({
  options,
  chosenId,
  onChoose,
}: ConflictIndividualPickerProps) {
  return (
    <div>
      <p className="text-foreground mb-3 text-sm">
        Les photos sélectionnées appartiennent à plusieurs individus. Choisissez celui auquel tout
        rattacher :
      </p>
      <div className="space-y-2">
        {options.map((ind) => (
          <label
            key={ind.id}
            className={`border-border flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
              chosenId === ind.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <input
              type="radio"
              name="conflict-individual"
              value={ind.id}
              checked={chosenId === ind.id}
              onChange={() => onChoose(ind.id)}
            />
            <span className="text-foreground text-sm font-medium">{ind.name}</span>
            {ind.photoCount > 0 && (
              <span className="text-muted-foreground text-xs">({ind.photoCount} photos)</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
