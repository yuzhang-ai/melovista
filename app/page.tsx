"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type KeyDefinition = {
  code: string;
  label: string;
  semitone: number;
  accidental?: boolean;
  group: "low" | "mid" | "high";
};

type Articulation = "short" | "long";
type AudioStatus = "idle" | "starting" | "loading" | "running" | "suspended" | "error";

type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type AudioDiagnostics = {
  baseLatency: number;
  outputLatency: number | null;
  sampleRate: number;
};

type SampleDefinition = {
  midi: number;
  file: string;
};

const MID_KEYS: KeyDefinition[] = [
  { code: "Backquote", label: "·", semitone: 0, group: "mid" },
  { code: "Digit1", label: "1", semitone: 2, group: "mid" },
  { code: "Digit2", label: "2", semitone: 4, group: "mid" },
  { code: "Digit3", label: "3", semitone: 5, group: "mid" },
  { code: "Digit4", label: "4", semitone: 7, group: "mid" },
  { code: "Digit5", label: "5", semitone: 9, group: "mid" },
  { code: "Digit6", label: "6", semitone: 11, group: "mid" },
  { code: "Tab", label: "Tab", semitone: 1, accidental: true, group: "mid" },
  { code: "KeyQ", label: "Q", semitone: 3, accidental: true, group: "mid" },
  { code: "KeyE", label: "E", semitone: 6, accidental: true, group: "mid" },
  { code: "KeyR", label: "R", semitone: 8, accidental: true, group: "mid" },
  { code: "KeyT", label: "T", semitone: 10, accidental: true, group: "mid" },
];

const HIGH_KEYS: KeyDefinition[] = [
  { code: "Digit7", label: "7", semitone: 0, group: "high" },
  { code: "Digit8", label: "8", semitone: 2, group: "high" },
  { code: "Digit9", label: "9", semitone: 4, group: "high" },
  { code: "Digit0", label: "0", semitone: 5, group: "high" },
  { code: "Minus", label: "−", semitone: 7, group: "high" },
  { code: "Equal", label: "=", semitone: 9, group: "high" },
  { code: "Backspace", label: "删除", semitone: 11, group: "high" },
  { code: "KeyU", label: "U", semitone: 1, accidental: true, group: "high" },
  { code: "KeyI", label: "I", semitone: 3, accidental: true, group: "high" },
  { code: "KeyP", label: "P", semitone: 6, accidental: true, group: "high" },
  { code: "BracketLeft", label: "[", semitone: 8, accidental: true, group: "high" },
  { code: "BracketRight", label: "]", semitone: 10, accidental: true, group: "high" },
];

const LOW_KEYS: KeyDefinition[] = [
  { code: "KeyA", label: "A", semitone: 0, group: "low" },
  { code: "KeyS", label: "S", semitone: 2, group: "low" },
  { code: "KeyD", label: "D", semitone: 4, group: "low" },
  { code: "KeyF", label: "F", semitone: 5, group: "low" },
  { code: "KeyG", label: "G", semitone: 7, group: "low" },
  { code: "KeyH", label: "H", semitone: 9, group: "low" },
  { code: "KeyJ", label: "J", semitone: 11, group: "low" },
  { code: "KeyZ", label: "Z", semitone: 1, accidental: true, group: "low" },
  { code: "KeyX", label: "X", semitone: 3, accidental: true, group: "low" },
  { code: "KeyV", label: "V", semitone: 6, accidental: true, group: "low" },
  { code: "KeyB", label: "B", semitone: 8, accidental: true, group: "low" },
  { code: "KeyN", label: "N", semitone: 10, accidental: true, group: "low" },
];

const ALL_KEYS = [...LOW_KEYS, ...MID_KEYS, ...HIGH_KEYS];
const KEY_BY_CODE = new Map(ALL_KEYS.map((key) => [key.code, key]));
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SHORT_RELEASE_SECONDS = 0.12;
const LONG_RELEASE_SECONDS = 3;

const PIANO_SAMPLES: SampleDefinition[] = [
  { midi: 36, file: "C2.mp3" },
  { midi: 39, file: "Ds2.mp3" },
  { midi: 42, file: "Fs2.mp3" },
  { midi: 45, file: "A2.mp3" },
  { midi: 48, file: "C3.mp3" },
  { midi: 51, file: "Ds3.mp3" },
  { midi: 54, file: "Fs3.mp3" },
  { midi: 57, file: "A3.mp3" },
  { midi: 60, file: "C4.mp3" },
  { midi: 63, file: "Ds4.mp3" },
  { midi: 66, file: "Fs4.mp3" },
  { midi: 69, file: "A4.mp3" },
  { midi: 72, file: "C5.mp3" },
  { midi: 75, file: "Ds5.mp3" },
  { midi: 78, file: "Fs5.mp3" },
  { midi: 81, file: "A5.mp3" },
];

