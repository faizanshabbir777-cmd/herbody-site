/* ============================================================
   HerBody · Operations Dashboards — shared JS
   No frameworks. All fetches are relative (../data/...) or
   https://api.github.com only.
   ============================================================ */
"use strict";

const GH_BRANCH = "main";
const GH_OWNER = "faizanshabbir777-cmd";
const GH_REPO = "herbody-site";
const GH_API = "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO;
const GH_WEB = "https://github.com/" + GH_OWNER + "/" + GH_REPO;

const DATA = "../data";
const PAT_KEY = "hb_dash_pat";
const IS_FILE = location.protocol === "file:";

const AGENTS = ["master", "tiktok", "social", "video", "image", "ppc", "paid"];
const AGENT_LABELS = {
  master: "Master", tiktok: "TikTok", social: "Social",
  video: "Video", image: "Image", ppc: "PPC", paid: "Paid Growth"
};

/* ---------------- fetch helpers ---------------- */

/** Fetch a relative JSON file. Returns null on 404, network error or bad JSON. */
async function fetchJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

/* ---------------- date utils ---------------- */

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function fmtDate(v) {
  const d = parseDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(v) {
  const d = parseDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(v) {
  const d = parseDate(v);
  if (!d) return "never";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 0) return fmtDateTime(v);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " hr ago";
  const days = Math.floor(s / 86400);
  if (days === 1) return "yesterday";
  if (days < 7) return days + " days ago";
  return fmtDate(v);
}

/* ---------------- formatting ---------------- */

const nfGB = new Intl.NumberFormat("en-GB");
const nfGBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 2 });

function fmtNum(v) {
  return (typeof v === "number" && isFinite(v)) ? nfGB.format(v) : String(v);
}
function fmtGBP(v) {
  return (typeof v === "number" && isFinite(v)) ? nfGBP.format(v) : "—";
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function titleCase(s) {
  return String(s || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human label for metric-style keys: revenue_gbp → "Revenue (£)", cvr_pct → "CVR %". */
function metricLabel(k) {
  let s = String(k || "");
  const gbp = /_gbp$/i.test(s), pct = /_pct$/i.test(s);
  s = titleCase(s.replace(/_(gbp|pct)$/i, ""));
  s = s.replace(/\b(Cvr|Ctr|Cpc|Cpa|Cpm|Roas|Aov)\b/g, (m) => m.toUpperCase());
  return s + (gbp ? " (£)" : "") + (pct ? " %" : "");
}

/* ---------------- empty states & banners ---------------- */

function emptyState(title, body, hint) {
  return '<div class="empty">' +
    '<div class="empty-spark">✦</div>' +
    "<h4>" + esc(title) + "</h4>" +
    "<p>" + esc(body) + "</p>" +
    (hint ? '<div class="empty-hint">' + esc(hint) + "</div>" : "") +
    "</div>";
}

/** If opened from file:// (or fetches will fail), explain that data loads on Pages. */
function insertLocalBanner() {
  if (!IS_FILE) return;
  const page = document.querySelector(".page");
  if (!page) return;
  const div = document.createElement("div");
  div.className = "local-banner";
  div.innerHTML = '<span class="spark">✦</span><span>You are viewing this page locally — ' +
    "live data loads when it is served from GitHub Pages. Everything below shows its empty state.</span>";
  page.insertBefore(div, page.firstChild);
}

/* ---------------- agent identity ---------------- */

function agentClass(agent) {
  return AGENTS.includes(agent) ? "c-" + agent : "c-master";
}
function agentChip(agent) {
  const a = AGENTS.includes(agent) ? agent : "master";
  return '<span class="agent-chip agent-' + a + '"><span class="dot"></span>' + esc(AGENT_LABELS[a] || a) + "</span>";
}

/* ---------------- copy to clipboard ---------------- */

async function copyText(text, btn) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (e) {
    // fallback for file:// and older browsers
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    } catch (e2) { ok = false; }
  }
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = ok ? "Copied ✦" : "Copy failed";
    btn.classList.toggle("copied", ok);
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1600);
  }
  return ok;
}

/* Delegated handler: any .copy-btn with data-copy copies its payload. */
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".copy-btn[data-copy]");
  if (!btn) return;
  copyText(btn.getAttribute("data-copy"), btn);
});

/* ---------------- localStorage PAT helpers ---------------- */

function getPAT() { try { return localStorage.getItem(PAT_KEY) || ""; } catch (e) { return ""; } }
function setPAT(t) { try { localStorage.setItem(PAT_KEY, t); } catch (e) { /* private mode */ } }
function forgetPAT() { try { localStorage.removeItem(PAT_KEY); } catch (e) { /* ignore */ } }

/* ---------------- GitHub Contents API ---------------- */

function ghHeaders() {
  const h = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const t = getPAT();
  if (t) h["Authorization"] = "Bearer " + t;
  return h;
}

