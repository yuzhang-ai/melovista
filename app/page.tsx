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
type Timbre = "acoustic" | "bright" | "violin" | "guitar" | "saxophone";
type SampleBankKey = Exclude<Timbre, "bright">;
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

type SampleBank = {
  basePath: string;
  samples: SampleDefinition[];
};

type TimbreOption = {
  id: Timbre;
  label: string;
  detail: string;
  bank: SampleBankKey;
  gain: number;
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

const SAMPLE_BANKS: Record<SampleBankKey, SampleBank> = {
  acoustic: {
    basePath: "/audio/piano",
    samples: [
      { midi: 36, file: "C2.mp3" }, { midi: 39, file: "Ds2.mp3" },
      { midi: 42, file: "Fs2.mp3" }, { midi: 45, file: "A2.mp3" },
      { midi: 48, file: "C3.mp3" }, { midi: 51, file: "Ds3.mp3" },
      { midi: 54, file: "Fs3.mp3" }, { midi: 57, file: "A3.mp3" },
      { midi: 60, file: "C4.mp3" }, { midi: 63, file: "Ds4.mp3" },
      { midi: 66, file: "Fs4.mp3" }, { midi: 69, file: "A4.mp3" },
      { midi: 72, file: "C5.mp3" }, { midi: 75, file: "Ds5.mp3" },
      { midi: 78, file: "Fs5.mp3" }, { midi: 81, file: "A5.mp3" },
    ],
  },
  violin: {
    basePath: "/audio/instruments/violin",
    samples: [
      { midi: 55, file: "G3.mp3" }, { midi: 60, file: "C4.mp3" },
      { midi: 64, file: "E4.mp3" }, { midi: 69, file: "A4.mp3" },
      { midi: 72, file: "C5.mp3" }, { midi: 76, file: "E5.mp3" },
      { midi: 81, file: "A5.mp3" }, { midi: 84, file: "C6.mp3" },
    ],
  },
  guitar: {
    basePath: "/audio/instruments/guitar",
    samples: [
      { midi: 38, file: "D2.mp3" }, { midi: 45, file: "A2.mp3" },
      { midi: 50, file: "D3.mp3" }, { midi: 57, file: "A3.mp3" },
      { midi: 62, file: "D4.mp3" }, { midi: 69, file: "A4.mp3" },
      { midi: 72, file: "C5.mp3" },
    ],
  },
  saxophone: {
    basePath: "/audio/instruments/saxophone",
    samples: [
      { midi: 50, file: "D3.mp3" }, { midi: 55, file: "G3.mp3" },
      { midi: 60, file: "C4.mp3" }, { midi: 65, file: "F4.mp3" },
      { midi: 70, file: "As4.mp3" }, { midi: 74, file: "D5.mp3" },
      { midi: 77, file: "F5.mp3" }, { midi: 81, file: "A5.mp3" },
    ],
  },
};

const TIMBRE_OPTIONS: TimbreOption[] = [
  { id: "acoustic", label: "原声", detail: "音乐厅钢琴", bank: "acoustic", gain: 0.82 },
  { id: "bright", label: "明亮", detail: "清亮钢琴", bank: "acoustic", gain: 0.74 },
  { id: "violin", label: "小提琴", detail: "温暖弓弦", bank: "violin", gain: 0.56 },
  { id: "guitar", label: "钢丝弦吉他", detail: "清脆拨弦", bank: "guitar", gain: 0.72 },
  { id: "saxophone", label: "萨克斯", detail: "醇厚管乐", bank: "saxophone", gain: 0.54 },
];

const TIMBRE_BY_ID = new Map(TIMBRE_OPTIONS.map((option) => [option.id, option]));
const WHITE_KEY_INDEX = new Map([[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6]]);
const BLACK_KEY_BOUNDARY = new Map([[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]]);

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

async function loadSampleBank(context: AudioContext, bank: SampleBank, onProgress: (loaded: number) => void) {
  let loaded = 0;
  const decoded = await Promise.all(
    bank.samples.map(async (sample) => {
      const response = await fetch(`${bank.basePath}/${sample.file}`, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Unable to load ${sample.file}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      loaded += 1;
      onProgress(loaded);
      return [sample.midi, buffer] as const;
    }),
  );
  return new Map<number, AudioBuffer>(decoded);
}

function nearestSample(midi: number, buffers: Map<number, AudioBuffer>, definitions: SampleDefinition[]) {
  let nearest = definitions[0];
  for (const sample of definitions) {
    if (Math.abs(sample.midi - midi) < Math.abs(nearest.midi - midi)) nearest = sample;
  }
  const buffer = buffers.get(nearest.midi);
  if (!buffer) return null;
  return { buffer, playbackRate: 2 ** ((midi - nearest.midi) / 12) };
}

function blackKeyLeft(semitone: number) {
  return `${((BLACK_KEY_BOUNDARY.get(semitone) ?? 0) / 7) * 100}%`;
}

function PianoOctave({
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
    <section className="piano-octave" aria-label={`${title} C${octave} 到 B${octave}`}>
      <div className="white-keys">
        {naturals.map((key) => (
          <div className={`piano-key white ${activeCodes.has(key.code) ? "active" : ""}`} key={key.code} data-key-code={key.code}>
            <div className="piano-key-label">
              <kbd>{key.label}</kbd>
              <span>{NOTE_NAMES[key.semitone]}{octave}</span>
            </div>
          </div>
        ))}
      </div>
      {accidentals.map((key) => (
        <div
          className={`piano-key black ${activeCodes.has(key.code) ? "active" : ""}`}
          key={key.code}
          data-key-code={key.code}
          style={{ left: blackKeyLeft(key.semitone) }}
        >
          <div className="piano-key-label">
            <kbd>{key.label}</kbd>
            <span>{NOTE_NAMES[key.semitone]}{octave}</span>
          </div>
        </div>
      ))}
      <div className="octave-caption">{title} · C{octave}—B{octave}</div>
    </section>
  );
}

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sampleLibrariesRef = useRef(new Map<SampleBankKey, Map<number, AudioBuffer>>());
  const voicesRef = useRef(new Map<string, Voice>());
  const activeCodesRef = useRef(new Set<string>());
  const bubbleLayerRef = useRef<HTMLDivElement | null>(null);
  const lowOctaveRef = useRef<2 | 3>(3);
  const articulationRef = useRef<Articulation>("short");
  const timbreRef = useRef<Timbre>("acoustic");
  const measurementsRef = useRef<number[]>([]);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [sampleProgress, setSampleProgress] = useState(0);
  const [sampleTotal, setSampleTotal] = useState(SAMPLE_BANKS.acoustic.samples.length);
  const [lowOctave, setLowOctave] = useState<2 | 3>(3);
  const [articulation, setArticulation] = useState<Articulation>("short");
  const [timbre, setTimbre] = useState<Timbre>("acoustic");
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [lastNote, setLastNote] = useState("等待加载原声音源");
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

  const spawnBubbles = useCallback((key: KeyDefinition) => {
    const layer = bubbleLayerRef.current;
    if (!layer) return;

    const groupIndex = key.group === "low" ? 0 : key.group === "mid" ? 1 : 2;
    const localX = key.accidental
      ? (BLACK_KEY_BOUNDARY.get(key.semitone) ?? 0) / 7
      : ((WHITE_KEY_INDEX.get(key.semitone) ?? 0) + 0.5) / 7;
    const globalX = ((groupIndex + localX) / 3) * 100;
    const hue = 178 + key.semitone * 7;

    [0, 1].forEach((index) => {
      const bubble = document.createElement("i");
      const size = index === 0 ? 25 + Math.random() * 22 : 8 + Math.random() * 10;
      bubble.className = "water-bubble";
      bubble.style.left = `calc(${globalX}% + ${(Math.random() - 0.5) * 18}px)`;
      bubble.style.setProperty("--bubble-size", `${size}px`);
      bubble.style.setProperty("--bubble-drift", `${(Math.random() - 0.5) * 90}px`);
      bubble.style.setProperty("--bubble-hue", `${hue}`);
      bubble.style.setProperty("--bubble-duration", `${2.6 + Math.random() * 1.2}s`);
      bubble.style.setProperty("--bubble-delay", `${index * 80}ms`);
      bubble.addEventListener("animationend", () => bubble.remove(), { once: true });
      layer.appendChild(bubble);
    });

    while (layer.childElementCount > 80) layer.firstElementChild?.remove();
  }, []);

  const startVoice = useCallback((code: string, key: KeyDefinition, eventStartedAt: number) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    const currentTimbre = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
    const bank = SAMPLE_BANKS[currentTimbre.bank];
    const buffers = sampleLibrariesRef.current.get(currentTimbre.bank);
    if (!context || !master || !buffers || context.state !== "running") return false;

    const midi = keyToMidi(key, lowOctaveRef.current);
    const sample = nearestSample(midi, buffers, bank.samples);
    if (!sample) return false;

    const now = context.currentTime;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = sample.buffer;
    source.playbackRate.setValueAtTime(sample.playbackRate, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(currentTimbre.gain, now + 0.003);
    source.connect(gain);

    if (timbreRef.current === "bright") {
      const brightness = context.createBiquadFilter();
      brightness.type = "highshelf";
      brightness.frequency.setValueAtTime(1800, now);
      brightness.gain.setValueAtTime(5.5, now);
      gain.connect(brightness);
      brightness.connect(master);
    } else {
      gain.connect(master);
    }

    source.start(now);
    spawnBubbles(key);

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
    setLastNote(`${keyToNote(key, lowOctaveRef.current)} · ${key.label} · ${currentTimbre.label} · ${articulationRef.current === "long" ? "长音" : "短音"}`);
    return true;
  }, [spawnBubbles]);

  const ensureSampleBank = useCallback(async (context: AudioContext, bankKey: SampleBankKey) => {
    const existing = sampleLibrariesRef.current.get(bankKey);
    if (existing) return existing;
    const bank = SAMPLE_BANKS[bankKey];
    setAudioStatus("loading");
    setSampleProgress(0);
    setSampleTotal(bank.samples.length);
    const buffers = await loadSampleBank(context, bank, setSampleProgress);
    sampleLibrariesRef.current.set(bankKey, buffers);
    return buffers;
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
        const current = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
        if (!sampleLibrariesRef.current.has(current.bank)) return;
        const running = context?.state === "running";
        setIsAudioReady(running);
        setAudioStatus(running ? "running" : "suspended");
      });
    }

    await Promise.race([
      context.resume().catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 600)),
    ]);

    const currentTimbre = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
    try {
      await ensureSampleBank(context, currentTimbre.bank);
    } catch {
      setAudioStatus("error");
      setIsAudioReady(false);
      setLastNote(`${currentTimbre.label}音源加载失败，请检查网络后重试`);
      return;
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
    setLastNote(running ? `${currentTimbre.label}音色已就绪，可以弹奏` : "音源已加载，请再次点击启动音频");
  }, [ensureSampleBank]);

  const selectTimbre = useCallback(async (next: Timbre) => {
    if (next === timbreRef.current || audioStatus === "loading") return;
    releaseAll(0.06);
    timbreRef.current = next;
    setTimbre(next);
    const option = TIMBRE_BY_ID.get(next) ?? TIMBRE_OPTIONS[0];
    const context = audioContextRef.current;

    if (!context) {
      setIsAudioReady(false);
      setAudioStatus("idle");
      setLastNote(`已选择${option.label}，点击右上角加载音源`);
      return;
    }

    await context.resume().catch(() => undefined);
    try {
      await ensureSampleBank(context, option.bank);
    } catch {
      setAudioStatus("error");
      setIsAudioReady(false);
      setLastNote(`${option.label}音源加载失败，请重试`);
      return;
    }

    const running = context.state === "running";
    setIsAudioReady(running);
    setAudioStatus(running ? "running" : "suspended");
    setLastNote(running ? `已切换到${option.label}音色` : `${option.label}已加载，点击右上角恢复音频`);
  }, [audioStatus, ensureSampleBank, releaseAll]);

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
      if (!started) setLastNote(`${keyToNote(key, lowOctaveRef.current)} · 请先加载并启动当前音源`);
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
  const selectedTimbre = TIMBRE_BY_ID.get(timbre) ?? TIMBRE_OPTIONS[0];
  const audioButtonText = audioStatus === "running"
    ? `${selectedTimbre.label}已就绪`
    : audioStatus === "loading"
      ? `正在加载${selectedTimbre.label} ${sampleProgress}/${sampleTotal}`
      : audioStatus === "starting"
        ? "正在启动音频…"
        : audioStatus === "suspended"
          ? "音频已暂停，点击恢复"
          : audioStatus === "error"
            ? "加载失败，点击重试"
            : `加载并启动${selectedTimbre.label}`;

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-line"><span className="status-dot" /> SAMPLE ENGINE · AQUA VISUAL</div>
          <h1>三八度沉浸式键盘钢琴</h1>
          <p>真实键盘布局、五种采样音色与水中发光气泡；声音先调度，视觉随后生成。</p>
        </div>
        <button className={`audio-button ${isAudioReady ? "ready" : ""}`} onClick={initializeAudio} disabled={audioStatus === "loading"} data-testid="start-audio">
          <span>{audioButtonText}</span>
          <small>{audioStatus === "running" ? `当前：${articulation === "long" ? "长音" : "短音"}模式` : "音色按需加载，加载后演奏不再请求网络"}</small>
        </button>
      </header>

      <section className="timbre-panel" aria-label="音色选择">
        <div className="timbre-copy">
          <span className="eyebrow">音色</span>
          <strong>选择你的演奏质感</strong>
          <small>首次选择小提琴、吉他或萨克斯时会单独加载</small>
        </div>
        <div className="timbre-options" role="group" aria-label="可用音色">
          {TIMBRE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`timbre-option ${timbre === option.id ? "active" : ""}`}
              aria-pressed={timbre === option.id}
              disabled={audioStatus === "loading"}
              onClick={() => void selectTimbre(option.id)}
            >
              <span>{option.label}</span>
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
      </section>

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

      <p className="measurement-note">键帽上方是电脑按键，下方是音高。建议使用内置扬声器或有线耳机；蓝牙设备会额外增加硬件延迟。</p>

      <section className="instrument-panel" aria-label="三八度真实钢琴键盘与水中发光气泡">
        <div className="instrument-heading">
          <div>
            <span className="eyebrow">演奏区</span>
            <h2>按键亮起，气泡随音高上浮</h2>
          </div>
          <span className="live-pill"><i /> LIVE</span>
        </div>
        <div className="instrument-scroll">
          <div className="instrument-stage">
            <div className="water-rays" aria-hidden="true" />
            <div className="bubble-surface" ref={bubbleLayerRef} aria-hidden="true" />
            <div className="waterline" aria-hidden="true" />
            <div className="piano-shell">
              <PianoOctave title="可切换低音区" octave={lowOctave} keys={LOW_KEYS} activeCodes={activeCodeSet} />
              <PianoOctave title="中音区" octave={4} keys={MID_KEYS} activeCodes={activeCodeSet} />
              <PianoOctave title="高音区" octave={5} keys={HIGH_KEYS} activeCodes={activeCodeSet} />
            </div>
          </div>
        </div>
      </section>

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
        Piano: <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">Salamander Grand Piano V3</a> · Other instruments: <a href="https://nbrosowsky.github.io/tonejs-instruments/" target="_blank" rel="noreferrer">tonejs-instruments</a> · CC BY 3.0
      </p>
    </main>
  );
}
