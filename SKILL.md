---
name: ayaka-map-router
description: 全域技能路由器（Ayaka Map Router）。先自动扫描本机已安装的全部技能——Qoder 用户级 ~/.qoder-cn/skills、~/.agents/skills、~/.claude/skills、所有已装插件缓存、当前工作区——生成按来源分组、标注 manual-only 与跨目录重复项的「路由地图」，再回答「这个任务该用哪个技能 / 走什么流程 / 有没有已装的能做 X」。当用户问「用哪个技能」「帮我选技能」「该走什么流程」「有没有已安装的技能能…」，或显式调用 /ayaka-map-router 时使用。只做已装技能的路由问答，不推荐尚未安装的市场技能（那属于 find-extensions），也不代为执行被推荐技能的内容。
disable-model-invocation: true
argument-hint: <你想完成的任务或问题>
---

# Ayaka Map Router（全域技能路由器）

你不需要记住环境里装了的一两百个技能，直接问。本技能把「该用哪个技能 / 走哪条流程」这件事，交给一张自动维护的全域路由地图来回答。

## 工作流程

1. **读地图**：读取本技能目录下 `references/routing-map.md`（自动生成的全域技能清单，按来源分组，含描述、`manual-only` 标记、跨目录重复标注）。
2. **确保地图存在且新鲜**：若 `references/routing-map.md` 不存在（首次安装）、头部生成时间距今超过 30 天、用户刚增删技能、或地图里找不到本该有的技能，就重新生成：
   `node "<本技能目录>/scripts/scan-skills.mjs" --out "<本技能目录>/references/routing-map.md"`
   脚本幂等；文件中 `<!-- USER-NOTES -->` 之后的手写内容会被保留。可参考 `references/routing-map.example.md` 了解输出格式。
3. **理解任务**：把用户描述拆成 领域 × 任务类型 × 所处阶段（构思 / 实现 / 调试 / 审查 / 文档 / 发布）。
4. **给出推荐**：按下面的「推荐格式」回答，最多推荐 3 个候选，说明为什么、先后关系、以及怎么触发。

## 推荐格式

```
🎯 首选：**/<name>**（<来源组>）— 一句话理由 + 触发方式
🥈 备选：**/<name2>** — 与首选的差别
🔀 若要成流程：<步骤A> → <步骤B> → <步骤C>
```

- 带 `manual-only` 标记的技能只能由用户 `/名字` 触发，推荐时要写清楚。
- 同名技能出现在多个来源组时，按优先级 **Qoder 用户级 > 插件 > ~/.agents > ~/.claude** 推荐，并提醒用户实际加载以客户端为准。
- 插件技能用完整前缀名调用（如 `/superpowers:brainstorming`、`/product-design:prd`）。

## 常见场景速查（入口示例，最终以地图为准）

- 打磨想法 / 压力测试计划 → grilling 类原语、brainstorming 类技能；要留文档痕迹就选带 docs 的那条。
- 大项目一个会话装不下 → wayfinder 类（多为 manual-only）；拆票 → to-tickets → implement。
- 测试驱动实现 → tdd 类；收尾合并 → finishing-a-development-branch 类。
- 修难缠 bug → diagnosing / systematic-debugging 类。
- 审查代码 → code-review / requesting-code-review 类。
- 文档 / 幻灯片 / 图表 → pptx、可视化、架构图（C4 / graphviz）类。
- 找**没装**的能力 → 不要用本技能，转 marketplace 发现类技能（如 find-extensions）。

> 上面只是入口示例。真正的候选集合、名称与前缀，一律以本机生成的 `routing-map.md` 为准；不同机器安装的技能不同，切勿照搬示例名称当作存在。

## 边界

- 本技能只做**已装技能**的路由问答；不执行被推荐技能的内容，推荐后由用户确认再调用。
- 地图是快照：无法覆盖会话内动态加载 / 禁用的技能；如与当前会话可见技能列表冲突，以会话列表为准并重新生成地图。
- 用户问「为什么有的技能不在列表里 / 不能被自动调用」：带 `disable-model-invocation: true` 的技能（地图中标 `manual-only`）被设计为仅手动 `/名字` 触发。

## Resources

- `scripts/scan-skills.mjs`：扫描上述全部来源、解析各 `SKILL.md` frontmatter、生成 / 更新 `references/routing-map.md`；stdout 仅输出 ASCII 摘要，技能正文写入文件。
- `references/routing-map.example.md`：输出格式示例（占位内容，非任何真实机器清单）。
- `references/routing-map.md`：本机实际地图，首次使用时由脚本生成，属用户本地数据。