function b64ToUtf8(b64) {
  const bin = atob(String(b64 || "").replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

/** GET a JSON file via the Contents API. Returns {json, sha}. Throws {status}. */
async function ghGetJSON(repoPath) {
  const r = await fetch(GH_API + "/contents/" + repoPath + "?ref=" + encodeURIComponent(GH_BRANCH), {
    headers: ghHeaders(), cache: "no-store"
  });
  if (!r.ok) { const err = new Error("GitHub GET " + r.status); err.status = r.status; throw err; }
  const d = await r.json();
  return { json: JSON.parse(b64ToUtf8(d.content)), sha: d.sha };
}

/** PUT a JSON file via the Contents API (base64 + sha + branch). Returns API response. Throws {status}. */
async function ghPutJSON(repoPath, obj, sha, message) {
  const body = {
    message: message,
    content: utf8ToB64(JSON.stringify(obj, null, 2) + "\n"),
    branch: GH_BRANCH
  };
  if (sha) body.sha = sha;
  const r = await fetch(GH_API + "/contents/" + repoPath, {
    method: "PUT", headers: ghHeaders(), body: JSON.stringify(body)
  });
  if (!r.ok) { const err = new Error("GitHub PUT " + r.status); err.status = r.status; throw err; }
  return r.json();
}

/* ---------------- shared data loaders ---------------- */

async function loadQueue() {
  const idx = await fetchJSON(DATA + "/queue/index.json");
  return (idx && Array.isArray(idx.items)) ? idx.items : [];
}
async function loadApprovals() {
  const a = await fetchJSON(DATA + "/approvals.json");
  return (a && Array.isArray(a.decisions)) ? a.decisions : [];
}
async function loadPublished() {
  const p = await fetchJSON(DATA + "/published/index.json");
  return (p && Array.isArray(p.items)) ? p.items : [];
}
async function loadLatestBrief() {
  const idx = await fetchJSON(DATA + "/briefs/index.json");
  if (!idx || !Array.isArray(idx.dates) || !idx.dates.length) return null;
  const latest = idx.dates.slice().sort().pop();
  const brief = await fetchJSON(DATA + "/briefs/" + latest + ".json");
  return brief ? Object.assign({ date: latest }, brief) : null;
}

function decidedIds(decisions) {
  return new Set(decisions.map((d) => d.id));
}

/* ---------------- payload rendering (drawer / approvals) ---------------- */

const FIELD_ORDER = [
  "media_url", "video_url", "image_url", "preview_url", "thumbnail_url",
  "visual_qa_status", "media_status", "product_on_screen_plan", "product_spec_version", "product_asset_ids",
  "hook", "script", "shot_list", "voiceover", "caption", "hashtags", "alt_text",
  "generation_prompt", "visual_prompt", "negative_prompt", "trend_basis", "expiry",
  "title", "headline", "primary_text", "description", "cta", "landing_url", "utm"
];

function fieldCopyValue(v) {
  if (Array.isArray(v)) {
    return v.every((x) => typeof x !== "object")
      ? v.map(String).join(v.some((x) => String(x).startsWith("#")) ? " " : "\n")
      : JSON.stringify(v, null, 2);
  }
  if (v && typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v == null ? "" : v);
}

const MEDIA_URL_KEYS = new Set(["media_url", "video_url", "image_url", "preview_url", "thumbnail_url"]);

function renderField(key, value) {
  const label = titleCase(key);
  const copyVal = fieldCopyValue(value);
  let valueHtml;
  if (MEDIA_URL_KEYS.has(key) && typeof value === "string" && /^https?:\/\//.test(value)) {
    const isImg = key === "image_url" || key === "thumbnail_url" || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);
    valueHtml = '<div class="field-value">' +
      (isImg
        ? '<a href="' + esc(value) + '" target="_blank" rel="noopener"><img src="' + esc(value) + '" alt="' + esc(label) + ' preview" style="max-width:220px;max-height:220px;border-radius:8px;display:block;margin-bottom:6px" loading="lazy"></a>'
        : "") +
      '<a href="' + esc(value) + '" target="_blank" rel="noopener">' + esc(value) + "</a></div>";
    return '<div class="field">' +
      '<div class="field-head"><span class="field-label">' + esc(label) + "</span>" +
      '<button type="button" class="copy-btn" data-copy="' + esc(copyVal) + '">Copy</button></div>' +
      valueHtml + "</div>";
  }
  if (key === "hashtags" && Array.isArray(value)) {
    valueHtml = '<div class="field-value"><div class="hashtag-wrap">' +
      value.map((h) => '<span class="hashtag">' + esc(String(h).startsWith("#") ? h : "#" + h) + "</span>").join("") +
      "</div></div>";
  } else if (Array.isArray(value) && value.every((x) => typeof x !== "object")) {
    valueHtml = '<div class="field-value">' + value.map((x) => esc(x)).join("\n") + "</div>";
  } else if (value && typeof value === "object") {
    valueHtml = '<div class="field-value mono-block">' + esc(JSON.stringify(value, null, 2)) + "</div>";
  } else {
    valueHtml = '<div class="field-value">' + esc(value) + "</div>";
  }
  return '<div class="field">' +
    '<div class="field-head"><span class="field-label">' + esc(label) + "</span>" +
    '<button type="button" class="copy-btn" data-copy="' + esc(copyVal) + '">Copy</button></div>' +
    valueHtml + "</div>";
}

/** Render a full payload object as labelled fields with copy buttons. */
function renderPayload(payload) {
  if (!payload || typeof payload !== "object" || !Object.keys(payload).length) {
    return '<p class="skeleton">No payload on this item yet.</p>';
  }
  const keys = Object.keys(payload);
  keys.sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a), ib = FIELD_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return keys.map((k) => renderField(k, payload[k])).join("");
}

/** Meta line (chips) for a queue/published item. */
function itemMetaChips(item, statusLabelHtml) {
  let html = agentChip(item.agent);
  if (item.platform && item.platform !== item.agent) html += '<span class="agent-chip">' + esc(titleCase(item.platform)) + "</span>";
  if (item.type) html += '<span class="agent-chip">' + esc(titleCase(item.type)) + "</span>";
  if (statusLabelHtml) html += statusLabelHtml;
  return html;
}

/* ---------------- autonomy status panel ---------------- */

