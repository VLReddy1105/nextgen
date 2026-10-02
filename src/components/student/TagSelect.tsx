"use client";
import { useId, useState } from "react";
import {
  normalizeEntries,
  catalogs,
  type CatalogKind,
} from "@/lib/forms/catalogs";
export function TagSelect({
  label,
  value,
  onChange,
  suggestions = [],
  catalog,
  strict = false,
}: {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  catalog?: CatalogKind;
  strict?: boolean;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const [active, setActive] = useState(0),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const choices = catalog ? catalogs[catalog] : suggestions;
  const matches = choices
    .filter(
      (s) =>
        s.toLowerCase().includes(query.toLowerCase()) &&
        !value.some((v) => v.toLowerCase() === s.toLowerCase()),
    )
    .slice(0, 8);
  const add = (raw: string) => {
    try {
      const tags = normalizeEntries(
        raw,
        choices,
        strict ||
          ["locations", "languages", "roles", "industries"].includes(
            catalog ?? "",
          ),
      );
      const next = [
        ...new Set([...value.map((v) => v.toLowerCase()), ...tags]),
      ];
      if (next.length > 20) throw new Error("Choose up to 20 values.");
      onChange(next);
      setQuery("");
      setError("");
      setOpen(false);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the values.");
    }
  };
  return (
    <div className="relative">
      <label className="sw-label" htmlFor={id}>
        {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((tag) => (
          <span className="sw-chip" key={tag}>
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={query}
          maxLength={1000}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={
            open && matches.length ? `${id}-${active}` : undefined
          }
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,;\n]/.test(text)) {
              e.preventDefault();
              add(text);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="sw-input !mt-0"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              add(open && matches[active] ? matches[active] : query);
            }
          }}
        />
        <button
          type="button"
          className="sw-button sw-secondary"
          disabled={!query.trim() || value.length >= 20}
          onClick={() => add(query)}
        >
          Add
        </button>
      </div>
      {open && matches.length > 0 ? (
        <ul
          role="listbox"
          id={`${id}-list`}
          className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {matches.map((m, i) => (
            <li
              role="option"
              aria-selected={active === i}
              id={`${id}-${i}`}
              key={m}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${active === i ? "bg-blue-50 text-blue-800" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                add(m);
              }}
            >
              {m}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-slate-400">
        {value.length}/20 · Paste comma, semicolon or newline-separated values.
      </p>
    </div>
  );
}
