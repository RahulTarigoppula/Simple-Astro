import { useEffect, useRef } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}

/**
 * A paper sheet rising from the bottom (FootnoteSheet, Drawer). Native <dialog> + showModal()
 * gives role="dialog", aria-modal, the focus trap, Escape and focus return for free.
 */
export function Sheet({ open, onClose, label, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
    } else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet-dialog paper"
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Only a tap on the backdrop (outside the sheet's box) closes it, not one on its padding.
        const d = ref.current;
        if (!d || e.target !== d) return;
        const r = d.getBoundingClientRect();
        if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right || e.clientY > r.bottom) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="sheet-dialog__grip" aria-hidden="true" />
      {open ? children : null}
    </dialog>
  );
}
