/*
 * schema.js - the content model.
 *
 * One JSON document holds the entire content universe: sections, trees,
 * columns, modules, sections, quizzes. Everything else reads and writes this
 * shape, so this file is the single source of truth for what a valid document
 * looks like, how to build new pieces of one, and how to carry an older one
 * forward.
 *
 * A module's tier is NOT stored. It is its index inside a column, and its role
 * is the slot it occupies on the tree. Storing position as data as well as
 * structure means the two can disagree the moment the editor reorders or
 * deletes something, so position is always derived.
 */

export const SCHEMA_VERSION = 3;

/*
 * Column count is data; tier depth is not.
 *
 * Every category has exactly four tiers, and the four mean the same thing in
 * every tree: a fixed proficiency ladder. That is what makes "Design III" and
 * "Risk III" comparable statements about someone's level rather than two
 * unrelated positions in two unrelated stacks.
 */
export const TIERS = 4;

export const LIMITS = {
  minColumns: 2,
  maxColumns: 6,
  defaultColumns: 4,
  tiers: TIERS,
};

export const TIER_NUMERALS = ["I", "II", "III", "IV"];

/** The ladder. Index 0 is tier I. */
export const TIER_LEVELS = ["Basic Awareness", "Foundational", "Skilled", "Advanced"];

/* The same ladder at label length, for places with a fixed width: a rail pill,
   a lattice box. "Basic Awareness" is the full name; "Basic" is what fits. */
export const TIER_SHORT = ["Basic", "Foundational", "Skilled", "Advanced"];

export const TIER_LEVEL_BLURBS = [
  "You know it exists, what it is for, and when it comes up.",
  "You can do it with guidance, and you recognise when it is going wrong.",
  "You do it unsupervised and make sound calls in ordinary situations.",
  "You handle the hard cases, set the standard, and teach it to others.",
];

/** "Basic Awareness" for tier 1, and so on. Empty for Novice and Master. */
export function tierLevel(tier) {
  return TIER_LEVELS[tier - 1] || "";
}

/** The short form: "Basic", "Foundational", "Skilled", "Advanced". */
export function tierShort(tier) {
  return TIER_SHORT[tier - 1] || "";
}

/*
 * The time contract. Each rung tells the learner what it will cost before they
 * commit, and the ladder itself communicates that depth grows with rank.
 * Master is not a time estimate: it is the final exam that pulls the four
 * categories together.
 */
export const NOVICE_TIME = "5 min";
export const MASTER_TIME = "Final Exam";
export const TIER_TIME = ["30 min", "1-2 hrs", "2-3 hrs", "4+ hrs"];

export function tierTime(entry) {
  if (!entry) return "";
  if (entry.role === "novice") return NOVICE_TIME;
  if (entry.role === "master") return MASTER_TIME;
  return TIER_TIME[entry.tier - 1] || "";
}

/**
 * A rung as two parts, for stacking: the category on top, the level beneath.
 * Novice and Master belong to no category, so they carry only a title.
 */
export function moduleRungParts(entry) {
  if (!entry) return { title: "", level: "" };
  if (entry.role !== "tier") return { title: entry.module.title, level: "" };
  return { title: entry.column.title, level: tierShort(entry.tier) };
}

/*
 * Lattice labels are capped so a box has a knowable worst case: roughly two
 * comfortable lines in the narrowest column of a six-column tree, which is what
 * the box height is sized against. Over-length values are flagged on import
 * rather than rejected, since silently truncating someone's content is worse
 * than letting it clip.
 *
 * Columns get less room because the tier numeral is appended to them.
 */
export const MAX_COLUMN_TITLE = 26;
export const MAX_MODULE_TITLE = 32;

/* Skill points per tier, mirroring how deeper SWG boxes cost more. Novice and
   Master are free, exactly as in the game. A module may override with its own
   `points`. */
export const TIER_POINTS = [4, 6, 8, 10, 12, 14];

