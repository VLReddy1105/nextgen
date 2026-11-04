"use client";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

const Popovers = createContext<{
  open: string | null;
  setOpen: (id: string | null) => void;
}>({ open: null, setOpen: () => {} });

export function WorkspacePopovers({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Popovers.Provider value={{ open, setOpen }}>{children}</Popovers.Provider>
  );
}

export function WorkspacePopover({
  label,
  trigger,
  children,
  placement = "bottom",
  compact = false,
  onNavigate,
  onOpen,
}: {
  label: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: "top" | "bottom";
  compact?: boolean;
  onNavigate?: () => void;
  onOpen?: () => void;
}) {
  const id = useId(),
    { open, setOpen } = useContext(Popovers);
  const root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname(),
    search = useSearchParams().toString();
  const route = `${pathname}?${search}`,
    previousRoute = useRef(route);
  const visible = open === id;
  useEffect(() => {
    if (previousRoute.current !== route) setOpen(null);
    previousRoute.current = route;
  }, [route, setOpen]);
  useEffect(() => {
    if (!visible) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(null);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [visible, setOpen]);
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          setOpen(null);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={visible}
        aria-controls={id}
        onClick={() => { if (!visible) onOpen?.(); setOpen(visible ? null : id); }}
        className={
          compact
            ? "relative grid size-10 place-items-center rounded-full hover:bg-slate-50"
            : "flex min-h-12 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"
        }
      >
        {trigger}
      </button>
      {visible && (
        <div
          id={id}
          aria-label={label}
          role="region"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setOpen(null);
              onNavigate?.();
            }
          }}
          className={`z-40 max-h-[70dvh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg ${placement === "top" ? "absolute bottom-full left-0 mb-2 w-48" : "fixed right-4 top-16 mt-2 w-[min(280px,85vw)] sm:absolute sm:right-0 sm:top-full"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
