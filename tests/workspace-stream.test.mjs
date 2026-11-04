import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceStream } from "../src/lib/api/workspace-stream.ts";

function response(text) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    // Split UTF-8 and JSON at every byte boundary, as a real transport may do.
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } }));
}
test("progressive parser preserves UTF-8, counters and readiness across chunks", async () => {
  const seen = [];
  const first = { profile: { full_name: "Zoë — Student" }, pending: ["projects"], counts: {}, module_unread: {} };
  const last = { projects: [], ready: "projects", counts: { projects: 0 }, module_unread: {} };
  const result = await readWorkspaceStream(response(JSON.stringify(first) + "\n" + JSON.stringify(last)), value => seen.push(value), new AbortController().signal);
  assert.equal(seen.length, 2);
  assert.equal(result.profile.full_name, first.profile.full_name);
  assert.deepEqual(result.pending, []);
  assert.equal(result.counts.projects, 0);
});
test("truncated streams and explicit server failures cannot become successful empty workspaces", async () => {
  for (const text of ["", '{"pending":["projects"]}\n', '{"error":"Retry safely"}\n']) {
    await assert.rejects(readWorkspaceStream(response(text), () => {}, new AbortController().signal));
  }
});
test("aborted streams never deliver a snapshot to the provider", async () => {
  const controller = new AbortController(); controller.abort();
  let received = false;
  await readWorkspaceStream(response('{"pending":[]}\n'), () => { received = true; }, controller.signal);
  assert.equal(received, false);
});