/*
 * A module is a fixed set of named sections, not a free-form list of blocks.
 *
 * The earlier design let an author drop any block anywhere in any order, which
 * sounds flexible and in practice means every module is laid out differently and
 * nothing is predictable to read or to write. Named sections make the shape of a
 * module the same everywhere: prose first, then resources by kind, then the
 * check at the end.
 *
 * `key` is the field on the module; `kind` tells the reader and the editor which
 * renderer to use.
 */
export const MODULE_SECTIONS = [
  { key: "body", label: "Main Article", icon: "article", kind: "richtext",
    hint: "The core of the module. Rich text, notes, links." },
  { key: "links", label: "Links", icon: "link", kind: "links",
    hint: "External reading." },
  { key: "videos", label: "Videos", icon: "video", kind: "videos",
    hint: "YouTube, an uploaded file, or any embed." },
  { key: "images", label: "Images", icon: "image", kind: "images",
    hint: "Diagrams and screenshots." },
  { key: "docs", label: "Docs", icon: "file", kind: "docs",
    hint: "Downloadable documents." },
  { key: "articles", label: "Articles", icon: "book", kind: "articles",
    hint: "Further pieces beyond the main article." },
  { key: "quiz", label: "Quiz", icon: "callout", kind: "quiz",
    hint: "Passing it is what marks the module complete." },
];

/** The list-shaped sections, in the order they render. */
export const LIST_SECTIONS = MODULE_SECTIONS.filter((s) =>
  ["links", "videos", "images", "docs", "articles"].includes(s.key)
);

export const FILE_KINDS = ["pdf", "doc", "sheet", "slide", "zip", "code", "other"];
export const CALLOUT_TONES = ["note", "tip", "warning", "danger"];
export const VIDEO_KINDS = [
  { kind: "youtube", label: "YouTube" },
  { kind: "file", label: "Uploaded or direct file" },
  { kind: "embed", label: "Other embed URL" },
];

export const QUESTION_TYPES = [
  { type: "mc", label: "Multiple choice", hint: "Exactly one correct answer" },
  { type: "multi", label: "Multi select", hint: "Several correct answers" },
  { type: "tf", label: "True / False", hint: "A single boolean" },
  { type: "exact", label: "Exact answer", hint: "Typed text matched against accepted answers" },
];

/* ------------------------------------------------------------------- ids */

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A readable id derived from a title, with a short suffix so it stays unique. */
export function slugId(title, prefix = "x") {
  const base = slugify(title);
  return base ? `${base}-${Math.random().toString(36).slice(2, 6)}` : uid(prefix);
}

/* --------------------------------------------------------------- helpers */

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || lo));

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

/* ------------------------------------------------------------- factories */

/* One factory per list section. `kind` is the section key, not a block type. */
const ITEM_DEFAULTS = {
  links: { title: "", url: "", note: "" },
  // mode: "facade" loads the player on click, "link" sends them to YouTube.
  videos: { title: "", kind: "youtube", videoId: "", src: "", poster: "", caption: "", start: 0, mode: "facade" },
  images: { title: "", src: "", alt: "", caption: "" },
  docs: { title: "", src: "", filename: "", kind: "pdf", size: "" },
  articles: { title: "", body: "" },
};

export function makeItem(section, patch = {}) {
  const defaults = ITEM_DEFAULTS[section] || {};
  return { ...defaults, ...patch, id: patch.id || uid(section.slice(0, 3)) };
}

export function makeQuestion(type = "mc", patch = {}) {
  const base = { prompt: "", image: "", imageAlt: "", points: 1, explanation: "" };
  const defaults = {
    mc: {
      choices: [
        { id: uid("c"), text: "", correct: true },
        { id: uid("c"), text: "", correct: false },
      ],
    },
    multi: {
      choices: [
        { id: uid("c"), text: "", correct: true },
        { id: uid("c"), text: "", correct: true },
        { id: uid("c"), text: "", correct: false },
      ],
    },
    tf: { answer: true },
    exact: { answers: [""], caseSensitive: false },
  };
  const id = patch.id || uid("q");
  return { ...base, ...(defaults[type] || defaults.mc), ...patch, id, type };
}

