import assert from "node:assert/strict";
import test from "node:test";
import { validateSupabaseConfig } from "../src/lib/supabase/config.ts";
import { AUTH_MESSAGES, authErrorMessage, mapAuthError } from "../src/lib/auth/errors.ts";
import { authRedirect } from "../src/lib/auth/routing.ts";
import { accountRoute, getAccountState } from "../src/lib/auth/account-state.ts";
import { safeInternalPath } from "../src/lib/http.ts";

// Synthetic shape fixtures, not signed tokens or usable credentials.
const jwt = role => `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.${"a".repeat(43)}`;
const publicKey = `sb_publishable_${"a".repeat(32)}`;
const url = "https://test-project.supabase.co";

test("missing configuration reports required variables without values", () => {
  for (const values of [[undefined, undefined], [url, ""], [" ", publicKey]]) {
    assert.throws(() => validateSupabaseConfig(...values), error => {
      assert.equal(mapAuthError(error).code, "CONFIG_MISSING");
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      return true;
    });
  }
});

test("public keys and hosted/local URL shapes are accepted without claiming authenticity", () => {
  for (const origin of [url, "http://localhost:54321", "http://127.0.0.1:54321", "http://[::1]:54321"]) {
    for (const key of [publicKey, jwt("anon")]) assert.equal(validateSupabaseConfig(origin, key).anonKey, key);
  }
});

test("malformed URL and privileged/non-public keys are rejected safely", () => {
  for (const badUrl of ["not-a-url", "http://remote.example", "https://user:secret@test.example", `${url}/auth/v1`, `${url}?key=secret`, `${url}#secret`]) {
    assert.throws(() => validateSupabaseConfig(badUrl, publicKey), { code: "CONFIG_INVALID" });
  }
  for (const key of ["sb_secret_PRIVATE", jwt("service_role"), jwt("authenticated"), "not-a-key", "a.b.c", "sb_publishable_short"]) {
    assert.throws(() => validateSupabaseConfig(url, key), error => {
      assert.equal(error.code, "CONFIG_INVALID");
      assert.ok(!error.message.includes(key));
      assert.ok(!mapAuthError(error).message.includes(key));
      return true;
    });
  }
});

test("auth failures map to safe distinct messages", () => {
  for (const [error, expected] of [
    [{ code: "invalid_credentials" }, "INVALID_CREDENTIALS"],
    [{ code: "email_not_confirmed" }, "EMAIL_NOT_VERIFIED"],
    [{ code: "user_banned" }, "ACCOUNT_DISABLED"],
    [{ name: "AuthRetryableFetchError" }, "NETWORK_ERROR"],
    [new TypeError("Failed to fetch"), "NETWORK_ERROR"],
    [new TypeError("unexpected frontend bug"), "UNKNOWN_AUTH_ERROR"],
    [{ code: "otp_expired" }, "LINK_INVALID"],
    [{ status: 429 }, "RATE_LIMITED"],
    [{ code: "weak_password" }, "WEAK_PASSWORD"],
    [{ code: "unexpected_failure", message: "database secret token stack trace" }, "UNKNOWN_AUTH_ERROR"],
  ]) {
    const result = mapAuthError(error);
    assert.equal(result.code, expected);
    assert.equal(result.message, AUTH_MESSAGES[expected]);
    assert.ok(!result.message.includes("database secret"));
  }
  assert.equal(authErrorMessage("untrusted callback details"), AUTH_MESSAGES.UNKNOWN_AUTH_ERROR);
  assert.equal(authErrorMessage("__proto__"), AUTH_MESSAGES.UNKNOWN_AUTH_ERROR);
  assert.equal(authErrorMessage("ACCOUNT_PENDING"), AUTH_MESSAGES.ACCOUNT_PENDING);
});

test("middleware routing protects dashboards and preserves return paths", () => {
  assert.equal(authRedirect("/dashboard", "", false), "/login?next=%2Fdashboard");
  assert.equal(authRedirect("/dashboard/overview", "?view=recent", false), "/login?next=%2Fdashboard%2Foverview%3Fview%3Drecent");
  assert.equal(authRedirect("/dashboard/overview", "", true), null);
  assert.equal(authRedirect("/login", "", true), "/dashboard/overview");
  assert.equal(authRedirect("/signup", "", true), "/dashboard/overview");
  assert.equal(authRedirect("/", "", false), null);
  assert.equal(authRedirect("/auth/callback", "?code=example", false), null);
});

test("student and every existing non-student role follow the same account admission", () => {
  for (const primary_role of ["student", "founder", "university", "company", "mentor"]) {
    const session = { user: { email_confirmed_at: "2026-10-02" }, profile: { primary_role, onboarding_completed: true, account_status: "active" }, profileError: null };
    assert.equal(accountRoute(getAccountState(session)), "/dashboard/overview");
    assert.match(accountRoute(getAccountState({ ...session, profile: { ...session.profile, onboarding_completed: false } })), /^\/onboarding\?/);
    assert.equal(accountRoute(getAccountState({ ...session, user: {} })), "/verify-email");
    for (const [account_status, route] of [["pending", "/pending-approval"], ["disabled", "/account-unavailable"], ["suspended", "/account-unavailable"]]) {
      assert.equal(accountRoute(getAccountState({ ...session, profile: { ...session.profile, account_status } })), route);
    }
  }
});

test("login return destinations reject external and normalized slash attacks", () => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/\nevil"]) {
    assert.equal(safeInternalPath(next, "/dashboard/overview"), "/dashboard/overview");
  }
  assert.equal(safeInternalPath("/invite/example", "/dashboard/overview"), "/invite/example");
});
