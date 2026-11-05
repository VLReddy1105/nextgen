import test from "node:test";
import assert from "node:assert/strict";
import { DetailReads } from "../src/lib/api/detail-reads.ts";
import { recordWrite, writePlan } from "../src/lib/api/refresh-plan.ts";

test("intent and click share one read; reuse is consumed once and account local", async () => {
  let calls = 0;
  const loader = async (_kind, id, _signal, receive) => {
    calls++;
    receive?.({ id, detail_pending: true });
    return { id, detail_pending: false };
  };
  const first = new DetailReads(loader), second = new DetailReads(loader);
  first.prefetch("projects", "one");
  first.prefetch("projects", "one");
  const cores = [];
  assert.equal((await first.read("projects", "one", undefined, item => cores.push(item))).id, "one");
  assert.equal(calls, 1);
  assert.equal(cores.length, 1);
  await second.read("projects", "one");
  await first.read("projects", "one");
  assert.equal(calls, 3);
});

test("intent is bounded, expires, and clears on identity disposal or mutation", async () => {
  const signals = [];
  const reads = new DetailReads(async (_kind, id, signal) => { signals.push(signal); return { id }; });
  const realNow = Date.now;
  let now = 0;
  Date.now = () => now;
  try {
    reads.prefetch("projects", "a"); reads.prefetch("projects", "b"); reads.prefetch("projects", "c");
    assert.equal(signals.length, 2);
    now = 4000;
    await reads.read("projects", "a");
    assert.equal(signals[0].aborted, true);
    assert.equal(signals.length, 3);
    reads.clear();
    assert.equal(signals[1].aborted, true);
  } finally { Date.now = realNow; }
});

test("stale consumer cancellation cannot abort another entity's newest request", async () => {
  const pending = new Map();
  const reads = new DetailReads((_kind, id, signal) => new Promise(resolve => pending.set(id, { signal, resolve })));
  reads.prefetch("projects", "old"); reads.prefetch("projects", "new");
  const old = new AbortController(), active = new AbortController();
  const older = reads.read("projects", "old", old.signal);
  const newer = reads.read("projects", "new", active.signal);
  old.abort();
  assert.equal(pending.get("old").signal.aborted, true);
  assert.equal(pending.get("new").signal.aborted, false);
  pending.get("old").resolve({ id: "old" }); pending.get("new").resolve({ id: "new" });
  await older; assert.equal((await newer).id, "new");
});

test("mutation refresh plans retain affected modules without attaching server metadata", () => {
  for (const [path, expected] of [["/events/id/registration", "events"], ["/applications/id/status", "applications"],
    ["/campus/id/invitations", "campus_progress"], ["/mentor-hub/affiliations/id", "mentor_hub"],
    ["/spaces/projects/id/join", "projects"], ["/communities/id/posts", "communities"]]) {
    const result = { ok: true }; recordWrite(path, "POST", result);
    assert.ok(writePlan(result).sections.includes(expected));
    assert.equal(writePlan(result).sections.includes("notifications"), true);
    assert.deepEqual(result, { ok: true });
  }
  const profile = { id: "student" }; recordWrite("/students/me", "PATCH", profile);
  assert.equal(writePlan(profile).profile, profile);
  assert.equal(writePlan({ sections: ["profile"] }), undefined);
});
