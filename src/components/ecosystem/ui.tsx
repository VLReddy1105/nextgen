"use client";
import { useRef, useEffect } from "react";
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="sw-title">{title}</h1>
        {description ? (
          <p className="sw-muted mt-3 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
export function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="sw-card">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="sw-muted mt-2">{label}</p>
    </div>
  );
}
export function DataCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sw-card mb-4">
      {title ? <h2 className="sw-section mb-4">{title}</h2> : null}
      {children}
    </section>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="sw-chip capitalize">{value.replaceAll("_", " ")}</span>
  );
}
export function InlineError({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
    >
      {message}
    </p>
  ) : null;
}
export function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto w-[min(480px,92vw)] rounded-2xl bg-white p-6 backdrop:bg-slate-950/40"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="my-5">{children}</div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="sw-button sw-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="sw-button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </dialog>
  );
}