function renderAutonomyPanel(policy, published, usage) {
  const el = document.getElementById("autonomy");
  if (!el) return;
  if (!policy) {
    el.innerHTML = emptyState(
      "No autonomy config",
      "data/config/autonomy.json controls how automatic the fleet is — from draft-only up to autonomous organic posting and ad scaling.",
      "Everything behaves as draft_only until the file exists."
    );
    return;
  }
  const kill = policy.kill_switch === true;
  const mode = policy.mode || "draft_only";
  const todayKey = ymd(new Date());
  const postedToday = {};
  (published || []).forEach((p) => {
    if (String(p.published_at || "").slice(0, 10) === todayKey && p.mode !== "ready-manual") {
      postedToday[p.platform] = (postedToday[p.platform] || 0) + 1;
    }
  });
  const autoPosted = (published || []).filter((p) =>
    String(p.published_at || "").slice(0, 10) === todayKey && p.mode === "api-auto").length;
  const caps = policy.max_posts_per_day_by_platform || {};
  const capRows = Object.keys(caps).map((p) =>
    '<div class="guard-row"><span class="k">' + esc(titleCase(p)) + " posts today</span><span class=\"v\">" +
    esc(String(postedToday[p] || 0)) + " / " + esc(String(caps[p])) + "</span></div>").join("");
  const ads = policy.ads || {};
  el.innerHTML = '<div class="card">' +
    '<div class="guard-row"><span class="k">Mode</span><span class="v' + (mode === "draft_only" ? "" : " on") + '">' + esc(mode) + "</span></div>" +
    '<div class="guard-row"><span class="k">Kill switch</span><span class="v">' + (kill ? "🔴 ACTIVE — all automation halted" : "off") + "</span></div>" +
    '<div class="guard-row"><span class="k">Allowed platforms</span><span class="v">' + esc((policy.allowed_platforms || []).join(", ") || "none") + "</span></div>" +
    capRows +
    '<div class="guard-row"><span class="k">Auto-posted today</span><span class="v">' + esc(String(autoPosted)) + "</span></div>" +
    '<div class="guard-row"><span class="k">Ad budget cap</span><span class="v">' + esc(fmtGBP(ads.max_daily_ad_budget_gbp)) + "/day · stop-loss " + esc(fmtGBP(ads.stop_loss_spend_gbp)) + "</span></div>" +
    '<div class="guard-row"><span class="k">Gates</span><span class="v">' +
    (policy.requires_compliance_pass ? "compliance PASS" : "⚠ compliance gate OFF") + " · " +
    (policy.requires_visual_qa_pass ? "visual QA pass" : "⚠ visual QA gate OFF") + "</span></div>" +
    (function () {
      const day = usage && usage.dates && usage.dates[todayKey];
      return '<div class="guard-row"><span class="k">Anthropic tokens today</span><span class="v">' +
        (day ? esc(fmtNum(day.input_tokens) + " in / " + fmtNum(day.output_tokens) + " out · " + day.calls + " calls") : "—") + "</span></div>";
    })() +
    '<p class="footnote" style="margin:10px 0 0">Config lives in data/config/autonomy.json — flip kill_switch to true to stop all automatic generation, posting and scaling instantly.</p>' +
    "</div>";
}

/* ============================================================
   PAGE: index.html — master overview
   ============================================================ */

async function initIndex() {
  insertLocalBanner();

  const [metrics, queue, decisions, brief, autonomy, published, ...agentStates] = await Promise.all([
    fetchJSON(DATA + "/metrics/latest.json"),
    loadQueue(),
    loadApprovals(),
    loadLatestBrief(),
    fetchJSON(DATA + "/config/autonomy.json"),
    loadPublished(),
    ...AGENTS.map((a) => fetchJSON(DATA + "/state/" + a + ".json"))
  ]);
  const stateByAgent = {};
  AGENTS.forEach((a, i) => { stateByAgent[a] = agentStates[i]; });
  const master = stateByAgent.master;
  const usage = await fetchJSON(DATA + "/state/anthropic-usage.json");
  renderAutonomyPanel(autonomy, published, usage);

  /* --- KPI tiles --- */
  const sh = (metrics && metrics.shopify) || {};
  const pendingCount = queue.filter((it) => !decidedIds(decisions).has(it.id)).length;
  const kpis = [
    { label: "Revenue", value: (typeof sh.revenue_gbp === "number") ? fmtGBP(sh.revenue_gbp) : null, sub: metrics && metrics.updated ? "as of " + timeAgo(metrics.updated) : "awaiting first metrics run", accent: true },
    { label: "Orders", value: (typeof sh.orders === "number") ? fmtNum(sh.orders) : null, sub: "Shopify" },
    { label: "Subscriptions", value: (typeof sh.subs === "number") ? fmtNum(sh.subs) : null, sub: "active subscribers" },
    { label: "Queue depth", value: fmtNum(queue.length), sub: pendingCount + " awaiting your decision" },
    { label: "Last fleet run", value: master && master.last_run ? timeAgo(master.last_run) : null, small: true,
      sub: master && master.last_run
        ? (timeAgo(master.last_run) === fmtDateTime(master.last_run) ? "MASTER's last commit" : fmtDateTime(master.last_run))
        : "the fleet has not run yet" }
  ];
  document.getElementById("kpis").innerHTML = kpis.map((k) => {
    const val = (k.value == null)
      ? '<div class="kpi-value pending">—</div>'
      : '<div class="kpi-value' + (k.small ? " pending" : "") + '">' + esc(k.value) + "</div>";
    return '<div class="kpi' + (k.accent ? " kpi-accent" : "") + '"><div class="kpi-label">' + esc(k.label) + "</div>" +
      val + '<div class="kpi-sub">' + esc(k.sub || "") + "</div></div>";
  }).join("");

  /* --- daily brief --- */
  const briefEl = document.getElementById("brief");
  if (!brief) {
    briefEl.innerHTML = emptyState(
      "No brief yet",
      "Once the agent fleet runs, MASTER writes a morning brief here — the day's wins, anything that needs watching, and the short list of actions that need you.",
      "Briefs land in data/briefs/ after each fleet run."
    );
  } else {
    const kpiChips = brief.kpis && Object.keys(brief.kpis).length
      ? '<div class="brief-kpis">' + Object.entries(brief.kpis).map(([k, v]) => {
        const val = (typeof v === "number") ? (/_gbp$/i.test(k) ? fmtGBP(v) : fmtNum(v)) : v;
        return '<span class="brief-kpi">' + esc(metricLabel(k)) + " <b>" + esc(val) + "</b></span>";
      }).join("") + "</div>"
      : "";
    const col = (cls, heading, arr, fallback) =>
      '<div class="brief-col ' + cls + '"><h4>' + heading + "</h4>" +
      ((arr && arr.length)
        ? "<ul>" + arr.map((x) => "<li>" + esc(typeof x === "string" ? x : JSON.stringify(x)) + "</li>").join("") + "</ul>"
        : '<p class="skeleton">' + esc(fallback) + "</p>") + "</div>";
    const notes = brief.per_agent_notes && Object.keys(brief.per_agent_notes).length
      ? '<div class="brief-notes">' + Object.entries(brief.per_agent_notes).map(([a, n]) =>
        '<div class="note-row">' + agentChip(a) + "<span>" + esc(n) + "</span></div>").join("") + "</div>"
      : "";
    briefEl.innerHTML = '<div class="card brief-card">' +
      '<div class="brief-date">Daily brief ✦ ' + esc(fmtDate(brief.date)) + "</div>" +
      kpiChips +
      '<div class="brief-cols">' +
      col("wins", "Wins", brief.wins, "Nothing logged yet.") +
      col("issues", "Issues", brief.issues, "Nothing flagged — quiet day.") +
      col("actions", "For you", brief.actions_for_owner, "Nothing needs you today.") +
      "</div>" + notes + "</div>";
  }

  /* --- per-agent status cards --- */
  const states = stateByAgent;
  const anyState = AGENTS.some((a) => states[a] && states[a].last_run);
  const cardsEl = document.getElementById("agent-cards");
  cardsEl.innerHTML = AGENTS.map((a) => {
    const s = states[a] || {};
    const actions = Array.isArray(s.recent_actions) ? s.recent_actions.slice(-3).reverse() : [];
    const actionsHtml = actions.length
      ? '<div><div class="mini-label">Recent actions</div><ul>' +
        actions.map((x) => "<li>" + esc(typeof x === "string" ? x : (x && (x.summary || x.action)) || JSON.stringify(x)) + "</li>").join("") + "</ul></div>"
      : '<p class="skeleton">No actions recorded yet.</p>';
    const summary = s.rolling_summary
      ? '<div class="summary">' + esc(s.rolling_summary) + "</div>"
      : "";
    return '<div class="card agent-card">' +
      '<div class="agent-card-head">' + agentChip(a) +
      '<span class="last-run">' + (s.last_run ? "ran " + esc(timeAgo(s.last_run)) : "not yet run") + "</span></div>" +
      actionsHtml + summary + "</div>";
  }).join("");
  if (!anyState) {
    const note = document.createElement("p");
    note.className = "footnote";
    note.style.marginTop = "14px";
    note.textContent = "Each card fills in with the agent's last run, its recent actions and a rolling summary once the fleet has been dispatched.";
    cardsEl.after(note);
  }
}

