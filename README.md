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

## 工作原理

```
你的提问
  │
  ├─ 读 references/routing-map.md（缺失/过期则先重新生成）
  │        ▲
  │        │ node scripts/scan-skills.mjs
  │        │
  │     扫描 ~/.qoder-cn · ~/.agents · ~/.claude · 插件缓存 · 工作区
  │     解析每个 SKILL.md 的 frontmatter（name/description/disable-model-invocation）
  │
  ├─ 把任务拆成 领域 × 任务类型 × 阶段
  └─ 输出 ≤3 个候选 + 理由 + 触发方式
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

**Q：会不会泄露我装了哪些技能？**
A：`references/routing-map.md` 是你本机生成的本地数据，默认已被 `.gitignore` 忽略，不会被提交；仓库里只附带一份占位示例。

## 许可

MIT © xez65
