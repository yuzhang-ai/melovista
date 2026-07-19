import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);

function pcm16Rms(wav) {
  let offset = 12;
  while (offset + 8 <= wav.byteLength) {
    const chunk = wav.subarray(offset, offset + 4).toString("ascii");
    const size = wav.readUInt32LE(offset + 4);
    if (chunk === "data") {
      let sum = 0;
      let samples = 0;
      for (let cursor = offset + 8; cursor + 1 < offset + 8 + size; cursor += 2) {
        const value = wav.readInt16LE(cursor) / 32768;
        sum += value * value;
        samples += 1;
      }
      return Math.sqrt(sum / samples);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV data chunk missing");
}

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
  assert.match(html, /<title>乐境 MeloVista · 沉浸式六音区钢琴<\/title>/i);
  assert.match(html, /乐境 MeloVista/);
  assert.match(html, /沧海听风/);
  assert.match(html, /加载并启动原声/);
  assert.match(html, /aria-label="扩展音区 C1 到 B1，当前可演奏"/);
  assert.match(html, /aria-label="低音区 C2 到 B2，当前可演奏"/);
  assert.match(html, /aria-label="低音区 C3 到 B3，待切换"/);
  assert.match(html, /aria-label="中音区 C4 到 B4，当前可演奏"/);
  assert.match(html, /aria-label="高音区 C5 到 B5，当前可演奏"/);
  assert.match(html, /aria-label="扩展音区 C6 到 B6，待切换"/);
  assert.equal(html.match(/class="piano-octave /g)?.length, 6);
  assert.match(html, /aria-label="沧海听风 可切换六音区真实钢琴键盘与发光音符光尘"/);
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
  assert.match(html, /钢琴曲库/);
  assert.match(html, /圣诞快乐，劳伦斯先生/);
  assert.match(html, /蒲公英的约定/);
  assert.match(html, /致爱丽丝/);
  assert.match(html, /导入本地 MIDI/);
  assert.match(html, /不会上传服务器/);
  assert.doesNotMatch(html, /你离开的事实|Call of Silence/);
  assert.match(html, /LEFT ALT/);
  assert.match(html, /data-testid="articulation-mode">短音/);
  assert.match(html, /Salamander Grand Piano V3/);
  assert.match(html, /tonejs-instruments/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("appreciation mode schedules three built-in pieces while preserving generic local-only imports", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const furEliseBuffer = await readFile(new URL("../public/midi/fur-elise.mid", import.meta.url));
  const mrLawrenceBuffer = await readFile(new URL("../public/midi/merry-christmas-mr-lawrence.mid", import.meta.url));
  const dandelionsBuffer = await readFile(new URL("../public/midi/dandelions-promise.mid", import.meta.url));
  const { Midi } = require("@tonejs/midi");
  const furElise = new Midi(furEliseBuffer);
  const mrLawrence = new Midi(mrLawrenceBuffer);
  const dandelions = new Midi(dandelionsBuffer);
  const furEliseNotes = furElise.tracks.flatMap((track) => track.notes);
  const mrLawrenceNotes = mrLawrence.tracks.flatMap((track) => track.notes);
  const dandelionsNotes = dandelions.tracks.flatMap((track) => track.notes);

  assert.ok(furEliseNotes.length > 800);
  assert.ok(furElise.duration > 120);
  assert.ok(mrLawrenceNotes.length > 1300);
  assert.ok(mrLawrence.duration > 300);
  assert.ok(dandelionsNotes.length > 800);
  assert.ok(dandelions.duration > 240);
  assert.match(source, /midiUrl: "\/midi\/fur-elise\.mid"/);
  assert.match(source, /midiUrl: "\/midi\/merry-christmas-mr-lawrence\.mid"/);
  assert.match(source, /midiUrl: "\/midi\/dandelions-promise\.mid"/);
  assert.match(source, /setInterval\(tick, 25\)/);
  assert.match(source, /const songHorizon = position \+ 0\.16 \* playback\.speed/);
  assert.match(source, /source\.start\(startAt\)/);
  assert.match(source, /spawnAutoNoteLight\(note\.midi\)/);
  assert.match(source, /file\.arrayBuffer\(\)/);
  const importHandler = source.slice(source.indexOf("const importLibraryMidi"), source.indexOf("const selectTimbre"));
  assert.doesNotMatch(importHandler, /fetch\(|FormData|XMLHttpRequest/);
  assert.match(importHandler, /localMidiTitle\(file\.name\)/);
  assert.match(importHandler, /parsedSongsRef\.current\.set\("local-import", parsed\)/);
  assert.match(source, /autoMidiCountsRef\.current\.set/);
  assert.match(source, /data-testid="library-toggle"/);
  assert.match(source, /\[0\.75, 1, 1\.25, 1\.5, 2\]/);
});

test("MeloVista provides persistent Chinese and English interfaces", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /type Locale = "zh" \| "en"/);
  assert.match(source, /data-testid="language-toggle"/);
  assert.match(source, /localStorage\.setItem\("melovista-locale", next\)/);
  assert.match(source, /url\.searchParams\.set\("lang", next\)/);
  assert.match(source, /navigator\.language\.toLowerCase\(\)\.startsWith\("zh"\)/);
  assert.match(source, /document\.documentElement\.lang = locale === "zh" \? "zh-CN" : "en"/);
  for (const text of ["MeloVista", "Sea Breeze", "Alpine Stillness", "Rainlight Night", "City at Dusk", "Steel-string guitar", "Immersive mode", "Performance controls"]) {
    assert.match(source, new RegExp(text));
  }
});

test("dynamic scenes use optimized muted ping-pong videos and independent seamless ambience", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const file of ["coast.mp4", "mountain-lake.mp4", "rain-night.mp4", "twilight-city.mp4"]) {
    assert.match(source, new RegExp(`/video-scenes/${file.replace(".", "\\.")}`));
    const video = await readFile(new URL(`../public/video-scenes/${file}`, import.meta.url));
    assert.ok(video.byteLength > 3_000_000 && video.byteLength < 5_000_000);
    assert.equal(video.includes(Buffer.from("mp4a")), false);
  }
  const ambienceRms = new Map();
  for (const file of ["coast.wav", "mountain-lake.wav", "rain-night-v2.wav", "twilight-city.wav"]) {
    assert.match(source, new RegExp(`/audio/ambience/${file.replace(".", "\\.")}`));
    const ambience = await readFile(new URL(`../public/audio/ambience/${file}`, import.meta.url));
    assert.ok(ambience.byteLength > 700_000);
    assert.equal(ambience.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(ambience.subarray(8, 12).toString("ascii"), "WAVE");
    ambienceRms.set(file, pcm16Rms(ambience));
  }
  assert.ok(ambienceRms.get("rain-night-v2.wav") < ambienceRms.get("coast.wav"));
  assert.match(source, /autoPlay[\s\S]*loop[\s\S]*muted[\s\S]*preload="auto"/);
  assert.doesNotMatch(source, /requestVideoFrameCallback/);
  assert.doesNotMatch(source, /VIDEO_CROSSFADE_SECONDS/);
  assert.match(source, /preload="auto"/);
  assert.match(source, /source\.loop = true/);
  assert.match(source, /AMBIENT_CROSSFADE_SECONDS = 0\.8/);
  assert.match(source, /const AMBIENT_VOLUME = 0\.28/);
  assert.match(source, /id: "rain"[\s\S]*rain-night-v2\.wav[\s\S]*ambientGain: 1/);
  assert.match(source, /AMBIENT_VOLUME \* option\.ambientGain/);
  assert.match(source, /data-testid="ambient-toggle"/);
  assert.match(source, /ambientPreferenceRef\.current === "auto"/);
  assert.match(source, /void playAmbientScene\(sceneRef\.current\)/);
  assert.match(source, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(source, /readyVideoScene === scene/);
  assert.doesNotMatch(styles, /\.scene-video-stack/);
  assert.match(styles, /\.scene-video \{[\s\S]*object-fit: cover[\s\S]*transition: opacity 520ms ease/);
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
  assert.match(source, /emitNoteLight\(\(\(groupIndex \+ localX\) \/ 6\) \* 100\)/);
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