export function makeQuiz(patch = {}) {
  return {
    id: patch.id || uid("quiz"),
    title: "Module check",
    intro: "",
    passPct: 80,
    shuffleQuestions: false,
    shuffleChoices: true,
    allowRetry: true,
    questions: [],
    ...patch,
  };
}

/*
 * `title` is the module's TOPIC, not its lattice label. For a tier module the
 * label comes from its column (see moduleDisplayName); for Novice and Master,
 * which have no column, the title is the label.
 */
export function makeModule(title = "", patch = {}) {
  return {
    id: patch.id || slugId(title || "module", "m"),
    title,
    blurb: "",
    points: null, // null means "use the tier default"
    body: "", // Main Article, rich text HTML
    links: [],
    videos: [],
    images: [],
    docs: [],
    articles: [],
    quiz: null,
    ...patch,
  };
}

/** Whether a section has anything in it, for empty-state and collapse defaults. */
export function sectionHasContent(module, key) {
  if (key === "body") return !!String(module.body || "").replace(/<[^>]*>/g, "").trim();
  if (key === "quiz") return !!module.quiz?.questions?.length;
  return Array.isArray(module[key]) && module[key].length > 0;
}

export function moduleIsEmpty(module) {
  return MODULE_SECTIONS.every((s) => !sectionHasContent(module, s.key));
}

export function makeColumn(title = "New column", patch = {}) {
  return {
    id: patch.id || slugId(title, "col"),
    title,
    blurb: "",
    // Always four. Modules start with no topic: their name comes from this column.
    modules: Array.from({ length: TIERS }, () => makeModule("")),
    ...patch,
  };
}

export function makeTree(title = "New tree", opts = {}) {
  const { columnCount, ...patch } = opts;
  const cols = clamp(columnCount ?? LIMITS.defaultColumns, LIMITS.minColumns, LIMITS.maxColumns);
  return {
    id: patch.id || slugId(title, "t"),
    title,
    subtitle: "",
    blurb: "",
    novice: makeModule(`Novice ${title}`),
    master: makeModule(`Master ${title}`),
    columns: Array.from({ length: cols }, (_, i) => makeColumn(`Column ${i + 1}`)),
    ...patch,
  };
}

export function makeSection(title = "New section", patch = {}) {
  return { id: patch.id || slugId(title, "s"), title, blurb: "", groups: [], ...patch };
}

/*
 * A sub-section: the middle rung between a section and its trees, so a document
 * can read Software Engineering > AWS > Lambdas.
 *
 * An UNTITLED group is meaningful, not a placeholder. Its trees render straight
 * under the section with no sub-heading, which is what a section with no
 * sub-divisions should look like, and it is what the v2 migration produces.
 */
export function makeGroup(title = "", patch = {}) {
  return { id: patch.id || slugId(title || "group", "g"), title, blurb: "", treeIds: [], ...patch };
}

/** Every tree id under a section, across all its sub-sections, in order. */
export function sectionTreeIds(section) {
  return (section?.groups || []).flatMap((g) => g.treeIds || []);
}

export function findGroup(section, groupId) {
  return (section?.groups || []).find((g) => g.id === groupId) || null;
}

/** The group a tree sits in within a section, or null. */
export function groupForTree(section, treeId) {
  return (section?.groups || []).find((g) => (g.treeIds || []).includes(treeId)) || null;
}

export function makeDoc(patch = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title: "SkillTrainer", author: "", updated: today() },
    sections: [],
    trees: [],
    ...patch,
  };
}

/* ------------------------------------------------------- tree traversal */

/*
 * Every entry carries its derived position. `role` is the slot ("novice",
 * "tier", "master"); `tier` is the 1-based index within a column and is
 * meaningless for novice and master.
 */
