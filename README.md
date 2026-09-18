# Ayaka Map Router（全域技能路由器）

> 一个给 Qoder / Claude Code 等 Agent 客户端用的「技能路由」技能：它先扫描你本机**已经安装**的全部技能，生成一张按来源分组的路由地图，然后回答你的问题——**「这个任务到底该用哪个技能、走哪条流程？」**

当技能装到一两百个时，没人记得住每个技能叫什么、能干什么、是不是只能手动触发。Ayaka Map Router 把「选技能」这件事变成一次提问。

## 它能做什么

- **全域盘点**：扫描以下所有位置里的技能（凡是含 `SKILL.md` 的目录都算一个技能）：
  - Qoder 用户级：`~/.qoder-cn/skills`
  - AGENTS 用户级：`~/.agents/skills`
  - Claude 用户级：`~/.claude/skills`
  - 已安装插件缓存：`~/.qoder-cn/plugins/cache/**`、`~/.claude/plugins/**`
  - 当前工作区：`.qoder/skills`、`.agents/skills`、`plugins/*/skills`
- **生成路由地图**：按来源分组列出每个技能的名称、描述，并自动标注：
  - `manual-only`：该技能设了 `disable-model-invocation: true`，模型无法自动调用，只能用户 `/名字` 手动触发；
  - `also in: …`：同名技能在多个目录重复出现。
- **给推荐**：把你的任务拆成「领域 × 任务类型 × 阶段」，最多推荐 3 个候选，说明理由、先后关系与触发方式。
- **场景分类**：用关键词启发式给每个技能打上场景标签——`coding`（编程）/ `design`（设计绘图）/ `writing`（文件编写）/ `chat`（日常问答）/ `general`（通用工具），并在地图里生成「按场景归类」汇总段；一个技能可属多个场景，`general` 任何场景都可用。
- **会话场景闸门**：每次调用本技能时，先按「场景 × 来源」盘点可用技能，再结合上下文并**询问你**判断当前会话属于哪种场景，然后**只推荐 / 只调用匹配该场景（+ general）的技能**，其余场景默认不主动调用；你说一声即可切换或按需开启。
- **可长期演进**：地图里 `<!-- USER-NOTES -->` 之后的手写内容，在每次重新生成时都会被保留。

## 安装

把本仓库克隆（或复制）到任一用户级技能目录下即可，目录名保持 `ayaka-map-router`：

```bash
# Qoder CN
git clone https://github.com/xez65/ayaka-map-router.git ~/.qoder-cn/skills/ayaka-map-router

# 或 Claude Code
git clone https://github.com/xez65/ayaka-map-router.git ~/.claude/skills/ayaka-map-router
```

安装后重启会话，或运行 `/skills reload`，再用 `/skills list` 确认已加载。

> 环境要求：Node.js 18+（脚本仅用 Node 内置模块，无第三方依赖）。

## 使用

直接用 `/ayaka-map-router` 触发，后面写你想完成的事：

```
/ayaka-map-router 我想给论文答辩做一页架构图，用哪个技能？
/ayaka-map-router 有没有已装的技能能帮我做 test-first 的功能开发？
/ayaka-map-router 修一个偶发的 flaky 测试，该走什么流程？
```

**首次使用**时，如果还没有生成过地图，技能会让你先运行扫描脚本（也可以自己手动跑一次）：

```bash
node scripts/scan-skills.mjs --out references/routing-map.md
```

之后每次提问，它会读取 `references/routing-map.md`；当地图缺失、超过 30 天、或你刚增删了技能时，它会重新生成。

输出示例（推荐格式）：

```
🎯 首选：/c4model（plugin:architecture-visualization）— 需要证据可追溯的 C4/Structurizr 架构图，正好是一页答辩图。
🥈 备选：/graphviz — 若图更偏密集依赖而非 C4 分层。
🔀 若要成流程：/c4model 出 DSL → 需要 PNG 再走导出脚本
```

## 会话入口与场景闸门

每次 `/ayaka-map-router` 被调用时，先走一遍入口流程：

1. **确保地图新鲜**：缺失 / 超 30 天 / 刚增删技能 → 重跑扫描脚本生成 `references/routing-map.md`。
2. **场景盘点**：把当前可用技能按「场景 × 来源」用几行话汇报给你，并点出哪些是 `manual-only`。
3. **判定场景**：结合上下文推断本次会话属于 **编程 / 日常聊天 / 设计绘图 / 文件编写** 中的哪一种，用 `AskUserQuestion` 把推断作为推荐项让你确认或改选。
4. **设定闸门**：确认后，本技能只推荐 / 只调用匹配该场景（+ `general`）的技能，其余场景默认不主动调用，并告诉你当前激活与已关闭的场景。

