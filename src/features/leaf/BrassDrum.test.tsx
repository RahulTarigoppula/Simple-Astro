import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrassDrum } from "./BrassDrum";

describe("BrassDrum", () => {
  it("moves with the keys when enabled", () => {
    const onChange = vi.fn();
    render(<BrassDrum label="Hour" short="hh" min={0} max={23} value={7} calm onChange={onChange} />);
    const drum = screen.getByRole("spinbutton", { name: "Hour" });
    expect(drum).not.toHaveAttribute("aria-disabled");
    fireEvent.keyDown(drum, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("is set aside when disabled: aria-disabled, dimmed, no keys, no drag, no typing", () => {
    const onChange = vi.fn();
    const onScrub = vi.fn();
    render(<BrassDrum label="Hour" short="hh" min={0} max={23} value={7} calm disabled onChange={onChange} onScrub={onScrub} />);
    const drum = screen.getByRole("spinbutton", { name: "Hour" });
    expect(drum).toHaveAttribute("aria-disabled", "true");
    expect(drum).toHaveClass("is-disabled");
    fireEvent.keyDown(drum, { key: "ArrowUp" });
    fireEvent.keyDown(drum, { key: "End" });
    fireEvent.keyDown(drum, { key: "5" });
    fireEvent.doubleClick(drum);
    fireEvent.pointerDown(drum, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(drum, { clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(drum, { clientY: 40, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    expect(onScrub).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
