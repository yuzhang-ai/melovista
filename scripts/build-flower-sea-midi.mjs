import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import midiPackage from "@tonejs/midi";

const { Midi } = midiPackage;
const PPQ = 480;
const TEMPO = 75;
const QUARTER_SECONDS = 60 / TEMPO;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "work", "flower-sea-omr-v2", "audiveris-output");
const outputPath = path.join(repoRoot, "public", "midi", "flower-sea.mid");

// Audiveris exported these measure lengths after losing the meter context on
// pages two and three. They are retained only to locate notes in the source
// page MIDIs. The rebuilt piece always uses the score's real meter: a two-beat
// pickup followed by measures 1-49 in 4/4.
const pages = [
  {
    page: 1,
    firstMeasure: 0,
    sourceMeasureQuarters: [2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4.5, 4.25, 4, 4, 4, 6.5, 4, 4],
  },
  {
    page: 2,
    firstMeasure: 19,
    sourceMeasureQuarters: [4, 4, 4, 4, 4, 4, 4, 5.5, 4, 3.75, 4, 4, 4, 6, 6, 6],
  },
  {
    page: 3,
    firstMeasure: 35,
    sourceMeasureQuarters: [4, 3.75, 4, 6, 4, 6, 6, 4, 4, 4, 4, 4, 4, 7, 4],
  },
];

const expectedMeasureQuarters = (measure) => (measure === 0 ? 2 : 4);

function snapQuarter(value) {
  const snapped = Math.round(value * 4) / 4;
  return Math.abs(value - snapped) <= 0.03 ? snapped : value;
}

function repairedStartQuarter(measure, sourceQuarter) {
  const quarter = snapQuarter(Math.max(0, sourceQuarter));

  // These measures were shifted by a spurious two-beat rest/backup operation.
  if ([10, 16, 38].includes(measure)) return Math.max(0, quarter - 2);

  // In measure 33, the second half of two voices was placed two beats late.
  if (measure === 33 && quarter >= 4) return quarter - 2;

  // Late closing figures were read as quarter notes instead of the beamed
  // eighth/sixteenth figures visible in the supplied score.
  if ([34, 41].includes(measure) && quarter >= 4) {
    return 3.5 + (quarter - 4) * 0.25;
  }

  // The final tied figure in measure 26 belongs at the end of the 4/4 bar.
  if (measure === 26 && quarter === 4) return 3.5;
  if (measure === 26 && quarter >= 4.5) return 3.75 + (quarter - 4.5) * 0.25;

  // The closing arpeggiated chord begins on beat four of measure 48 and ties
  // across the final bar; Audiveris placed that voice two beats late.
  if (measure === 48 && quarter >= 4) return quarter - 2;

  return quarter;
}

function repairedDurationTicks(measure, sourceQuarter, durationTicks) {
  const quarter = snapQuarter(Math.max(0, sourceQuarter));
  if ([34, 41].includes(measure) && quarter >= 4) {
    return Math.max(30, Math.round(durationTicks * 0.25));
  }
  if (measure === 26 && quarter === 4 && durationTicks <= PPQ) {
    return Math.max(30, Math.round(durationTicks * 0.5));
  }
  return durationTicks;
}

function scoreMeasure(page, localIndex) {
  return page.page === 1 ? localIndex : page.firstMeasure + localIndex;
}

const rebuiltNotes = [[], []];
let targetQuarterCursor = 0;

