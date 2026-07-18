import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the three-octave latency lab", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>三八度真实钢琴 · 延迟实验室<\/title>/i);
  assert.match(html, /三八度键盘钢琴/);
  assert.match(html, /加载并启动真实钢琴/);
  assert.match(html, /aria-label="高音区 C5 到 B5"/);
  assert.match(html, /aria-label="中音区 C4 到 B4"/);
  assert.match(html, /aria-label="可切换低音区 C3 到 B3"/);
  assert.match(html, /LEFT ALT/);
  assert.match(html, /短音模式/);
  assert.match(html, /Salamander Grand Piano V3/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