export function allModules(tree) {
  if (!tree) return [];
  const out = [];
  if (tree.novice) {
    out.push({ module: tree.novice, role: "novice", column: null, columnIndex: -1, tier: 0 });
  }
  (tree.columns || []).forEach((column, columnIndex) => {
    (column.modules || []).forEach((module, i) => {
      out.push({ module, role: "tier", column, columnIndex, tier: i + 1 });
    });
  });
  if (tree.master) {
    out.push({ module: tree.master, role: "master", column: null, columnIndex: -1, tier: 0 });
  }
  return out;
}

/** Locate a module inside a tree, returning its derived position. */
export function findModule(tree, moduleId) {
  return allModules(tree).find((e) => e.module.id === moduleId) || null;
}

export const findTree = (doc, treeId) => doc.trees.find((t) => t.id === treeId) || null;
export const findSection = (doc, sectionId) => doc.sections.find((s) => s.id === sectionId) || null;

/** Sections that currently list this tree. A tree may appear in several. */
export const sectionsForTree = (doc, treeId) =>
  doc.sections.filter((s) => sectionTreeIds(s).includes(treeId));

/** Rows the lattice needs: master + four tiers + novice. */
export function treeRows() {
  return TIERS + 2;
}

export const moduleCount = (tree) => allModules(tree).length;

/** Points a module is worth. Novice and Master are free, as in SWG. */
export function modulePoints(entry) {
  if (entry.module.points != null) return Number(entry.module.points) || 0;
  if (entry.role !== "tier") return 0;
  return TIER_POINTS[entry.tier - 1] ?? TIER_POINTS[TIER_POINTS.length - 1];
}

export function treePoints(tree) {
  return allModules(tree).reduce((sum, e) => sum + modulePoints(e), 0);
}

/** The tier marker under a box: "I".."VI", or "Novice" / "Master" for the caps. */
export function moduleTierLabel(entry) {
  if (entry.role === "novice") return "Novice";
  if (entry.role === "master") return "Master";
  return TIER_NUMERALS[entry.tier - 1] || String(entry.tier);
}

/*
 * The name of a module, as it appears on the lattice and everywhere else.
 *
 * A column is a category, and every tier in it carries the category's name:
 * Hunting I, Hunting II, Hunting III, Hunting IV. So the name is DERIVED from
 * the column rather than stored per module, which means renaming a column
 * renames its whole stack and the two can never disagree.
 *
 * A module's own `title` is its topic: what that particular tier covers. It is
 * optional, and it shows on the module page rather than on the box.
 */
export function moduleDisplayName(entry) {
  if (!entry) return "";
  if (entry.role !== "tier") return entry.module.title;
  const numeral = TIER_NUMERALS[entry.tier - 1] || String(entry.tier);
  return `${entry.column.title} ${numeral}`;
}

/** Display name resolved from ids, for callers that only have the tree. */
export function moduleNameById(tree, moduleId) {
  return moduleDisplayName(findModule(tree, moduleId));
}

/** Fresh ids throughout, so a duplicated or imported tree cannot collide. */
export function reidTree(tree) {
  const clone = deepClone(tree);
  clone.id = slugId(clone.title, "t");
  const rekey = (m) => {
    m.id = slugId(m.title, "m");
    LIST_SECTIONS.forEach(({ key }) => (m[key] || []).forEach((item) => (item.id = uid(key.slice(0, 3)))));
    if (m.quiz) {
      m.quiz.id = uid("quiz");
      (m.quiz.questions || []).forEach((q) => {
        q.id = uid("q");
        (q.choices || []).forEach((c) => (c.id = uid("c")));
      });
    }
  };
  if (clone.novice) rekey(clone.novice);
  if (clone.master) rekey(clone.master);
  (clone.columns || []).forEach((col) => {
    col.id = slugId(col.title, "col");
    (col.modules || []).forEach(rekey);
  });
  return clone;
}

/* --------------------------------------------------------------- migrate */

/*
 * Migrations run in order against documents older than SCHEMA_VERSION, so packs
 * authored today keep loading after the model changes. Each entry takes a doc
 * at version N and returns one at N + 1.
 *
 * The markdown-to-HTML converter is injected rather than imported, because
 * markdown.js imports dom.js and schema.js must stay dependency-free. store.js
 * wires it up at boot via setMarkdownConverter().
 */
