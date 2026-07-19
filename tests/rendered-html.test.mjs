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

test("server-renders the immersive six-range piano", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>四景 · 六音区沉浸式钢琴<\/title>/i);
  assert.match(html, /沧海听风/);
  assert.match(html, /加载并启动原声/);
  assert.match(html, /aria-label="扩展音区 C1 到 B1，当前可演奏"/);
  assert.match(html, /aria-label="低音区 C2 到 B2，当前可演奏"/);
  assert.match(html, /aria-label="低音区 C3 到 B3，待切换"/);
  assert.match(html, /aria-label="中音区 C4 到 B4，当前可演奏"/);
  assert.match(html, /aria-label="高音区 C5 到 B5，当前可演奏"/);
  assert.match(html, /aria-label="扩展音区 C6 到 B6，待切换"/);
  assert.equal(html.match(/class="piano-octave /g)?.length, 6);
  assert.match(html, /aria-label="沧海听风可切换六音区真实钢琴键盘与发光音符光尘"/);
  assert.match(html, /NUM \+/);
  assert.match(html, /山湖静语/);
  assert.match(html, /雨夜伴灯/);
  assert.match(html, /暮光之城/);
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

test("dynamic scenes use muted looping video with poster and reduced-motion fallback", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const file of ["coast.mp4", "mountain-lake.mp4", "rain-night.mp4", "twilight-city.mp4"]) {
    assert.match(source, new RegExp(`/video-scenes/${file.replace(".", "\\.")}`));
  }
  assert.match(source, /autoPlay\s+loop\s+muted\s+playsInline\s+preload="metadata"/);
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(source, /readyVideoScene === scene/);
  assert.match(styles, /\.scene-video \{[\s\S]*object-fit: cover/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.scene-video \{ display: none; \}/);
});

test("immersive mode suppresses non-piano keyboard events", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(immersiveModeRef\.current\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /IMMERSIVE_CONTROL_CODES = new Set\(\["Space", "AltLeft", "NumpadAdd"\]\)/);
  assert.match(source, /!KEY_BY_CODE\.has\(event\.code\) && !IMMERSIVE_CONTROL_CODES\.has\(event\.code\)/);
  assert.match(source, /navigator as KeyboardLockNavigator/);
});

test("navigation and numpad keys map the switchable C1 and C6 range", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const code of ["Insert", "Home", "PageUp", "NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract", "Delete", "End", "Numpad7", "Numpad8", "Numpad9"]) {
    assert.match(source, new RegExp(`code: "${code}"`));
  }
  assert.match(source, /if \(event\.code === "NumpadAdd"\)/);
  assert.match(source, /extremeOctaveRef\.current === 1 \? 6 : 1/);
  assert.match(source, /midi: 24, file: "C1\.mp3"/);
  assert.match(source, /midi: 84, file: "C6\.mp3"/);
  assert.match(styles, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.match(styles, /height: 186px/);
});

test("the visual keyboard exposes all six octaves while keeping switchable groups exclusive", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /lowOctaveRef = useRef<2 \| 3>\(2\)/);
  assert.match(source, /\[lowOctave, setLowOctave\] = useState<2 \| 3>\(2\)/);
  assert.match(source, /enabled=\{lowOctave === 2\}/);
  assert.match(source, /enabled=\{lowOctave === 3\}/);
  assert.match(source, /enabled=\{extremeOctave === 1\}/);
  assert.match(source, /enabled=\{extremeOctave === 6\}/);
  assert.match(source, /const globalX = \(\(groupIndex \+ localX\) \/ 6\) \* 100/);
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
