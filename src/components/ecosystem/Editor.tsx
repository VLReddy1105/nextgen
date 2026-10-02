"use client";
import { useState } from "react";
import { TagSelect } from "@/components/student/TagSelect";
import { type CatalogKind } from "@/lib/forms/catalogs";
import { useWorkspace } from "@/components/student/WorkspaceProvider";
export type Values = Record<
  string,
  string | number | boolean | string[] | null
>;
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  catalog?: CatalogKind;
  required?: boolean;
  publishRequired?: boolean;
  min?: number;
  max?: number;
};
export function Editor({
  title,
  fields,
  initial = {},
  save,
  onSaved,
}: {
  title: string;
  fields: Field[];
  initial?: Values;
  save: (v: Values) => Promise<unknown>;
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<Values>(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const { mutate } = useWorkspace();
  return (
    <form
      className="sw-card mt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          for (const f of fields)
            if (
              (f.required ||
                (f.publishRequired && values.status === "published")) &&
              (!values[f.key] ||
                (Array.isArray(values[f.key]) &&
                  !(values[f.key] as string[]).length))
            )
              throw Error(`${f.label} is required.`);
          await mutate(() => save(values));
          setSaved(true);
          onSaved?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="sw-section">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {fields.map((f) => (
          <div
            key={f.key}
            className={
              f.catalog || f.type === "textarea" ? "sm:col-span-2" : ""
            }
          >
            {f.catalog ? (
              <TagSelect
                label={f.label + (f.required ? " *" : "")}
                catalog={f.catalog}
                strict
                value={(values[f.key] as string[]) || []}
                onChange={(v) => {
                  setSaved(false);
                  setValues({ ...values, [f.key]: v });
                }}
              />
            ) : (
              <label className="sw-label">
                {f.label}
                {f.required ? " *" : ""}
                {f.options ? (
                  <select
                    className="sw-input"
                    required={
                      f.required ||
                      (f.publishRequired && values.status === "published")
                    }
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {f.optionLabels?.[o] || o.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="sw-input"
                    rows={4}
                    required={
                      f.required ||
                      (f.publishRequired && values.status === "published")
                    }
                    maxLength={10000}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.value })
                    }
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!values[f.key]}
                    onChange={(e) =>
                      setValues({ ...values, [f.key]: e.target.checked })
                    }
                  />
                ) : (
                  <input
                    className="sw-input"
                    type={f.type || "text"}
                    required={
                      f.required ||
                      (f.publishRequired && values.status === "published")
                    }
                    min={f.min}
                    max={f.max}
                    maxLength={f.type === "url" ? 2048 : 500}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]:
                          f.type === "number"
                            ? e.target.value
                              ? Number(e.target.value)
                              : null
                            : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-4 text-red-700" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-4 text-emerald-700" role="status">
          Saved. Your workspace is up to date.
        </p>
      )}
      <button className="sw-button mt-5" disabled={busy}>
        {busy ? "Saving…" : "Save " + title.toLowerCase()}
      </button>
    </form>
  );
}