let markdownToHtml = (md) => `<p>${String(md || "").replace(/</g, "&lt;")}</p>`;

export function setMarkdownConverter(fn) {
  if (typeof fn === "function") markdownToHtml = fn;
}

const MIGRATIONS = {
  /*
   * v1 -> v2: a flat, ordered `blocks[]` array becomes named sections.
   *
   * The first article block is the Main Article, since that is what it was
   * being used as; later ones become entries in Articles. Callouts have no
   * section of their own any more, because notes are now something you write
   * inline in the rich text, so each one is folded into the main body as a note
   * box. Everything else sorts into the section for its kind.
   */
  1: (doc) => {
    (doc.trees || []).forEach((tree) => {
      const modules = [tree.novice, tree.master]
        .concat((tree.columns || []).flatMap((c) => c.modules || []))
        .filter(Boolean);

      modules.forEach((m) => {
        const blocks = Array.isArray(m.blocks) ? m.blocks : [];
        delete m.blocks;

        m.body = m.body || "";
        m.links = m.links || [];
        m.videos = m.videos || [];
        m.images = m.images || [];
        m.docs = m.docs || [];
        m.articles = m.articles || [];

        let mainTaken = false;
        const bodyParts = [];

        blocks.forEach((b) => {
          switch (b.type) {
            case "article": {
              const htmlBody =
                (b.title ? `<h2>${escapeText(b.title)}</h2>` : "") + markdownToHtml(b.body);
              if (!mainTaken) {
                mainTaken = true;
                bodyParts.unshift(htmlBody);
              } else {
                m.articles.push({ id: uid("art"), title: b.title || "", body: markdownToHtml(b.body) });
              }
              break;
            }
            case "callout":
              bodyParts.push(
                `<div class="rt-note" data-tone="${escapeText(b.tone || "note")}">` +
                  (b.title ? `<p><strong>${escapeText(b.title)}</strong></p>` : "") +
                  markdownToHtml(b.body) +
                  `</div>`
              );
              break;
            case "image":
              m.images.push({
                id: uid("ima"), title: b.title || "", src: b.src || "",
                alt: b.alt || "", caption: b.caption || "",
              });
              break;
            case "youtube":
              m.videos.push({
                id: uid("vid"), kind: "youtube", title: b.title || "", videoId: b.videoId || "",
                src: "", poster: "", caption: b.caption || "",
                start: Number(b.start) || 0, mode: b.mode === "link" ? "link" : "facade",
              });
              break;
            case "video":
              m.videos.push({
                id: uid("vid"), kind: /^https?:\/\//i.test(b.src || "") && !/\.(mp4|webm|ogv|mov)/i.test(b.src || "") ? "embed" : "file",
                title: b.title || "", videoId: "", src: b.src || "", poster: b.poster || "",
                caption: b.caption || "", start: 0, mode: "facade",
              });
              break;
            case "link":
              m.links.push({ id: uid("lin"), title: b.title || "", url: b.url || "", note: b.note || "" });
              break;
            case "file":
              m.docs.push({
                id: uid("doc"), title: b.title || "", src: b.src || "",
                filename: b.filename || "", kind: b.kind || "pdf", size: b.size || "",
              });
              break;
          }
        });

        if (bodyParts.length) m.body = bodyParts.join("\n") + (m.body || "");
      });
    });

    doc.schemaVersion = 2;
    return doc;
  },

  /*
   * v2 -> v3: sections gain sub-sections.
   *
   * A section's flat treeIds becomes a single UNTITLED group, which renders
   * exactly as it did before: trees straight under the section, no sub-heading.
   * So an existing pack looks unchanged and can grow sub-sections later without
   * a rewrite.
   */
  2: (doc) => {
    (doc.sections || []).forEach((s) => {
      const ids = Array.isArray(s.treeIds) ? s.treeIds : [];
      delete s.treeIds;
      if (!Array.isArray(s.groups)) s.groups = [];
      if (ids.length) s.groups.unshift({ id: uid("g"), title: "", blurb: "", treeIds: ids });
    });
    doc.schemaVersion = 3;
    return doc;
  },
};

