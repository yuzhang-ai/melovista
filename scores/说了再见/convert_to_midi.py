from __future__ import annotations

import copy
from pathlib import Path

from music21 import converter, instrument, key, meter, stream, tempo


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "说了再见.musicxml"
OUTPUT = ROOT / "说了再见-钢琴双轨-识谱版.mid"
MEASURE_QUARTERS = 4.0

# 原图中可清晰读到的速度标记。偏移量以四分音符为单位。
TEMPO_MAP = (
    (1, 0.0, 64),
    (33, 0.0, 62),
    (33, 2.0, 60),
    (34, 0.0, 64),
    (71, 0.0, 60),
    (71, 2.0, 58),
    (71, 3.0, 56),
    (72, 0.0, 54),
)


def normalized_part(source_part: stream.Part, name: str) -> stream.Part:
    result = stream.Part(id=source_part.id)
    result.partName = name
    piano = instrument.Piano()
    piano.instrumentName = name
    result.insert(0, piano)

    for source_measure in source_part.getElementsByClass(stream.Measure):
        measure = copy.deepcopy(source_measure)
        number = int(measure.number)

        # Audiveris 在少数密集小节中会把时值多算 1/8–1/4 拍。
        # 以原谱的 4/4 拍小节线为准，避免后续整页逐渐错位。
        for event in list(measure.recurse().notesAndRests):
            offset = float(event.getOffsetInHierarchy(measure))
            if offset >= MEASURE_QUARTERS:
                event.activeSite.remove(event)
                continue
            end = offset + float(event.quarterLength)
            if end > MEASURE_QUARTERS:
                event.quarterLength = MEASURE_QUARTERS - offset

        result.insert((number - 1) * MEASURE_QUARTERS, measure)

    return result


def main() -> None:
    parsed = converter.parse(SOURCE)
    score = stream.Score(id="SaidGoodbye")
    score.metadata = copy.deepcopy(parsed.metadata)
    score.metadata.title = "说了再见 (Said Goodbye)"
    score.metadata.composer = "周杰伦"

    right = normalized_part(parsed.parts[0], "Piano - Right Hand")
    left = normalized_part(parsed.parts[1], "Piano - Left Hand")
    score.insert(0, right)
    score.insert(0, left)

    # 对两轨显式补全拍号和起始调号，便于各类 DAW 软件稳定读取。
    for part in score.parts:
        first_measure = part.measure(1)
        if not first_measure.getElementsByClass(meter.TimeSignature):
            first_measure.insert(0, meter.TimeSignature("4/4"))
        if not first_measure.getElementsByClass(key.KeySignature):
            first_measure.insert(0, key.KeySignature(2))

    for measure_no, within_measure, bpm in TEMPO_MAP:
        absolute_offset = (measure_no - 1) * MEASURE_QUARTERS + within_measure
        right.insert(absolute_offset, tempo.MetronomeMark(number=bpm))

    score.write("midi", fp=OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