**按需开关口令**（随时调整闸门）：

| 你说 | 效果 |
| --- | --- |
| 「切到 设计 场景」 | 重跑判定与设定，改设闸门 |
| 「这次也允许 writing 的 /pptx」 | 仅本会话单次放行该技能 |
| 「把 文档 场景也打开」 | 该场景并入激活集合 |
| 「别限制了，全部场景都荐」 | 解除闸门，回到全域推荐 |

> 两点诚实说明：① 场景闸门约束的是**本路由器自身**的推荐 / 调用范围，被"关闭"的技能你仍可直接 `/名字` 触发、或由客户端原生机制调用——本技能不做客户端级禁用；② 场景标签是关键词启发式**初判**，会有误分，最终以路由器判断 + 你的确认为准，也可在 `USER-NOTES` 里写死覆盖。

## 工作原理

```
你的提问（/ayaka-map-router）
  │
  ├─ 读 references/routing-map.md（缺失/过期则先重新生成）
  │        ▲
  │        │ node scripts/scan-skills.mjs
  │        │
  │     扫描 ~/.qoder-cn · ~/.agents · ~/.claude · 插件缓存 · 工作区
  │     解析每个 SKILL.md 的 frontmatter（name/description/disable-model-invocation）
  │     按关键词打场景标签 coding/design/writing/chat/general →「按场景归类」段
  │
  ├─ 场景盘点：按 场景 × 来源 汇报可用技能
  ├─ 判定场景：结合上下文 + AskUserQuestion 确认当前会话场景
  ├─ 设定闸门：只放行 该场景 + general 的技能
  └─ 输出 ≤3 个候选 + 理由 + 触发方式（闸门内）
```

- **推荐优先级**：同名技能跨目录出现时，按 **Qoder 用户级 > 插件 > ~/.agents > ~/.claude** 推荐，并提醒以客户端实际加载为准。
- **插件技能**用完整前缀名调用，如 `/superpowers:brainstorming`、`/product-design:prd`。
- 脚本的 **stdout 只输出 ASCII 摘要**，技能正文（可能含中文）一律写入文件，规避 Windows 控制台编码问题。

## 目录结构

```
ayaka-map-router/
├── SKILL.md                        # 技能主体（路由工作流与推荐格式）
├── scripts/
│   └── scan-skills.mjs             # 全域扫描 + 生成 routing-map.md（幂等，保留 USER-NOTES）
├── references/
│   ├── routing-map.example.md      # 输出格式示例（占位内容，非任何真实机器清单）
│   └── routing-map.md              # 你本机的实际地图，首次使用时生成（已被 .gitignore 忽略）
├── README.md
├── LICENSE
└── .gitignore
```

## 边界与约定

- 本技能**只做已装技能的路由问答**：不执行被推荐技能的内容，推荐后由你确认再调用。
- 想推荐**尚未安装**的市场能力，请改用 marketplace 发现类技能（如 `find-extensions`），不归本技能负责。
- 地图是**快照**：无法覆盖会话内动态加载/禁用的技能；若与当前会话可见技能列表冲突，以会话列表为准并重新生成地图。

## 常见问题

**Q：为什么有的技能不出现在可自动调用列表里？**
A：带 `disable-model-invocation: true` 的技能（地图中标 `manual-only`）被设计为仅手动 `/名字` 触发。

**Q：我希望它能被模型自动调用（自动路由）怎么办？**
A：删掉 `SKILL.md` frontmatter 里的 `disable-model-invocation: true` 这一行并保存即可。注意这会让它在更多场景下被自动拉起，可能带来额外触发噪声，按需取舍。

**Q：地图能加我自己的固定流程偏好吗？**
A：可以。编辑 `references/routing-map.md` 中 `<!-- USER-NOTES -->` 之后的内容，重新生成时会被保留。

**Q：场景闸门会把其它技能"真的关掉"吗？**
A：不会。它只约束**本路由器**的推荐 / 调用范围——被归到"关闭"场景的技能，你仍可直接 `/名字` 触发，客户端原生机制也照常能调。想在客户端层面真正限制 Agent 可加载哪些技能，需要用客户端自身的技能 / 权限设置；本技能不去改写其它技能的 frontmatter。

**Q：会不会泄露我装了哪些技能？**
A：`references/routing-map.md` 是你本机生成的本地数据，默认已被 `.gitignore` 忽略，不会被提交；仓库里只附带一份占位示例。

## 许可

MIT © xez65
