#!/usr/bin/env node
// scan-skills.mjs — rebuild the global skill routing map (references/routing-map.md).
// Part of the Ayaka Map Router skill.
//
// Usage:
//   node scan-skills.mjs [--out <path-to-routing-map.md>] [--home <dir>] [--cwd <dir>]
//   --out   : where to write the map (default: <skill>/references/routing-map.md)
//   --home  : override the home directory used to locate user-level skill dirs (for testing)
//   --cwd   : override the workspace directory to scan (default: process.cwd())
//
// stdout is ASCII-only (Windows console safety); all skill text goes to the file.
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const HOME = flag('--home', homedir());
const CWD = flag('--cwd', process.cwd());
const outFile = flag('--out', join(HERE, '..', 'references', 'routing-map.md'));

// Parse the frontmatter keys we care about, including YAML folded/literal blocks (| or >).
function readFront(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const fm = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(name|description|when_to_use|disable-model-invocation):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let val = kv[2].trim();
    if (/^[|>][-+]?$/.test(val)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) { parts.push(lines[++i].trim()); }
      val = parts.join(' ');
    }
    fm[kv[1]] = val.replace(/^["']|["']$/g, '');
  }
  return fm;
}

// Scenario classification — heuristic keyword tagging (first pass; the router + user refine at runtime).
// A skill may match several scenarios; 'general' = matched none (utility/router skills, always allowed).
const SCENARIOS = [
  { key: 'coding',  label: '编程 / 开发', kw: ['code','coding','implement','debug','test','tdd','review','refactor','deploy','git','program','api','bug','build','dev','compile','script','fullstack','backend','frontend','unit','merge','commit','scaffold','migrat','代码','实现','调试','测试','审查','重构','部署','开发','编译','脚本','分支','合并','接口','编程','工程'] },
  { key: 'design',  label: '设计 / 绘图', kw: ['design','ui','ux','diagram','c4','graphviz','plantuml','structurizr','prototype','draw','svg','excalidraw','drawio','figma','mockup','visual','wireframe','architecture','chart','topology','绘图','设计','架构','原型','视觉','界面','图表','拓扑'] },
  { key: 'writing', label: '文档 / 写作', kw: ['doc','document','writing','readme','paper','thesis','report','markdown','ppt','pptx','slide','presentation','deck','essay','documentation','outline','文档','写作','论文','报告','说明','演示','幻灯片','大纲','文案','撰写'] },
  { key: 'chat',    label: '日常 / 问答', kw: ['ask','chat','answer','explain','translate','summarize','summary','brainstorm','idea','question','router','闲聊','问答','翻译','总结','头脑','想法','解释','路由'] },
];
const SCEN_LABEL = { general: '通用 / 工具', ...Object.fromEntries(SCENARIOS.map(s => [s.key, s.label])) };
function classify(name, desc) {
  const hay = ((name || '') + ' ' + (desc || '')).toLowerCase();
  const scored = SCENARIOS
    .map(s => ({ key: s.key, n: s.kw.reduce((a, k) => a + (hay.includes(k.toLowerCase()) ? 1 : 0), 0) }))
    .filter(s => s.n > 0)
    .sort((a, b) => b.n - a.n);
  return scored.length
    ? { scen: scored.map(s => s.key), primary: scored[0].key }
    : { scen: ['general'], primary: 'general' };
}

// Recursively find directories that contain a SKILL.md (a skill folder).
function walk(dir, depth, acc) {
  if (depth > 6) return acc;
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (existsSync(join(p, 'SKILL.md'))) { acc.push(p); continue; }
    walk(p, depth + 1, acc);
  }
  return acc;
}

function collect(dir, group) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const p of walk(dir, 0, [])) {
    let text = '';
    try { text = readFileSync(join(p, 'SKILL.md'), 'utf8'); } catch { continue; }
    const fm = readFront(text);
    const nm = fm.name || basename(p);
    const desc = (fm.description || '(no description)').replace(/\s+/g, ' ').trim().slice(0, 300);
    const sc = classify(nm, desc);
    out.push({
      name: nm,
      desc,
      hidden: fm['disable-model-invocation'] === 'true',
      group,
      scen: sc.scen,
      primary: sc.primary,
    });
  }
  return out;
}

// 1) User-level skill directories (Qoder / AGENTS / Claude conventions).
const entries = [
  ...collect(join(HOME, '.qoder-cn', 'skills'), 'Qoder user-level'),
  ...collect(join(HOME, '.agents', 'skills'), 'AGENTS user-level (~/.agents/skills)'),
  ...collect(join(HOME, '.claude', 'skills'), 'Claude user-level (~/.claude/skills)'),
];