/* ============================================================
   PAGE: calendar.html — content calendar
   ============================================================ */

const cal = {
  view: "month",
  cursor: null,           // Date anchored to the 1st of the shown month
  entries: [],            // merged queue + published
  itemsById: {}
};

async function initCalendar() {
  insertLocalBanner();

  const [queue, published, decisions] = await Promise.all([loadQueue(), loadPublished(), loadApprovals()]);
  const decMap = {};
  decisions.forEach((d) => { decMap[d.id] = d; });
  const publishedIds = new Set(published.map((p) => p.id));

  cal.entries = [];
  queue.forEach((it) => {
    if (publishedIds.has(it.id)) return; // shown from the published list instead
    const d = parseDate(it.scheduled_for) || parseDate(it.created);
    const dec = decMap[it.id];
    cal.entries.push({
      kind: "queued", date: d, item: it,
      status: dec ? dec.status : "pending"
    });
    cal.itemsById[it.id] = it;
  });
  published.forEach((p) => {
    cal.entries.push({ kind: "published", date: parseDate(p.published_at), item: p, status: "published" });
  });

  // start the grid on the month of the earliest upcoming entry, else today
  const now = new Date();
  const upcoming = cal.entries.filter((e) => e.date && e.date >= new Date(now.getFullYear(), now.getMonth(), 1))
    .sort((a, b) => a.date - b.date);
  const anchor = upcoming.length ? upcoming[0].date : now;
  cal.cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);

  document.getElementById("cal-prev").addEventListener("click", () => { shiftMonth(-1); });
  document.getElementById("cal-next").addEventListener("click", () => { shiftMonth(1); });
  document.getElementById("cal-today").addEventListener("click", () => {
    cal.cursor = new Date(now.getFullYear(), now.getMonth(), 1); renderCalendar();
  });
  document.querySelectorAll(".view-toggle button").forEach((b) => {
    b.addEventListener("click", () => {
      cal.view = b.dataset.view;
      document.querySelectorAll(".view-toggle button").forEach((x) => x.classList.toggle("active", x === b));
      renderCalendar();
    });
  });
  setupDrawer();
  renderCalendar();
}

function shiftMonth(delta) {
  cal.cursor = new Date(cal.cursor.getFullYear(), cal.cursor.getMonth() + delta, 1);
  renderCalendar();
}

function calEntryChip(e, compact) {
  const it = e.item;
  const cls = agentClass(it.agent);
  const tick = e.kind === "published" ? '<span class="tick">✓</span> ' : "";
  const title = it.title || titleCase(it.type || "item");
  if (compact) {
    return '<button type="button" class="cal-item ' + cls + (e.kind === "published" ? " published" : "") + '" data-id="' + esc(it.id) + '" data-kind="' + e.kind + '" title="' + esc(title) + '">' +
      '<span class="who">' + esc(AGENT_LABELS[it.agent] || it.agent || "?") + "</span>" + tick + esc(title) + "</button>";
  }
  const statusChip = e.kind === "published"
    ? '<span class="status-chip status-published">✓ Published' + (it.mode ? " · " + esc(it.mode) : "") + "</span>"
    : '<span class="status-chip status-' + esc(e.status) + '">' + esc(e.status) + "</span>";
  return '<button type="button" class="cal-row ' + cls + '" data-id="' + esc(it.id) + '" data-kind="' + e.kind + '">' +
    agentChip(it.agent) +
    '<span class="title">' + tick + esc(title) + "</span>" +
    '<span class="meta">' + esc(it.platform ? titleCase(it.platform) : "") + "</span>" +
    statusChip + "</button>";
}