for (const page of pages) {
  const sourcePath = path.join(sourceRoot, `page-${page.page}.mid`);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing OMR source MIDI: ${sourcePath}`);
  }

  const source = new Midi(fs.readFileSync(sourcePath));
  if (source.header.ppq !== PPQ || source.tracks.length < 2) {
    throw new Error(`Unexpected page-${page.page} MIDI structure`);
  }

  const sourceStarts = [];
  let sourceQuarterCursor = 0;
  for (let localIndex = 0; localIndex < page.sourceMeasureQuarters.length; localIndex += 1) {
    const measure = scoreMeasure(page, localIndex);
    sourceStarts.push({
      measure,
      sourceStartTicks: Math.round(sourceQuarterCursor * PPQ),
      sourceEndTicks: Math.round((sourceQuarterCursor + page.sourceMeasureQuarters[localIndex]) * PPQ),
      targetStartQuarter: targetQuarterCursor,
    });
    sourceQuarterCursor += page.sourceMeasureQuarters[localIndex];
    targetQuarterCursor += expectedMeasureQuarters(measure);
  }

  source.tracks.slice(0, 2).forEach((track, trackIndex) => {
    let measureIndex = 0;
    for (const note of track.notes) {
      if (note.durationTicks < 10) continue;

      while (
        measureIndex + 1 < sourceStarts.length
        && note.ticks >= sourceStarts[measureIndex + 1].sourceStartTicks - 2
      ) {
        measureIndex += 1;
      }

      const location = sourceStarts[measureIndex];
      if (!location || note.ticks >= location.sourceEndTicks + 2) continue;

      const sourceQuarter = (note.ticks - location.sourceStartTicks) / PPQ;
      const localTargetQuarter = repairedStartQuarter(location.measure, sourceQuarter);
      const targetTicks = Math.round((location.targetStartQuarter + localTargetQuarter) * PPQ);
      let midi = note.midi;

      // The 8va line in the supplied score runs from measures 41 through 48.
      if (trackIndex === 0 && location.measure >= 41 && location.measure <= 48) midi += 12;

      rebuiltNotes[trackIndex].push({
        midi,
        ticks: targetTicks,
        durationTicks: repairedDurationTicks(location.measure, sourceQuarter, note.durationTicks),
        velocity: Math.min(1, Math.max(0.2, note.velocity)),
        measure: location.measure,
      });
    }
  });
}

const pieceEndTicks = Math.round(targetQuarterCursor * PPQ);
const output = new Midi();
output.name = "Flower Sea - Jay Chou (measure-corrected)";
output.header.setTempo(TEMPO);
output.header.timeSignatures = [
  { ticks: 0, timeSignature: [2, 4] },
  { ticks: 2 * PPQ, timeSignature: [4, 4] },
];
output.header.keySignatures = [{ ticks: 0, key: "A", scale: "major" }];
output.header.meta = [
  { ticks: 0, type: "text", text: "Measure-level repair from user-provided score images" },
  { ticks: 0, type: "copyrightNotice", text: "Arrangement credit on supplied score: Seashells / Chongchong Piano" },
];

const targetTracks = [output.addTrack(), output.addTrack()];
targetTracks[0].name = "Right Hand";
targetTracks[1].name = "Left Hand";
targetTracks.forEach((track) => {
  track.instrument.number = 0;
});

for (let trackIndex = 0; trackIndex < rebuiltNotes.length; trackIndex += 1) {
  const notes = rebuiltNotes[trackIndex]
    .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi || b.durationTicks - a.durationTicks);
  const deduplicated = [];

  for (const note of notes) {
    const previous = deduplicated.at(-1);
    if (previous && previous.ticks === note.ticks && previous.midi === note.midi) {
      previous.durationTicks = Math.max(previous.durationTicks, note.durationTicks);
      previous.velocity = Math.max(previous.velocity, note.velocity);
      continue;
    }
    deduplicated.push({ ...note });
  }

  for (const note of deduplicated) {
    const durationTicks = Math.max(30, Math.min(note.durationTicks, pieceEndTicks - note.ticks));
    if (durationTicks <= 0 || note.ticks < 0 || note.ticks >= pieceEndTicks) continue;
    targetTracks[trackIndex].addNote({
      midi: note.midi,
      ticks: note.ticks,
      durationTicks,
      velocity: note.velocity,
    });
  }
}

fs.writeFileSync(outputPath, output.toArray());

const notes = output.tracks.flatMap((track) => track.notes);
const audit = {
  outputPath,
  scoreMeasures: "pickup + 1-49",
  tracks: output.tracks.length,
  notes: notes.length,
  durationSeconds: output.duration,
  expectedDurationSeconds: targetQuarterCursor * QUARTER_SECONDS,
  minMidi: Math.min(...notes.map((note) => note.midi)),
  maxMidi: Math.max(...notes.map((note) => note.midi)),
  tempo: output.header.tempos[0]?.bpm,
};

if (audit.tracks !== 2 || audit.notes < 740 || audit.durationSeconds !== audit.expectedDurationSeconds) {
  throw new Error(`Flower Sea MIDI audit failed: ${JSON.stringify(audit)}`);
}

console.log(JSON.stringify(audit, null, 2));
