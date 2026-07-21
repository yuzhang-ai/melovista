# 五线谱识别归档

这里保存项目已经完成识别的原始谱面分页图、可编辑乐谱、MIDI、OMR 工程和机器 QA 结果，便于后续继续人工校谱，而不是只保留最终试听文件。

## 曲目

- [`花海`](./花海/README.md)：3 页谱面，包含 Audiveris 分页识别结果、MuseScore 精修工程；站内使用的最终 MIDI 位于 [`public/midi/flower-sea.mid`](../public/midi/flower-sea.mid)。
- [`枫`](./枫/README.md)：3 页谱面，59 小节双轨 MIDI。
- [`明明就`](./明明就/README.md)：4 页谱面，37 小节双轨 MIDI。
- [`说了再见`](./说了再见/README.md)：4 页谱面，72 小节双轨 MIDI。

## 归档边界

仓库保留能够试听、编辑和复核的文件：分页 PNG、MIDI、MusicXML/MXL、Audiveris OMR、MuseScore MSCZ、预处理清单和 QA 报告。

以下文件不提交：识谱运行日志、可由分页 PNG 重新合成的多页 TIFF、Audiveris/MuseScore/FFmpeg 安装包、构建缓存和部署压缩包。它们体积大且可以重复生成，不属于乐谱成果。

## 人工验证闭环

自动识谱结果均属于初校版。继续使用或上线前，应先阅读各曲目录下的 `README.md`，按其中标记的小节跟谱试听；发现错音时优先在 MusicXML、OMR 或 MSCZ 中局部修正，再重新导出 MIDI。
