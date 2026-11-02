(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let tasks = [];
  try { tasks = JSON.parse(localStorage.getItem("taskflow.tasks.v1")) || []; } catch {}

  // Theme (shared with the main page)
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $("themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem("taskflow.theme", t); } catch {}
  }
  let saved = null; try { saved = localStorage.getItem("taskflow.theme"); } catch {}
  applyTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("themeBtn").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  $("printBtn").addEventListener("click", () => window.print());
  $("year").textContent = new Date().getFullYear();

  const localDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = localDay(new Date());

  // Headline numbers
  const total = tasks.length, done = tasks.filter((t) => t.done).length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const overdue = tasks.filter((t) => !t.done && t.due && t.due < today).length;
  $("kTotal").textContent = total;
  $("kOverdue").textContent = overdue;
  $("ringText").textContent = rate + "%";
  $("ringFg").style.strokeDashoffset = 213.6 * (1 - rate / 100);
  $("headline").textContent = total ? `${done} of ${total} tasks completed` : "No data yet. Add tasks on the main page.";

  // 30-day heatmap
  const counts = {};
  tasks.forEach((t) => { if (t.completedAt) { const k = localDay(new Date(t.completedAt)); counts[k] = (counts[k] || 0) + 1; } });
  const days = [...Array(30)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (29 - i)); return localDay(d); });
  const max = Math.max(1, ...days.map((d) => counts[d] || 0));
  const heat = $("heatmap");
  days.forEach((d) => {
    const n = counts[d] || 0;
    const cell = document.createElement("div");
    cell.className = "cell"; cell.dataset.level = n ? Math.ceil((n / max) * 4) : 0;
    cell.title = `${d}: ${n} completed`;
    heat.appendChild(cell);
  });
  $("kWeek").textContent = days.slice(-7).reduce((s, d) => s + (counts[d] || 0), 0);
  $("kBest").textContent = Math.max(0, ...days.map((d) => counts[d] || 0));

  // Breakdown bars
  function bars(el, groups) {
    el.innerHTML = "";
    const entries = Object.entries(groups);
    if (!entries.length) { el.textContent = "No data yet."; return; }
    entries.sort((a, b) => b[1].total - a[1].total).forEach(([name, g]) => {
      const row = document.createElement("div"); row.className = "brow";
      const label = document.createElement("div"); label.className = "blabel";
      const a = document.createElement("span"); a.textContent = name;
      const b = document.createElement("small"); b.textContent = `${g.done}/${g.total}`;
      label.append(a, b);
      const track = document.createElement("div"); track.className = "track";
      const fill = document.createElement("div"); fill.className = "fill";
      fill.style.width = (g.total ? (g.done / g.total) * 100 : 0) + "%";
      track.appendChild(fill); row.append(label, track); el.appendChild(row);
    });
  }
  const group = (key) => tasks.reduce((o, t) => {
    const k = String(t[key] || "other"), g = (o[k] = o[k] || { total: 0, done: 0 });
    g.total++; if (t.done) g.done++; return o;
  }, {});
  bars($("byCat"), group("category"));
  bars($("byPri"), group("priority"));

  // Due soon
  const due = tasks.filter((t) => !t.done && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
  const ul = $("dueList");
  if (!due.length) { const li = document.createElement("li"); li.textContent = "Nothing due. Nice."; ul.appendChild(li); }
  due.forEach((t) => {
    const li = document.createElement("li");
    const name = document.createElement("span"); name.textContent = t.title;
    const when = document.createElement("span");
    when.className = "chip" + (t.due < today ? " overdue" : ""); when.textContent = t.due;
    li.append(name, when); ul.appendChild(li);
  });
})();