# Global Skill Routing Map — EXAMPLE (format reference only)

<!-- This is a shipped sample so you can see the output shape. It is NOT any real machine's inventory. -->
<!-- Your actual map is generated into references/routing-map.md the first time the skill runs:
     node scripts/scan-skills.mjs --out references/routing-map.md -->

Total: 6 skill folders, 5 unique names, 3 groups.

## Qoder user-level

- **/ayaka-map-router** — 全域技能路由器：扫描本机已装技能并回答该用哪个技能。 **[manual-only: model cannot auto-invoke; user triggers /ayaka-map-router]**
- **/my-notes** — 个人笔记整理与检索。

## plugin:superpowers

- **/brainstorming** — 在实现前通过提问澄清意图、需求与设计。 _(also in: Qoder user-level)_
- **/test-driven-development** — 以一次一个 red-green slice 的方式构建行为。
- **/systematic-debugging** — 面对疑难 bug 先建立可复现的紧反馈环再动手。

## workspace:C:\path\to\your\project

- **/project-lint** — 本项目自定义的提交前检查流程。

---

说明：
- `manual-only` 标记来自该技能 `SKILL.md` frontmatter 里的 `disable-model-invocation: true`，只能由用户 `/名字` 触发。
- `_(also in: …)_` 表示同名技能出现在多个来源组；推荐时按 **Qoder 用户级 > 插件 > ~/.agents > ~/.claude** 的优先级，并以客户端实际加载为准。
- 插件技能用完整前缀名调用，例如 `/superpowers:brainstorming`。

<!-- USER-NOTES -->
## Custom flow notes (hand-edit; survives regeneration)

- 在这里写你自己的固定流程偏好，例如「做 PPT 一律先 /visual-deck-builder 再 /pptx」。重新生成地图时，本标记之后的内容会被保留。
