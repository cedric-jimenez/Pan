import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CreateIndividualNameField from "@/components/identification/CreateIndividualNameField"

describe("CreateIndividualNameField Component", () => {
  it("renders the input with the current name", () => {
    render(
      <CreateIndividualNameField
        name="Sally"
        nameLoading={false}
        submitting={false}
        onNameChange={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByRole("textbox")).toHaveValue("Sally")
  })

  it("calls onNameChange when the user types", async () => {
    const user = userEvent.setup()
    const onNameChange = vi.fn()
    render(
      <CreateIndividualNameField
        name=""
        nameLoading={false}
        submitting={false}
        onNameChange={onNameChange}
        onRegenerate={vi.fn()}
      />
    )
    await user.type(screen.getByRole("textbox"), "A")
    expect(onNameChange).toHaveBeenCalledWith("A")
  })

  it("calls onRegenerate when the regenerate button is clicked", async () => {
    const user = userEvent.setup()
    const onRegenerate = vi.fn()
    render(
      <CreateIndividualNameField
        name="Sally"
        nameLoading={false}
        submitting={false}
        onNameChange={vi.fn()}
        onRegenerate={onRegenerate}
      />
    )
    await user.click(screen.getByLabelText("Suggérer un autre nom"))
    expect(onRegenerate).toHaveBeenCalledTimes(1)
  })

  it("shows a loading placeholder while the name is being generated", () => {
    render(
      <CreateIndividualNameField
        name=""
        nameLoading={true}
        submitting={false}
        onNameChange={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText("Génération…")).toBeInTheDocument()
  })

  it("disables the regenerate button while loading a name", () => {
    render(
      <CreateIndividualNameField
        name=""
        nameLoading={true}
        submitting={false}
        onNameChange={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Suggérer un autre nom")).toBeDisabled()
  })

  it("disables the input and regenerate button while submitting", () => {
    render(
      <CreateIndividualNameField
        name="Sally"
        nameLoading={false}
        submitting={true}
        onNameChange={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.getByLabelText("Suggérer un autre nom")).toBeDisabled()
  })

  it("renders the helper text", () => {
    render(
      <CreateIndividualNameField
        name="Sally"
        nameLoading={false}
        submitting={false}
        onNameChange={vi.fn()}
        onRegenerate={vi.fn()}
      />
    )
    expect(screen.getByText("Nom suggéré automatiquement — modifiable.")).toBeInTheDocument()
  })
})
