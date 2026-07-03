import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface DeleteDayModalProps {
  date: Date
  totalCount: number
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function DeleteDayModal({
  date,
  totalCount,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteDayModalProps) {
  const plural = totalCount > 1
  const dayLabel = format(date, "d MMMM yyyy", { locale: fr })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-lg p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-semibold">Confirmer la suppression</h3>
        <p className="text-muted-foreground mb-6">
          Êtes-vous sûr de vouloir supprimer toutes les photos du{" "}
          <strong className="text-foreground">{dayLabel}</strong> ?
          <br />
          <br />
          <strong className="text-destructive">
            {totalCount} photo{plural ? "s" : ""} ser{plural ? "ont" : "a"} définitivement
            supprimée{plural ? "s" : ""}.
          </strong>
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="border-destructive-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                Suppression...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