const escapeText = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function migrate(input) {
  let doc = deepClone(input);
  let v = Number(doc.schemaVersion) || 0;
  while (v < SCHEMA_VERSION && MIGRATIONS[v]) {
    doc = MIGRATIONS[v](doc);
    v = Number(doc.schemaVersion) || v + 1;
  }
  doc.schemaVersion = SCHEMA_VERSION;
  return doc;
}

/* ------------------------------------------------------------- normalize */

/*
 * Fills in anything a hand-written pack left out, so an author can write terse
 * JSON by hand and still end up with a complete document. Returns a new object.
 */
export function normalize(input) {
  const doc = migrate(input || {});

  doc.meta = { title: "SkillTrainer", author: "", updated: today(), ...(doc.meta || {}) };
  doc.trees = (Array.isArray(doc.trees) ? doc.trees : []).map(normalizeTree);
  doc.sections = (Array.isArray(doc.sections) ? doc.sections : []).map((s, i) => ({
    id: s.id || slugId(s.title || `section-${i}`, "s"),
    title: s.title || `Section ${i + 1}`,
    blurb: s.blurb || "",
    groups: (Array.isArray(s.groups) ? s.groups : []).map((g, gi) => ({
      id: g.id || slugId(g.title || `group-${gi}`, "g"),
      title: g.title || "",
      blurb: g.blurb || "",
      treeIds: Array.isArray(g.treeIds) ? [...new Set(g.treeIds)] : [],
    })),
  }));

  // Drop references to trees this document does not contain.
  const known = new Set(doc.trees.map((t) => t.id));
  doc.sections.forEach((s) => {
    s.groups.forEach((g) => (g.treeIds = g.treeIds.filter((id) => known.has(id))));
  });

  return doc;
}

function normalizeTree(t, i) {
  const title = t.title || `Tree ${i + 1}`;
  const columns = (Array.isArray(t.columns) ? t.columns : [])
    .slice(0, LIMITS.maxColumns)
    .map((c, ci) => {
      const ctitle = c.title || `Column ${ci + 1}`;
      return {
        id: c.id || slugId(ctitle, "col"),
        title: ctitle,
        blurb: c.blurb || "",
        // A tier module takes its name from this column, so a missing title is
        // just a module with no topic yet, not something to invent a name for.
        // Short columns are padded to four; long ones are left alone so that
        // validate() can report the problem instead of quietly dropping content.
        modules: padTiers((Array.isArray(c.modules) ? c.modules : []).map((m) => normalizeModule(m, ""))),
      };
    });

  return {
    id: t.id || slugId(title, "t"),
    title,
    subtitle: t.subtitle || "",
    blurb: t.blurb || "",
    novice: normalizeModule(t.novice, `Novice ${title}`),
    master: normalizeModule(t.master, `Master ${title}`),
    columns,
  };
}

/* Every category has four tiers, so a pack that writes two gets two empties. */
function padTiers(modules) {
  const out = modules.slice();
  while (out.length < TIERS) out.push(makeModule(""));
  return out;
}

function normalizeModule(m, fallbackTitle) {
  const src = m && typeof m === "object" ? m : {};
  const title = src.title || fallbackTitle;
  const list = (key) =>
    (Array.isArray(src[key]) ? src[key] : []).map((item) => makeItem(key, item || {}));

  return {
    id: src.id || slugId(title || "module", "m"),
    title,
    blurb: src.blurb || "",
    points: src.points == null ? null : Number(src.points) || 0,
    body: typeof src.body === "string" ? src.body : "",
    links: list("links"),
    videos: list("videos").map((v) => ({
      ...v,
      kind: VIDEO_KINDS.some((k) => k.kind === v.kind) ? v.kind : "youtube",
      start: Number(v.start) || 0,
    })),
    images: list("images"),
    docs: list("docs"),
    articles: list("articles"),
    quiz: src.quiz ? normalizeQuiz(src.quiz) : null,
  };
}