function renderCalendar() {
  const gridWrap = document.getElementById("cal-grid-wrap");
  const listWrap = document.getElementById("cal-list-wrap");
  const label = document.getElementById("cal-month-label");
  const y = cal.cursor.getFullYear(), m = cal.cursor.getMonth();
  label.textContent = cal.cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const hasAny = cal.entries.length > 0;
  const emptyHtml = emptyState(
    "Nothing scheduled yet",
    "When the agents draft content and campaigns, everything lands here on its scheduled day — TikToks, social posts and PPC campaigns, each colour-marked by agent, with a ✓ once published.",
    "The queue lives in data/queue/ and fills after the first fleet run."
  );

  if (cal.view === "month") {
    gridWrap.style.display = "";
    listWrap.style.display = "none";

    // Monday-first grid
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayKey = ymd(new Date());

    const byDay = {};
    cal.entries.forEach((e) => {
      if (!e.date) return;
      const k = ymd(e.date);
      (byDay[k] = byDay[k] || []).push(e);
    });

    let cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      .map((d) => '<div class="cal-dow">' + d + "</div>").join("");
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells += '<div class="cal-cell out"></div>';
        continue;
      }
      const dateKey = ymd(new Date(y, m, dayNum));
      const dayEntries = (byDay[dateKey] || []).sort((a, b) => (a.date - b.date));
      cells += '<div class="cal-cell' + (dateKey === todayKey ? " today" : "") + '">' +
        '<div class="cal-daynum">' + dayNum + "</div>" +
        dayEntries.map((e) => calEntryChip(e, true)).join("") +
        "</div>";
    }
    gridWrap.innerHTML = '<div class="cal-scroll"><div class="cal-grid">' + cells + "</div></div>" +
      (!hasAny ? '<div style="margin-top:16px">' + emptyHtml + "</div>" : "");
  } else {
    gridWrap.style.display = "none";
    listWrap.style.display = "";
    if (!hasAny) { listWrap.innerHTML = emptyHtml; return; }
    const sorted = cal.entries.filter((e) => e.date).sort((a, b) => a.date - b.date)
      .concat(cal.entries.filter((e) => !e.date));
    let html = "", lastDay = null;
    sorted.forEach((e) => {
      const dayLabel = e.date ? fmtDate(e.date) : "Unscheduled";
      if (dayLabel !== lastDay) {
        html += '<div class="cal-list-day">' + esc(dayLabel) + "</div>";
        lastDay = dayLabel;
      }
      html += calEntryChip(e, false);
    });
    listWrap.innerHTML = '<div class="cal-list">' + html + "</div>";
  }
}

/* --- detail drawer --- */

function setupDrawer() {
  const close = () => document.body.classList.remove("drawer-open");
  document.getElementById("drawer-close").addEventListener("click", close);
  document.getElementById("drawer-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".cal-item[data-id], .cal-row[data-id]");
    if (!btn) return;
    openDrawer(btn.dataset.id, btn.dataset.kind);
  });
}

async function openDrawer(id, kind) {
  const entry = cal.entries.find((e) => e.item.id === id && e.kind === kind) ||
    cal.entries.find((e) => e.item.id === id);
  if (!entry) return;
  const it = entry.item;
  document.body.classList.add("drawer-open");
  document.getElementById("drawer-title").textContent = it.title || titleCase(it.type || "Item");

  const statusChip = entry.kind === "published"
    ? '<span class="status-chip status-published">✓ Published ' + (it.mode ? "· " + esc(it.mode) : "") + "</span>"
    : '<span class="status-chip status-' + esc(entry.status) + '">' + esc(entry.status) + "</span>";
  const when = entry.kind === "published"
    ? "Published " + fmtDateTime(it.published_at)
    : (it.scheduled_for ? "Scheduled for " + fmtDate(it.scheduled_for) : "No date set");

  const body = document.getElementById("drawer-body");
  body.innerHTML = '<div class="drawer-meta">' + itemMetaChips(it, statusChip) + "</div>" +
    '<p class="skeleton">' + esc(when) + "</p>";

  if (entry.kind === "published") {
    let extra = "";
    if (it.result_url) {
      extra += '<div class="field"><div class="field-head"><span class="field-label">Live link</span>' +
        '<button type="button" class="copy-btn" data-copy="' + esc(it.result_url) + '">Copy</button></div>' +
        '<div class="field-value"><a href="' + esc(it.result_url) + '" target="_blank" rel="noopener">' + esc(it.result_url) + "</a></div></div>";
    }
    body.innerHTML += extra || '<p class="skeleton">Published item — no further payload stored in the index.</p>';
    return;
  }

  body.innerHTML += '<p class="skeleton" id="drawer-loading">Loading full payload…</p>';
  const full = it.path ? await fetchJSON(DATA + "/" + it.path) : null;
  const loading = document.getElementById("drawer-loading");
  if (loading) loading.remove();
  if (!full) {
    body.innerHTML += emptyState("Payload not found", "The item file could not be loaded" + (IS_FILE ? " — payloads load when served from GitHub Pages." : ". It may not be committed yet."));
    return;
  }
  body.innerHTML += renderPayload(full.payload || full);
}

/* ============================================================
   PAGE: ppc.html — PPC overview
   ============================================================ */

