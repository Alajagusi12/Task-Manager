import json
from collections import Counter
from pyscript import document, window
from pyodide.ffi import create_proxy

def build(*args):
    try:
        tasks = json.loads(window.localStorage.getItem("taskflow.tasks.v1") or "[]")
    except Exception:
        tasks = []

    total = len(tasks)
    done = sum(1 for t in tasks if t.get("done"))
    rate = round(done / total * 100) if total else 0
    pending = [t for t in tasks if not t.get("done")]
    urgent = sum(1 for t in pending if t.get("priority") == "high")
    cats = Counter(t.get("category", "Personal") for t in tasks)
    top = cats.most_common(1)[0][0] if cats else "-"

    if total == 0:
        tip = "Add a few tasks and I will analyse them."
    elif urgent:
        tip = f"Start with your {urgent} high-priority task(s) first."
    elif rate >= 80:
        tip = "Excellent progress. Keep the streak going!"
    elif pending:
        tip = f"{len(pending)} tasks left. Try one 25-minute focus session."
    else:
        tip = "Everything is done. Take a break."

    rows = [("Completion rate", f"{rate}%"), ("Busiest category", top),
            ("High priority pending", str(urgent)), ("Advice", tip)]
    box = document.getElementById("reportBody")
    box.innerHTML = ""
    for label, value in rows:
        row = document.createElement("div")
        row.className = "report-row"
        a = document.createElement("span"); a.textContent = label
        b = document.createElement("strong"); b.textContent = value
        row.append(a, b)
        box.appendChild(row)

window.addEventListener("tasks-saved", create_proxy(build))
build()