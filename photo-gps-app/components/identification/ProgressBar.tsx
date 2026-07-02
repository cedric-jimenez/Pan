"use client"

interface ProgressBarProps {
  done: number
  total: number
  /** Short label shown before the counter, e.g. "photos importées". */
  label: string
}

export default function ProgressBar({ done, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-secondary-foreground tabular-nums">
          {done} / {total}
        </span>
      </div>
      <div
        className="bg-muted h-2.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
