import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useArrowKeys } from "./useArrowKeys";
import { swipeOf, useSwipe } from "./useSwipe";

type Ev = React.PointerEvent;
const ev = (x: number, y: number, over: Partial<{ pointerType: string; pointerId: number; target: Element; isPrimary: boolean }> = {}) =>
  ({ clientX: x, clientY: y, pointerId: 1, pointerType: "touch", isPrimary: true, target: document.body, ...over }) as unknown as Ev;

describe("swipeOf", () => {
  it("needs 48 px of sideways travel", () => {
    expect(swipeOf(-47, 0)).toBeNull();
    expect(swipeOf(-48, 0)).toBe("left");
    expect(swipeOf(60, 0)).toBe("right");
  });
  it("leaves a mostly vertical movement to the scroller", () => {
    expect(swipeOf(-80, 70)).toBeNull();
    expect(swipeOf(-80, -200)).toBeNull();
    expect(swipeOf(-90, 40)).toBe("left");
  });
  it("takes its own threshold and ratio", () => {
    expect(swipeOf(30, 0, 24)).toBe("right");
    expect(swipeOf(60, 50, 48, 1)).toBe("right");
  });
});

describe("useSwipe", () => {
  const setup = (over: Parameters<typeof useSwipe>[0] = {}) => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ onLeft, onRight, ...over }));
    return { h: result.current, onLeft, onRight };
  };

  it("calls onLeft for a finger moving left and onRight for one moving right", () => {
    const { h, onLeft, onRight } = setup();
    h.onPointerDown(ev(200, 100));
    h.onPointerUp(ev(120, 110));
    expect(onLeft).toHaveBeenCalledTimes(1);
    h.onPointerDown(ev(100, 100));
    h.onPointerUp(ev(190, 90));
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it("ignores a tap, a short drag and a vertical scroll", () => {
    const { h, onLeft, onRight } = setup();
    h.onPointerDown(ev(200, 100));
    h.onPointerUp(ev(200, 100));
    h.onPointerDown(ev(200, 100));
    h.onPointerUp(ev(170, 100));
    h.onPointerDown(ev(200, 100));
    h.onPointerUp(ev(140, 300));
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
  });

  it("forgets a gesture the browser took over (pointercancel) and one without a start", () => {
    const { h, onLeft } = setup();
    h.onPointerDown(ev(200, 100));
    h.onPointerCancel(ev(190, 140));
    h.onPointerUp(ev(60, 100));
    h.onPointerUp(ev(0, 100));
    expect(onLeft).not.toHaveBeenCalled();
  });

  it("does not read a mouse drag unless asked, nor a second finger, nor when disabled", () => {
    const a = setup();
    a.h.onPointerDown(ev(200, 100, { pointerType: "mouse" }));
    a.h.onPointerUp(ev(100, 100, { pointerType: "mouse" }));
    a.h.onPointerDown(ev(200, 100, { isPrimary: false }));
    a.h.onPointerUp(ev(100, 100, { isPrimary: false }));
    a.h.onPointerDown(ev(200, 100));
    a.h.onPointerUp(ev(100, 100, { pointerId: 2 }));
    expect(a.onLeft).not.toHaveBeenCalled();
    const b = setup({ mouse: true });
    b.h.onPointerDown(ev(200, 100, { pointerType: "mouse" }));
    b.h.onPointerUp(ev(100, 100, { pointerType: "mouse" }));
    expect(b.onLeft).toHaveBeenCalledTimes(1);
    const c = setup({ disabled: true });
    c.h.onPointerDown(ev(200, 100));
    c.h.onPointerUp(ev(100, 100));
    expect(c.onLeft).not.toHaveBeenCalled();
  });

  it("never starts on a field or on something marked data-noswipe", () => {
    const { h, onLeft } = setup();
    const box = document.createElement("div");
    box.innerHTML = '<input id="i" /><div data-noswipe=""><button id="b">x</button></div>';
    document.body.append(box);
    for (const id of ["i", "b"]) {
      const target = box.querySelector(`#${id}`) as Element;
      h.onPointerDown(ev(200, 100, { target }));
      h.onPointerUp(ev(100, 100, { target }));
    }
    expect(onLeft).not.toHaveBeenCalled();
    box.remove();
  });

  it("keeps the same handlers between renders and calls the newest callbacks", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useSwipe({ onLeft: fn }), { initialProps: { fn: first } });
    const h = result.current;
    rerender({ fn: second });
    expect(result.current).toBe(h);
    h.onPointerDown(ev(200, 100));
    h.onPointerUp(ev(100, 100));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("useArrowKeys", () => {
  function Probe({ prev, next }: { prev: () => void; next: () => void }) {
    useArrowKeys(prev, next);
    return (
      <div>
        <input aria-label="field" />
        <div role="tablist">
          <button type="button" role="tab">
            tab
          </button>
        </div>
        <button type="button">plain</button>
      </div>
    );
  }

  it("steps on Left and Right, but not from a field, a tab list or with a modifier", () => {
    const prev = vi.fn();
    const next = vi.fn();
    render(<Probe prev={prev} next={next} />);
    act(() => {
      fireEvent.keyDown(screen.getByRole("button", { name: "plain" }), { key: "ArrowRight" });
      fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.keyDown(screen.getByLabelText("field"), { key: "ArrowRight" });
      fireEvent.keyDown(screen.getByRole("tab"), { key: "ArrowRight" });
      fireEvent.keyDown(document.body, { key: "ArrowRight", altKey: true });
      fireEvent.keyDown(document.body, { key: "a" });
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
