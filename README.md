# GOD'S WILL Demo UI

This repository contains a static prototype that visualises the requested menu, chapter selection, level briefing, character dossier, and tutorial flows for the GOD'S WILL demo.

## 运行方式

1. 在本地克隆或下载项目后，直接用浏览器打开 `index.html` 即可预览效果。
2. 若使用 VS Code 等编辑器，推荐通过 Live Server 扩展或任意静态服务器来获得热刷新体验：
   ```bash
   npx serve .
   ```
   然后在浏览器访问命令行提示的地址。

## 功能概览

- **主菜单**：黑幕开场/闭合动画、标题 `GOD'S WILL` 以及“开始 / 设置 / 教学 / 离开”按钮。
- **章节选择**：七个纵向条块展示章节，仅 Demo 章节可选，其余均锁定。
- **关卡选择**：提供 Demo 章节内三张关卡的彩色 hover 效果、地图预览（含掩体、空洞、角色位置）、敌方情报以及“进入关卡”按钮。首次进入时敌方技能为锁定状态，点击后会解锁记录。
- **角色界面**：左侧角色立绘占位 + 等级，右侧提供“介绍/技能”页签，最右侧可切换 Adora / Karma / Dario。
- **教学页**：黑幕转场后呈现四个标签页，覆盖玩法速览、技能、特殊效果与敌人分类说明。
- **设置/离开面板**：以半透明面板形式展示 Demo 版本占位提示。

所有文本、描述、技能与单位信息均依照需求文档进行编排。动画使用 CSS 实现黑幕覆盖→散开的转场效果，页面高度不足时可滚动浏览。
