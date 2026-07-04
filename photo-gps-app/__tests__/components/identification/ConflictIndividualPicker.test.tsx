import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ConflictIndividualPicker from "@/components/identification/ConflictIndividualPicker"
import { ConflictIndividual } from "@/types/identification"

const options: ConflictIndividual[] = [
  { id: "1", name: "Sally", photoCount: 3 },
  { id: "2", name: "Spot", photoCount: 0 },
]

describe("ConflictIndividualPicker Component", () => {
  it("renders the instructional text", () => {
    render(<ConflictIndividualPicker options={options} chosenId={null} onChoose={vi.fn()} />)
    expect(screen.getByText(/Choisissez celui auquel tout/)).toBeInTheDocument()
  })

  it("renders one radio option per individual", () => {
    render(<ConflictIndividualPicker options={options} chosenId={null} onChoose={vi.fn()} />)
    expect(screen.getByText("Sally")).toBeInTheDocument()
    expect(screen.getByText("Spot")).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(2)
  })

  it("shows the photo count only when greater than 0", () => {
    render(<ConflictIndividualPicker options={options} chosenId={null} onChoose={vi.fn()} />)
    expect(screen.getByText("(3 photos)")).toBeInTheDocument()
    expect(screen.queryByText("(0 photos)")).not.toBeInTheDocument()
  })

  it("marks the chosen option as checked", () => {
    render(<ConflictIndividualPicker options={options} chosenId="2" onChoose={vi.fn()} />)
    const radios = screen.getAllByRole("radio") as HTMLInputElement[]
    expect(radios[0].checked).toBe(false)
    expect(radios[1].checked).toBe(true)
  })

  it("calls onChoose with the individual id when selected", async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    render(<ConflictIndividualPicker options={options} chosenId={null} onChoose={onChoose} />)

    await user.click(screen.getByText("Sally"))
    expect(onChoose).toHaveBeenCalledWith("1")
  })

  it("renders no options when the list is empty", () => {
    render(<ConflictIndividualPicker options={[]} chosenId={null} onChoose={vi.fn()} />)
    expect(screen.queryAllByRole("radio")).toHaveLength(0)
  })
})
