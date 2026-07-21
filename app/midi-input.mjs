export const MELOVISTA_MIDI_MIN = 24;
export const MELOVISTA_MIDI_MAX = 95;

/**
 * @typedef {{ type: "note-on", channel: number, note: number, velocity: number }
 * | { type: "note-off", channel: number, note: number, velocity: number }
 * | { type: "sustain", channel: number, down: boolean }
 * | { type: "all-notes-off", channel: number }
 * | null} ParsedMidiInputMessage
 */

export class WebMidiUnavailableError extends Error {
  constructor() {
    super("Web MIDI is unavailable");
    this.name = "WebMidiUnavailableError";
  }
}

/** @param {{ requestMIDIAccess?: (options: { sysex: boolean, software: boolean }) => Promise<unknown> }} midiNavigator */
export function requestMeloVistaMidiAccess(midiNavigator) {
  if (typeof midiNavigator.requestMIDIAccess !== "function") throw new WebMidiUnavailableError();
  return midiNavigator.requestMIDIAccess({ sysex: false, software: false });
}

/** @param {{ inputs: { forEach: (callback: (input: any) => void) => void } }} access */
export function connectedMidiInputPorts(access) {
  const inputs = [];
  access.inputs.forEach((input) => {
    if (input.state === "connected") inputs.push(input);
  });
  return inputs;
}

/** @param {{ open?: () => Promise<unknown>, onmidimessage: null | ((event: any) => void) }} input @param {(event: any) => void} handler */
export async function openMidiInputPort(input, handler) {
  await input.open?.();
  input.onmidimessage = handler;
}

/** @param {{ close?: () => Promise<unknown>, onmidimessage: null | ((event: any) => void) }} input */
export async function closeMidiInputPort(input) {
  input.onmidimessage = null;
  await input.close?.();
}

/** @param {{ onstatechange: null | (() => void) }} access @param {() => void} handler */
export function watchMidiAccess(access, handler) {
  access.onstatechange = handler;
  return () => {
    if (access.onstatechange === handler) access.onstatechange = null;
  };
}

/**
 * Convert one channel-voice MIDI packet into the small set of events MeloVista uses.
 * System messages, pitch bend, aftertouch and unsupported controllers are ignored.
 *
 * @param {ArrayLike<number> | null | undefined} data
 * @returns {ParsedMidiInputMessage}
 */
export function parseMidiInputMessage(data) {
  if (!data || data.length < 1) return null;
  const status = Number(data[0]) & 0xff;
  if (status < 0x80 || status >= 0xf0) return null;

  const command = status & 0xf0;
  const channel = status & 0x0f;
  const data1 = Number(data[1] ?? 0) & 0x7f;
  const data2 = Number(data[2] ?? 0) & 0x7f;

  if (command === 0x90 && data2 > 0) {
    return { type: "note-on", channel, note: data1, velocity: data2 / 127 };
  }
  if (command === 0x80 || (command === 0x90 && data2 === 0)) {
    return { type: "note-off", channel, note: data1, velocity: data2 / 127 };
  }
  if (command === 0xb0 && data1 === 64) {
    return { type: "sustain", channel, down: data2 >= 64 };
  }
  if (command === 0xb0 && (data1 === 120 || data1 === 123)) {
    return { type: "all-notes-off", channel };
  }
  return null;
}

/** @param {number} note */
export function isMeloVistaMidiNote(note) {
  return Number.isInteger(note) && note >= MELOVISTA_MIDI_MIN && note <= MELOVISTA_MIDI_MAX;
}

/** @param {string} deviceId @param {number} channel @param {number} note */
export function midiPerformanceKey(deviceId, channel, note) {
  return JSON.stringify([deviceId, channel, note]);
}

export class MidiPerformanceState {
  #notes = new Map();
  #sustainChannels = new Map();

  /** @param {string} deviceId @param {number} channel @param {number} note @param {number} velocity */
  noteOn(deviceId, channel, note, velocity) {
    const key = midiPerformanceKey(deviceId, channel, note);
    const actions = [];
    const previous = this.#notes.get(key);
    if (previous) actions.push({ kind: "release", ...previous });
    const next = { key, deviceId, channel, note, velocity, releasedWhileSustained: false };
    this.#notes.set(key, next);
    actions.push({ kind: "start", ...next });
    return actions;
  }

  /** @param {string} deviceId @param {number} channel @param {number} note */
  noteOff(deviceId, channel, note) {
    const key = midiPerformanceKey(deviceId, channel, note);
    const current = this.#notes.get(key);
    if (!current) return [];
    if (this.#sustainChannels.has(JSON.stringify([deviceId, channel]))) {
      current.releasedWhileSustained = true;
      return [];
    }
    this.#notes.delete(key);
    return [{ kind: "release", ...current }];
  }

  /** @param {string} deviceId @param {number} channel @param {boolean} down */
  setSustain(deviceId, channel, down) {
    const sustainKey = JSON.stringify([deviceId, channel]);
    if (down) {
      this.#sustainChannels.set(sustainKey, { deviceId, channel });
      return [];
    }
    this.#sustainChannels.delete(sustainKey);
    const actions = [];
    for (const [key, note] of this.#notes) {
      if (note.deviceId === deviceId && note.channel === channel && note.releasedWhileSustained) {
        this.#notes.delete(key);
        actions.push({ kind: "release", ...note });
      }
    }
    return actions;
  }

  /** @param {string | undefined} deviceId @param {number | undefined} channel */
  allNotesOff(deviceId = undefined, channel = undefined) {
    const actions = [];
    for (const [key, note] of this.#notes) {
      if ((deviceId === undefined || note.deviceId === deviceId) && (channel === undefined || note.channel === channel)) {
        this.#notes.delete(key);
        actions.push({ kind: "release", ...note });
      }
    }
    for (const [sustainKey, sustain] of this.#sustainChannels) {
      if ((deviceId === undefined || sustain.deviceId === deviceId) && (channel === undefined || sustain.channel === channel)) {
        this.#sustainChannels.delete(sustainKey);
      }
    }
    return actions;
  }

  /** @param {string} key */
  has(key) {
    return this.#notes.has(key);
  }

  activeNotes() {
    return new Set([...this.#notes.values()].map((note) => note.note));
  }

  get sustainActive() {
    return this.#sustainChannels.size > 0;
  }
}
