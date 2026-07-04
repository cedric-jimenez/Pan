import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DeleteDayModal from "@/components/gallery/DeleteDayModal"

const testDate = new Date(2024, 2, 15)

describe("DeleteDayModal", () => {
  it("renders the singular confirmation message for a single photo", () => {
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={1}
        isDeleting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument()
    expect(screen.getByText("15 mars 2024")).toBeInTheDocument()
    expect(screen.getByText("1 photo sera définitivement supprimée.")).toBeInTheDocument()
  })

  it("renders the plural confirmation message for multiple photos", () => {
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={3}
        isDeleting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText("3 photos seront définitivement supprimées.")).toBeInTheDocument()
  })

  it("calls onCancel when the cancel button is clicked", async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={1}
        isDeleting={false}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: "Annuler" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("calls onConfirm when the delete button is clicked", async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={1}
        isDeleting={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole("button", { name: "Supprimer" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("shows a deleting state and disables both buttons", () => {
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={1}
        isDeleting={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText("Suppression...")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Suppression..." })).toBeDisabled()
  })

  it("does not show the deleting spinner text when idle", () => {
    render(
      <DeleteDayModal
        date={testDate}
        totalCount={1}
        isDeleting={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.queryByText("Suppression...")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled()
  })
})
