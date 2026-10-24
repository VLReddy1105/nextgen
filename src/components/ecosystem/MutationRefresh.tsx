"use client";
import { createContext } from "react";
// Detail-only actions (comments/reactions/resources) refresh their focused read,
// not the full authenticated workspace. Relationship changes use the provider.
export const MutationRefresh = createContext<null | (() => Promise<void>)>(
  null,
);