function keyToMidi(key: KeyDefinition, lowOctave: 2 | 3) {
  const octave = key.group === "low" ? lowOctave : key.group === "mid" ? 4 : 5;
  return 12 * (octave + 1) + key.semitone;
}

function keyToNote(key: KeyDefinition, lowOctave: 2 | 3) {
  const octave = key.group === "low" ? lowOctave : key.group === "mid" ? 4 : 5;
  return `${NOTE_NAMES[key.semitone]}${octave}`;
}

function percentile95(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

async function loadPianoSamples(context: AudioContext, onProgress: (loaded: number) => void) {
  let loaded = 0;
  const decoded = await Promise.all(
    PIANO_SAMPLES.map(async (sample) => {
      const response = await fetch(`/audio/piano/${sample.file}`, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Unable to load ${sample.file}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      loaded += 1;
      onProgress(loaded);
      return [sample.midi, buffer] as const;
    }),
  );
  return new Map<number, AudioBuffer>(decoded);
}

function nearestSample(midi: number, buffers: Map<number, AudioBuffer>) {
  let nearest = PIANO_SAMPLES[0];
  for (const sample of PIANO_SAMPLES) {
    if (Math.abs(sample.midi - midi) < Math.abs(nearest.midi - midi)) nearest = sample;
  }
  const buffer = buffers.get(nearest.midi);
  if (!buffer) return null;
  return {
    buffer,
    playbackRate: 2 ** ((midi - nearest.midi) / 12),
  };
}

function KeyStrip({
  title,
  octave,
  keys,
  activeCodes,
}: {
  title: string;
  octave: number;
  keys: KeyDefinition[];
  activeCodes: Set<string>;
}) {
  const naturals = keys.filter((key) => !key.accidental);
  const accidentals = keys.filter((key) => key.accidental);

  return (
    <section className="key-strip" aria-label={`${title} C${octave} 到 B${octave}`}>
      <div className="strip-heading">
        <div>
          <span className="eyebrow">{title}</span>
          <h2>C{octave} — B{octave}</h2>
        </div>
        <span className="range-tag">12 音</span>
      </div>
      <div className="key-row naturals">
        {naturals.map((key) => (
          <div className={`key-chip natural ${activeCodes.has(key.code) ? "active" : ""}`} key={key.code} data-key-code={key.code}>
            <kbd>{key.label}</kbd>
            <span>{NOTE_NAMES[key.semitone]}{octave}</span>
          </div>
        ))}
      </div>
      <div className="key-row accidentals">
        {accidentals.map((key) => (
          <div className={`key-chip accidental ${activeCodes.has(key.code) ? "active" : ""}`} key={key.code} data-key-code={key.code}>
            <kbd>{key.label}</kbd>
            <span>{NOTE_NAMES[key.semitone]}{octave}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sampleBuffersRef = useRef(new Map<number, AudioBuffer>());
  const voicesRef = useRef(new Map<string, Voice>());
  const activeCodesRef = useRef(new Set<string>());
  const lowOctaveRef = useRef<2 | 3>(3);
  const articulationRef = useRef<Articulation>("short");
  const measurementsRef = useRef<number[]>([]);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [sampleProgress, setSampleProgress] = useState(0);
  const [lowOctave, setLowOctave] = useState<2 | 3>(3);
  const [articulation, setArticulation] = useState<Articulation>("short");
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [lastNote, setLastNote] = useState("等待加载钢琴音源");
  const [lastScheduleMs, setLastScheduleMs] = useState(0);
  const [p95ScheduleMs, setP95ScheduleMs] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics | null>(null);

  const releaseVoice = useCallback((code: string, forcedRelease?: number) => {
    const context = audioContextRef.current;
    const voice = voicesRef.current.get(code);
    if (!context || !voice) return;

    const releaseSeconds = forcedRelease ?? (articulationRef.current === "long" ? LONG_RELEASE_SECONDS : SHORT_RELEASE_SECONDS);
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);
    voice.source.stop(now + releaseSeconds + 0.05);
    voicesRef.current.delete(code);
  }, []);

  const releaseAll = useCallback((releaseSeconds = 0.08) => {
    [...voicesRef.current.keys()].forEach((code) => releaseVoice(code, releaseSeconds));
    activeCodesRef.current.clear();
    setActiveCodes(new Set());
  }, [releaseVoice]);

  const toggleArticulation = useCallback(() => {
    const next = articulationRef.current === "short" ? "long" : "short";
    articulationRef.current = next;
    setArticulation(next);
    setLastNote(`已切换到${next === "long" ? "长音" : "短音"}模式`);
  }, []);

  const startVoice = useCallback((code: string, key: KeyDefinition, eventStartedAt: number) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    if (!context || !master || context.state !== "running") return false;

    const midi = keyToMidi(key, lowOctaveRef.current);
    const sample = nearestSample(midi, sampleBuffersRef.current);
    if (!sample) return false;

    const now = context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = sample.buffer;
    source.playbackRate.setValueAtTime(sample.playbackRate, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.82, now + 0.003);
    source.connect(gain);
    gain.connect(master);
    source.start(now);

    const voice = { source, gain };
    voicesRef.current.set(code, voice);
    source.onended = () => {
      if (voicesRef.current.get(code) === voice) voicesRef.current.delete(code);
    };

    const scheduledMs = performance.now() - eventStartedAt;
    const measurements = measurementsRef.current;
    measurements.push(scheduledMs);
    if (measurements.length > 120) measurements.shift();

    setLastScheduleMs(scheduledMs);
    setP95ScheduleMs(percentile95(measurements));
    setLastNote(`${keyToNote(key, lowOctaveRef.current)} · ${key.label} · ${articulationRef.current === "long" ? "长音" : "短音"}`);
    return true;
  }, []);

  const initializeAudio = useCallback(async () => {
    setAudioStatus("starting");
    let context = audioContextRef.current;
    if (!context) {
      context = new AudioContext({ latencyHint: "interactive" });
      const masterGain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      masterGain.gain.value = 0.72;
      compressor.threshold.value = -8;
      compressor.knee.value = 8;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.18;
      masterGain.connect(compressor);
      compressor.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = masterGain;
      context.addEventListener("statechange", () => {
        const samplesReady = sampleBuffersRef.current.size === PIANO_SAMPLES.length;
        if (!samplesReady) return;
        const running = context?.state === "running";
        setIsAudioReady(running);
        setAudioStatus(running ? "running" : "suspended");
      });
    }

    await Promise.race([
      context.resume().catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 600)),
    ]);

    if (sampleBuffersRef.current.size !== PIANO_SAMPLES.length) {
      setAudioStatus("loading");
      setSampleProgress(0);
      try {
        sampleBuffersRef.current = await loadPianoSamples(context, setSampleProgress);
      } catch {
        setAudioStatus("error");
        setIsAudioReady(false);
        setLastNote("钢琴音源加载失败，请检查网络后重试");
        return;
      }
    }

    const contextWithOutput = context as AudioContext & { outputLatency?: number };
    setDiagnostics({
      baseLatency: context.baseLatency,
      outputLatency: contextWithOutput.outputLatency ?? null,
      sampleRate: context.sampleRate,
    });
    const running = context.state === "running";
    setIsAudioReady(running);
    setAudioStatus(running ? "running" : "suspended");
    setLastNote(running ? "真实钢琴已就绪，可以弹奏" : "音源已加载，请再次点击启动音频");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      if (event.code === "AltLeft") {
        event.preventDefault();
        if (!event.repeat) toggleArticulation();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat) return;
        LOW_KEYS.forEach((key) => {
          releaseVoice(key.code, 0.08);
          activeCodesRef.current.delete(key.code);
        });
        const nextOctave = lowOctaveRef.current === 3 ? 2 : 3;
        lowOctaveRef.current = nextOctave;
        setLowOctave(nextOctave);
        setActiveCodes(new Set(activeCodesRef.current));
        setLastNote(`低音区已切换到 C${nextOctave} — B${nextOctave}`);
        return;
      }

      const key = KEY_BY_CODE.get(event.code);
      if (!key) return;
      event.preventDefault();
      if (event.repeat || activeCodesRef.current.has(event.code)) return;

      const eventStartedAt = performance.now();
      activeCodesRef.current.add(event.code);
      const started = startVoice(event.code, key, eventStartedAt);
      if (!started) setLastNote(`${keyToNote(key, lowOctaveRef.current)} · 请先加载并启动钢琴音源`);
      setActiveCodes(new Set(activeCodesRef.current));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "AltLeft") {
        event.preventDefault();
        return;
      }
      if (!KEY_BY_CODE.has(event.code)) return;
      event.preventDefault();
      releaseVoice(event.code);
      activeCodesRef.current.delete(event.code);
      setActiveCodes(new Set(activeCodesRef.current));
    };

    const onVisibilityChange = () => {
      if (document.hidden) releaseAll(0.08);
    };
    const onBlur = () => releaseAll(0.08);

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseAll(0.05);
    };
  }, [releaseAll, releaseVoice, startVoice, toggleArticulation]);

  const activeCodeSet = useMemo(() => activeCodes, [activeCodes]);
  const audioButtonText = audioStatus === "running"
    ? "真实钢琴已就绪"
    : audioStatus === "loading"
      ? `正在加载钢琴音源 ${sampleProgress}/${PIANO_SAMPLES.length}`
      : audioStatus === "starting"
        ? "正在启动音频…"
        : audioStatus === "suspended"
          ? "音频已暂停，点击恢复"
          : audioStatus === "error"
            ? "加载失败，点击重试"
            : "加载并启动真实钢琴";

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-line"><span className="status-dot" /> REAL SAMPLE ENGINE · P1</div>
          <h1>三八度键盘钢琴</h1>
          <p>真实 Yamaha C5 钢琴采样已接入；音源加载后全部驻留内存，按键仍然立即调度。</p>
        </div>
        <button className={`audio-button ${isAudioReady ? "ready" : ""}`} onClick={initializeAudio} disabled={audioStatus === "loading"} data-testid="start-audio">
          <span>{audioButtonText}</span>
          <small>{audioStatus === "running" ? `当前：${articulation === "long" ? "长音" : "短音"}模式` : "首次约加载 1.2MB，浏览器缓存后更快"}</small>
        </button>
      </header>

      <section className="diagnostics" aria-label="延迟诊断">
        <div className="metric primary">
          <span>最近一次 JS 调度</span>
          <strong data-testid="last-schedule">{lastScheduleMs.toFixed(2)}<em> ms</em></strong>
        </div>
        <div className="metric">
          <span>最近 120 次 P95</span>
          <strong data-testid="p95-schedule">{p95ScheduleMs.toFixed(2)}<em> ms</em></strong>
        </div>
        <div className="metric">
          <span>浏览器基础音频延迟</span>
          <strong>{diagnostics ? (diagnostics.baseLatency * 1000).toFixed(1) : "—"}<em> ms</em></strong>
        </div>
        <div className="metric">
          <span>当前音 / 操作</span>
          <strong className="last-note" data-testid="last-note">{lastNote}</strong>
        </div>
      </section>

      <p className="measurement-note">演奏过程中不会请求网络。建议继续使用内置扬声器或有线耳机；蓝牙设备仍会额外增加硬件延迟。</p>

      <div className="keyboard-map">
        <KeyStrip title="高音区" octave={5} keys={HIGH_KEYS} activeCodes={activeCodeSet} />
        <KeyStrip title="中音区" octave={4} keys={MID_KEYS} activeCodes={activeCodeSet} />
        <KeyStrip title="可切换低音区" octave={lowOctave} keys={LOW_KEYS} activeCodes={activeCodeSet} />
      </div>

      <footer className="performance-controls">
        <section className="control-card">
          <div>
            <span className="eyebrow">低音区切换</span>
            <strong>C{lowOctave} — B{lowOctave}</strong>
          </div>
          <kbd>SPACE</kbd>
          <p>每按一次，在 C3 与 C2 之间切换</p>
        </section>
        <button className={`control-card articulation ${articulation}`} type="button" onClick={toggleArticulation} data-testid="articulation-toggle">
          <div>
            <span className="eyebrow">发音长度</span>
            <strong data-testid="articulation-mode">{articulation === "long" ? "长音模式" : "短音模式"}</strong>
          </div>
          <kbd>LEFT ALT</kbd>
          <p>{articulation === "long" ? "松键后自然延音约 3 秒" : "松键后快速收音，适合颗粒感节奏"}</p>
        </button>
      </footer>

      <p className="sample-credit">
        Piano samples: <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">Salamander Grand Piano V3</a> by Alexander Holm · CC BY 3.0
      </p>
    </main>
  );
}
