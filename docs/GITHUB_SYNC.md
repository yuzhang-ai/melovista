# 琴窗 GitHub 同步 · 2026-10-11

- 目标：将琴窗品牌、自定义窗景与本地录制视图整合到 GitHub main，更新仓库介绍。
- 现场：melovista 仓库；agent/qinchuang-custom-scenes 起点 5cb9803，远端 main 起点 1a804c5。现有未提交改动保留。
- 范围：产品代码、对应测试、README 展示图、CI 与交接记录。排除个人音频脚本、缓存和本机配置。
- 授权：提交、合并、推送和仓库介绍更新；不另行手动部署网站。
- 验收：Node 24 下 lint、Vinext 构建与 Node 测试、Next.js 生产构建；内置浏览器普通与录制入口；远端 main/介绍回读及 CI。
- 停机条件：真实冲突、检查失败未解释、泄密风险；不强推或覆盖现有改动。
- 本地验证：Node 24.21.0 下 27/27 测试、ESLint、Vinext 构建及 Next.js 生产构建通过。默认 Node 20 不满足要求，仅调整当前进程 PATH。
- 浏览器：内置浏览器验证 Next.js 生产服务；普通入口非 film 且有六音区；film 入口呈现竖屏三音区，音源加载完成后开始覆盖层消失，琴键可点击。
- 未验证：实体 MIDI、手机真机、人工听感、生产部署。Vinext 本地 start 虽返回页面但浏览器无样式，此备用运行路径存在缺口，构建通过不代表运行验收通过；实际 Vercel 配置使用 Next.js。
- 发布状态：准备提交并 fast-forward 到 main；远端结果以对应提交的 GitHub Actions 与仓库读取为准。
