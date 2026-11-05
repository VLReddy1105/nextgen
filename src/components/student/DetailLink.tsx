"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import type { Module } from "@/lib/api/types";

export default function DetailLink(props: ComponentProps<typeof Link>) {
  const { details } = useWorkspace();
  const intent = () => {
    const match = String(props.href).match(/^\/dashboard\/(projects|communities|opportunities|applications|events|mentorship)\/([^/?#]+)$/);
    if (match) details?.prefetch(match[1] as Module, match[2]);
  };
  return <Link {...props} onPointerEnter={(event) => { intent(); props.onPointerEnter?.(event); }} onFocus={(event) => { intent(); props.onFocus?.(event); }} />;
}
