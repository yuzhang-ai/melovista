"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type KeyDefinition = {
  code: string;
  label: string;
  semitone: number;
  accidental?: boolean;
  group: "low" | "mid" | "high";
};

type Voice = {
  oscillators: OscillatorNode[];
  gain: GainNode;
};

type AudioDiagnostics = {
  baseLatency: number;
  outputLatency: number | null;
  sampleRate: number;
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

function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

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
  const voicesRef = useRef(new Map<string, Voice>());
  const activeCodesRef = useRef(new Set<string>());
  const lowOctaveRef = useRef<2 | 3>(3);
  const measurementsRef = useRef<number[]>([]);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<"idle" | "starting" | "running" | "suspended">("idle");
  const [lowOctave, setLowOctave] = useState<2 | 3>(3);
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [lastNote, setLastNote] = useState("等待按键");
  const [lastScheduleMs, setLastScheduleMs] = useState(0);
  const [p95ScheduleMs, setP95ScheduleMs] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics | null>(null);

  const releaseVoice = useCallback((code: string) => {
    const context = audioContextRef.current;
    const voice = voicesRef.current.get(code);
    if (!context || !voice) return;

    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    voice.oscillators.forEach((oscillator) => oscillator.stop(now + 0.2));
    voicesRef.current.delete(code);
  }, []);

  const releaseAll = useCallback(() => {
    [...voicesRef.current.keys()].forEach(releaseVoice);
    activeCodesRef.current.clear();
    setActiveCodes(new Set());
  }, [releaseVoice]);

  const startVoice = useCallback((code: string, key: KeyDefinition, eventStartedAt: number) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    if (!context || !master || context.state !== "running") return false;

    const midi = keyToMidi(key, lowOctaveRef.current);
    const frequency = midiToFrequency(midi);
    const now = context.currentTime;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const oscillators: OscillatorNode[] = [];

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(7200, frequency * 11), now);
    filter.Q.setValueAtTime(0.7, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 1.8);
    gain.connect(filter);
    filter.connect(master);

    ([
      { ratio: 1, type: "triangle" as OscillatorType, level: 1 },
      { ratio: 2, type: "sine" as OscillatorType, level: 0.22 },
      { ratio: 3, type: "sine" as OscillatorType, level: 0.08 },
    ]).forEach(({ ratio, type, level }) => {
      const oscillator = context.createOscillator();
      const partialGain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency * ratio, now);
      partialGain.gain.setValueAtTime(level, now);
      oscillator.connect(partialGain);
      partialGain.connect(gain);
      oscillator.start(now);
      oscillators.push(oscillator);
    });

    voicesRef.current.set(code, { oscillators, gain });

    const scheduledMs = performance.now() - eventStartedAt;
    const measurements = measurementsRef.current;
    measurements.push(scheduledMs);
    if (measurements.length > 120) measurements.shift();

    setLastScheduleMs(scheduledMs);
    setP95ScheduleMs(percentile95(measurements));
    setLastNote(`${keyToNote(key, lowOctaveRef.current)} · ${key.label}`);
    return true;
  }, []);

  const initializeAudio = useCallback(async () => {
    setAudioStatus("starting");
    let context = audioContextRef.current;
    if (!context) {
      context = new AudioContext({ latencyHint: "interactive" });
      const masterGain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      masterGain.gain.value = 0.55;
      compressor.threshold.value = -10;
      compressor.knee.value = 10;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;
      masterGain.connect(compressor);
      compressor.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = masterGain;
      context.addEventListener("statechange", () => {
        const running = context?.state === "running";
        setIsAudioReady(running);
        setAudioStatus(running ? "running" : "suspended");
      });
    }

    const resumeAttempt = context.resume().catch(() => undefined);
    await Promise.race([
      resumeAttempt,
      new Promise<void>((resolve) => window.setTimeout(resolve, 600)),
    ]);
    const contextWithOutput = context as AudioContext & { outputLatency?: number };
    setDiagnostics({
      baseLatency: context.baseLatency,
      outputLatency: contextWithOutput.outputLatency ?? null,
      sampleRate: context.sampleRate,
    });
    const running = context.state === "running";
    setIsAudioReady(running);
    setAudioStatus(running ? "running" : "suspended");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (event.repeat) return;

        LOW_KEYS.forEach((key) => {
          releaseVoice(key.code);
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
      if (!started) setLastNote(`${keyToNote(key, lowOctaveRef.current)} · ${key.label}（音频未运行）`);
      setActiveCodes(new Set(activeCodesRef.current));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
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
      if (document.hidden) releaseAll();
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseAll();
    };
  }, [releaseAll, releaseVoice, startVoice]);

  const activeCodeSet = useMemo(() => activeCodes, [activeCodes]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-line"><span className="status-dot" /> LATENCY LAB · P0</div>
          <h1>三八度键盘钢琴</h1>
          <p>先验证手感。声音在键盘事件到达后立即调度，暂不加载气泡动画。</p>
        </div>
        <button className={`audio-button ${isAudioReady ? "ready" : ""}`} onClick={initializeAudio} data-testid="start-audio">
          <span>{audioStatus === "running" ? "音频已启动" : audioStatus === "starting" ? "正在启动音频…" : audioStatus === "suspended" ? "音频仍被浏览器暂停" : "点击启动音频"}</span>
          <small>{audioStatus === "running" ? "现在可以直接弹奏" : audioStatus === "suspended" ? "请在实际 Chrome / Edge 中再点一次" : "浏览器要求先进行一次点击"}</small>
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

      <p className="measurement-note">提示：JS 调度耗时用于验证代码热路径，不等于扬声器最终出声的端到端延迟；蓝牙设备会额外增加硬件延迟。</p>

      <div className="keyboard-map">
        <KeyStrip title="高音区" octave={5} keys={HIGH_KEYS} activeCodes={activeCodeSet} />
        <KeyStrip title="中音区" octave={4} keys={MID_KEYS} activeCodes={activeCodeSet} />
        <KeyStrip title="可切换低音区" octave={lowOctave} keys={LOW_KEYS} activeCodes={activeCodeSet} />
      </div>

      <footer className="octave-switch">
        <div>
          <span className="eyebrow">低音区切换</span>
          <strong>C{lowOctave} — B{lowOctave}</strong>
        </div>
        <kbd>SPACE</kbd>
        <p>每按一次空格，在 C3 与 C2 之间切换</p>
      </footer>
    </main>
  );
}
