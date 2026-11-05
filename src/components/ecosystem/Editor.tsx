"use client";
import { lazy, Suspense, type ComponentProps } from "react";
export type { Values, Field } from "./EditorForm";
const Form = lazy(() => import("./EditorForm").then((module) => ({ default: module.EditorForm })));

export function Editor(props: ComponentProps<typeof Form>) {
  return <Suspense fallback={<p role="status" className="sw-card mt-5">Preparing the form…</p>}><Form {...props} /></Suspense>;
}
