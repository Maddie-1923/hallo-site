"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A button that drops a panel under itself and closes on outside click,
// Escape, or navigation. The panel's contents come in as children, so the
// server can render them (the upcoming list, the account links) and this
// only owns the open/closed state.
export function Menu({
  label,
  button,
  children,
  align = "right",
  width = 280,
}: {
  label: string;
  button: React.ReactNode;
  children: React.ReactNode;
  align?: "right" | "left";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const path = usePathname();
  // Closing on navigation without an effect: remember the path the menu was
  // opened on, and treat a different one as closed.
  const [openedAt, setOpenedAt] = useState(path);
  const isOpen = open && openedAt === path;

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => {
          setOpenedAt(path);
          setOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 rounded-full text-ink hover:text-accent transition-colors cursor-pointer shrink-0"
      >
        {button}
      </button>
      {isOpen && (
        <div
          role="menu"
          className={`absolute top-[calc(100%+10px)] ${align === "right" ? "right-0" : "left-0"} z-50 rounded-2xl border border-hair bg-card shadow-[0_20px_50px_rgba(0,0,0,.6)] overflow-hidden`}
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