async function initPPC() {
  insertLocalBanner();

  const [queue, metrics, budgets, published] = await Promise.all([
    loadQueue(),
    fetchJSON(DATA + "/metrics/latest.json"),
    fetchJSON(DATA + "/config/budgets.json"),
    loadPublished()
  ]);

  /* --- budget guard --- */
  const cap = (budgets && typeof budgets.max_daily_budget_gbp === "number") ? budgets.max_daily_budget_gbp : 25;
  document.getElementById("guard-rows").innerHTML =
    '<div class="guard-row"><span class="k">Daily budget cap (all platforms)</span><span class="v">' + esc(fmtGBP(cap)) + "/day</span></div>" +
    '<div class="guard-row"><span class="k">Mode</span><span class="v on">draft_only — nothing spends without your approval</span></div>' +
    '<div class="guard-row"><span class="k">Budget source</span><span class="v">data/config/budgets.json</span></div>' +
    '<div class="guard-row"><span class="k">Currency</span><span class="v">' + esc((budgets && budgets.currency) || "GBP") + "</span></div>";

  /* --- campaign cards from queue (type === "campaign") --- */
  const campaignItems = queue.filter((it) => it.type === "campaign");
  const campEl = document.getElementById("campaigns");
  if (!campaignItems.length) {
    campEl.innerHTML = emptyState(
      "No campaign drafts yet",
      "When the PPC agent drafts a campaign — Google, Meta or TikTok — its full spec appears here as a card: objective, budget, targeting and creative, ready for your read-through.",
      "Campaign drafts stay in draft_only mode until approved on the Approvals page."
    );
  } else {
    const cards = await Promise.all(campaignItems.map(async (it) => {
      const full = it.path ? await fetchJSON(DATA + "/" + it.path) : null;
      const spec = (full && (full.payload || full)) || {};
      const rows = Object.entries(spec)
        .filter(([, v]) => v == null || typeof v !== "object")
        .slice(0, 8)
        .map(([k, v]) => {
          let val = v == null ? "—" : String(v);
          if (/budget|spend|bid|cost/i.test(k) && typeof v === "number") val = fmtGBP(v);
          return '<div class="spec-row"><span class="k">' + esc(metricLabel(k)) + '</span><span class="v">' + esc(val) + "</span></div>";
        }).join("");
      return '<div class="card campaign-card">' +
        '<div class="agent-card-head"><h3>' + esc(it.title || "Campaign") + "</h3>" + agentChip(it.agent || "ppc") + "</div>" +
        '<div class="kpi-sub" style="margin-top:4px">' + esc(titleCase(it.platform || "")) +
        (it.scheduled_for ? " · " + esc(fmtDate(it.scheduled_for)) : "") + "</div>" +
        (rows ? '<div class="spec-rows">' + rows + "</div>" : '<p class="skeleton" style="margin-top:10px">Spec file not loaded yet.</p>') +
        "</div>";
    }));
    campEl.innerHTML = '<div class="grid-2">' + cards.join("") + "</div>";
  }

  /* --- spend metrics --- */
  const metEl = document.getElementById("spend-metrics");
  const platforms = [["gads", "Google Ads"], ["meta", "Meta"], ["tiktok", "TikTok"]];
  const hasMetrics = metrics && platforms.some(([k]) => metrics[k] && Object.keys(metrics[k]).length);
  if (!hasMetrics) {
    metEl.innerHTML = emptyState(
      "No spend data yet",
      "Once campaigns are live and the metrics agent runs, spend, clicks and conversions per platform roll up here from data/metrics/latest.json.",
      metrics && metrics.updated ? "Last metrics run: " + fmtDateTime(metrics.updated) : "The metrics rollup has not run yet."
    );
  } else {
    metEl.innerHTML = '<div class="grid-3">' + platforms.map(([key, name]) => {
      const m = (metrics && metrics[key]) || {};
      const rows = Object.entries(m).map(([k, v]) => {
        let val = (typeof v === "number") ? (/gbp|spend|cost|revenue/i.test(k) ? fmtGBP(v) : fmtNum(v)) : String(v);
        return '<div class="spec-row"><span class="k">' + esc(metricLabel(k)) + '</span><span class="v num">' + esc(val) + "</span></div>";
      }).join("");
      return '<div class="card metric-block"><h4>' + esc(name) + "</h4>" +
        (rows || '<p class="skeleton">Nothing reported yet.</p>') + "</div>";
    }).join("") + "</div>" +
    (metrics && metrics.updated ? '<p class="footnote">Updated ' + esc(timeAgo(metrics.updated)) + "</p>" : "");
  }

  /* --- repo links (branch-aware) --- */
  const links = [
    ["ads/google/campaigns", "Google campaign YAML + Ads Editor CSVs"],
    ["ads/meta/campaigns", "Meta campaign YAML"],
    ["ads/tiktok/campaigns", "TikTok campaign YAML"],
    ["ads/shared", "Shared ad copy + assets"],
    ["data/config/budgets.json", "Budget allocation (the £" + cap + "/day cap lives here)"]
  ];
  document.getElementById("repo-links").innerHTML = links.map(([p, what]) => {
    const kind = p.endsWith(".json") ? "blob" : "tree";
    return '<a class="repo-link" target="_blank" rel="noopener" href="' + GH_WEB + "/" + kind + "/" + GH_BRANCH + "/" + p + '">' +
      '<span class="path">' + esc(p) + '</span><span class="what">' + esc(what) + " →</span></a>";
  }).join("");
}

/* ============================================================
   PAGE: approvals.html — approval queue
   ============================================================ */

const APPROVALS_REPO_PATH = "data/approvals.json";

