# 三八度键盘钢琴 · 延迟实验室

使用真实 Salamander Grand Piano 采样验证电脑键盘到浏览器音频调度延迟的 P1 样机。16 个压缩采样约 1.2MB，首次点击后加载并解码到内存；演奏热路径不走网络。

## 启动

```powershell
npm.cmd install
npm.cmd run dev
```

打开终端显示的本地地址，点击一次“启动音频”，再使用键盘弹奏。

## 键位

- C4–B4 全音：`· 1 2 3 4 5 6`
- C4–B4 半音：`Tab Q E R T`
- C5–B5 全音：`7 8 9 0 - = Backspace`
- C5–B5 半音：`U I P [ ]`
- C3–B3 全音：`A S D F G H J`
- C3–B3 半音：`Z X V B N`
- `Space`：将最低一组在 C3–B3 与 C2–B2 间切换
- 左侧 `Alt`：在短音与长音之间切换；右侧 Alt 不响应

页面会显示最近一次键盘事件到音频调度的 JS 耗时、最近 120 次 P95，以及浏览器报告的基础音频延迟。JS 调度耗时不等于扬声器最终出声的端到端延迟，最终听感需要使用内置扬声器或有线耳机人工确认。

## 钢琴采样授权

音源来自 Alexander Holm 的 Salamander Grand Piano V3，采用 CC BY 3.0 许可。本项目只使用覆盖 C2–B5 的压缩采样子集，并在页面中保留署名。

## 验证

```powershell
npm.cmd test
```