function normalizeQuiz(q) {
  const quiz = makeQuiz({
    ...q,
    questions: (Array.isArray(q.questions) ? q.questions : []).map(normalizeQuestion),
  });
  quiz.passPct = clamp(quiz.passPct, 1, 100);
  return quiz;
}

function normalizeQuestion(q) {
  const type = QUESTION_TYPES.some((t) => t.type === q?.type) ? q.type : "mc";
  const out = makeQuestion(type, { ...q, type });

  if (type === "mc" || type === "multi") {
    out.choices = (Array.isArray(q.choices) ? q.choices : []).map((c) =>
      typeof c === "string"
        ? { id: uid("c"), text: c, correct: false }
        : { id: c.id || uid("c"), text: c.text ?? "", correct: !!c.correct }
    );
    if (!out.choices.length) out.choices = makeQuestion(type).choices;
  }
  if (type === "exact") {
    const list = Array.isArray(q.answers) ? q.answers : q.answer != null ? [q.answer] : [];
    out.answers = list.map(String);
    if (!out.answers.length) out.answers = [""];
    out.caseSensitive = !!q.caseSensitive;
  }
  if (type === "tf") out.answer = !!q.answer;

  out.points = clamp(out.points, 1, 100);
  return out;
}

/* -------------------------------------------------------------- validate */

/*
 * Reports every problem it can find rather than throwing on the first, and
 * names the JSON path of each, so a malformed pack is actually diagnosable.
 */
export function validate(doc) {
  const errors = [];
  const warnings = [];
  const err = (path, message) => errors.push({ path, message });
  const warn = (path, message) => warnings.push({ path, message });

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: [{ path: "$", message: "Document is not an object" }], warnings };
  }
  if (!Array.isArray(doc.trees)) err("$.trees", "Missing or not an array");
  if (!Array.isArray(doc.sections)) err("$.sections", "Missing or not an array");
  if (errors.length) return { ok: false, errors, warnings };

  const seen = new Set();
  const claim = (id, path) => {
    if (!id) return err(path, "Missing id");
    if (seen.has(id)) err(path, `Duplicate id "${id}"`);
    seen.add(id);
  };

  doc.trees.forEach((t, ti) => {
    const tp = `$.trees[${ti}]`;
    claim(t.id, `${tp}.id`);
    if (!t.title) err(`${tp}.title`, "Missing title");
    if (t.novice) claim(t.novice.id, `${tp}.novice.id`);
    if (t.master) claim(t.master.id, `${tp}.master.id`);

    if (!Array.isArray(t.columns)) return err(`${tp}.columns`, "Missing or not an array");
    if (t.columns.length < LIMITS.minColumns || t.columns.length > LIMITS.maxColumns) {
      err(
        `${tp}.columns`,
        `${t.columns.length} columns; allowed range is ${LIMITS.minColumns} to ${LIMITS.maxColumns}`
      );
    }

    // Novice and Master put their own title on the lattice, so theirs is capped.
    [["novice", t.novice], ["master", t.master]].forEach(([role, m]) => {
      if (m?.title && m.title.length > MAX_MODULE_TITLE) {
        warn(
          `${tp}.${role}.title`,
          `${m.title.length} characters; over ${MAX_MODULE_TITLE} will clip on the lattice`
        );
      }
    });

    t.columns.forEach((c, ci) => {
      const cp = `${tp}.columns[${ci}]`;
      claim(c.id, `${cp}.id`);
      if (!c.title) err(`${cp}.title`, "Missing title; a column names every tier in it");
      else if (c.title.length > MAX_COLUMN_TITLE) {
        warn(
          `${cp}.title`,
          `${c.title.length} characters; over ${MAX_COLUMN_TITLE} will clip once the tier numeral is appended`
        );
      }

      if (!Array.isArray(c.modules)) return err(`${cp}.modules`, "Missing or not an array");
      if (c.modules.length !== TIERS) {
        err(
          `${cp}.modules`,
          `${c.modules.length} tiers; every category has exactly ${TIERS} (${TIER_LEVELS.join(", ")})`
        );
      }
      c.modules.forEach((m, mi) => {
        const mp = `${cp}.modules[${mi}]`;
        claim(m.id, `${mp}.id`);
        // No title check: a tier module is named by its column. `title` here is
        // the optional topic, which never appears on a box.
        validateQuiz(m.quiz, `${mp}.quiz`, err, warn);
      });
    });
  });

  const treeIds = new Set(doc.trees.map((t) => t.id));
  doc.sections.forEach((s, si) => {
    const sp = `$.sections[${si}]`;
    claim(s.id, `${sp}.id`);
    if (!s.title) err(`${sp}.title`, "Missing title");
    (s.groups || []).forEach((g, gi) => {
      const gp = `${sp}.groups[${gi}]`;
      claim(g.id, `${gp}.id`);
      (g.treeIds || []).forEach((id, i) => {
        if (!treeIds.has(id)) warn(`${gp}.treeIds[${i}]`, `References unknown tree "${id}"`);
      });
    });
  });

  return { ok: errors.length === 0, errors, warnings };
}

