import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PhotoActionsBar from "@/components/photo-details/PhotoActionsBar"

function baseProps() {
  return {
    isEditing: false,
    isSaving: false,
    isDeleting: false,
    isReprocessing: false,
    onSave: vi.fn(),
    onCancelEdit: vi.fn(),
    onEdit: vi.fn(),
    onAssignIndividual: vi.fn(),
    onReprocess: vi.fn(),
    onDelete: vi.fn(),
  }
}

describe("PhotoActionsBar Component", () => {
  it("renders the editing actions when isEditing is true", () => {
    render(<PhotoActionsBar {...baseProps()} isEditing />)
    expect(screen.getByText("Save")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
    expect(screen.queryByText("Edit")).not.toBeInTheDocument()
  })

  it("renders the default actions when not editing", () => {
    render(<PhotoActionsBar {...baseProps()} />)
    expect(screen.getByText("Edit")).toBeInTheDocument()
    expect(screen.getByText("Assign Individual")).toBeInTheDocument()
    expect(screen.getByText("Retraiter")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("calls onSave when Save is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} isEditing />)
    await user.click(screen.getByText("Save"))
    expect(props.onSave).toHaveBeenCalledTimes(1)
  })

  it("calls onCancelEdit when Cancel is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} isEditing />)
    await user.click(screen.getByText("Cancel"))
    expect(props.onCancelEdit).toHaveBeenCalledTimes(1)
  })

  it("shows a loading Save button when isSaving is true", () => {
    render(<PhotoActionsBar {...baseProps()} isEditing isSaving />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("calls onEdit when Edit is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} />)
    await user.click(screen.getByText("Edit"))
    expect(props.onEdit).toHaveBeenCalledTimes(1)
  })

  it("calls onAssignIndividual when Assign Individual is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} />)
    await user.click(screen.getByText("Assign Individual"))
    expect(props.onAssignIndividual).toHaveBeenCalledTimes(1)
  })

  it("calls onReprocess when Retraiter is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} />)
    await user.click(screen.getByText("Retraiter"))
    expect(props.onReprocess).toHaveBeenCalledTimes(1)
  })

  it("shows a loading, disabled reprocess button while reprocessing", () => {
    render(<PhotoActionsBar {...baseProps()} isReprocessing />)
    expect(screen.queryByText("Retraiter")).not.toBeInTheDocument()
    expect(screen.getByText("Loading...").closest("button")).toBeDisabled()
  })

  it("calls onDelete when Delete is clicked", async () => {
    const props = baseProps()
    const user = userEvent.setup()
    render(<PhotoActionsBar {...props} />)
    await user.click(screen.getByText("Delete"))
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it("shows a loading Delete button when isDeleting is true", () => {
    render(<PhotoActionsBar {...baseProps()} isDeleting />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })
})
