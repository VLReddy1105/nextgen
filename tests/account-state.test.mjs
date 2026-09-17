import assert from "node:assert/strict";
import test from "node:test";
import { accountRoute, getAccountState } from "../src/lib/auth/account-state.ts";

const active = {
  user: { email_confirmed_at: "2026-09-16T10:00:00Z" },
  profile: { primary_role: "student", onboarding_completed: true, account_status: "active" },
  profileError: null,
};

test("confirmed active accounts keep their requested destination", () => {
  assert.equal(getAccountState(active), "ready");
  assert.equal(accountRoute("ready", "/invite/example"), "/invite/example");
});

test("new active accounts go through onboarding before the dashboard", () => {
  const state = getAccountState({ ...active, profile: { ...active.profile, onboarding_completed: false } });
  assert.equal(state, "onboarding");
  assert.equal(accountRoute(state, "/dashboard/overview"), "/onboarding?next=%2Fdashboard%2Foverview");
});

test("email verification and approval remain distinct", () => {
  assert.equal(getAccountState({ ...active, user: { email_confirmed_at: null } }), "verify-email");
  assert.equal(getAccountState({ ...active, profile: { ...active.profile, account_status: "pending" } }), "pending");
  assert.equal(accountRoute("pending"), "/pending-approval");
});

test("only suspended and disabled accounts use the unavailable page", () => {
  for (const account_status of ["suspended", "disabled"]) {
    assert.equal(getAccountState({ ...active, profile: { ...active.profile, account_status } }), "unavailable");
  }
  assert.equal(accountRoute("unavailable"), "/account-unavailable");
});

test("missing rows, failed queries, and unknown statuses are account errors", () => {
  assert.equal(getAccountState({ ...active, profile: null }), "profile-missing");
  assert.equal(getAccountState({ ...active, profile: null, profileError: { code: "42703", message: "Column missing" } }), "profile-error");
  assert.equal(getAccountState({ ...active, profile: { ...active.profile, account_status: "unknown" } }), "profile-error");
  assert.equal(accountRoute("profile-error"), "/account-error");
  assert.equal(accountRoute("profile-missing"), "/account-error");
});
