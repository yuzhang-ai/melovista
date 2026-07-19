import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("server-renders the immersive three-octave piano", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>四景 · 三八度沉浸式钢琴<\/title>/i);
  assert.match(html, /海岸午后/);
  assert.match(html, /加载并启动原声/);
  assert.match(html, /aria-label="高音区 C5 到 B5"/);
  assert.match(html, /aria-label="中音区 C4 到 B4"/);
  assert.match(html, /aria-label="可切换低音区 C3 到 B3"/);
  assert.match(html, /aria-label="海岸午后三八度真实钢琴键盘与发光音符光尘"/);
  assert.match(html, /林间晴窗/);
  assert.match(html, /雨夜公寓/);
  assert.match(html, /星空露台/);
  assert.match(html, /aria-label="选择音色"/);
  assert.doesNotMatch(html, /<select\b/i);
  assert.match(html, /钢丝弦吉他/);
  assert.match(html, /小提琴/);
  assert.match(html, /萨克斯/);
  assert.match(html, /沉浸演奏/);
  assert.match(html, /性能信息/);
  assert.match(html, /LEFT ALT/);
  assert.match(html, /data-testid="articulation-mode">短音/);
  assert.match(html, /Salamander Grand Piano V3/);
  assert.match(html, /tonejs-instruments/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("immersive mode suppresses non-piano keyboard events", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(immersiveModeRef\.current\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /IMMERSIVE_CONTROL_CODES = new Set\(\["Space", "AltLeft"\]\)/);
  assert.match(source, /!KEY_BY_CODE\.has\(event\.code\) && !IMMERSIVE_CONTROL_CODES\.has\(event\.code\)/);
  assert.match(source, /navigator as KeyboardLockNavigator/);
});

test("short and long articulation use natural release envelopes", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /SHORT_RELEASE_TIME_CONSTANT_SECONDS = 0\.72/);
  assert.match(source, /SHORT_RELEASE_STOP_SECONDS = 3/);
  assert.match(source, /LONG_RELEASE_TIME_CONSTANT_SECONDS = 1\.8/);
  assert.match(source, /LONG_RELEASE_STOP_SECONDS = 9/);
  assert.match(source, /setTargetAtTime\(0\.0001, now, timeConstant\)/);
});

test("audio starts before the scene creates note particles", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const audioStart = source.indexOf("source.start(now);");
  const visualStart = source.indexOf("spawnNoteLight(key);", audioStart);

  assert.notEqual(audioStart, -1);
  assert.notEqual(visualStart, -1);
  assert.ok(audioStart < visualStart);
});

test("all note particles share the scene's full rise height", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const rise = Math\.max\(layer\.clientHeight - 18, 280\)/);
  assert.match(source, /setProperty\("--spark-rise", `\$\{rise\}px`\)/);
  assert.doesNotMatch(source, /key\.group.*--spark-rise|--spark-rise.*key\.group/);
});
