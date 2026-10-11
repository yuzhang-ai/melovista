# 琴窗 MeloVista 开发状态与换机交接

> 当前同步记录：请先读 [2026-10-11 GitHub 整合](./GITHUB_SYNC.md)。下方 7 月同步结论是历史快照，不代表当前分支状态。

> 更新时间：2026-07-31（Asia/Shanghai）｜交接分支：`main`｜当前公开版本：`v0.17.0`｜当前开发：未发布
>
> 产品代码基线：`91fff6e`（`feat: add Web MIDI input and score archive`）
>
> GitHub：<https://github.com/yuzhang-ai/melovista>

这份文档是换电脑继续开发时的单一交接入口。功能说明看根目录 `README.md`，版本变化看 `CHANGELOG.md`，乐谱校验状态看 `scores/README.md` 和各曲目的说明。

## 1. 当前同步结论

- 2026-07-27 交接前已执行 `git fetch origin --prune --tags`。
- 当时本地 `main` 与 `origin/main` 的产品代码完全一致，ahead/behind 均为 `0`，双方均指向 `91fff6e`。
- 本次交接提交只补充开发状态、规划和换机说明，并将本机 `.whalecode/` 工作状态排除，不包含新的产品功能。
- `.env*`、`.vercel/`、构建产物、日志、识谱临时工具和本机 AI/IDE 状态不进入仓库；换机时不要依赖这些本地文件。

### 交接前验证记录

2026-07-27 使用 Node `v24.16.0`、npm `11.13.0` 完成以下自动验证：

- `npm.cmd test`：通过；Vinext 生产构建成功，Node 测试 `20/20` 通过。
- `npm.cmd run lint`：通过；ESLint 无报错。
- `npm.cmd run build:vercel`：通过；Next.js `16.2.6` 生产构建与静态页面生成成功。
- `git diff --check`：通过；未发现空白符错误。

本次没有实体 MIDI 键盘和多型号手机的人工测试条件，因此对应项目仍保持“待人工确认”，不能用上述自动验证替代。

## 2. 当前开发状态

| 模块 | 状态 | 当前能力 | 仍需人工确认 |
| --- | --- | --- | --- |
| 六音区钢琴 | 已完成 | C1–B6、电脑键盘、鼠标、触摸、多点与滑奏 | 手机真机多点手感、和弦并发、长短音尾音 |
| 声音与场景 | 已完成 | 五种音色、四个动态场景、独立无缝环境声 | 内置扬声器/有线耳机音量平衡与端到端延迟 |
| 我的窗景 | 开发中 | 本地图片/视频校验、零上传预览、静音循环、替换/移除与对象 URL 释放 | iPhone Safari、Android Chrome、MOV/MP4 真机解码与大文件压力 |
| 欣赏模式 | 已完成 | 四首内置 MIDI、本地文件夹曲库、搜索、变速、三种播放模式 | 连续播放 5 分钟漂移、切换场景/音色时的真实听感 |
| 练习能力 | 部分完成 | 节拍器、拍号/BPM、跟随曲目、A–B 循环 | 左右手分轨静音、“弹对再继续”尚未实现 |
| Web MIDI | 功能与模拟测试已完成 | Note On/Off、力度、延音、热插拔、All Notes Off | 必须用实体键盘验证 USB 识别、力度、踏板极性和实际延迟 |
| 五线谱归档 | 初校完成 | 花海、枫、明明就、说了再见的图片、OMR、MusicXML/MIDI 与 QA 归档 | 除已精修的《花海》外，其余曲目仍需逐小节跟谱试听 |
| 部署 | 已上线 | Vercel 主站与 Vinext/Sites 双构建通道 | 发布新功能后仍需浏览器冒烟验收 |
| 自动化 | 本地脚本与 CI 配置可用 | ESLint、双构建、Node 测试；PR 与 `main` 推送触发 GitHub Actions | 首次推送后仍需确认远端 CI 实际通过 |

## 3. 已知边界与风险

