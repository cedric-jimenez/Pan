import Button from "../Button"

interface PhotoActionsBarProps {
  isEditing: boolean
  isSaving: boolean
  isDeleting: boolean
  isReprocessing: boolean
  onSave: () => void
  onCancelEdit: () => void
  onEdit: () => void
  onAssignIndividual: () => void
  onReprocess: () => void
  onDelete: () => void
}

export default function PhotoActionsBar({
  isEditing,
  isSaving,
  isDeleting,
  isReprocessing,
  onSave,
  onCancelEdit,
  onEdit,
  onAssignIndividual,
  onReprocess,
  onDelete,
}: PhotoActionsBarProps) {
  if (isEditing) {
    return (
      <div className="border-border flex flex-wrap gap-2 border-t pt-4">
        <Button onClick={onSave} variant="primary" isLoading={isSaving}>
          Save
        </Button>
        <Button onClick={onCancelEdit} variant="secondary">
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="border-border flex flex-wrap gap-2 border-t pt-4">
      <Button onClick={onEdit} variant="primary">
        Edit
      </Button>
      <Button onClick={onAssignIndividual} variant="secondary">
        Assign Individual
      </Button>
      <Button
        onClick={onReprocess}
        variant="secondary"
        isLoading={isReprocessing}
        disabled={isReprocessing}
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retraiter
        </span>
      </Button>
      <Button onClick={onDelete} variant="destructive" isLoading={isDeleting}>
        Delete
      </Button>
    </div>
  )
}
