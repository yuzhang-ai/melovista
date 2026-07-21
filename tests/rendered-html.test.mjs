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
  assert.match(html, /花海/);
  assert.match(html, /致爱丽丝/);
  assert.match(html, /选择 MIDI 文件/);
  assert.match(html, /打开 MIDI 文件夹/);
  assert.match(html, /本地音乐库/);
  assert.match(html, /不上传服务器/);
  assert.match(html, /data-pointer-piano="true"/);
  assert.match(html, /data-midi="24"/);
  assert.match(html, /data-midi="95"/);
  assert.match(html, /data-testid="playback-mode"/);
  assert.match(html, /aria-label="播放模式：顺序播放"/);
  assert.match(html, /data-testid="practice-toggle"/);
  assert.match(html, /节奏练习/);
  assert.match(html, /data-testid="metronome-toggle"/);
  assert.match(html, /id="metronome-tempo"/);
  assert.match(html, /A–B 片段循环/);
  assert.doesNotMatch(html, /你离开的事实|Call of Silence/);
  assert.match(html, /LEFT ALT/);
  assert.match(html, /data-testid="articulation-mode">短音/);
  assert.match(html, /data-testid="github-credit"/);
  assert.match(html, /https:\/\/github\.com\/yuzhang-ai\/melovista/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Salamander Grand Piano V3/);
  assert.match(html, /tonejs-instruments/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("Vercel deployment keeps the existing Sites build and uses the canonical public URL", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.equal(packageJson.scripts.build, "vinext build");
  assert.equal(packageJson.scripts["build:vercel"], "next build");
  assert.equal(vercel.framework, "nextjs");
  assert.equal(vercel.buildCommand, "npm run build:vercel");
  assert.match(layout, /VERCEL_PROJECT_PRODUCTION_URL/);
  assert.match(layout, /melovista\.vercel\.app/);
  assert.match(styles, /\.github-credit \{/);
});

test("appreciation mode schedules four built-in pieces and a local-only folder library", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const furEliseBuffer = await readFile(new URL("../public/midi/fur-elise.mid", import.meta.url));
  const mrLawrenceBuffer = await readFile(new URL("../public/midi/merry-christmas-mr-lawrence.mid", import.meta.url));
  const dandelionsBuffer = await readFile(new URL("../public/midi/dandelions-promise.mid", import.meta.url));
  const flowerSeaBuffer = await readFile(new URL("../public/midi/flower-sea.mid", import.meta.url));
  const { Midi } = require("@tonejs/midi");
  const furElise = new Midi(furEliseBuffer);
  const mrLawrence = new Midi(mrLawrenceBuffer);
  const dandelions = new Midi(dandelionsBuffer);
  const flowerSea = new Midi(flowerSeaBuffer);
  const furEliseNotes = furElise.tracks.flatMap((track) => track.notes);
  const mrLawrenceNotes = mrLawrence.tracks.flatMap((track) => track.notes);
  const dandelionsNotes = dandelions.tracks.flatMap((track) => track.notes);
  const flowerSeaNotes = flowerSea.tracks.flatMap((track) => track.notes);
  const flowerSeaNoteKeys = flowerSea.tracks.flatMap((track, trackIndex) =>
    track.notes.map((note) => `${trackIndex}:${note.ticks}:${note.midi}`),
  );

  assert.ok(furEliseNotes.length > 800);
  assert.ok(furElise.duration > 120);
  assert.ok(mrLawrenceNotes.length > 1300);
  assert.ok(mrLawrence.duration > 300);
  assert.ok(dandelionsNotes.length > 800);
  assert.ok(dandelions.duration > 240);
  assert.equal(flowerSea.tracks.length, 2);
  assert.equal(flowerSeaNotes.length, 769);
  assert.ok(Math.abs(flowerSea.duration - 158.4) < 0.001);
  assert.equal(flowerSea.header.tempos[0]?.bpm, 75);
  assert.deepEqual(
    flowerSea.header.timeSignatures.map(({ ticks, timeSignature }) => ({ ticks, timeSignature })),
    [
      { ticks: 0, timeSignature: [2, 4] },
      { ticks: 960, timeSignature: [4, 4] },
    ],
  );
  assert.equal(Math.min(...flowerSeaNotes.map((note) => note.midi)), 37);
  assert.equal(Math.max(...flowerSeaNotes.map((note) => note.midi)), 93);
  assert.equal(new Set(flowerSeaNoteKeys).size, flowerSeaNoteKeys.length);
  assert.match(source, /midiUrl: "\/midi\/fur-elise\.mid"/);
  assert.match(source, /midiUrl: "\/midi\/merry-christmas-mr-lawrence\.mid"/);
  assert.match(source, /midiUrl: "\/midi\/dandelions-promise\.mid"/);
  assert.match(source, /midiUrl: "\/midi\/flower-sea\.mid"/);
  assert.match(source, /setInterval\(tick, 25\)/);
  assert.match(source, /const songHorizon = Math\.min\([\s\S]*position \+ 0\.16 \* playback\.speed\)/);
  assert.match(source, /source\.start\(startAt\)/);
  assert.match(source, /spawnMidiNoteLight\(note\.midi, true\)/);
  assert.match(source, /file\.arrayBuffer\(\)/);
  const importHandler = source.slice(source.indexOf("const importLibraryMidis"), source.indexOf("const selectTimbre"));
  assert.doesNotMatch(importHandler, /fetch\(|FormData|XMLHttpRequest/);
  assert.match(importHandler, /localMidiTitle\(file\.name\)/);
  assert.match(importHandler, /parsedSongsRef\.current\.set\(id, parsed\)/);
  assert.match(importHandler, /filter\(isMidiFile\)/);
  assert.match(importHandler, /failedFiles\.push\(file\.name\)/);
  assert.match(source, /input\.setAttribute\("webkitdirectory", ""\)/);
  assert.match(source, /event\.dataTransfer\.files/);
  assert.match(source, /localLibrarySongsRef\.current/);
  assert.match(source, /autoMidiCountsRef\.current\.set/);
  assert.match(source, /data-testid="library-toggle"/);
  assert.match(source, /type PlaybackMode = "sequential" \| "repeat-one" \| "shuffle"/);
  assert.match(source, /const PLAYBACK_MODES: PlaybackMode\[\] = \["sequential", "repeat-one", "shuffle"\]/);
  assert.match(source, /playbackModeRef\.current/);
  assert.match(source, /const nextSongId = nextLibrarySongId\(song\.id, mode, currentLibraryQueue\(\)\)/);
  assert.match(source, /const candidates = songs\.filter\(\(song\) => song\.id !== currentSongId\)/);
  assert.match(source, /beginLibraryPlaybackRef\.current\?\.\(0, playback\.speed, nextSongId\)/);
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
  assert.match(source, /emitNoteLight\(\(\(\(octave - 1\) \+ localX\) \/ 6\) \* 100, automatic\)/);
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
  const visualStart = source.indexOf("spawnMidiNoteLight(midi);", audioStart);

  assert.notEqual(audioStart, -1);
  assert.notEqual(visualStart, -1);
  assert.ok(audioStart < visualStart);
});

test("pointer piano supports mouse, glide and multi-touch across all visible octaves", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /pointerNotesRef = useRef\(new Map<number/);
  assert.match(source, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(source, /document\.elementFromPoint\(clientX, clientY\)/);
  assert.match(source, /onPointerMove=\{handlePianoPointerMove\}/);
  assert.match(source, /onPointerCancel=\{handlePianoPointerEnd\}/);
  assert.match(source, /data-midi=\{midi\}/);
  assert.match(styles, /\.piano-key \{[^}]*touch-action: none/);
});

test("practice mode uses Web Audio lookahead scheduling and an audio-clock A-B loop", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /type BeatCount = 2 \| 3 \| 4 \| 6/);
  assert.match(source, /const scheduleMetronomeClick/);
  assert.match(source, /oscillator\.frequency\.setValueAtTime\(accent \? 1320 : 880, when\)/);
  assert.match(source, /liveContext\.currentTime \+ 0\.1/);
  assert.match(source, /clock\.nextBeatTime \+= 60 \/ metronomeTempoRef\.current/);
  assert.match(source, /metronomeSchedulerRef\.current = window\.setInterval\(tick, 25\)/);
  assert.match(source, /midi\.header\.tempos\[0\]\?\.bpm/);
  assert.match(source, /midi\.header\.timeSignatures/);
  assert.match(source, /signatures\[index \+ 1\]\?\.ticks \?\? midi\.durationTicks/);
  assert.match(source, /const hasActiveLoop = loop\.enabled && loop\.b > loop\.a/);
  assert.match(source, /Math\.min\(hasActiveLoop \? loop\.b : playback\.duration/);
  assert.match(source, /beginLibraryPlaybackRef\.current\?\.\(loop\.a, playback\.speed, song\.id\)/);
  assert.match(source, /if \(document\.hidden\)[\s\S]*stopMetronome\(\)/);
  assert.match(styles, /\.practice-drawer/);
  assert.match(styles, /\.beat-indicator i\.active/);
  assert.match(styles, /\.loop-practice-card\.active/);
});

test("all note particles share the scene's full rise height", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const rise = Math\.max\(layer\.clientHeight - 18, 280\)/);
  assert.match(source, /setProperty\("--spark-rise", `\$\{rise\}px`\)/);
  assert.doesNotMatch(source, /key\.group.*--spark-rise|--spark-rise.*key\.group/);
});
