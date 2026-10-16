(() => {
  "use strict";

  const STORAGE_KEY = "taskflow.tasks.v1";
  const THEME_KEY = "taskflow.theme";
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

  // ---------- State ----------
  let tasks = load().map((t) => ({ status: t.done ? "done" : "todo", ...t }));
  let view = "list";
  let filter = "all";
  let query = "";
  let sortMode = "manual";
  let lastDeleted = null;
  let toastTimer = null;
  let dragId = null;

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const form = $("taskForm"), input = $("taskInput"), prioritySel = $("prioritySelect");
  const categorySel = $("categorySelect"), dueInput = $("dueInput");
  const list = $("taskList"), empty = $("emptyState");
  const toast = $("toast");

  // ---------- Storage ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const isOverdue = (t) => !t.done && t.due && t.due < todayStr();

  function formatDue(d) {
    const date = new Date(d + "T00:00:00");
    const diff = Math.round((date - new Date(todayStr() + "T00:00:00")) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function visibleTasks() {
    let out = tasks.filter((t) => {
      if (filter === "active" && t.done) return false;
      if (filter === "completed" && !t.done) return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
    if (sortMode === "priority") out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    if (sortMode === "due") out.sort((a, b) => (a.due || "9999") .localeCompare(b.due || "9999"));
    if (sortMode === "newest") out.sort((a, b) => b.created - a.created);
    return out;
  }

  // ---------- Render ----------
  function render() {
    const items = visibleTasks();
    list.hidden = view === "board"; $("board").hidden = view !== "board";
    list.innerHTML = "";
    if (view === "board") renderBoard(items); else items.forEach((t) => list.appendChild(taskEl(t)));
    empty.classList.toggle("show", items.length === 0);
    updateStats(); drawChart();
  }

  function taskEl(t) {
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.dataset.id = t.id;
    li.draggable = sortMode === "manual" && filter === "all" && !query;

    const handle = document.createElement("span");
    handle.className = "handle"; handle.textContent = "⋮⋮"; handle.title = "Drag to reorder";

    const check = document.createElement("input");
    check.type = "checkbox"; check.className = "check"; check.checked = t.done;
    check.setAttribute("aria-label", "Mark complete");
    check.addEventListener("change", () => { setDone(t, check.checked); });

    const body = document.createElement("div");
    body.className = "task-body";
    const title = document.createElement("div");
    title.className = "task-title"; title.textContent = t.title;
    title.addEventListener("dblclick", () => startEdit(t, body, title));
    body.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.appendChild(chip(t.priority, "chip " + t.priority));
    meta.appendChild(chip(t.category, "chip"));
    if (t.due) meta.appendChild(chip("📅 " + formatDue(t.due), "chip" + (isOverdue(t) ? " overdue" : "")));
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = btn("✎", "Edit", () => startEdit(t, body, title));
    const del = btn("✕", "Delete", () => removeTask(t.id));
    del.classList.add("del");
    actions.append(edit, del);

    li.append(handle, check, body, actions);
    bindDrag(li, t.id);
    return li;
  }

  const chip = (text, cls) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
  const btn = (text, label, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = text; b.title = label; b.setAttribute("aria-label", label);
    b.addEventListener("click", fn); return b;
  };

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const active = total - done;
    const overdue = tasks.filter(isOverdue).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    $("statTotal").textContent = total;
    $("statActive").textContent = active;
    $("statDone").textContent = done;
    $("statOverdue").textContent = overdue;
    $("ringText").textContent = pct + "%";
    $("ringFg").style.strokeDashoffset = 213.6 * (1 - pct / 100);
    $("leftCount").textContent = `${active} item${active === 1 ? "" : "s"} left`;
    $("summary").textContent = total === 0 ? "No tasks yet"
      : active === 0 ? "All done. Great work! 🎉"
      : `${active} to go, ${done} completed`;
  }

  // ---------- Actions ----------
  function addTask(e) {
    e.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    tasks.unshift({
      id: uid(), title, done: false, status: "todo", created: Date.now(),
      priority: prioritySel.value, category: categorySel.value, due: dueInput.value || ""
    });
    save(); form.reset(); prioritySel.value = "medium"; render(); input.focus();
  }

  function startEdit(t, body, titleEl) {
    const field = document.createElement("input");
    field.type = "text"; field.className = "edit-input"; field.value = t.title; field.maxLength = 120;
    body.replaceChild(field, titleEl); field.focus(); field.select();
    const finish = (commit) => {
      const v = field.value.trim();
      if (commit && v) t.title = v;
      save(); render();
    };
    field.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    field.addEventListener("blur", () => finish(true));
  }

  function removeTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index < 0) return;
    lastDeleted = { task: tasks[index], index };
    tasks.splice(index, 1);
    save(); render();
    showToast("Task deleted", "Undo", undoDelete);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    tasks.splice(lastDeleted.index, 0, lastDeleted.task);
    lastDeleted = null; save(); render(); hideToast();
  }

  function clearCompleted() {
    const n = tasks.filter((t) => t.done).length;
    if (!n) return showToast("No completed tasks to clear");
    tasks = tasks.filter((t) => !t.done);
    save(); render(); showToast(`Cleared ${n} task${n === 1 ? "" : "s"}`);
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "tasks.json"; a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- Completion, board, chart ----------
  function setDone(t, v) {
    t.done = v; t.status = v ? "done" : "todo"; t.completedAt = v ? Date.now() : null;
    if (v) burst();
    save(); render();
  }

  const COLS = [["todo", "To do"], ["doing", "In progress"], ["done", "Done"]];
  function renderBoard(items) {
    const board = $("board"); board.innerHTML = "";
    COLS.forEach(([key, label]) => {
      const col = document.createElement("div"); col.className = "col";
      const rows = items.filter((t) => t.status === key);
      const h = document.createElement("h4"); h.textContent = `${label} (${rows.length})`; col.appendChild(h);
      rows.forEach((t) => {
        const c = document.createElement("div"); c.className = "kcard"; c.draggable = true;
        const p = document.createElement("div"); p.textContent = t.title; c.appendChild(p);
        const m = document.createElement("div"); m.className = "task-meta";
        m.append(chip(t.priority, "chip " + t.priority), chip(t.category, "chip"));
        c.appendChild(m);
        c.addEventListener("dragstart", () => { dragId = t.id; });
        col.appendChild(c);
      });
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        const t = tasks.find((x) => x.id === dragId);
        if (!t) return;
        if (key === "done") setDone(t, true);
        else { t.status = key; t.done = false; t.completedAt = null; save(); render(); }
      });
      board.appendChild(col);
    });
  }

  function drawChart() {
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    const n = days.map((d) => tasks.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === d.toDateString()).length);
    const max = Math.max(1, ...n);
    $("chart").innerHTML = days.map((d, i) =>
      `<div class="bar-col"><span>${n[i]}</span><div class="bar" style="height:${(n[i] / max) * 100}%"></div><small>${d.toLocaleDateString(undefined, { weekday: "narrow" })}</small></div>`).join("");
  }

  function burst() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < 26; i++) {
      const c = document.createElement("i"); c.className = "confetti";
      c.style.cssText = `left:${40 + Math.random() * 20}%;background:hsl(${Math.random() * 360},80%,60%);--x:${(Math.random() - 0.5) * 500}px;--r:${Math.random() * 720}deg`;
      document.body.appendChild(c); setTimeout(() => c.remove(), 1200);
    }
  }

  // ---------- Focus timer ----------
  let tLeft = 1500, tInt = null;
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function paintTimer() { $("timer").textContent = fmt(tLeft); document.title = tInt ? `${fmt(tLeft)} · Focus` : "Task Manager · Teslim Abdulwahab"; }
  $("tStart").addEventListener("click", () => {
    if (tInt) { clearInterval(tInt); tInt = null; $("tStart").textContent = "Resume"; return paintTimer(); }
    $("tStart").textContent = "Pause";
    tInt = setInterval(() => {
      if (--tLeft <= 0) { clearInterval(tInt); tInt = null; tLeft = 1500; $("tStart").textContent = "Start"; showToast("Focus session complete 🎉"); burst(); }
      paintTimer();
    }, 1000);
  });
  $("tReset").addEventListener("click", () => { clearInterval(tInt); tInt = null; tLeft = 1500; $("tStart").textContent = "Start"; paintTimer(); });

  // ---------- View + import ----------
  $("viewBtn").addEventListener("click", () => { view = view === "list" ? "board" : "list"; render(); });
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(data)) throw 0;
      const have = new Set(tasks.map((t) => t.id));
      const fresh = data.filter((t) => t && typeof t.title === "string" && !have.has(t.id)).map((t) => ({
        id: uid(), title: String(t.title).slice(0, 120), done: !!t.done, status: t.done ? "done" : (t.status === "doing" ? "doing" : "todo"),
        created: Date.now(), completedAt: t.completedAt || null,
        priority: PRIORITY_RANK[t.priority] !== undefined ? t.priority : "medium",
        category: String(t.category || "Personal").slice(0, 20), due: /^\d{4}-\d\d-\d\d$/.test(t.due) ? t.due : ""
      }));
      tasks = fresh.concat(tasks); save(); render(); showToast(`Imported ${fresh.length} task${fresh.length === 1 ? "" : "s"}`);
    } catch { showToast("Couldn't read that file"); }
    e.target.value = "";
  });

  // ---------- Drag & drop ----------
  function bindDrag(li, id) {
    li.addEventListener("dragstart", () => { dragId = id; li.classList.add("dragging"); });
    li.addEventListener("dragend", () => { li.classList.remove("dragging"); dragId = null; });
    li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("drag-over"); });
    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
    li.addEventListener("drop", (e) => {
      e.preventDefault(); li.classList.remove("drag-over");
      if (!dragId || dragId === id) return;
      const from = tasks.findIndex((t) => t.id === dragId);
      const to = tasks.findIndex((t) => t.id === id);
      tasks.splice(to, 0, tasks.splice(from, 1)[0]);
      save(); render();
    });
  }

  // ---------- Toast ----------
  function showToast(msg, actionLabel, action) {
    toast.innerHTML = "";
    const span = document.createElement("span"); span.textContent = msg; toast.appendChild(span);
    if (actionLabel) toast.appendChild(btn(actionLabel, actionLabel, action));
    toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 4500);
  }
  function hideToast() { toast.classList.remove("show"); }

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $("themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    applyTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }

  // ---------- Events ----------
  form.addEventListener("submit", addTask);
  $("clearBtn").addEventListener("click", clearCompleted);
  $("exportBtn").addEventListener("click", exportTasks);
  $("themeBtn").addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("searchInput").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  $("sortSelect").addEventListener("change", (e) => { sortMode = e.target.value; render(); });
  document.querySelectorAll(".tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      tab.classList.add("active"); filter = tab.dataset.filter; render();
    }));
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); input.focus(); }
  });

  // ---------- Init ----------
  const h = new Date().getHours();
  $("greeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("dateLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("year").textContent = new Date().getFullYear();
  initTheme();
  render();
})();