# 《花海》五线谱识别归档

## 文件说明

- `source/page-1.png` 至 `page-3.png`：用于第二轮识别的三页清理后谱面。
- `omr/page-*.omr`：Audiveris 分页工程，可继续修正识别结果。
- `omr/page-*.mxl`：Audiveris 分页压缩 MusicXML 导出。
- `omr/page-*.mid`：Audiveris 分页原始 MIDI，仅供对照，不是站内最终版本。
- `花海-精修版.mscz`：在 MuseScore 中完成跨页、节奏与高八度修补后的可编辑工程。
- [`../../public/midi/flower-sea.mid`](../../public/midi/flower-sea.mid)：站内曲库实际加载的最终双轨 MIDI。

## 已完成修补

- 修复 OMR 造成的跨页节奏错位和小节漂移。
- 修复第 41–48 小节漏识别的 `8va`，恢复高八度演奏。
- 保留两拍弱起、49 个完整小节、双手两轨和 `♩=75`。
- 最终 MIDI 包含 769 个有效音符，总时长约 2:38.4，音域为 C♯2–A6。

## 人工验证闭环

最终版本已经过 MIDI 结构、重复事件、音域、速度、时长和反向排谱检查。若后续试听仍发现局部错音，请记录具体小节，在 `花海-精修版.mscz` 中修正后重新导出，并再次核对站内 MIDI 文件哈希与播放效果。
