# Global Skill Routing Map — EXAMPLE (format reference only)

<!-- This is a shipped sample so you can see the output shape. It is NOT any real machine's inventory. -->
<!-- Your actual map is generated into references/routing-map.md the first time the skill runs:
     node scripts/scan-skills.mjs --out references/routing-map.md -->

Total: 6 skill folders, 6 unique names, 3 groups.

## 按场景归类 (By scenario)

> 分类为关键词启发式初判，一个技能可属多个场景；`general` 为通用/工具类，任何场景都可用。最终以路由器判断 + 用户确认为准。

### 编程 / 开发 (`coding`) — 3

/project-lint · /systematic-debugging · /test-driven-development

### 设计 / 绘图 (`design`) — 1

/brainstorming

### 文档 / 写作 (`writing`) — 0

_（无）_

### 日常 / 问答 (`chat`) — 2

/ayaka-map-router · /brainstorming

### 通用 / 工具 (`general`) — 1

/my-notes

## Qoder user-level

- **/ayaka-map-router** — 全域技能路由器：扫描本机已装技能并回答该用哪个技能。 **[manual-only: model cannot auto-invoke; user triggers /ayaka-map-router]** _[chat]_
- **/my-notes** — 个人笔记整理与检索。 _[general]_

## plugin:superpowers

- **/brainstorming** — 在实现前通过提问澄清意图、需求与设计。 _(also in: Qoder user-level)_ _[chat, design]_
- **/test-driven-development** — 以一次一个 red-green slice 的方式构建行为。 _[coding]_
- **/systematic-debugging** — 面对疑难 bug 先建立可复现的紧反馈环再动手。 _[coding]_

## workspace:C:\path\to\your\project

- **/project-lint** — 本项目自定义的提交前检查流程。 _[coding]_

---

说明：
- `_[...]_` 是场景标签（`coding` / `design` / `writing` / `chat` / `general`），用于会话入口的场景盘点与闸门；一个技能可属多个场景。
- `manual-only` 标记来自该技能 `SKILL.md` frontmatter 里的 `disable-model-invocation: true`，只能由用户 `/名字` 触发。
- `_(also in: …)_` 表示同名技能出现在多个来源组；推荐时按 **Qoder 用户级 > 插件 > ~/.agents > ~/.claude** 的优先级，并以客户端实际加载为准。
- 插件技能用完整前缀名调用，例如 `/superpowers:brainstorming`。

<!-- USER-NOTES -->
## Custom flow notes (hand-edit; survives regeneration)

- 在这里写你自己的固定流程偏好，例如「做 PPT 一律先 /visual-deck-builder 再 /pptx」。重新生成地图时，本标记之后的内容会被保留。
- 也可以在这里覆盖启发式分类，例如「/frontend-design 归到 coding 而非 design」。
