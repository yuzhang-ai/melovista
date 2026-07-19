"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type KeyDefinition = {
  code: string;
  label: string;
  semitone: number;
  accidental?: boolean;
  group: "extreme" | "low" | "mid" | "high";
};

type Articulation = "short" | "long";
type Timbre = "acoustic" | "bright" | "violin" | "guitar" | "saxophone";
type SceneId = "coast" | "forest" | "rain" | "stars";
type Locale = "zh" | "en";
type SongId = "merry-christmas-mr-lawrence" | "dandelions-promise" | "fur-elise" | "truth-that-you-leave" | "call-of-silence";
type OpenMenu = "scene" | "timbre" | null;
type SampleBankKey = Exclude<Timbre, "bright">;
type AudioStatus = "idle" | "starting" | "loading" | "running" | "suspended" | "error";
type PlaybackState = "idle" | "loading" | "playing" | "paused";

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

type SongNote = {
  midi: number;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;
};

type ParsedSong = {
  notes: SongNote[];
  duration: number;
};

type LibrarySong = {
  id: SongId;
  title: Record<Locale, string>;
  composer: Record<Locale, string>;
  color: string;
  midiUrl?: string;
  sourceUrl?: string;
  license?: string;
};

type TimbreOption = {
  id: Timbre;
  label: Record<Locale, string>;
  detail: Record<Locale, string>;
  bank: SampleBankKey;
  gain: number;
};

type SceneOption = {
  id: SceneId;
  label: Record<Locale, string>;
  detail: Record<Locale, string>;
  icon: string;
  image: string;
  video: string;
  videoPosition: string;
};

type KeyboardLockNavigator = Navigator & {
  keyboard?: {
    lock?: (keyCodes?: string[]) => Promise<void>;
    unlock?: () => void;
  };
};