// 2) Plugin caches. Layouts vary; scan a few known roots and, for each plugin,
//    look for a `skills/` dir directly or one version-level down.
const pluginRoots = [
  { root: join(HOME, '.qoder-cn', 'plugins', 'cache'), marketDepth: 1 },
  { root: join(HOME, '.claude', 'plugins'), marketDepth: 0 },
];
for (const { root, marketDepth } of pluginRoots) {
  if (!existsSync(root)) continue;
  let markets;
  try { markets = readdirSync(root); } catch { continue; }
  for (const market of markets) {
    const mdir = join(root, market);
    if (!existsSync(mdir) || !statSync(mdir).isDirectory()) continue;
    const pluginsDir = marketDepth === 1 ? mdir : mdir; // both: <root>/<market>/<plugin>
    let plugins;
    try { plugins = readdirSync(pluginsDir); } catch { continue; }
    for (const plugin of plugins) {
      const pdir = join(pluginsDir, plugin);
      if (!existsSync(pdir) || !statSync(pdir).isDirectory()) continue;
      const group = `plugin:${plugin}`;
      let skills = collect(join(pdir, 'skills'), group);
      if (skills.length === 0) {
        for (const ver of readdirSync(pdir)) {
          skills = skills.concat(collect(join(pdir, ver, 'skills'), group));
        }
      }
      entries.push(...skills);
    }
  }
}

// 3) Current workspace.
entries.push(...collect(join(CWD, '.qoder', 'skills'), `workspace:${CWD}`));
entries.push(...collect(join(CWD, '.agents', 'skills'), `workspace:${CWD}`));
const wsPlugins = join(CWD, 'plugins');
if (existsSync(wsPlugins)) {
  for (const p of readdirSync(wsPlugins)) {
    entries.push(...collect(join(wsPlugins, p, 'skills'), `plugin(workspace):${p}`));
  }
}

// Dedup within a group; track cross-group presence of the same name.
const byKey = new Map();
for (const e of entries) {
  const k = `${e.group}::${e.name}`;
  const prev = byKey.get(k);
  if (prev) { prev.dup = (prev.dup || 1) + 1; continue; }
  byKey.set(k, { ...e });
}
const all = [...byKey.values()];
const names = new Map();
for (const e of all) {
  if (!names.has(e.name)) names.set(e.name, []);
  names.get(e.name).push(e.group);
}
const groups = new Map();
for (const e of all) {
  if (!groups.has(e.group)) groups.set(e.group, []);
  groups.get(e.group).push(e);
}

const ts = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
let md = `# Global Skill Routing Map\n\n`;
md += `<!-- Generated by scripts/scan-skills.mjs at ${ts}. Do not hand-edit above USER-NOTES. -->\n\n`;
md += `Total: ${all.length} skill folders, ${new Set(all.map(e => e.name)).size} unique names, ${groups.size} groups.\n\n`;
if (all.length === 0) {
  md += `_No skills found in the scanned locations. Check that skill folders contain a \`SKILL.md\`._\n\n`;
}

// By-scenario summary (heuristic tags; refine via USER-NOTES or at runtime).
md += `## 按场景归类 (By scenario)\n\n`;
md += `> 分类为关键词启发式初判，一个技能可属多个场景；\`general\` 为通用/工具类，任何场景都可用。最终以路由器判断 + 用户确认为准。\n\n`;
for (const key of [...SCENARIOS.map(s => s.key), 'general']) {
  const uniq = new Map();
  for (const e of all) if (e.scen.includes(key) && !uniq.has(e.name)) uniq.set(e.name, e);
  const items = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
  md += `### ${SCEN_LABEL[key]} (\`${key}\`) — ${items.length}\n\n`;
  md += items.length ? items.map(e => `/${e.name}`).join(' · ') + `\n\n` : `_（无）_\n\n`;
}

for (const [g, list] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  md += `## ${g}\n\n`;
  for (const e of list.sort((a, b) => a.name.localeCompare(b.name))) {
    const also = names.get(e.name).filter(x => x !== e.group);
    const dupNote = also.length ? ` _(also in: ${also.join(', ')})_` : '';
    const hiddenNote = e.hidden ? ` **[manual-only: model cannot auto-invoke; user triggers /${e.name}]**` : '';
    const scenNote = ` _[${e.scen.join(', ')}]_`;
    md += `- **/${e.name}** — ${e.desc}${hiddenNote}${dupNote}${scenNote}\n`;
  }
  md += `\n`;
}

// Preserve user notes across regenerations.
const marker = '<!-- USER-NOTES -->';
if (existsSync(outFile)) {
  try {
    const old = readFileSync(outFile, 'utf8');
    const i = old.indexOf(marker);
    if (i >= 0) md += old.slice(i) + '\n';
  } catch { /* fresh write */ }
}
if (!md.includes(marker)) md += `${marker}\n## Custom flow notes (hand-edit; survives regeneration)\n\n- (empty)\n`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, md, 'utf8');
console.log(`OK entries=${all.length} unique=${new Set(all.map(e => e.name)).size} groups=${groups.size}`);
