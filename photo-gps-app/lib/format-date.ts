import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function formatDate(value: Date | string | null): string | null {
  if (!value) return null
  return format(new Date(value), "d MMMM yyyy", { locale: fr })
}

export function formatTime(value: Date | string | null): string | null {
  if (!value) return null
  return format(new Date(value), "HH:mm", { locale: fr })
}
