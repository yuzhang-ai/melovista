import assert from "node:assert/strict";
import test from "node:test";

import {
  MidiPerformanceState,
  closeMidiInputPort,
  connectedMidiInputPorts,
  isMeloVistaMidiNote,
  openMidiInputPort,
  parseMidiInputMessage,
  requestMeloVistaMidiAccess,
  watchMidiAccess,
} from "../app/midi-input.mjs";

test("parses note on, note off and the velocity-zero note-off convention", () => {
  assert.deepEqual(parseMidiInputMessage(Uint8Array.of(0x92, 60, 100)), {
    type: "note-on",
    channel: 2,
    note: 60,
    velocity: 100 / 127,
  });
  assert.deepEqual(parseMidiInputMessage(Uint8Array.of(0x82, 60, 32)), {
    type: "note-off",
    channel: 2,
    note: 60,
    velocity: 32 / 127,
  });
  assert.equal(parseMidiInputMessage(Uint8Array.of(0x92, 60, 0))?.type, "note-off");
  assert.equal(parseMidiInputMessage(Uint8Array.of(0xe0, 0, 64)), null);
});

test("parses sustain and emergency all-notes-off controllers", () => {
  assert.deepEqual(parseMidiInputMessage(Uint8Array.of(0xb1, 64, 127)), {
    type: "sustain",
    channel: 1,
    down: true,
  });
  assert.deepEqual(parseMidiInputMessage(Uint8Array.of(0xb1, 64, 0)), {
    type: "sustain",
    channel: 1,
    down: false,
  });
  assert.deepEqual(parseMidiInputMessage(Uint8Array.of(0xb1, 123, 0)), {
    type: "all-notes-off",
    channel: 1,
  });
});

test("limits hardware notes to MeloVista's visible C1 to B6 range", () => {
  assert.equal(isMeloVistaMidiNote(24), true);
  assert.equal(isMeloVistaMidiNote(95), true);
  assert.equal(isMeloVistaMidiNote(23), false);
  assert.equal(isMeloVistaMidiNote(96), false);
});

test("defers note release while the sustain pedal is down", () => {
  const state = new MidiPerformanceState();
  assert.equal(state.noteOn("device-a", 0, 60, 0.8)[0].kind, "start");
  state.setSustain("device-a", 0, true);
  assert.deepEqual(state.noteOff("device-a", 0, 60), []);
  assert.deepEqual([...state.activeNotes()], [60]);
  assert.equal(state.sustainActive, true);

  const releases = state.setSustain("device-a", 0, false);
  assert.deepEqual(releases.map((action) => [action.kind, action.note]), [["release", 60]]);
  assert.deepEqual([...state.activeNotes()], []);
  assert.equal(state.sustainActive, false);
});

test("retrigger and all-notes-off cannot leave stuck notes", () => {
  const state = new MidiPerformanceState();
  state.noteOn("device-a", 0, 60, 0.6);
  const retrigger = state.noteOn("device-a", 0, 60, 1);
  assert.deepEqual(retrigger.map((action) => action.kind), ["release", "start"]);
  state.noteOn("device-a", 1, 64, 0.7);
  const releases = state.allNotesOff("device-a");
  assert.deepEqual(releases.map((action) => action.note).sort((a, b) => a - b), [60, 64]);
  assert.deepEqual([...state.activeNotes()], []);
});

test("requests safe MIDI access and exercises a mocked device lifecycle", async () => {
  let requestedOptions = null;
  let opened = 0;
  let closed = 0;
  let received = null;
  const connectedInput = {
    id: "mock-keyboard",
    state: "connected",
    onmidimessage: null,
    async open() { opened += 1; },
    async close() { closed += 1; },
  };
  const disconnectedInput = { id: "old-keyboard", state: "disconnected", onmidimessage: null };
  const access = {
    inputs: new Map([[connectedInput.id, connectedInput], [disconnectedInput.id, disconnectedInput]]),
    onstatechange: null,
  };
  const midiNavigator = {
    async requestMIDIAccess(options) {
      requestedOptions = options;
      return access;
    },
  };

  assert.equal(await requestMeloVistaMidiAccess(midiNavigator), access);
  assert.deepEqual(requestedOptions, { sysex: false, software: false });
  assert.deepEqual(connectedMidiInputPorts(access).map((input) => input.id), ["mock-keyboard"]);

  let stateChanges = 0;
  const stopWatching = watchMidiAccess(access, () => { stateChanges += 1; });
  access.onstatechange();
  assert.equal(stateChanges, 1);

  await openMidiInputPort(connectedInput, (event) => { received = event.data; });
  connectedInput.onmidimessage({ data: Uint8Array.of(0x90, 60, 100) });
  assert.deepEqual([...received], [0x90, 60, 100]);
  assert.equal(opened, 1);

  await closeMidiInputPort(connectedInput);
  assert.equal(connectedInput.onmidimessage, null);
  assert.equal(closed, 1);
  stopWatching();
  assert.equal(access.onstatechange, null);
});
