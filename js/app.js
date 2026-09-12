(function () {
  "use strict";

  const DATA = window.STUDY_DATA;
  const ITEMS = DATA.items;
  const STORAGE = {
    manual: "route-ac:manual:v1",
    handle: "route-ac:cf-handle:v1",
    solved: "route-ac:cf-solved:v1",
    profile: "route-ac:cf-profile:v1",
    activity: "route-ac:cf-activity:v1",
    syncedAt: "route-ac:cf-synced-at:v1",
  };
  const SHEETS = ["A", "B", "C1", "C2", "D1", "D2", "D3", "CP31"];
  const SHEET_NAMES = {
    A: "Div2-A · Start here",
    B: "Div2-B · Build range",
    C1: "Div2-C · Part one",
    C2: "Div2-C · Part two",
    D1: "Div2-D · Part one",
    D2: "Div2-D · Part two",
    D3: "Div2-D · Part three",
    CP31: "CP-31 · 800–1900",
  };
  const TITLES = {
    dashboard: ["Today", "Your training route"],
    library: ["Problem library", "Every problem, one place"],
    cp31: ["CP-31", "Climb by rating"],
    lessons: ["Lessons", "Watch before you solve"],
    resources: ["Resources", "All links, preserved"],
  };

  const readJSON = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const manual = new Set(readJSON(STORAGE.manual, []));
  const cfSolved = new Set(readJSON(STORAGE.solved, []));
  const cfActivity = readJSON(STORAGE.activity, []);
  const savedProfile = readJSON(STORAGE.profile, null);

  const state = {
    view: "dashboard",
    search: "",
    sheet: "all",
    status: "all",
    platform: "all",
    type: "all",
    rating: "all",
    visible: 80,
    linkSearch: "",
    linkPlatform: "all",
    linksVisible: 120,
    expanded: new Set(),
    menuOpen: false,
    modalOpen: false,
    handle: localStorage.getItem(STORAGE.handle) || "",
    profile: savedProfile,
    cfSolved,
    cfActivity,
    syncStatus: savedProfile ? "live" : "idle",
    syncMessage: savedProfile ? syncLabel() : "Connect a public handle to import accepted submissions.",
    toast: null,
  };

  function syncLabel() {
    const raw = Number(localStorage.getItem(STORAGE.syncedAt) || 0);
    if (!raw) return "Saved on this device.";
    return `Last synced ${new Date(raw).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function icon(name) {
    const paths = {
      dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      library: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
      cp31: '<path d="m4 17 6-6 4 4 6-7"/><path d="M14 8h6v6"/><path d="M4 22h16"/>',
      lessons: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>',
      resources: '<path d="M15 7h3a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h3"/><path d="m9 11 3 3 3-3"/><path d="M12 14V3"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      external: '<path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      sync: '<path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 2 7"/>',
      x: '<path d="M18 6 6 18M6 6l12 12"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
  }

  function cfKey(item) {
    return item.contestId && item.index ? `${item.contestId}-${item.index}` : "";
  }

  function isSynced(item) {
    const key = cfKey(item);
    return Boolean(key && state.cfSolved.has(key));
  }

  function isComplete(item) {
    return manual.has(item.id) || isSynced(item);
  }

  function saveManual() {
    localStorage.setItem(STORAGE.manual, JSON.stringify([...manual]));
  }

  function sheetStats(sheet) {
    const rows = ITEMS.filter((item) => item.sheet === sheet && item.type === "problem");
    const done = rows.filter(isComplete).length;
    return { total: rows.length, done, percent: rows.length ? Math.round((done / rows.length) * 100) : 0 };
  }

  function overallStats() {
    const problems = ITEMS.filter((item) => item.type === "problem");
    const lessons = ITEMS.filter((item) => item.type === "lesson");
    const solved = problems.filter(isComplete).length;
    const watched = lessons.filter(isComplete).length;
    return {
      problems: problems.length,
      lessons: lessons.length,
      solved,
      watched,
      percent: problems.length ? Math.round((solved / problems.length) * 100) : 0,
      manual: problems.filter((item) => manual.has(item.id) && !isSynced(item)).length,
      verified: problems.filter(isSynced).length,
    };
  }

  function currentStreak() {
    const days = new Set(state.cfActivity);
    if (!days.size) return 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    const today = cursor.toISOString().slice(0, 10);
    if (!days.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let streak = 0;
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }

  function navButton(view, label) {
    return `<button class="nav-button ${state.view === view ? "active" : ""}" data-view="${view}">${icon(view)}<span>${label}</span></button>`;
  }

  function sidebar() {
    return `<aside class="sidebar ${state.menuOpen ? "open" : ""}">
      <div class="brand"><div class="brand-mark">AC</div><div><strong>Route AC</strong><span>training index</span></div></div>
      <p class="nav-label">Workspace</p>
      <nav class="nav-list" aria-label="Primary navigation">
        ${navButton("dashboard", "Overview")}
        ${navButton("library", "Problem library")}
        ${navButton("cp31", "CP-31 sheet")}
        ${navButton("lessons", "Video lessons")}
        ${navButton("resources", "Resources")}
      </nav>
      <p class="rail-label">Study route</p>
      <div class="route-rail">
        ${SHEETS.map((sheet) => {
          const stats = sheetStats(sheet);
          return `<button class="route-node ${state.view !== "dashboard" && state.sheet === sheet ? "active" : ""}" data-sheet-jump="${sheet}" title="${escapeHTML(SHEET_NAMES[sheet])}">
            <span class="route-code">${sheet === "CP31" ? "31" : sheet}</span>
            <span class="route-name">${escapeHTML(SHEET_NAMES[sheet])}</span>
            <span class="route-percent">${stats.percent}%</span>
          </button>`;
        }).join("")}
      </div>
      <div class="sidebar-foot"><div class="sync-mini"><strong>${state.handle ? `@${escapeHTML(state.handle)}` : "Local progress"}</strong><span>${state.handle ? "Codeforces handle saved on this device." : "Manual marks are saved in this browser."}</span></div></div>
    </aside>`;
  }

  function topbar() {
    const [eyebrow, title] = TITLES[state.view];
    return `<header class="topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="icon-btn mobile-menu" data-action="toggle-menu" aria-label="Open menu">${icon("menu")}</button>
        <div><div class="eyebrow">${eyebrow}</div><h1 class="page-title">${title}</h1></div>
      </div>
      <div class="top-actions">
        <a class="btn ghost" href="Junior_Sheet_StudyGuide.pdf" target="_blank" rel="noopener">Original guide ${icon("external")}</a>
        <button class="btn ${state.handle ? "signal" : "primary"}" data-action="open-sync">${state.handle ? `@${escapeHTML(state.handle)}` : "Connect CF"}</button>
      </div>
    </header>`;
  }

  function syncCard() {
    const statusText = state.syncStatus === "busy" ? "Reading accepted submissions…" : state.syncMessage;
    return `<div class="sync-card">
      <div>
        <div class="eyebrow">Codeforces sync</div>
        <h3>${state.profile ? `${escapeHTML(state.profile.handle)} · ${escapeHTML(state.profile.rank || "unrated")}` : "Handle only. No password."}</h3>
        <p>Public Codeforces submissions mark matching Junior Sheet and CP-31 problems automatically. Manual marks always remain available.</p>
        <div class="sync-status"><span class="status-dot ${state.syncStatus}"></span>${escapeHTML(statusText)}</div>
      </div>
      <div class="handle-form">
        <button class="btn primary" data-action="open-sync">${state.handle ? "Sync again" : "Connect handle"}</button>
        ${state.handle ? '<button class="btn" data-action="disconnect">Disconnect</button>' : ""}
      </div>
    </div>`;
  }

  function dashboard() {
    const stats = overallStats();
    const next = ITEMS.find((item) => item.type === "problem" && !isComplete(item));
    return `<section>
      <div class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Junior Sheet V5.6 + CP-31</div>
          <h2>Practice until <em>accepted</em> feels ordinary.</h2>
          <p>A single, searchable route through Mostafa Saad’s Junior Sheet and 372 CP-31 problems. Watch the lesson, solve the task, keep the streak.</p>
          <div class="hero-actions">
            <button class="btn signal" data-view="library">Open problem library ${icon("chevron")}</button>
            <button class="btn ghost" data-view="lessons" style="color:white;border-color:#4b5e53">Browse lessons</button>
          </div>
        </div>
        <div class="hero-meter">
          <div class="meter" style="--percent:${stats.percent}"><div class="meter-inner"><strong>${stats.percent}%</strong><span>route complete</span></div></div>
        </div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><span>Solved</span><strong>${stats.solved}</strong><small>of ${stats.problems.toLocaleString()} problems</small></div>
        <div class="stat-card"><span>CF verified</span><strong>${stats.verified}</strong><small>accepted submissions</small></div>
        <div class="stat-card"><span>Lessons watched</span><strong>${stats.watched}</strong><small>of ${stats.lessons} videos</small></div>
        <div class="stat-card"><span>Current streak</span><strong>${currentStreak()}</strong><small>UTC submission days</small></div>
      </div>
      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-head"><div><h3 class="panel-title">The route</h3><p class="panel-subtitle">Progress from absolute beginner to Div2-D, then climb CP-31 by rating.</p></div><button class="btn small" data-view="library">View all</button></div>
          <div class="ladder">
            ${SHEETS.map((sheet) => {
              const x = sheetStats(sheet);
              return `<button class="ladder-card" data-sheet-jump="${sheet}"><span class="ladder-fill" style="--fill:${x.percent}%"></span><span class="ladder-top"><span class="ladder-code">${sheet}</span><span class="ladder-count">${x.done}/${x.total}</span></span><span class="ladder-bottom"><span class="ladder-percent">${x.percent}%</span><span class="ladder-note">complete</span></span></button>`;
            }).join("")}
          </div>
        </div>
        <div class="continue-card">
          <div class="eyebrow">Next unsolved</div>
          ${next ? `<h3>${escapeHTML(next.name)}</h3><p>${escapeHTML(next.notes || "Open the statement, solve it, then mark it done—or let Codeforces do it for you.")}</p><div class="continue-meta">${chip(next.sheet, "")}${next.rating ? chip(String(next.rating), "blue") : ""}${chip(next.platform || "Practice", "")}</div>${next.problemUrl ? `<a class="btn signal" href="${escapeHTML(next.problemUrl)}" target="_blank" rel="noopener noreferrer">Solve now ${icon("external")}</a>` : `<button class="btn signal" data-sheet-jump="${next.sheet}">Open sheet</button>`}` : '<h3>Route complete.</h3><p>Every problem in the tracker is marked solved.</p>'}
        </div>
      </div>
      <div class="section-block">${syncCard()}</div>
    </section>`;
  }

  function chip(text, className = "") {
    return `<span class="chip ${className}">${escapeHTML(text)}</span>`;
  }

  function filteredItems() {
    const forcedSheet = state.view === "cp31" ? "CP31" : state.sheet;
    const forcedType = state.view === "lessons" ? "lesson" : state.type;
    const query = state.search.trim().toLowerCase();
    return ITEMS.filter((item) => {
      if (forcedSheet !== "all" && item.sheet !== forcedSheet) return false;
      if (forcedType !== "all" && item.type !== forcedType) return false;
      if (state.status === "done" && !isComplete(item)) return false;
      if (state.status === "todo" && isComplete(item)) return false;
      if (state.platform !== "all" && item.platform !== state.platform) return false;
      if (state.rating !== "all" && String(item.rating || "") !== state.rating) return false;
      if (query) {
        const haystack = `${item.name} ${item.problemLabel || ""} ${(item.tags || []).join(" ")} ${item.notes || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function select(name, options, value) {
    return `<select class="field" data-filter="${name}" aria-label="${name}">${options.map(([key, label]) => `<option value="${escapeHTML(key)}" ${String(value) === String(key) ? "selected" : ""}>${escapeHTML(label)}</option>`).join("")}</select>`;
  }

  function toolbar() {
    const platforms = [...new Set(ITEMS.map((item) => item.platform).filter(Boolean))].sort();
    const ratings = [...new Set(ITEMS.map((item) => item.rating).filter(Boolean))].sort((a, b) => a - b);
    return `<div class="toolbar">
      <label class="search-wrap">${icon("search")}<input class="field" data-search="items" value="${escapeHTML(state.search)}" placeholder="Search title, code, topic…" /></label>
      ${select("sheet", [["all", "All sheets"], ...SHEETS.map((s) => [s, s === "CP31" ? "CP-31" : `Sheet ${s}`])], state.view === "cp31" ? "CP31" : state.sheet)}
      ${select("status", [["all", "Any status"], ["todo", "To solve"], ["done", "Completed"]], state.status)}
      ${select("platform", [["all", "All platforms"], ...platforms.map((p) => [p, p])], state.platform)}
      ${select("rating", [["all", "Any rating"], ...ratings.map((r) => [String(r), `${r} rated`])], state.rating)}
    </div>`;
  }

  function problemRow(item) {
    const complete = isComplete(item);
    const synced = isSynced(item);
    const expanded = state.expanded.has(item.id);
    const links = [];
    if (item.problemUrl) links.push({ label: "Problem statement", url: item.problemUrl });
    for (const resource of item.resources || []) links.push(resource);
    return `<article class="problem-row ${complete ? "solved" : ""}">
      <button class="check ${complete ? "checked" : ""} ${synced ? "sync" : ""}" data-toggle="${escapeHTML(item.id)}" aria-label="${complete ? "Mark incomplete" : "Mark complete"}" title="${synced ? "Verified by an accepted Codeforces submission" : "Saved manually on this device"}">${icon("check")}</button>
      <div class="problem-main">
        <div class="problem-top"><span class="problem-number">${item.sheet}.${String(item.order).padStart(3, "0")}</span><span class="problem-title" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span></div>
        <div class="problem-meta">${chip(item.sheet === "CP31" ? "CP-31" : `Sheet ${item.sheet}`, item.sheet === "CP31" ? "green" : "")}${item.type === "lesson" ? chip("Video lesson", "orange") : ""}${item.rating ? chip(String(item.rating), "blue") : ""}${item.platform ? chip(item.platform, "") : ""}${synced ? chip("CF verified", "green") : complete ? chip("Manual", "yellow") : ""}${(item.tags || []).slice(0, 2).map((tag) => chip(tag, "")).join("")}</div>
      </div>
      <div class="problem-actions">
        ${item.problemUrl ? `<a class="icon-btn" href="${escapeHTML(item.problemUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open problem">${icon("external")}</a>` : ""}
        ${(item.resources || []).length ? `<a class="btn small" href="${escapeHTML(item.resources[0].url)}" target="_blank" rel="noopener noreferrer">${item.type === "lesson" ? "Watch" : "Solution"}</a>` : ""}
        ${(item.notes || links.length > 1) ? `<button class="icon-btn" data-expand="${escapeHTML(item.id)}" aria-label="Show details">${icon("more")}</button>` : ""}
      </div>
      ${expanded ? `<div class="problem-detail">${item.notes ? `<div>${escapeHTML(item.notes)}</div>` : ""}${links.length ? `<div class="detail-links">${links.map((link) => `<a class="btn small" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label || "Open resource")} ${icon("external")}</a>`).join("")}</div>` : ""}</div>` : ""}
    </article>`;
  }

  function libraryView() {
    const items = filteredItems();
    const shown = items.slice(0, state.visible);
    const title = state.view === "cp31" ? "372 handpicked Codeforces problems" : state.view === "lessons" ? "Lesson index" : "Complete study index";
    const subtitle = state.view === "cp31" ? "Thirty-one problems at every rating from 800 through 1900." : state.view === "lessons" ? "The 61 prerequisite videos appear in the same order as the original guide." : "The Junior Sheet, lesson videos, CP-31, solutions and editorials—searchable together.";
    return `<section>
      <div class="section-heading"><div><h2>${title}</h2><p>${subtitle}</p></div></div>
      ${toolbar()}
      <div class="list-summary"><span>${items.length.toLocaleString()} matching items</span><button class="btn small ghost" data-action="reset-filters">Reset filters</button></div>
      <div class="problem-list">${shown.map(problemRow).join("") || '<div class="empty"><strong>No matches</strong>Try a broader title, topic, sheet or status.</div>'}</div>
      ${shown.length < items.length ? `<div class="load-more"><button class="btn" data-action="load-more">Show ${Math.min(80, items.length - shown.length)} more</button></div>` : ""}
    </section>`;
  }

  function resourceCard(resource) {
    return `<a class="resource-card" href="${escapeHTML(resource.url)}" target="_blank" rel="noopener noreferrer"><span class="chip blue">${escapeHTML(resource.platform || "Resource")}</span><h3>${escapeHTML(resource.label)}</h3><p>Open the original resource in a new tab.</p><span class="card-arrow">Open resource →</span></a>`;
  }

  function resourcesView() {
    const featured = [
      { label: "Original Junior Sheet study guide", url: "Junior_Sheet_StudyGuide.pdf", platform: "PDF" },
      { label: "Official CP-31 sheet", url: "https://www.tle-eliminators.com/cp-sheet", platform: "TLE Eliminators" },
      { label: "CP-31 introduction", url: "https://www.youtube.com/watch?v=yMhJGm6D4Kk", platform: "YouTube" },
      ...DATA.resources,
    ];
    const query = state.linkSearch.trim().toLowerCase();
    const links = DATA.sourceLinks.filter((link) => {
      if (state.linkPlatform !== "all" && link.platform !== state.linkPlatform) return false;
      return !query || `${link.label} ${link.url} ${link.platform}`.toLowerCase().includes(query);
    });
    const platforms = [...new Set(DATA.sourceLinks.map((link) => link.platform))].sort();
    return `<section>
      <div class="section-heading"><div><h2>Start with the source</h2><p>Every unique hyperlink from the 38-page guide is preserved below, including statements, editorials, videos and reference solutions.</p></div></div>
      <div class="resource-grid">${featured.slice(0, 9).map(resourceCard).join("")}</div>
      <div class="section-block">
        <div class="section-heading"><div><h2>Cross-platform practice</h2><p>A small, verified starter set on AtCoder, CodeChef and LeetCode for transferring the same core patterns.</p></div></div>
        <div class="practice-grid">${DATA.crossPlatform.map((item) => `<a class="practice-card" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer"><span class="chip ${item.platform === "AtCoder" ? "blue" : item.platform === "CodeChef" ? "orange" : "green"}">${escapeHTML(item.platform)}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.topic)}</p><span class="card-arrow">Practice →</span></a>`).join("")}</div>
      </div>
      <div class="section-block panel">
        <div class="panel-head"><div><h3 class="panel-title">All source links</h3><p class="panel-subtitle">${DATA.sourceLinks.length.toLocaleString()} unique URLs extracted from the PDF.</p></div></div>
        <div class="toolbar" style="position:static;grid-template-columns:minmax(220px,1fr) minmax(150px,.35fr)">
          <label class="search-wrap">${icon("search")}<input class="field" data-search="links" value="${escapeHTML(state.linkSearch)}" placeholder="Search every original link…" /></label>
          ${select("linkPlatform", [["all", "All sources"], ...platforms.map((p) => [p, p])], state.linkPlatform)}
        </div>
        <div class="list-summary"><span>${links.length.toLocaleString()} matching links</span></div>
        <div class="source-link-list">${links.slice(0, state.linksVisible).map((link) => `<a class="source-link" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer"><span class="chip">${escapeHTML(link.platform)}</span><span class="source-title">${escapeHTML(link.label)}</span><span class="source-page">PDF · ${link.page}</span></a>`).join("")}</div>
        ${state.linksVisible < links.length ? `<div class="load-more"><button class="btn" data-action="load-more-links">Show more links</button></div>` : ""}
      </div>
    </section>`;
  }

  function modal() {
    if (!state.modalOpen) return "";
    return `<div class="modal-backdrop" data-action="close-sync"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="sync-title">
      <div class="eyebrow">Public Codeforces API</div>
      <h2 id="sync-title">Connect your handle</h2>
      <p>Enter only your public Codeforces handle. No password or token is requested. Your handle and imported AC list stay in this browser.</p>
      <form class="handle-form" data-form="sync"><input class="field" name="handle" value="${escapeHTML(state.handle)}" autocomplete="off" placeholder="tourist" aria-label="Codeforces handle" /><button class="btn primary" type="submit">${state.syncStatus === "busy" ? "Syncing…" : "Connect & sync"}</button></form>
      <div class="modal-foot"><span>${escapeHTML(state.syncMessage)}</span><button class="btn small ghost" type="button" data-action="close-sync">Close</button></div>
    </div></div>`;
  }

  function mobileNav() {
    return `<nav class="mobile-nav" aria-label="Mobile navigation">${[
      ["dashboard", "Home"], ["library", "Problems"], ["cp31", "CP-31"], ["lessons", "Lessons"], ["resources", "Links"],
    ].map(([view, label]) => `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${icon(view)}<span>${label}</span></button>`).join("")}</nav>`;
  }

  function render(refocus) {
    const root = document.getElementById("app");
    root.innerHTML = `<div class="app-shell">${sidebar()}<main class="main">${topbar()}<div class="content">${state.view === "dashboard" ? dashboard() : state.view === "resources" ? resourcesView() : libraryView()}</div></main>${mobileNav()}</div>${modal()}${state.toast ? `<div class="toast ${state.toast.error ? "error" : ""}">${escapeHTML(state.toast.text)}</div>` : ""}`;
    if (refocus) {
      requestAnimationFrame(() => {
        const input = document.querySelector(`[data-search="${refocus}"]`);
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      });
    }
  }

  function notify(text, error = false) {
    state.toast = { text, error };
    render();
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => {
      state.toast = null;
      render();
    }, 3200);
  }

  function resetFilters() {
    state.search = "";
    state.sheet = state.view === "cp31" ? "CP31" : "all";
    state.status = "all";
    state.platform = "all";
    state.type = state.view === "lessons" ? "lesson" : "all";
    state.rating = "all";
    state.visible = 80;
  }

  function changeView(view) {
    state.view = view;
    state.menuOpen = false;
    resetFilters();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function api(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Codeforces returned HTTP ${response.status}.`);
    const payload = await response.json();
    if (payload.status !== "OK") throw new Error(payload.comment || "Codeforces could not complete the request.");
    return payload.result;
  }

  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  async function syncCodeforces(handle, closeWhenDone = true) {
    const clean = String(handle || "").trim();
    if (!clean) {
      state.syncMessage = "Enter a Codeforces handle.";
      state.syncStatus = "error";
      render();
      return;
    }
    state.syncStatus = "busy";
    state.syncMessage = "Checking the handle…";
    state.modalOpen = true;
    render();
    try {
      const profiles = await api(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(clean)}`);
      const profile = profiles[0];
      const accepted = new Set();
      const activity = new Set();
      let from = 1;
      const count = 10000;
      for (let page = 0; page < 4; page += 1) {
        state.syncMessage = page ? `Reading submissions ${from.toLocaleString()} onward…` : "Reading accepted submissions…";
        render();
        const submissions = await api(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(clean)}&from=${from}&count=${count}`);
        submissions.forEach((submission) => {
          if (submission.verdict !== "OK" || !submission.problem?.contestId || !submission.problem?.index) return;
          accepted.add(`${submission.problem.contestId}-${submission.problem.index}`);
          activity.add(new Date(submission.creationTimeSeconds * 1000).toISOString().slice(0, 10));
        });
        if (submissions.length < count) break;
        from += count;
        await delay(2100);
      }
      state.handle = profile.handle;
      state.profile = profile;
      state.cfSolved = accepted;
      state.cfActivity = [...activity];
      state.syncStatus = "live";
      const matched = ITEMS.filter((item) => accepted.has(cfKey(item))).length;
      state.syncMessage = `${accepted.size.toLocaleString()} unique ACs found · ${matched.toLocaleString()} tracker rows matched.`;
      localStorage.setItem(STORAGE.handle, profile.handle);
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      localStorage.setItem(STORAGE.solved, JSON.stringify([...accepted]));
      localStorage.setItem(STORAGE.activity, JSON.stringify([...activity]));
      localStorage.setItem(STORAGE.syncedAt, String(Date.now()));
      if (closeWhenDone) state.modalOpen = false;
      render();
      notify(`Synced ${profile.handle}: ${matched.toLocaleString()} sheet entries verified.`);
    } catch (error) {
      state.syncStatus = "error";
      state.syncMessage = error.message.includes("Failed to fetch")
        ? "This browser could not reach Codeforces. Manual marking still works."
        : error.message;
      render();
    }
  }

  function disconnect() {
    for (const key of [STORAGE.handle, STORAGE.profile, STORAGE.solved, STORAGE.activity, STORAGE.syncedAt]) localStorage.removeItem(key);
    state.handle = "";
    state.profile = null;
    state.cfSolved = new Set();
    state.cfActivity = [];
    state.syncStatus = "idle";
    state.syncMessage = "Connect a public handle to import accepted submissions.";
    render();
    notify("Codeforces handle disconnected. Manual progress was kept.");
  }

  document.addEventListener("click", (event) => {
    const backdrop = event.target.closest(".modal-backdrop");
    const modalBox = event.target.closest(".modal");
    if (backdrop && !modalBox) {
      state.modalOpen = false;
      render();
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) return changeView(viewButton.dataset.view);
    const sheetButton = event.target.closest("[data-sheet-jump]");
    if (sheetButton) {
      state.view = sheetButton.dataset.sheetJump === "CP31" ? "cp31" : "library";
      resetFilters();
      state.sheet = sheetButton.dataset.sheetJump;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const toggle = event.target.closest("[data-toggle]");
    if (toggle) {
      const item = ITEMS.find((row) => row.id === toggle.dataset.toggle);
      if (item && isSynced(item)) return notify("This item is verified by Codeforces and stays completed.");
      if (manual.has(toggle.dataset.toggle)) manual.delete(toggle.dataset.toggle);
      else manual.add(toggle.dataset.toggle);
      saveManual();
      render();
      return;
    }
    const expand = event.target.closest("[data-expand]");
    if (expand) {
      const id = expand.dataset.expand;
      if (state.expanded.has(id)) state.expanded.delete(id);
      else state.expanded.add(id);
      render();
      return;
    }
    const action = event.target.closest("button[data-action], a[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "open-sync") { state.modalOpen = true; render(); }
    if (action === "close-sync") { state.modalOpen = false; render(); }
    if (action === "toggle-menu") { state.menuOpen = !state.menuOpen; render(); }
    if (action === "disconnect") disconnect();
    if (action === "reset-filters") { resetFilters(); render(); }
    if (action === "load-more") { state.visible += 80; render(); }
    if (action === "load-more-links") { state.linksVisible += 160; render(); }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches('[data-search="items"]')) {
      state.search = event.target.value;
      state.visible = 80;
      render("items");
    }
    if (event.target.matches('[data-search="links"]')) {
      state.linkSearch = event.target.value;
      state.linksVisible = 120;
      render("links");
    }
  });

  document.addEventListener("change", (event) => {
    const name = event.target.dataset.filter;
    if (!name) return;
    if (name === "linkPlatform") state.linkPlatform = event.target.value;
    else state[name] = event.target.value;
    state.visible = 80;
    state.linksVisible = 120;
    render();
  });

  document.addEventListener("submit", (event) => {
    if (!event.target.matches('[data-form="sync"]')) return;
    event.preventDefault();
    syncCodeforces(new FormData(event.target).get("handle"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modalOpen) {
      state.modalOpen = false;
      render();
    }
  });

  render();
  const lastSync = Number(localStorage.getItem(STORAGE.syncedAt) || 0);
  if (state.handle && Date.now() - lastSync > 6 * 60 * 60 * 1000) {
    window.setTimeout(() => syncCodeforces(state.handle, false), 500);
  }
})();