async function initApprovals() {
  insertLocalBanner();
  setupTokenPanel();
  setupKillSwitchPanel();

  const [queue, decisions] = await Promise.all([loadQueue(), loadApprovals()]);
  const done = decidedIds(decisions);
  const pending = queue.filter((it) => !done.has(it.id));

  const countEl = document.getElementById("pending-count");
  if (countEl) countEl.textContent = pending.length
    ? pending.length + " item" + (pending.length === 1 ? "" : "s") + " waiting for you"
    : "Nothing waiting";

  const listEl = document.getElementById("approval-list");
  if (!pending.length) {
    listEl.innerHTML = emptyState(
      queue.length ? "All caught up ✦" : "Nothing to approve yet",
      queue.length
        ? "Every queued item has a decision. New drafts appear here the moment an agent queues them."
        : "When the agents draft content or campaigns, each one lands here for your yes or no. Nothing publishes without you.",
      "Drafts queue in data/queue/ · decisions are written to data/approvals.json"
    );
    return;
  }

  const qaDoc = await fetchJSON(DATA + "/visual-qa.json");
  const qaById = {};
  ((qaDoc && qaDoc.decisions) || []).forEach((d) => { qaById[d.id] = d; });

  listEl.innerHTML = pending.map((it) => {
    const qa = qaById[it.id];
    const qaChip = qa
      ? '<span class="status-chip status-' + (qa.status === "pass" ? "approved" : "rejected") + '">QA ' + esc(qa.status) + "</span>"
      : "";
    return '<div class="approval-item ' + agentClass(it.agent) + '" data-id="' + esc(it.id) + '">' +
      '<button type="button" class="approval-summary" data-toggle="' + esc(it.id) + '">' +
      '<span class="title">' + esc(it.title || titleCase(it.type || "Untitled draft")) + " " + qaChip + "</span>" +
      agentChip(it.agent) +
      '<span class="meta">' + esc(titleCase(it.platform || "")) +
      (it.scheduled_for ? " · " + esc(fmtDate(it.scheduled_for)) : "") + "</span>" +
      '<span class="chev">▾</span></button>' +
      '<div class="approval-body">' +
      '<div class="payload-slot"><p class="skeleton">Expand to load the full draft…</p></div>' +
      '<div class="decision-bar">' +
      '<input type="text" class="decision-note" placeholder="Optional note (kept with the decision)" aria-label="Decision note">' +
      '<button type="button" class="pill pill-good" data-decide="approved">Approve ✦</button>' +
      '<button type="button" class="pill pill-bad" data-decide="rejected">Reject</button>' +
      "</div>" +
      '<div class="decision-bar qa-bar" hidden>' +
      '<span class="field-label" style="align-self:center">Visual QA — does the media show the REAL product (label, jar, gummies) exactly?</span>' +
      '<button type="button" class="pill pill-good" data-qa="pass">QA pass ✦</button>' +
      '<button type="button" class="pill pill-bad" data-qa="fail">QA fail</button>' +
      "</div>" +
      '<div class="decision-result" hidden></div>' +
      "</div></div>";
  }).join("");

  // expand/collapse + lazy payload load
  listEl.addEventListener("click", async (ev) => {
    const toggle = ev.target.closest("[data-toggle]");
    if (toggle) {
      const itemEl = toggle.closest(".approval-item");
      const isOpen = itemEl.classList.toggle("open");
      const slot = itemEl.querySelector(".payload-slot");
      if (isOpen && !slot.dataset.loaded) {
        slot.dataset.loaded = "1";
        const it = pending.find((x) => x.id === itemEl.dataset.id);
        slot.innerHTML = '<p class="skeleton">Loading draft…</p>';
        const full = it && it.path ? await fetchJSON(DATA + "/" + it.path) : null;
        slot.innerHTML = full
          ? renderPayload(full.payload || full)
          : '<p class="skeleton">Could not load the item file' + (IS_FILE ? " — payloads load when served from GitHub Pages." : ".") + "</p>";
        // Show the visual-QA bar only for items that actually carry generated media.
        const payload = (full && (full.payload || full)) || {};
        if (payload.media_url || payload.video_url || payload.image_url || payload.media_status === "generated" || payload.media_status === "pending") {
          const qaBar = itemEl.querySelector(".qa-bar");
          if (qaBar) qaBar.hidden = false;
        }
      }
      return;
    }
    const decideBtn = ev.target.closest("[data-decide]");
    if (decideBtn) {
      const itemEl = decideBtn.closest(".approval-item");
      decide(itemEl, decideBtn.dataset.decide);
      return;
    }
    const qaBtn = ev.target.closest("[data-qa]");
    if (qaBtn) {
      const itemEl = qaBtn.closest(".approval-item");
      qaDecide(itemEl, qaBtn.dataset.qa);
    }
  });
}

const VISUAL_QA_REPO_PATH = "data/visual-qa.json";

/** Write a visual-QA verdict (pass/fail) to data/visual-qa.json via the Contents API. */
async function qaDecide(itemEl, status) {
  const id = itemEl.dataset.id;
  const note = itemEl.querySelector(".decision-note").value.trim();
  const resultEl = itemEl.querySelector(".decision-result");
  const buttons = itemEl.querySelectorAll("[data-qa]");
  resultEl.hidden = false;
  resultEl.className = "decision-result";

  if (!getPAT()) {
    resultEl.className = "decision-result err";
    resultEl.textContent = "No token saved — add your fine-grained GitHub token in the settings panel above first.";
    return;
  }
  buttons.forEach((b) => b.classList.add("busy"));
  resultEl.textContent = "Writing visual-QA verdict to GitHub…";

  const decision = { id: id, status: status, by: "owner-dashboard", at: new Date().toISOString() };
  if (note) decision.note = note;

  const attempt = async () => {
    let json = { version: 1, decisions: [] }, sha = undefined;
    try {
      const got = await ghGetJSON(VISUAL_QA_REPO_PATH);
      json = got.json; sha = got.sha;
    } catch (e) {
      if (e.status !== 404) throw e; // 404 → first verdict creates the file
    }
    if (!Array.isArray(json.decisions)) json.decisions = [];
    json.decisions = json.decisions.filter((d) => d.id !== id);
    json.decisions.push(decision);
    return ghPutJSON(VISUAL_QA_REPO_PATH, json, sha, "Visual QA " + status + " " + id + " via dashboard");
  };

  try {
    let res;
    try { res = await attempt(); }
    catch (e) { if (e.status === 409) { res = await attempt(); } else { throw e; } }
    const commitUrl = res && res.commit && res.commit.html_url;
    resultEl.className = "decision-result ok";
    resultEl.innerHTML = "Visual QA " + esc(status) + " saved" +
      (commitUrl ? ' — <a href="' + esc(commitUrl) + '" target="_blank" rel="noopener">view commit</a>.' : ".") +
      (status === "pass" ? " This asset can now auto-post / promote once compliance and mode allow." : " This asset is blocked from auto-posting and paid promotion.");
    itemEl.querySelector(".approval-summary .title").insertAdjacentHTML("beforeend",
      ' <span class="status-chip status-' + (status === "pass" ? "approved" : "rejected") + '">QA ' + esc(status) + "</span>");
  } catch (e) {
    resultEl.className = "decision-result err";
    resultEl.textContent = "Could not save the visual-QA verdict (" + (e.status || "network error") + "). Check your token and connection, then try again.";
  } finally {
    buttons.forEach((b) => b.classList.remove("busy"));
  }
}

