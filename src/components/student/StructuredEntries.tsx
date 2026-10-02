"use client";
export type Entry = Record<string, string | number | null>;
export function StructuredEntries({
  kind,
  value,
  onChange,
}: {
  kind: "experience" | "certifications" | "projects";
  value: Entry[];
  onChange: (v: Entry[]) => void;
}) {
  const fields =
    kind === "experience"
      ? ["role", "organization", "start_date", "end_date", "description"]
      : kind === "certifications"
        ? ["name", "issuer", "year", "url"]
        : ["title", "description", "url"];
  return (
    <div className="mt-5 space-y-4">
      {value.map((entry, i) => (
        <fieldset className="rounded-xl border border-slate-200 p-4" key={i}>
          <legend className="px-2 font-semibold capitalize">
            {kind} {i + 1}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((k) => (
              <label className="sw-label capitalize" key={k}>
                {k.replaceAll("_", " ")}
                <input
                  className="sw-input"
                  type={
                    k === "url"
                      ? "url"
                      : k === "year"
                        ? "number"
                        : k.endsWith("date")
                          ? "month"
                          : "text"
                  }
                  min={k === "year" ? 1950 : undefined}
                  max={k === "year" ? 2100 : undefined}
                  maxLength={k === "description" ? 2000 : 160}
                  value={entry[k] ?? ""}
                  onChange={(e) =>
                    onChange(
                      value.map((v, n) =>
                        n === i
                          ? {
                              ...v,
                              [k]:
                                k === "year"
                                  ? e.target.value
                                    ? Number(e.target.value)
                                    : null
                                  : e.target.value,
                            }
                          : v,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-sm text-red-700"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Remove entry
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="sw-button sw-secondary"
        disabled={value.length >= 20}
        onClick={() =>
          onChange([
            ...value,
            Object.fromEntries(
              fields.map((f) => [f, f === "year" ? null : ""]),
            ),
          ])
        }
      >
        Add{" "}
        {kind === "experience"
          ? "experience"
          : kind === "certifications"
            ? "certification"
            : "project"}
      </button>
    </div>
  );
}
