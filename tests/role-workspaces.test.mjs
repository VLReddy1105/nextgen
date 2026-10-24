import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  roleModules,
  moduleLabel,
  canOpenModule,
  canManageSpace,
  canEditPublication,
} from "../src/lib/role-workspaces.ts";

test("every visible role module has a real route and role-specific purpose", () => {
  for (const [role, modules] of Object.entries(roleModules)) {
    assert.equal(new Set(modules).size, modules.length);
    for (const moduleKey of modules) {
      assert.ok(
        existsSync(`src/app/dashboard/${moduleKey}/page.tsx`),
        `${role}/${moduleKey}`,
      );
      assert.ok(moduleLabel(role, moduleKey));
    }
  }
  assert.ok(canOpenModule("mentor", "projects"));
  assert.ok(canOpenModule("mentor", "events"));
  assert.ok(canOpenModule("company", "talent"));
  assert.ok(canOpenModule("university", "student-connections"));
  assert.equal(canOpenModule("founder", "students"), false);
  assert.equal(canOpenModule("founder", "talent"), false);
  assert.equal(canOpenModule("company", "my-university"), false);
  assert.equal(canOpenModule("unknown", "overview"), false);
});

test("space controls require the actual contextual owner role", () => {
  assert.ok(canManageSpace("projects", "project_head"));
  assert.ok(canManageSpace("communities", "captain"));
  for (const role of [
    "student",
    "company",
    "university",
    "mentor",
    "founder",
    "team_lead",
    "moderator",
    "member",
    undefined,
  ]) {
    assert.equal(canManageSpace("projects", role), false);
    assert.equal(canManageSpace("communities", role), false);
  }
  assert.equal(canManageSpace("projects", "captain"), false);
});

test("viewing a published item never grants edit controls", () => {
  assert.equal(
    canEditPublication("events", "reader", { organizer_id: "owner" }),
    false,
  );
  assert.equal(
    canEditPublication("opportunities", "reader", { created_by: "owner" }),
    false,
  );
  assert.ok(canEditPublication("events", "owner", { organizer_id: "owner" }));
  assert.ok(
    canEditPublication("opportunities", "owner", { created_by: "owner" }),
  );
  assert.equal(canEditPublication("events", "owner", {}), false);
});