/** Write a decision to data/approvals.json via the GitHub Contents API. */
async function decide(itemEl, status) {
  const id = itemEl.dataset.id;
  const note = itemEl.querySelector(".decision-note").value.trim();
  const resultEl = itemEl.querySelector(".decision-result");
  const buttons = itemEl.querySelectorAll("[data-decide]");
  resultEl.hidden = false;
  resultEl.className = "decision-result";

  if (!getPAT()) {
    resultEl.className = "decision-result err";
    resultEl.textContent = "No token saved — add your fine-grained GitHub token in the settings panel above first.";
    return;
  }

  buttons.forEach((b) => b.classList.add("busy"));
  resultEl.textContent = "Writing decision to GitHub…";

  const decision = {
    id: id,
    status: status,                       // "approved" | "rejected"
    by: "owner-dashboard",
    at: new Date().toISOString()
  };
  if (note) decision.note = note;

  const attempt = async () => {
    const { json, sha } = await ghGetJSON(APPROVALS_REPO_PATH);
    const doc = (json && typeof json === "object") ? json : { version: 1, decisions: [] };
    if (!Array.isArray(doc.decisions)) doc.decisions = [];
    doc.decisions = doc.decisions.filter((d) => d.id !== id); // one decision per item
    doc.decisions.push(decision);
    return ghPutJSON(APPROVALS_REPO_PATH, doc, sha,
      (status === "approved" ? "Approve" : "Reject") + " " + id + " via dashboard");
  };

  try {
    let res;
    try {
      res = await attempt();
    } catch (e) {
      if (e.status === 409) {
        // someone else wrote in between — refetch and retry once
        res = await attempt();
      } else { throw e; }
    }
    // optimistic UI
    itemEl.querySelector(".decision-bar").style.display = "none";
    const commitUrl = res && res.commit && res.commit.html_url;
    resultEl.className = "decision-result ok";
    resultEl.innerHTML = (status === "approved" ? "Approved ✦ " : "Rejected. ") +
      "Decision saved" + (commitUrl ? ' — <a href="' + esc(commitUrl) + '" target="_blank" rel="noopener">view commit</a>' : ".") +
      (status === "approved" ? ' Ready when you are: <a href="https://github.com/' + GH_OWNER + "/" + GH_REPO + '/actions/workflows/publish-approved.yml" target="_blank" rel="noopener">publish now</a>.' : "");
    itemEl.querySelector(".approval-summary .title").insertAdjacentHTML("beforeend",
      ' <span class="status-chip status-' + status + '">' + status + "</span>");
    const countEl = document.getElementById("pending-count");
    if (countEl) {
      const remaining = document.querySelectorAll(".approval-item:not(.decided)").length - 1;
      itemEl.classList.add("decided");
      countEl.textContent = remaining > 0 ? remaining + " item" + (remaining === 1 ? "" : "s") + " waiting for you" : "Nothing waiting";
    }
  } catch (e) {
    resultEl.className = "decision-result err";
    if (e.status === 401) {
      resultEl.textContent = "GitHub rejected the token (401). Check it has Contents read & write on " + GH_OWNER + "/" + GH_REPO + ", hasn't expired, then save it again above.";
    } else if (e.status === 404) {
      resultEl.textContent = "approvals.json not found on branch \"" + GH_BRANCH + "\" (404). Check the branch still exists — or update GH_BRANCH in dash.js after a merge.";
    } else if (e.status === 409) {
      resultEl.textContent = "Write conflict (409) twice in a row — someone else is writing at the same moment. Wait a few seconds and try again.";
    } else {
      resultEl.textContent = "Could not save the decision (" + (e.status || "network error") + "). Check your connection and try again.";
    }
  } finally {
    buttons.forEach((b) => b.classList.remove("busy"));
  }
}

/* --- kill switch panel --- */

const AUTONOMY_REPO_PATH = "data/config/autonomy.json";

function setupKillSwitchPanel() {
  const btn = document.getElementById("kill-switch-btn");
  const statusEl = document.getElementById("kill-switch-status");
  if (!btn) return;

  let active = null;

  const render = () => {
    if (active === null) {
      btn.textContent = "Unavailable";
      btn.disabled = true;
      statusEl.className = "token-status none";
      statusEl.textContent = "Could not read data/config/autonomy.json.";
      return;
    }
    btn.disabled = false;
    if (active) {
      btn.textContent = "Resume automation";
      btn.className = "pill pill-good";
      statusEl.className = "token-status ok";
      statusEl.textContent = "🔴 KILL SWITCH ACTIVE — all automatic generation, posting and scaling is halted.";
    } else {
      btn.textContent = "STOP all automation";
      btn.className = "pill pill-bad";
      statusEl.className = "token-status none";
      statusEl.textContent = "Automation running normally (kill switch off).";
    }
  };

  fetchJSON(DATA + "/config/autonomy.json").then((cfg) => {
    active = cfg ? cfg.kill_switch === true : null;
    render();
  });

  btn.addEventListener("click", async () => {
    if (!getPAT()) {
      statusEl.className = "token-status none";
      statusEl.textContent = "No token saved — add your GitHub token above first.";
      return;
    }
    const next = !active;
    if (next && !window.confirm("Activate the kill switch? All automatic generation, posting and ad scaling stops on the next run.")) return;
    btn.disabled = true;
    statusEl.textContent = "Writing to GitHub…";
    try {
      const attempt = async () => {
        const { json, sha } = await ghGetJSON(AUTONOMY_REPO_PATH);
        json.kill_switch = next;
        return ghPutJSON(AUTONOMY_REPO_PATH, json, sha,
          (next ? "KILL SWITCH ON" : "kill switch off") + " via dashboard");
      };
      try { await attempt(); } catch (e) { if (e.status === 409) await attempt(); else throw e; }
      active = next;
      render();
    } catch (e) {
      statusEl.className = "token-status none";
      statusEl.textContent = "Could not update the kill switch (" + (e.status || "network error") + ").";
      btn.disabled = false;
    }
  });
}

/* --- token settings panel --- */

function setupTokenPanel() {
  const input = document.getElementById("token-input");
  const saveBtn = document.getElementById("token-save");
  const forgetBtn = document.getElementById("token-forget");
  const statusEl = document.getElementById("token-status");
  if (!input) return;

  const refresh = () => {
    const t = getPAT();
    if (t) {
      statusEl.className = "token-status ok";
      statusEl.textContent = "✦ Token saved in this browser (ends …" + t.slice(-4) + ")";
      input.value = "";
      input.placeholder = "Token saved — paste a new one to replace it";
    } else {
      statusEl.className = "token-status none";
      statusEl.textContent = "No token saved yet — approvals are read-only until you add one.";
      input.placeholder = "github_pat_…";
    }
  };
  saveBtn.addEventListener("click", () => {
    const v = input.value.trim();
    if (!v) { statusEl.className = "token-status none"; statusEl.textContent = "Paste a token first."; return; }
    setPAT(v);
    refresh();
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") saveBtn.click(); });
  forgetBtn.addEventListener("click", () => { forgetPAT(); refresh(); });
  refresh();
}