1. Web MIDI 主要面向桌面 Chrome/Edge，并要求 HTTPS；Firefox、Safari 和部分移动浏览器可能不支持。
2. 本地导入的 MIDI 只保存在当前浏览器会话，刷新后需要重新选择；收藏、最近播放和目录授权持久化尚未实现。
3. 自动识谱的结构 QA 不能替代真人校谱。任何准备上线的识谱曲目，都要先完成“跟原谱看 + 听 + 记录具体小节 + 局部修正 + 再导出”的闭环。
4. 仓库已增加 GitHub Actions 验证配置，但首次推送前只有本地验证证据；远端 CI 通过后才能把它计为仓库门禁。换机后仍不能只以本地页面能打开作为通过。
5. 主产品本地启动不要求自建 `.env`。`VERCEL_PROJECT_PRODUCTION_URL` 和 `VERCEL_URL` 由 Vercel 在部署时提供；D1 代码目前是可选示例，不在主产品路径中。
6. “我的窗景”只在当前页面会话读取媒体，刷新后需要重新选择；图片上限 20MB、视频上限 200MB，视频兼容性最终取决于浏览器和文件编码。
7. 中文展示品牌已从“乐境”调整为“琴窗”，英文名、仓库名、域名、内部函数名和本地存储键继续保留 `MeloVista` / `melovista`，避免破坏已有链接和偏好。

## 4. 下一阶段规划

### P0：换机后先建立可靠基线

- 按第 5 节完成克隆、依赖安装和 `npm.cmd test`。
- 打开本地页面，人工检查中文/英文、钢琴发声、曲库播放、节拍器、A–B 循环和场景切换。
- 有实体 MIDI 设备时，补做 USB、力度、踏板、热插拔和卡音恢复验收，并把结果写回本文件或单独 QA 记录。
- 建议新增 GitHub Actions，至少自动执行 `npm ci`、`npm run lint`、`npm run build:vercel` 和 Node 测试。

### P1：补齐练习闭环

- 增加左手/右手声部单独静音。
- 实现“等待我弹对再继续”的跟随练习模式。
- 为本地曲库增加收藏、最近播放和可选的 IndexedDB/目录授权记录。
- 为每个练习功能同时定义自动化检查和一次人工演奏验收，不只验证按钮是否存在。

### P2：按真实需求扩展乐谱

- 先完成《枫》《明明就》《说了再见》的人工跟谱试听和重点小节修正。
- 确认用户确实需要“看谱练习”后，再评估使用 OpenSheetMusicDisplay 渲染 MusicXML 与播放光标；不提前扩大复杂度。
- 新增内置曲目前先核对来源、授权、编配者和人工听感，版权信息与曲目文件一起提交。

## 5. 新电脑接手 SOP

### 5.1 克隆与安装

```powershell
git clone https://github.com/yuzhang-ai/melovista.git
Set-Location melovista
git checkout main
git pull --ff-only origin main

node --version
npm.cmd --version
npm.cmd ci
```

要求 Node.js `>=22.13.0`。交接电脑验证时使用的是 Node `v24.16.0`、npm `11.13.0`；版本不必完全相同，但不要低于 `package.json` 的 engines 要求。

### 5.2 自动验证

```powershell
npm.cmd test
```

`npm test` 会先执行 Vinext 生产构建，再执行 `tests/*.test.mjs`。如需分别确认两个部署通道：

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run build:vercel
```

### 5.3 本地运行

```powershell
npm.cmd run dev
```

打开终端提示的本地地址。首次发声需要用户手势；Web MIDI 在本地开发时应使用浏览器认可的安全上下文，并优先用桌面 Chrome/Edge。

### 5.4 人工冒烟检查清单

- [ ] 页面可打开，中文/英文切换正常。
- [ ] 点击“加载并启动”后，电脑键盘、鼠标和触摸能发声。
- [ ] 五种音色、四个场景和环境声均可切换。
- [ ] 四首内置曲目可播放、暂停、跳转、变速和切换播放模式。
- [ ] 本地 MIDI 多选、文件夹导入、搜索和清空正常，且没有上传请求。
- [ ] 节拍器、跟随曲目 BPM/拍号、A–B 循环正常。
- [ ] 有设备时：MIDI 授权、选设备、力度、延音踏板、拔插和 All Notes Off 正常。
- [ ] 控制台没有持续报错；使用耳机或扬声器确认无明显卡音、爆音和不可接受延迟。

## 6. 继续开发与再次交接

开始当天工作前：

```powershell
git status --short --branch
git fetch origin --prune --tags
git pull --ff-only origin main
```

准备推送前：

```powershell
npm.cmd test
git status --short
git diff --check
git diff --cached
```

人工确认差异中不含账号、密钥、客户数据、本机路径、临时日志和大体积可再生成文件后，再提交并推送。每次功能变化同步更新：

1. `CHANGELOG.md`：用户可感知变化和验证结果。
2. 本文：开发状态、已知风险、下一步优先级和人工待验项。
3. 对应专题文档：例如 `docs/APPRECIATION_MODE.md` 或曲目目录下的 `README.md`。

完成推送后，以 `git fetch origin` 后本地 HEAD 与 `origin/main` 的哈希一致作为最终同步凭证。