function validateQuiz(quiz, path, err, warn) {
  if (!quiz) return;
  if (!Array.isArray(quiz.questions)) return err(`${path}.questions`, "Not an array");
  if (!quiz.questions.length) warn(path, "Quiz has no questions and can never be passed");

  quiz.questions.forEach((q, qi) => {
    const qp = `${path}.questions[${qi}]`;
    if (!q.prompt) warn(`${qp}.prompt`, "Question has no prompt");

    if (q.type === "mc" || q.type === "multi") {
      const correct = (q.choices || []).filter((c) => c.correct).length;
      if (!q.choices?.length) err(`${qp}.choices`, "No choices");
      else if (correct === 0) err(`${qp}.choices`, "No choice marked correct");
      else if (q.type === "mc" && correct > 1) {
        err(`${qp}.choices`, `Multiple choice has ${correct} correct answers; use multi select`);
      }
    }
    if (q.type === "exact" && !(q.answers || []).some((a) => String(a).trim())) {
      err(`${qp}.answers`, "No accepted answers");
    }
  });
}

/* ----------------------------------------------------------------- merge */

/*
 * Merging a pack into a document. A tree whose id collides is replaced, since
 * re-importing an edited export should update in place rather than duplicate.
 * Sections merge their sub-sections, so a pack can add a tree to an existing section
 * without taking ownership of it.
 */
export function mergeDocs(base, incoming, { replaceTrees = true } = {}) {
  const out = deepClone(base);
  const inc = normalize(incoming);

  inc.trees.forEach((tree) => {
    const at = out.trees.findIndex((t) => t.id === tree.id);
    if (at === -1) out.trees.push(tree);
    else if (replaceTrees) out.trees[at] = tree;
  });

  inc.sections.forEach((section) => {
    const at = out.sections.findIndex((s) => s.id === section.id);
    if (at === -1) {
      out.sections.push(section);
      return;
    }
    const target = out.sections[at];
    target.title = section.title || target.title;
    target.blurb = section.blurb || target.blurb;

    // Merge sub-section by sub-section: a group with a matching id (or the same
    // title) absorbs the incoming trees; anything else is appended.
    section.groups.forEach((g) => {
      /* Match on id first, then on title. Matching empty titles matters: the
         untitled group is the "no sub-section" bucket, and a section should only
         ever have one of those, or two packs merging leave the reader with two
         unexplained blocks of loose trees. */
      const existing =
        target.groups.find((x) => x.id === g.id) ||
        target.groups.find((x) => x.title === g.title);
      if (existing) existing.treeIds = [...new Set([...existing.treeIds, ...g.treeIds])];
      else target.groups.push(g);
    });
  });

  out.meta = { ...out.meta, updated: today() };
  return out;
}
