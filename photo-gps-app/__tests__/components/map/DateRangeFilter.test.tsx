import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DateRangeFilter from "@/components/map/DateRangeFilter"

function baseProps() {
  return {
    datePreset: "all" as const,
    onDatePresetChange: vi.fn(),
    customStart: "",
    onCustomStartChange: vi.fn(),
    customEnd: "",
    onCustomEndChange: vi.fn(),
  }
}

describe("DateRangeFilter Component", () => {
  it("renders all date preset options", () => {
    render(<DateRangeFilter {...baseProps()} />)
    expect(screen.getByText("Dernières 24 heures")).toBeInTheDocument()
    expect(screen.getByText("7 derniers jours")).toBeInTheDocument()
    expect(screen.getByText("30 derniers jours")).toBeInTheDocument()
    expect(screen.getByText("Toutes les dates")).toBeInTheDocument()
    expect(screen.getByText("Personnalisé…")).toBeInTheDocument()
  })

  it("does not show custom date inputs unless the custom preset is selected", () => {
    render(<DateRangeFilter {...baseProps()} />)
    expect(screen.queryByText("Du")).not.toBeInTheDocument()
    expect(screen.queryByText("Au")).not.toBeInTheDocument()
  })

  it("shows custom date inputs when datePreset is custom", () => {
    render(<DateRangeFilter {...baseProps()} datePreset="custom" />)
    expect(screen.getByText("Du")).toBeInTheDocument()
    expect(screen.getByText("Au")).toBeInTheDocument()
  })

  it("calls onDatePresetChange when a different preset is selected", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<DateRangeFilter {...props} />)
    await user.selectOptions(screen.getByRole("combobox"), "7d")
    expect(props.onDatePresetChange).toHaveBeenCalledWith("7d")
  })

  it("calls onCustomStartChange and onCustomEndChange when custom date inputs change", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<DateRangeFilter {...props} datePreset="custom" />)
    const [startInput, endInput] = screen.getAllByDisplayValue("")
    await user.type(startInput, "2024-01-01")
    expect(props.onCustomStartChange).toHaveBeenCalled()
    await user.type(endInput, "2024-01-31")
    expect(props.onCustomEndChange).toHaveBeenCalled()
  })

  it("reflects the current customStart and customEnd values", () => {
    render(
      <DateRangeFilter
        {...baseProps()}
        datePreset="custom"
        customStart="2024-01-01"
        customEnd="2024-01-31"
      />
    )
    expect(screen.getByDisplayValue("2024-01-01")).toBeInTheDocument()
    expect(screen.getByDisplayValue("2024-01-31")).toBeInTheDocument()
  })
})