type ImmersiveFullscreenOptions = FullscreenOptions & {
  keyboardLock?: "browser";
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

const EXTREME_KEYS: KeyDefinition[] = [
  { code: "Insert", label: "Ins", semitone: 0, group: "extreme" },
  { code: "Home", label: "Home", semitone: 2, group: "extreme" },
  { code: "PageUp", label: "PgUp", semitone: 4, group: "extreme" },
  { code: "NumLock", label: "Num", semitone: 5, group: "extreme" },
  { code: "NumpadDivide", label: "/", semitone: 7, group: "extreme" },
  { code: "NumpadMultiply", label: "*", semitone: 9, group: "extreme" },
  { code: "NumpadSubtract", label: "−", semitone: 11, group: "extreme" },
  { code: "Delete", label: "Del", semitone: 1, accidental: true, group: "extreme" },
  { code: "End", label: "End", semitone: 3, accidental: true, group: "extreme" },
  { code: "Numpad7", label: "7", semitone: 6, accidental: true, group: "extreme" },
  { code: "Numpad8", label: "8", semitone: 8, accidental: true, group: "extreme" },
  { code: "Numpad9", label: "9", semitone: 10, accidental: true, group: "extreme" },
];

const ALL_KEYS = [...EXTREME_KEYS, ...LOW_KEYS, ...MID_KEYS, ...HIGH_KEYS];
const KEY_BY_CODE = new Map(ALL_KEYS.map((key) => [key.code, key]));
const IMMERSIVE_CONTROL_CODES = new Set(["Space", "AltLeft", "NumpadAdd"]);
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SHORT_RELEASE_TIME_CONSTANT_SECONDS = 0.72;
const SHORT_RELEASE_STOP_SECONDS = 3;
const LONG_RELEASE_TIME_CONSTANT_SECONDS = 1.8;
const LONG_RELEASE_STOP_SECONDS = 9;

const UI_COPY = {
  zh: {
    brand: "乐境 MeloVista",
    tagline: "四景 · 六音区沉浸式琴房",
    documentTitle: "乐境 MeloVista · 沉浸式六音区钢琴",
    language: "语言",
    languageName: "中文",
    switchLanguage: "切换至英文界面",
    scene: "场景",
    chooseScene: "选择场景",
    chooseWindow: "选择一扇窗",
    timbre: "音色",
    chooseTimbre: "选择音色",
    chooseInstrument: "选择乐器音色",
    noteLength: "延音",
    short: "短音",
    long: "长音",
    mode: "模式",
    enterImmersive: "沉浸演奏",
    exitImmersive: "退出沉浸",
    more: "更多",
    performance: "性能信息",
    library: "曲库",
    appreciation: "欣赏模式",
    songLibrary: "钢琴曲库",
    libraryIntro: "自动演奏时仍可继续使用键盘跟弹",
    available: "可直接播放",
    needsMidi: "需导入授权 MIDI",
    imported: "本地 MIDI 已就绪",
    importMidi: "导入已授权 MIDI",
    localOnly: "文件仅在当前浏览器解析，不会上传",
    publicDomain: "公版曲目 · Mutopia Project",
    play: "播放",
    pause: "暂停",
    previous: "上一首",
    next: "下一首",
    loop: "循环",
    speed: "速度",
    openPerformance: "性能信息",
    closeLibrary: "关闭曲库",
    midiRequired: "请先导入你拥有使用权的 MIDI 文件",
    midiLoaded: "本地 MIDI 已导入，可以播放",
    midiInvalid: "无法解析这个 MIDI 文件，请换一个文件重试",
    songLoading: "正在准备曲目…",
    songPlaying: "正在欣赏",
    songPaused: "曲目已暂停",
    songFinished: "曲目播放完成",
    controls: "演奏控制",
    startEngine: "点击启用音频引擎",
    immersiveMode: "沉浸模式",
    immersiveNotice: "仅琴键、Space、小键盘 + 和左 Alt 响应",
    closePerformance: "关闭性能信息",
    recentSchedule: "最近 JS 调度",
    p95: "120 次 P95",
    baseLatency: "浏览器基础延迟",
    outputLatency: "输出延迟",
    sampleRate: "采样率",
    currentAction: "当前操作",
    performanceNote: "声音始终先于视觉粒子调度。蓝牙设备仍会产生额外硬件延迟。",
    instrumentLabel: "可切换六音区真实钢琴键盘与发光音符光尘",
    liveInfo: "实时演奏信息",
    schedule: "调度",
    currentNote: "当前音",
    extendedRange: "扩展音区",
    lowRange: "低音区",
    midRange: "中音区",
    highRange: "高音区",
    currentPlayable: "当前可演奏",
    waitingSwitch: "待切换",
    current: "当前",
    extendedHint: "扩展音区",
    lowHint: "低音区",
    headphoneHint: "建议使用有线耳机获得最佳体验",
    waitingSource: "等待加载原声音源",
    languageChanged: "已切换至中文界面",
  },
  en: {
    brand: "MeloVista",
    tagline: "FOUR SCENES · SIX OCTAVES",
    documentTitle: "MeloVista · Immersive Six-Octave Piano",
    language: "Language",
    languageName: "EN",
    switchLanguage: "Switch to Chinese",
    scene: "Scene",
    chooseScene: "Choose a scene",
    chooseWindow: "Choose a window",
    timbre: "Voice",
    chooseTimbre: "Choose a voice",
    chooseInstrument: "Choose an instrument voice",
    noteLength: "Length",
    short: "Short",
    long: "Long",
    mode: "Mode",
    enterImmersive: "Immersive",
    exitImmersive: "Exit immersive",
    more: "More",
    performance: "Performance",
    library: "Library",
    appreciation: "Listen",
    songLibrary: "Piano Library",
    libraryIntro: "Keep playing along on your keyboard while the song performs",
    available: "Ready to play",
    needsMidi: "Licensed MIDI required",
    imported: "Local MIDI ready",
    importMidi: "Import licensed MIDI",
    localOnly: "The file is parsed only in this browser and is never uploaded",
    publicDomain: "Public domain · Mutopia Project",
    play: "Play",
    pause: "Pause",
    previous: "Previous",
    next: "Next",
    loop: "Loop",
    speed: "Speed",
    openPerformance: "Performance info",
    closeLibrary: "Close library",
    midiRequired: "Import a MIDI file you have permission to use first",
    midiLoaded: "Local MIDI imported and ready to play",
    midiInvalid: "This MIDI file could not be parsed. Try another file.",
    songLoading: "Preparing the song…",
    songPlaying: "Now playing",
    songPaused: "Song paused",
    songFinished: "Song finished",
    controls: "Performance controls",
    startEngine: "Click to enable the audio engine",
    immersiveMode: "Immersive mode",
    immersiveNotice: "Only piano keys, Space, Numpad + and Left Alt respond",
    closePerformance: "Close performance information",
    recentSchedule: "Latest JS schedule",
    p95: "120-event P95",
    baseLatency: "Browser base latency",
    outputLatency: "Output latency",
    sampleRate: "Sample rate",
    currentAction: "Current action",
    performanceNote: "Sound is always scheduled before visual particles. Bluetooth devices still add hardware latency.",
    instrumentLabel: "switchable six-octave sampled piano keyboard with glowing note particles",
    liveInfo: "Live performance information",
    schedule: "Schedule",
    currentNote: "Current note",
    extendedRange: "Extended range",
    lowRange: "Low register",
    midRange: "Middle register",
    highRange: "High register",
    currentPlayable: "playable now",
    waitingSwitch: "switch to play",
    current: "active",
    extendedHint: "Extended range",
    lowHint: "Low register",
    headphoneHint: "Wired headphones are recommended for the best experience",
    waitingSource: "Load the current sound source to begin",
    languageChanged: "English interface enabled",
  },
} as const;

const SAMPLE_BANKS: Record<SampleBankKey, SampleBank> = {
  acoustic: {
    basePath: "/audio/piano",
    samples: [
      { midi: 24, file: "C1.mp3" }, { midi: 27, file: "Ds1.mp3" },
      { midi: 30, file: "Fs1.mp3" }, { midi: 33, file: "A1.mp3" },
      { midi: 36, file: "C2.mp3" }, { midi: 39, file: "Ds2.mp3" },
      { midi: 42, file: "Fs2.mp3" }, { midi: 45, file: "A2.mp3" },
      { midi: 48, file: "C3.mp3" }, { midi: 51, file: "Ds3.mp3" },
      { midi: 54, file: "Fs3.mp3" }, { midi: 57, file: "A3.mp3" },
      { midi: 60, file: "C4.mp3" }, { midi: 63, file: "Ds4.mp3" },
      { midi: 66, file: "Fs4.mp3" }, { midi: 69, file: "A4.mp3" },
      { midi: 72, file: "C5.mp3" }, { midi: 75, file: "Ds5.mp3" },
      { midi: 78, file: "Fs5.mp3" }, { midi: 81, file: "A5.mp3" },
      { midi: 84, file: "C6.mp3" }, { midi: 87, file: "Ds6.mp3" },
      { midi: 90, file: "Fs6.mp3" }, { midi: 93, file: "A6.mp3" },
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
  { id: "acoustic", label: { zh: "原声", en: "Acoustic" }, detail: { zh: "音乐厅钢琴", en: "Concert grand" }, bank: "acoustic", gain: 0.82 },
  { id: "bright", label: { zh: "明亮", en: "Bright" }, detail: { zh: "清亮钢琴", en: "Brilliant piano" }, bank: "acoustic", gain: 0.74 },
  { id: "violin", label: { zh: "小提琴", en: "Violin" }, detail: { zh: "温暖弓弦", en: "Warm bowed strings" }, bank: "violin", gain: 0.56 },
  { id: "guitar", label: { zh: "钢丝弦吉他", en: "Steel-string guitar" }, detail: { zh: "清脆拨弦", en: "Crisp plucked strings" }, bank: "guitar", gain: 0.72 },
  { id: "saxophone", label: { zh: "萨克斯", en: "Saxophone" }, detail: { zh: "醇厚管乐", en: "Mellow brass" }, bank: "saxophone", gain: 0.54 },
];

const SCENE_OPTIONS: SceneOption[] = [
  { id: "coast", label: { zh: "沧海听风", en: "Sea Breeze" }, detail: { zh: "海风与暖阳", en: "Ocean air & warm sunlight" }, icon: "☀", image: "/scenes/coast-video-poster.jpg", video: "/video-scenes/coast.mp4", videoPosition: "50% 58%" },
  { id: "forest", label: { zh: "山湖静语", en: "Alpine Stillness" }, detail: { zh: "湖面与雪峰", en: "Lake & snow peaks" }, icon: "☘", image: "/scenes/mountain-lake-video-poster.jpg", video: "/video-scenes/mountain-lake.mp4", videoPosition: "50% 62%" },
  { id: "rain", label: { zh: "雨夜伴灯", en: "Rainlight Night" }, detail: { zh: "雨幕与暖灯", en: "Rainfall & lamplight" }, icon: "☂", image: "/scenes/rain-night-video-poster.jpg", video: "/video-scenes/rain-night.mp4", videoPosition: "50% 58%" },
  { id: "stars", label: { zh: "暮光之城", en: "City at Dusk" }, detail: { zh: "落日与灯火", en: "Sunset & city lights" }, icon: "✦", image: "/scenes/twilight-city-video-poster.jpg", video: "/video-scenes/twilight-city.mp4", videoPosition: "50% 58%" },
];

const LIBRARY_SONGS: LibrarySong[] = [
  {
    id: "merry-christmas-mr-lawrence",
    title: { zh: "圣诞快乐，劳伦斯先生", en: "Merry Christmas, Mr. Lawrence" },
    composer: { zh: "坂本龙一", en: "Ryuichi Sakamoto" },
    color: "#d7b78a",
  },
  {
    id: "dandelions-promise",
    title: { zh: "蒲公英的约定", en: "Dandelion's Promise" },
    composer: { zh: "周杰伦", en: "Jay Chou" },
    color: "#d9e59a",
  },
  {
    id: "fur-elise",
    title: { zh: "致爱丽丝", en: "Für Elise" },
    composer: { zh: "路德维希·范·贝多芬", en: "Ludwig van Beethoven" },
    color: "#e9c36b",
    midiUrl: "/midi/fur-elise.mid",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931",
    license: "Public Domain",
  },
  {
    id: "truth-that-you-leave",
    title: { zh: "你离开的事实", en: "The Truth That You Leave" },
    composer: { zh: "Pianoboy", en: "Pianoboy" },
    color: "#9fbfd9",
  },
  {
    id: "call-of-silence",
    title: { zh: "Call of Silence", en: "Call of Silence" },
    composer: { zh: "泽野弘之", en: "Hiroyuki Sawano" },
    color: "#a6a1d8",
  },
];

const TIMBRE_BY_ID = new Map(TIMBRE_OPTIONS.map((option) => [option.id, option]));
const SCENE_BY_ID = new Map(SCENE_OPTIONS.map((option) => [option.id, option]));
const SONG_BY_ID = new Map(LIBRARY_SONGS.map((song) => [song.id, song]));
const WHITE_KEY_INDEX = new Map([[0, 0], [2, 1], [4, 2], [5, 3], [7, 4], [9, 5], [11, 6]]);
const BLACK_KEY_BOUNDARY = new Map([[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]]);

function keyToMidi(key: KeyDefinition, lowOctave: 2 | 3, extremeOctave: 1 | 6) {
  const octave = key.group === "extreme" ? extremeOctave : key.group === "low" ? lowOctave : key.group === "mid" ? 4 : 5;
  return 12 * (octave + 1) + key.semitone;
}

function keyToNote(key: KeyDefinition, lowOctave: 2 | 3, extremeOctave: 1 | 6) {
  const octave = key.group === "extreme" ? extremeOctave : key.group === "low" ? lowOctave : key.group === "mid" ? 4 : 5;
  return `${NOTE_NAMES[key.semitone]}${octave}`;
}

function keyDisplayLabel(key: KeyDefinition, locale: Locale) {
  return key.code === "Backspace" ? (locale === "zh" ? "删除" : "Bksp") : key.label;
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

async function parseMidiBuffer(buffer: ArrayBuffer): Promise<ParsedSong> {
  const { Midi } = await import("@tonejs/midi");
  const midi = new Midi(buffer);
  const notes = midi.tracks
    .flatMap((track) => track.notes.map((note) => ({
      midi: note.midi,
      startSeconds: note.time,
      durationSeconds: Math.max(note.duration, 0.06),
      velocity: Math.max(0.12, note.velocity),
    })))
    .sort((a, b) => a.startSeconds - b.startSeconds || a.midi - b.midi);
  return { notes, duration: Math.max(midi.duration, notes.at(-1)?.startSeconds ?? 0) };
}

function formatPlaybackTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
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
  enabled = true,
  locale,
  autoMidis,
}: {
  title: string;
  octave: number;
  keys: KeyDefinition[];
  activeCodes: Set<string>;
  enabled?: boolean;
  locale: Locale;
  autoMidis: Set<number>;
}) {
  const copy = UI_COPY[locale];
  const naturals = keys.filter((key) => !key.accidental);
  const accidentals = keys.filter((key) => key.accidental);

  return (
    <section
      className={`piano-octave ${enabled ? "enabled" : "inactive"}`}
      aria-label={locale === "zh"
        ? `${title} C${octave} 到 B${octave}，${enabled ? copy.currentPlayable : copy.waitingSwitch}`
        : `${title} C${octave} to B${octave}, ${enabled ? copy.currentPlayable : copy.waitingSwitch}`}
    >
      <div className="white-keys">
        {naturals.map((key) => (
          <div className={`piano-key white ${enabled && activeCodes.has(key.code) ? "active" : ""} ${autoMidis.has(12 * (octave + 1) + key.semitone) ? "auto-active" : ""}`} key={key.code} data-key-code={key.code}>
            <div className="piano-key-label">
              <kbd>{keyDisplayLabel(key, locale)}</kbd>
              <span>{NOTE_NAMES[key.semitone]}{octave}</span>
            </div>
          </div>
        ))}
      </div>
      {accidentals.map((key) => (
        <div
          className={`piano-key black ${enabled && activeCodes.has(key.code) ? "active" : ""} ${autoMidis.has(12 * (octave + 1) + key.semitone) ? "auto-active" : ""}`}
          key={key.code}
          data-key-code={key.code}
          style={{ left: blackKeyLeft(key.semitone) }}
        >
          <div className="piano-key-label">
            <kbd>{keyDisplayLabel(key, locale)}</kbd>
            <span>{NOTE_NAMES[key.semitone]}{octave}</span>
          </div>
        </div>
      ))}
      <div className="octave-caption">C{octave}—B{octave} · {enabled ? copy.current : copy.waitingSwitch}</div>
    </section>
  );
}

export default function Home() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sampleLibrariesRef = useRef(new Map<SampleBankKey, Map<number, AudioBuffer>>());
  const voicesRef = useRef(new Map<string, Voice>());
  const autoVoicesRef = useRef(new Map<string, Voice>());
  const autoMidiCountsRef = useRef(new Map<number, number>());
  const autoVisualTimersRef = useRef<number[]>([]);
  const autoSchedulerRef = useRef<number | null>(null);
  const parsedSongsRef = useRef(new Map<SongId, ParsedSong>());
  const playbackRef = useRef({ notes: [] as SongNote[], nextIndex: 0, offset: 0, startedAt: 0, duration: 0, speed: 1 });
  const loopSongRef = useRef(false);
  const activeCodesRef = useRef(new Set<string>());
  const particleLayerRef = useRef<HTMLDivElement | null>(null);
  const controlDockRef = useRef<HTMLElement | null>(null);
  const midiInputRef = useRef<HTMLInputElement | null>(null);
  const lowOctaveRef = useRef<2 | 3>(2);
  const extremeOctaveRef = useRef<1 | 6>(1);
  const articulationRef = useRef<Articulation>("short");
  const timbreRef = useRef<Timbre>("acoustic");
  const localeRef = useRef<Locale>("zh");
  const immersiveModeRef = useRef(false);
  const fullscreenEnteredRef = useRef(false);
  const measurementsRef = useRef<number[]>([]);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [sampleProgress, setSampleProgress] = useState(0);
  const [sampleTotal, setSampleTotal] = useState(SAMPLE_BANKS.acoustic.samples.length);
  const [lowOctave, setLowOctave] = useState<2 | 3>(2);
  const [extremeOctave, setExtremeOctave] = useState<1 | 6>(1);
  const [articulation, setArticulation] = useState<Articulation>("short");
  const [timbre, setTimbre] = useState<Timbre>("acoustic");
  const [scene, setScene] = useState<SceneId>("coast");
  const [locale, setLocale] = useState<Locale>("zh");
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [readyVideoScene, setReadyVideoScene] = useState<SceneId | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<SongId>("fur-elise");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopSong, setLoopSong] = useState(false);
  const [autoMidis, setAutoMidis] = useState<Set<number>>(new Set());
  const [importedSongIds, setImportedSongIds] = useState<Set<SongId>>(new Set());
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [lastNote, setLastNote] = useState(UI_COPY.zh.waitingSource);
  const [lastScheduleMs, setLastScheduleMs] = useState(0);
  const [p95ScheduleMs, setP95ScheduleMs] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AudioDiagnostics | null>(null);

  const releaseVoice = useCallback((code: string, forcedRelease?: number) => {
    const context = audioContextRef.current;
    const voice = voicesRef.current.get(code);
    if (!context || !voice) return;

    const isPlayedNoteRelease = forcedRelease === undefined;
    const isLongRelease = articulationRef.current === "long";
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    if (isPlayedNoteRelease) {
      const timeConstant = isLongRelease ? LONG_RELEASE_TIME_CONSTANT_SECONDS : SHORT_RELEASE_TIME_CONSTANT_SECONDS;
      const stopAfter = isLongRelease ? LONG_RELEASE_STOP_SECONDS : SHORT_RELEASE_STOP_SECONDS;
      voice.gain.gain.setTargetAtTime(0.0001, now, timeConstant);
      voice.source.stop(now + stopAfter);
    } else {
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + forcedRelease);
      voice.source.stop(now + forcedRelease + 0.05);
    }
    voicesRef.current.delete(code);
  }, []);

  const releaseAll = useCallback((releaseSeconds = 0.08) => {
    [...voicesRef.current.keys()].forEach((code) => releaseVoice(code, releaseSeconds));
    activeCodesRef.current.clear();
    setActiveCodes(new Set());
  }, [releaseVoice]);

  const toggleArticulation = useCallback(() => {
    const next = articulationRef.current === "short" ? "long" : "short";
    const currentLocale = localeRef.current;
    const copy = UI_COPY[currentLocale];
    articulationRef.current = next;
    setArticulation(next);
    setLastNote(currentLocale === "zh"
      ? `已切换到${next === "long" ? copy.long : copy.short}模式`
      : `Note length switched to ${next === "long" ? copy.long : copy.short}`);
  }, []);

  const emitNoteLight = useCallback((globalX: number, automatic = false) => {
    const layer = particleLayerRef.current;
    if (!layer) return;
    const count = automatic ? 5 : 9;
    const rise = Math.max(layer.clientHeight - 18, 280);

    Array.from({ length: count }).forEach((_, index) => {
      const spark = document.createElement("i");
      const size = index === 0 ? 9 : 3.5 + Math.random() * 4.5;
      spark.className = `note-spark ${index === 0 ? "note-core" : ""} ${automatic ? "auto-spark" : ""}`;
      spark.style.left = `calc(${globalX}% + ${(Math.random() - 0.5) * 28}px)`;
      spark.style.setProperty("--spark-size", `${size}px`);
      spark.style.setProperty("--spark-drift", `${(Math.random() - 0.5) * 100}px`);
      spark.style.setProperty("--spark-rise", `${rise}px`);
      spark.style.setProperty("--spark-duration", `${2.45 + Math.random() * 0.55}s`);
      spark.style.setProperty("--spark-delay", `${index * 32}ms`);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
      layer.appendChild(spark);
    });

    while (layer.childElementCount > 180) layer.firstElementChild?.remove();
  }, []);

  const spawnNoteLight = useCallback((key: KeyDefinition) => {
    const groupIndex = key.group === "extreme"
      ? (extremeOctaveRef.current === 1 ? 0 : 5)
      : key.group === "low"
        ? (lowOctaveRef.current === 2 ? 1 : 2)
        : key.group === "mid"
          ? 3
          : 4;
    const localX = key.accidental
      ? (BLACK_KEY_BOUNDARY.get(key.semitone) ?? 0) / 7
      : ((WHITE_KEY_INDEX.get(key.semitone) ?? 0) + 0.5) / 7;
    emitNoteLight(((groupIndex + localX) / 6) * 100);
  }, [emitNoteLight]);

  const spawnAutoNoteLight = useCallback((midi: number) => {
    const octave = Math.floor(midi / 12) - 1;
    if (octave < 1 || octave > 6) return;
    const semitone = midi % 12;
    const localX = BLACK_KEY_BOUNDARY.has(semitone)
      ? (BLACK_KEY_BOUNDARY.get(semitone) ?? 0) / 7
      : ((WHITE_KEY_INDEX.get(semitone) ?? 0) + 0.5) / 7;
    emitNoteLight((((octave - 1) + localX) / 6) * 100, true);
  }, [emitNoteLight]);

  const startVoice = useCallback((code: string, key: KeyDefinition, eventStartedAt: number) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    const currentTimbre = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
    const bank = SAMPLE_BANKS[currentTimbre.bank];
    const buffers = sampleLibrariesRef.current.get(currentTimbre.bank);
    if (!context || !master || !buffers || context.state !== "running") return false;

    const midi = keyToMidi(key, lowOctaveRef.current, extremeOctaveRef.current);
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
    spawnNoteLight(key);

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
    const currentLocale = localeRef.current;
    const copy = UI_COPY[currentLocale];
    setLastNote(`${keyToNote(key, lowOctaveRef.current, extremeOctaveRef.current)} · ${keyDisplayLabel(key, currentLocale)} · ${currentTimbre.label[currentLocale]} · ${articulationRef.current === "long" ? copy.long : copy.short}`);
    return true;
  }, [spawnNoteLight]);

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
    const currentLocale = localeRef.current;
    const timbreLabel = currentTimbre.label[currentLocale];
    try {
      await ensureSampleBank(context, currentTimbre.bank);
    } catch {
      setAudioStatus("error");
      setIsAudioReady(false);
      setLastNote(currentLocale === "zh"
        ? `${timbreLabel}音源加载失败，请检查网络后重试`
        : `${timbreLabel} source failed to load. Check your connection and retry.`);
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
    setLastNote(currentLocale === "zh"
      ? (running ? `${timbreLabel}音色已就绪，可以弹奏` : "音源已加载，请再次点击启动音频")
      : (running ? `${timbreLabel} is ready to play` : "Source loaded. Click again to start audio."));
  }, [ensureSampleBank]);

  const clearAutoVisuals = useCallback(() => {
    autoVisualTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    autoVisualTimersRef.current = [];
    autoMidiCountsRef.current.clear();
    setAutoMidis(new Set());
  }, []);

  const stopAutoSources = useCallback(() => {
    const context = audioContextRef.current;
    const now = context?.currentTime ?? 0;
    autoVoicesRef.current.forEach((voice) => {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        voice.source.stop(now + 0.05);
      } catch {
        // A source that already ended needs no further cleanup.
      }
    });
    autoVoicesRef.current.clear();
    clearAutoVisuals();
  }, [clearAutoVisuals]);

  const stopAutoScheduler = useCallback(() => {
    if (autoSchedulerRef.current !== null) {
      window.clearInterval(autoSchedulerRef.current);
      autoSchedulerRef.current = null;
    }
  }, []);

  const currentPlaybackPosition = useCallback(() => {
    const context = audioContextRef.current;
    const playback = playbackRef.current;
    if (!context || !playback.startedAt) return playback.offset;
    return Math.min(playback.duration, playback.offset + (context.currentTime - playback.startedAt) * playback.speed);
  }, []);

  const scheduleAutoNote = useCallback((note: SongNote, when: number, speed: number, noteId: string) => {
    const context = audioContextRef.current;
    const master = masterGainRef.current;
    const currentTimbre = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
    const bank = SAMPLE_BANKS[currentTimbre.bank];
    const buffers = sampleLibrariesRef.current.get(currentTimbre.bank);
    if (!context || !master || !buffers || context.state !== "running") return;
    const sample = nearestSample(note.midi, buffers, bank.samples);
    if (!sample) return;

    const startAt = Math.max(when, context.currentTime + 0.002);
    const soundingDuration = Math.max(0.08, note.durationSeconds / speed);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = sample.buffer;
    source.playbackRate.setValueAtTime(sample.playbackRate, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(currentTimbre.gain * note.velocity * 0.72, startAt + 0.008);
    gain.gain.setTargetAtTime(0.0001, startAt + soundingDuration * 0.82, 0.42);
    source.connect(gain);

    if (timbreRef.current === "bright") {
      const brightness = context.createBiquadFilter();
      brightness.type = "highshelf";
      brightness.frequency.setValueAtTime(1800, startAt);
      brightness.gain.setValueAtTime(5.5, startAt);
      gain.connect(brightness);
      brightness.connect(master);
    } else {
      gain.connect(master);
    }

    source.start(startAt);
    source.stop(startAt + soundingDuration + 2.4);
    const voice = { source, gain };
    autoVoicesRef.current.set(noteId, voice);
    source.onended = () => autoVoicesRef.current.delete(noteId);

    const visualDelay = Math.max(0, (startAt - context.currentTime) * 1000);
    const visualOn = window.setTimeout(() => {
      autoMidiCountsRef.current.set(note.midi, (autoMidiCountsRef.current.get(note.midi) ?? 0) + 1);
      setAutoMidis((current) => new Set(current).add(note.midi));
      spawnAutoNoteLight(note.midi);
    }, visualDelay);
    const visualOff = window.setTimeout(() => {
      const remaining = Math.max(0, (autoMidiCountsRef.current.get(note.midi) ?? 1) - 1);
      if (remaining > 0) {
        autoMidiCountsRef.current.set(note.midi, remaining);
      } else {
        autoMidiCountsRef.current.delete(note.midi);
        setAutoMidis((current) => {
          const next = new Set(current);
          next.delete(note.midi);
          return next;
        });
      }
    }, visualDelay + Math.max(90, soundingDuration * 1000));
    autoVisualTimersRef.current.push(visualOn, visualOff);
  }, [spawnAutoNoteLight]);

  const loadLibrarySong = useCallback(async (song: LibrarySong) => {
    const cached = parsedSongsRef.current.get(song.id);
    if (cached) return cached;
    if (!song.midiUrl) return null;
    const response = await fetch(song.midiUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Unable to load ${song.id}`);
    const parsed = await parseMidiBuffer(await response.arrayBuffer());
    parsedSongsRef.current.set(song.id, parsed);
    return parsed;
  }, []);

  const beginLibraryPlayback = useCallback(async (offset?: number, speedOverride?: number) => {
    const song = SONG_BY_ID.get(selectedSongId) ?? LIBRARY_SONGS[0];
    const copy = UI_COPY[localeRef.current];
    const chosenSpeed = speedOverride ?? playbackSpeed;
    const chosenOffset = Math.max(0, offset ?? playbackRef.current.offset);
    setPlaybackState("loading");
    setLastNote(`${copy.songLoading} · ${song.title[localeRef.current]}`);

    let parsed: ParsedSong | null;
    try {
      parsed = await loadLibrarySong(song);
    } catch {
      setPlaybackState("idle");
      setLastNote(copy.midiInvalid);
      return;
    }
    if (!parsed) {
      setPlaybackState("idle");
      setLastNote(copy.midiRequired);
      return;
    }

    await initializeAudio();
    const context = audioContextRef.current;
    const currentTimbre = TIMBRE_BY_ID.get(timbreRef.current) ?? TIMBRE_OPTIONS[0];
    if (!context || !sampleLibrariesRef.current.has(currentTimbre.bank) || context.state !== "running") {
      setPlaybackState("paused");
      return;
    }

    stopAutoScheduler();
    stopAutoSources();
    const safeOffset = Math.min(chosenOffset, parsed.duration);
    playbackRef.current = {
      notes: parsed.notes,
      nextIndex: parsed.notes.findIndex((note) => note.startSeconds >= safeOffset - 0.02),
      offset: safeOffset,
      startedAt: context.currentTime,
      duration: parsed.duration,
      speed: chosenSpeed,
    };
    if (playbackRef.current.nextIndex < 0) playbackRef.current.nextIndex = parsed.notes.length;
    setTrackDuration(parsed.duration);
    setPlaybackSeconds(safeOffset);
    setPlaybackState("playing");
    setLastNote(`${copy.songPlaying} · ${song.title[localeRef.current]}`);

    const tick = () => {
      const liveContext = audioContextRef.current;
      if (!liveContext) return;
      const playback = playbackRef.current;
      const position = Math.min(playback.duration, playback.offset + (liveContext.currentTime - playback.startedAt) * playback.speed);
      setPlaybackSeconds(position);
      const songHorizon = position + 0.16 * playback.speed;
      while (playback.nextIndex < playback.notes.length && playback.notes[playback.nextIndex].startSeconds <= songHorizon) {
        const noteIndex = playback.nextIndex;
        const note = playback.notes[noteIndex];
        const audioWhen = liveContext.currentTime + Math.max(0, (note.startSeconds - position) / playback.speed);
        scheduleAutoNote(note, audioWhen, playback.speed, `${song.id}:${noteIndex}:${playback.startedAt}`);
        playback.nextIndex += 1;
      }
      if (position >= playback.duration) {
        if (loopSongRef.current) {
          stopAutoSources();
          playback.offset = 0;
          playback.startedAt = liveContext.currentTime + 0.12;
          playback.nextIndex = 0;
          setPlaybackSeconds(0);
        } else {
          stopAutoScheduler();
          stopAutoSources();
          playback.offset = 0;
          playback.startedAt = 0;
          setPlaybackState("idle");
          setLastNote(`${copy.songFinished} · ${song.title[localeRef.current]}`);
        }
      }
    };
    autoSchedulerRef.current = window.setInterval(tick, 25);
    tick();
  }, [initializeAudio, loadLibrarySong, playbackSpeed, scheduleAutoNote, selectedSongId, stopAutoScheduler, stopAutoSources]);

  const pauseLibraryPlayback = useCallback(() => {
    const position = currentPlaybackPosition();
    playbackRef.current.offset = position;
    playbackRef.current.startedAt = 0;
    stopAutoScheduler();
    stopAutoSources();
    setPlaybackSeconds(position);
    setPlaybackState("paused");
    const song = SONG_BY_ID.get(selectedSongId) ?? LIBRARY_SONGS[0];
    setLastNote(`${UI_COPY[localeRef.current].songPaused} · ${song.title[localeRef.current]}`);
  }, [currentPlaybackPosition, selectedSongId, stopAutoScheduler, stopAutoSources]);

  const resetLibraryPlayback = useCallback(() => {
    stopAutoScheduler();
    stopAutoSources();
    playbackRef.current.offset = 0;
    playbackRef.current.startedAt = 0;
    playbackRef.current.nextIndex = 0;
    setPlaybackSeconds(0);
    setPlaybackState("idle");
  }, [stopAutoScheduler, stopAutoSources]);

  const chooseLibrarySong = useCallback((songId: SongId) => {
    resetLibraryPlayback();
    setSelectedSongId(songId);
    const parsed = parsedSongsRef.current.get(songId);
    setTrackDuration(parsed?.duration ?? 0);
  }, [resetLibraryPlayback]);

  const moveLibrarySong = useCallback((direction: -1 | 1) => {
    const currentIndex = LIBRARY_SONGS.findIndex((song) => song.id === selectedSongId);
    const nextIndex = (currentIndex + direction + LIBRARY_SONGS.length) % LIBRARY_SONGS.length;
    chooseLibrarySong(LIBRARY_SONGS[nextIndex].id);
  }, [chooseLibrarySong, selectedSongId]);

  const changePlaybackSpeed = useCallback((nextSpeed: number) => {
    const wasPlaying = playbackState === "playing";
    const position = wasPlaying ? currentPlaybackPosition() : playbackRef.current.offset;
    stopAutoScheduler();
    stopAutoSources();
    playbackRef.current.offset = position;
    playbackRef.current.startedAt = 0;
    playbackRef.current.speed = nextSpeed;
    setPlaybackSpeed(nextSpeed);
    setPlaybackSeconds(position);
    setPlaybackState(wasPlaying ? "loading" : "paused");
    if (wasPlaying) void beginLibraryPlayback(position, nextSpeed);
  }, [beginLibraryPlayback, currentPlaybackPosition, playbackState, stopAutoScheduler, stopAutoSources]);

  const seekLibraryPlayback = useCallback((nextPosition: number) => {
    const wasPlaying = playbackState === "playing";
    stopAutoScheduler();
    stopAutoSources();
    playbackRef.current.offset = nextPosition;
    playbackRef.current.startedAt = 0;
    setPlaybackSeconds(nextPosition);
    setPlaybackState(wasPlaying ? "loading" : "paused");
    if (wasPlaying) void beginLibraryPlayback(nextPosition);
  }, [beginLibraryPlayback, playbackState, stopAutoScheduler, stopAutoSources]);

  const importLibraryMidi = useCallback(async (file: File | null) => {
    if (!file) return;
    const copy = UI_COPY[localeRef.current];
    try {
      const parsed = await parseMidiBuffer(await file.arrayBuffer());
      if (!parsed.notes.length) throw new Error("Empty MIDI");
      parsedSongsRef.current.set(selectedSongId, parsed);
      setImportedSongIds((current) => new Set(current).add(selectedSongId));
      setTrackDuration(parsed.duration);
      setPlaybackSeconds(0);
      playbackRef.current.offset = 0;
      setLastNote(copy.midiLoaded);
    } catch {
      setLastNote(copy.midiInvalid);
    }
  }, [selectedSongId]);

  const selectTimbre = useCallback(async (next: Timbre) => {
    if (next === timbreRef.current || audioStatus === "loading") return;
    releaseAll(0.06);
    timbreRef.current = next;
    setTimbre(next);
    const option = TIMBRE_BY_ID.get(next) ?? TIMBRE_OPTIONS[0];
    const currentLocale = localeRef.current;
    const optionLabel = option.label[currentLocale];
    const context = audioContextRef.current;

    if (!context) {
      setIsAudioReady(false);
      setAudioStatus("idle");
      setLastNote(currentLocale === "zh"
        ? `已选择${optionLabel}，点击右上角加载音源`
        : `${optionLabel} selected. Use the top-right control to load it.`);
      return;
    }

    await context.resume().catch(() => undefined);
    try {
      await ensureSampleBank(context, option.bank);
    } catch {
      setAudioStatus("error");
      setIsAudioReady(false);
      setLastNote(currentLocale === "zh" ? `${optionLabel}音源加载失败，请重试` : `${optionLabel} source failed to load. Please retry.`);
      return;
    }

    const running = context.state === "running";
    setIsAudioReady(running);
    setAudioStatus(running ? "running" : "suspended");
    setLastNote(currentLocale === "zh"
      ? (running ? `已切换到${optionLabel}音色` : `${optionLabel}已加载，点击右上角恢复音频`)
      : (running ? `Switched to ${optionLabel}` : `${optionLabel} loaded. Use the top-right control to resume audio.`));
  }, [audioStatus, ensureSampleBank, releaseAll]);

  const selectScene = useCallback((next: SceneId) => {
    const option = SCENE_BY_ID.get(next) ?? SCENE_OPTIONS[0];
    const currentLocale = localeRef.current;
    setScene(next);
    setOpenMenu(null);
    particleLayerRef.current?.replaceChildren();
    setLastNote(currentLocale === "zh"
      ? `已进入${option.label.zh} · ${option.detail.zh}`
      : `Entered ${option.label.en} · ${option.detail.en}`);
  }, []);

  const changeLocale = useCallback((next: Locale, announce = true) => {
    localeRef.current = next;
    setLocale(next);
    setOpenMenu(null);
    try {
      window.localStorage.setItem("melovista-locale", next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(null, "", url);
    } catch {
      // Language switching still works when storage or URL access is restricted.
    }
    if (announce) setLastNote(UI_COPY[next].languageChanged);
  }, []);

  useEffect(() => {
    const queryLocale = new URLSearchParams(window.location.search).get("lang");
    let savedLocale: string | null = null;
    try {
      savedLocale = window.localStorage.getItem("melovista-locale");
    } catch {
      savedLocale = null;
    }
    const browserLocale: Locale = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
    const nextLocale: Locale = queryLocale === "zh" || queryLocale === "en"
      ? queryLocale
      : savedLocale === "zh" || savedLocale === "en"
        ? savedLocale
        : browserLocale;
    const localeTimer = window.setTimeout(() => {
      localeRef.current = nextLocale;
      setLocale(nextLocale);
      setLastNote(UI_COPY[nextLocale].waitingSource);
    }, 0);
    return () => window.clearTimeout(localeTimer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = UI_COPY[locale].documentTitle;
  }, [locale]);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      SCENE_OPTIONS.slice(1).forEach((option) => {
        const preload = new Image();
        preload.src = option.image;
      });
    }, 800);
    return () => window.clearTimeout(preloadTimer);
  }, []);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!controlDockRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    immersiveModeRef.current = false;
    fullscreenEnteredRef.current = false;
    setImmersiveMode(false);
    releaseAll(0.06);
    (navigator as KeyboardLockNavigator).keyboard?.unlock?.();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    setLastNote(localeRef.current === "zh" ? "已退出沉浸模式，快捷控制恢复" : "Immersive mode closed. All shortcuts are available again.");
  }, [releaseAll]);

  const enterImmersiveMode = useCallback(async () => {
    releaseAll(0.06);
    immersiveModeRef.current = true;
    setImmersiveMode(true);
    setLastNote(localeRef.current === "zh"
      ? "沉浸模式已开启：仅琴键与演奏控制响应"
      : "Immersive mode enabled: only piano keys and performance controls respond");

    try {
      await document.documentElement.requestFullscreen({
        navigationUI: "hide",
        keyboardLock: "browser",
      } as ImmersiveFullscreenOptions);
      fullscreenEnteredRef.current = Boolean(document.fullscreenElement);
    } catch {
      fullscreenEnteredRef.current = false;
    }

    if (fullscreenEnteredRef.current) {
      await (navigator as KeyboardLockNavigator).keyboard?.lock?.().catch(() => undefined);
    }
  }, [releaseAll]);

  const toggleImmersiveMode = useCallback(() => {
    if (immersiveModeRef.current) {
      void exitImmersiveMode();
    } else {
      void enterImmersiveMode();
    }
  }, [enterImmersiveMode, exitImmersiveMode]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateVideoPreference = () => setVideoEnabled(!reducedMotion.matches);
    updateVideoPreference();
    reducedMotion.addEventListener("change", updateVideoPreference);
    return () => reducedMotion.removeEventListener("change", updateVideoPreference);
  }, []);

  useEffect(() => () => {
    if (autoSchedulerRef.current !== null) window.clearInterval(autoSchedulerRef.current);
    autoVisualTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    autoVoicesRef.current.forEach((voice) => {
      try {
        voice.source.stop();
      } catch {
        // Already-ended voices need no cleanup.
      }
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (immersiveModeRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!KEY_BY_CODE.has(event.code) && !IMMERSIVE_CONTROL_CODES.has(event.code)) return;
      }

      const target = event.target as HTMLElement | null;
      if (!immersiveModeRef.current && target?.matches("input, textarea, select, [contenteditable='true']")) return;

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
        setLastNote(localeRef.current === "zh"
          ? `低音区已切换到 C${nextOctave} — B${nextOctave}`
          : `Low register switched to C${nextOctave} — B${nextOctave}`);
        return;
      }

      if (event.code === "NumpadAdd") {
        event.preventDefault();
        if (event.repeat) return;
        EXTREME_KEYS.forEach((key) => {
          releaseVoice(key.code, 0.08);
          activeCodesRef.current.delete(key.code);
        });
        const nextOctave = extremeOctaveRef.current === 1 ? 6 : 1;
        extremeOctaveRef.current = nextOctave;
        setExtremeOctave(nextOctave);
        setActiveCodes(new Set(activeCodesRef.current));
        setLastNote(localeRef.current === "zh"
          ? `扩展音区已切换到 C${nextOctave} — B${nextOctave}`
          : `Extended range switched to C${nextOctave} — B${nextOctave}`);
        return;
      }

      const key = KEY_BY_CODE.get(event.code);
      if (!key) return;
      event.preventDefault();
      if (event.repeat || activeCodesRef.current.has(event.code)) return;

      const eventStartedAt = performance.now();
      activeCodesRef.current.add(event.code);
      const started = startVoice(event.code, key, eventStartedAt);
      if (!started) setLastNote(localeRef.current === "zh"
        ? `${keyToNote(key, lowOctaveRef.current, extremeOctaveRef.current)} · 请先加载并启动当前音源`
        : `${keyToNote(key, lowOctaveRef.current, extremeOctaveRef.current)} · Load and start the current sound source first`);
      setActiveCodes(new Set(activeCodesRef.current));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (immersiveModeRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!KEY_BY_CODE.has(event.code) && !IMMERSIVE_CONTROL_CODES.has(event.code)) return;
      }

      if (event.code === "Space" || event.code === "AltLeft" || event.code === "NumpadAdd") {
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
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && fullscreenEnteredRef.current && immersiveModeRef.current) {
        fullscreenEnteredRef.current = false;
        immersiveModeRef.current = false;
        setImmersiveMode(false);
        (navigator as KeyboardLockNavigator).keyboard?.unlock?.();
        releaseAll(0.06);
        setLastNote(localeRef.current === "zh"
          ? "全屏已退出，沉浸模式同步关闭"
          : "Fullscreen ended, so immersive mode was closed too");
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      (navigator as KeyboardLockNavigator).keyboard?.unlock?.();
      releaseAll(0.05);
    };
  }, [releaseAll, releaseVoice, startVoice, toggleArticulation]);

  const activeCodeSet = useMemo(() => activeCodes, [activeCodes]);
  const copy = UI_COPY[locale];
  const selectedTimbre = TIMBRE_BY_ID.get(timbre) ?? TIMBRE_OPTIONS[0];
  const selectedScene = SCENE_BY_ID.get(scene) ?? SCENE_OPTIONS[0];
  const selectedSong = SONG_BY_ID.get(selectedSongId) ?? LIBRARY_SONGS[0];
  const selectedTimbreLabel = selectedTimbre.label[locale];
  const selectedSceneLabel = selectedScene.label[locale];
  const selectedSongReady = Boolean(selectedSong.midiUrl || importedSongIds.has(selectedSong.id));
  const audioButtonText = audioStatus === "running"
    ? (locale === "zh" ? `${selectedTimbreLabel}已就绪` : `${selectedTimbreLabel} ready`)
    : audioStatus === "loading"
      ? (locale === "zh" ? `正在加载${selectedTimbreLabel} ${sampleProgress}/${sampleTotal}` : `Loading ${selectedTimbreLabel} ${sampleProgress}/${sampleTotal}`)
      : audioStatus === "starting"
        ? (locale === "zh" ? "正在启动音频…" : "Starting audio…")
        : audioStatus === "suspended"
          ? (locale === "zh" ? "音频已暂停，点击恢复" : "Audio paused · click to resume")
          : audioStatus === "error"
            ? (locale === "zh" ? "加载失败，点击重试" : "Load failed · click to retry")
            : (locale === "zh" ? `加载并启动${selectedTimbreLabel}` : `Load & start ${selectedTimbreLabel}`);

  return (
    <main className={`app-shell sunroom ${immersiveMode ? "immersive" : ""} ${activeCodes.size ? "playing" : ""}`} data-scene={scene} data-locale={locale}>
      <div className="scene-background" key={`poster-${scene}`} style={{ backgroundImage: `url(${selectedScene.image})` }} aria-hidden="true" />
      {videoEnabled && (
        <video
          className={`scene-video ${readyVideoScene === scene ? "ready" : ""}`}
          key={scene}
          src={selectedScene.video}
          poster={selectedScene.image}
          style={{ objectPosition: selectedScene.videoPosition }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          onCanPlay={() => setReadyVideoScene(scene)}
          aria-hidden="true"
        />
      )}
      <div className="scene-light" aria-hidden="true" />

      <header className="floating-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">≋</span>
          <div>
            <h1>{copy.brand}</h1>
            <p>{copy.tagline}</p>
          </div>
        </div>

        <nav className="control-dock" aria-label={copy.controls} ref={controlDockRef}>
          <div className="dock-menu-wrap scene-selector">
            <button className={`dock-button scene-item ${openMenu === "scene" ? "active" : ""}`} type="button" aria-haspopup="listbox" aria-expanded={openMenu === "scene"} onClick={() => setOpenMenu((current) => current === "scene" ? null : "scene")}>
              <span className="dock-icon" aria-hidden="true">{selectedScene.icon}</span>
              <span><small>{copy.scene}</small><b>{selectedSceneLabel}</b></span>
              <i className="dock-chevron" aria-hidden="true">⌄</i>
            </button>
            <div className={`glass-menu scene-menu ${openMenu === "scene" ? "open" : ""}`} role="listbox" aria-label={copy.chooseScene}>
              <div className="menu-heading"><small>SCENES</small><strong>{copy.chooseWindow}</strong></div>
              {SCENE_OPTIONS.map((option) => (
                <button className={scene === option.id ? "selected" : ""} type="button" role="option" aria-selected={scene === option.id} key={option.id} onClick={() => selectScene(option.id)}>
                  <i className="scene-thumb" style={{ backgroundImage: `url(${option.image})` }} aria-hidden="true" />
                  <span><strong>{option.label[locale]}</strong><small>{option.detail[locale]}</small></span>
                  <b aria-hidden="true">{scene === option.id ? "✓" : ""}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="dock-menu-wrap timbre-selector">
            <button className={`dock-button timbre-button ${openMenu === "timbre" ? "active" : ""}`} type="button" disabled={audioStatus === "loading"} aria-haspopup="listbox" aria-expanded={openMenu === "timbre"} onClick={() => setOpenMenu((current) => current === "timbre" ? null : "timbre")}>
              <span className="dock-icon" aria-hidden="true">♩</span>
              <span><small>{copy.timbre}</small><b>{selectedTimbreLabel}</b></span>
              <i className="dock-chevron" aria-hidden="true">⌄</i>
            </button>
            <div className={`glass-menu timbre-menu ${openMenu === "timbre" ? "open" : ""}`} role="listbox" aria-label={copy.chooseTimbre}>
              <div className="menu-heading"><small>TIMBRE</small><strong>{copy.chooseInstrument}</strong></div>
              {TIMBRE_OPTIONS.map((option) => (
                <button className={timbre === option.id ? "selected" : ""} type="button" role="option" aria-selected={timbre === option.id} key={option.id} onClick={() => { setOpenMenu(null); void selectTimbre(option.id); }}>
                  <i className="timbre-orb" aria-hidden="true">{option.id === "acoustic" || option.id === "bright" ? "♩" : option.id === "violin" ? "𝄞" : option.id === "guitar" ? "♢" : "◖"}</i>
                  <span><strong>{option.label[locale]}</strong><small>{option.detail[locale]}</small></span>
                  <b aria-hidden="true">{timbre === option.id ? "✓" : ""}</b>
                </button>
              ))}
            </div>
          </div>
          <button className={`dock-button ${articulation === "long" ? "active" : ""}`} type="button" onClick={toggleArticulation} data-testid="articulation-toggle">
            <span className="dock-icon" aria-hidden="true">⌁</span>
            <span><small>{copy.noteLength}</small><b data-testid="articulation-mode">{articulation === "long" ? copy.long : copy.short}</b></span>
          </button>
          <button className={`dock-button ${immersiveMode ? "active" : ""}`} type="button" aria-pressed={immersiveMode} onClick={toggleImmersiveMode} data-testid="immersive-toggle">
            <span className="dock-icon" aria-hidden="true">◎</span>
            <span><small>{copy.mode}</small><b>{immersiveMode ? copy.exitImmersive : copy.enterImmersive}</b></span>
          </button>
          <button className={`dock-button ${showLibrary ? "active" : ""}`} type="button" aria-pressed={showLibrary} onClick={() => { setShowPerformance(false); setShowLibrary((value) => !value); }} data-testid="library-toggle">
            <span className="dock-icon" aria-hidden="true">♫</span>
            <span><small>{copy.library}</small><b>{copy.appreciation}</b></span>
          </button>
          <button className="dock-button language-button" type="button" aria-label={copy.switchLanguage} onClick={() => changeLocale(locale === "zh" ? "en" : "zh")} data-testid="language-toggle">
            <span className="dock-icon language-icon" aria-hidden="true">文</span>
            <span><small>{copy.language}</small><b>{locale === "zh" ? "中 / EN" : "EN / 中"}</b></span>
          </button>
        </nav>

        <button className={`audio-status ${isAudioReady ? "ready" : ""}`} onClick={initializeAudio} disabled={audioStatus === "loading"} data-testid="start-audio">
          <i />
          <span>{audioButtonText}<small>{audioStatus === "running" ? `${selectedTimbreLabel} · ${articulation === "long" ? copy.long : copy.short}` : copy.startEngine}</small></span>
        </button>
      </header>

      <aside className={`library-drawer ${showLibrary ? "open" : ""}`} aria-hidden={!showLibrary}>
        <div className="drawer-heading library-heading">
          <div><small>MELOVISTA LIBRARY</small><strong>{copy.songLibrary}</strong><span>{copy.libraryIntro}</span></div>
          <div className="drawer-actions">
            <button type="button" onClick={() => { setShowLibrary(false); setShowPerformance(true); }} aria-label={copy.openPerformance}>⌁</button>
            <button type="button" onClick={() => setShowLibrary(false)} aria-label={copy.closeLibrary}>×</button>
          </div>
        </div>

        <div className="song-list" role="listbox" aria-label={copy.songLibrary}>
          {LIBRARY_SONGS.map((song, index) => {
            const ready = Boolean(song.midiUrl || importedSongIds.has(song.id));
            return (
              <button className={selectedSongId === song.id ? "selected" : ""} type="button" role="option" aria-selected={selectedSongId === song.id} key={song.id} onClick={() => chooseLibrarySong(song.id)}>
                <i style={{ "--song-color": song.color } as React.CSSProperties}>{String(index + 1).padStart(2, "0")}</i>
                <span><strong>{song.title[locale]}</strong><small>{song.composer[locale]}</small></span>
                <b className={ready ? "ready" : "locked"}>{ready ? "●" : "○"}</b>
              </button>
            );
          })}
        </div>

        <div className="now-playing-card" style={{ "--song-color": selectedSong.color } as React.CSSProperties}>
          <div className="now-playing-copy">
            <small>{playbackState === "playing" ? copy.songPlaying : selectedSongReady ? copy.available : copy.needsMidi}</small>
            <strong>{selectedSong.title[locale]}</strong>
            <span>{selectedSong.composer[locale]}</span>
          </div>

          <div className="song-progress">
            <input type="range" min="0" max={Math.max(trackDuration, 1)} step="0.1" value={Math.min(playbackSeconds, Math.max(trackDuration, 1))} disabled={!trackDuration} aria-label={copy.currentNote} onChange={(event) => seekLibraryPlayback(Number(event.target.value))} />
            <span>{formatPlaybackTime(playbackSeconds)} / {trackDuration ? formatPlaybackTime(trackDuration) : "—:—"}</span>
          </div>

          <div className="transport-controls">
            <button type="button" onClick={() => moveLibrarySong(-1)} aria-label={copy.previous}>‹</button>
            <button className="play-button" type="button" disabled={!selectedSongReady || playbackState === "loading"} onClick={() => playbackState === "playing" ? pauseLibraryPlayback() : void beginLibraryPlayback()} aria-label={playbackState === "playing" ? copy.pause : copy.play}>
              {playbackState === "loading" ? "…" : playbackState === "playing" ? "Ⅱ" : "▶"}
            </button>
            <button type="button" onClick={() => moveLibrarySong(1)} aria-label={copy.next}>›</button>
            <button className={loopSong ? "active" : ""} type="button" aria-pressed={loopSong} onClick={() => setLoopSong((current) => { loopSongRef.current = !current; return !current; })} aria-label={copy.loop}>↻</button>
          </div>

          <div className="speed-controls" aria-label={copy.speed}>
            <small>{copy.speed}</small>
            {[0.75, 1, 1.25].map((speed) => (
              <button className={playbackSpeed === speed ? "active" : ""} type="button" key={speed} onClick={() => changePlaybackSpeed(speed)}>{speed}×</button>
            ))}
          </div>

          {!selectedSong.midiUrl && (
            <div className="midi-import">
              <button type="button" onClick={() => midiInputRef.current?.click()}>{importedSongIds.has(selectedSong.id) ? copy.imported : copy.importMidi}</button>
              <small>{copy.localOnly}</small>
              <input ref={midiInputRef} type="file" accept=".mid,.midi,audio/midi,audio/x-midi" onChange={(event) => { void importLibraryMidi(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
            </div>
          )}

          {selectedSong.sourceUrl && (
            <a className="song-license" href={selectedSong.sourceUrl} target="_blank" rel="noreferrer">{copy.publicDomain} · {selectedSong.license}</a>
          )}
        </div>
      </aside>

      {immersiveMode && (
        <div className="immersive-notice" role="status">
          <strong>{copy.immersiveMode}</strong>
          <span>{copy.immersiveNotice}</span>
        </div>
      )}

      <aside className={`performance-drawer ${showPerformance ? "open" : ""}`} aria-hidden={!showPerformance}>
        <div className="drawer-heading">
          <div><small>PERFORMANCE</small><strong>{copy.performance}</strong></div>
          <button type="button" onClick={() => setShowPerformance(false)} aria-label={copy.closePerformance}>×</button>
        </div>
        <dl>
          <div><dt>{copy.recentSchedule}</dt><dd>{lastScheduleMs.toFixed(2)} ms</dd></div>
          <div><dt>{copy.p95}</dt><dd>{p95ScheduleMs.toFixed(2)} ms</dd></div>
          <div><dt>{copy.baseLatency}</dt><dd>{diagnostics ? `${(diagnostics.baseLatency * 1000).toFixed(1)} ms` : "—"}</dd></div>
          <div><dt>{copy.outputLatency}</dt><dd>{diagnostics?.outputLatency != null ? `${(diagnostics.outputLatency * 1000).toFixed(1)} ms` : "—"}</dd></div>
          <div><dt>{copy.sampleRate}</dt><dd>{diagnostics ? `${diagnostics.sampleRate} Hz` : "—"}</dd></div>
          <div><dt>{copy.currentAction}</dt><dd data-testid="last-note">{lastNote}</dd></div>
        </dl>
        <p>{copy.performanceNote}</p>
        <div className="sample-credit">
          Samples: <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">Salamander Grand Piano V3</a> · <a href="https://nbrosowsky.github.io/tonejs-instruments/" target="_blank" rel="noreferrer">tonejs-instruments</a> · CC BY 3.0
        </div>
      </aside>

      <section className="instrument-panel" aria-label={`${selectedSceneLabel} ${copy.instrumentLabel}`}>
        <div className="instrument-scroll">
          <div className="instrument-stage">
            <div className="particle-surface" ref={particleLayerRef} aria-hidden="true" />
            <div className="performance-pill" aria-label={copy.liveInfo}>
              <div><span>{copy.schedule}</span><strong data-testid="last-schedule">{lastScheduleMs.toFixed(2)}<small> ms</small></strong></div>
              <div><span>P95</span><strong data-testid="p95-schedule">{p95ScheduleMs.toFixed(2)}<small> ms</small></strong></div>
              <div className="current-note"><span>{copy.currentNote}</span><strong>{lastNote.split("·")[0].trim()}</strong></div>
              <i className="level-bars" aria-hidden="true"><b /><b /><b /><b /></i>
            </div>
            <div className="piano-shell">
              <PianoOctave title={copy.extendedRange} octave={1} keys={EXTREME_KEYS} activeCodes={activeCodeSet} enabled={extremeOctave === 1} locale={locale} autoMidis={autoMidis} />
              <PianoOctave title={copy.lowRange} octave={2} keys={LOW_KEYS} activeCodes={activeCodeSet} enabled={lowOctave === 2} locale={locale} autoMidis={autoMidis} />
              <PianoOctave title={copy.lowRange} octave={3} keys={LOW_KEYS} activeCodes={activeCodeSet} enabled={lowOctave === 3} locale={locale} autoMidis={autoMidis} />
              <PianoOctave title={copy.midRange} octave={4} keys={MID_KEYS} activeCodes={activeCodeSet} locale={locale} autoMidis={autoMidis} />
              <PianoOctave title={copy.highRange} octave={5} keys={HIGH_KEYS} activeCodes={activeCodeSet} locale={locale} autoMidis={autoMidis} />
              <PianoOctave title={copy.extendedRange} octave={6} keys={EXTREME_KEYS} activeCodes={activeCodeSet} enabled={extremeOctave === 6} locale={locale} autoMidis={autoMidis} />
            </div>
          </div>
        </div>
      </section>

      <footer className="key-hints">
        <span><kbd>NUM +</kbd> {copy.extendedHint} C{extremeOctave}</span>
        <i />
        <span><kbd>SPACE</kbd> {copy.lowHint} C{lowOctave}</span>
        <i />
        <span><kbd>LEFT ALT</kbd> {articulation === "long" ? copy.long : copy.short}</span>
        <i />
        <span>{copy.headphoneHint}</span>
      </footer>
    </main>
  );
}
