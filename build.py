"""Builds p/NNN.html for every data/NNN.json and the index.html listing."""
import json, html, glob, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CATS = [
    "Inside My Own Home", "My Village & Street", "Our Fields, Cattle & Kirana Shops",
    "Money Worries & Scams", "Helping Mother, Sisters & Village Women",
    "Government Papers & Office Help", "Clean Water, Soil & Air",
    "Brothers, Sisters & Career Dreams", "My Hostel & School", "Culture, Artisans & Village Pride",
]
WIDGETS = {"cards", "picker", "calculator", "checklist", "quiz", "steps", "text"}

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}">
<link rel="stylesheet" href="../assets/style.css"></head>
<body><main class="wrap" id="app"></main>
<script>window.P={data};</script><script src="../assets/app.js"></script></body></html>
"""

def main():
    projects, errors = [], []
    for f in sorted(glob.glob(os.path.join(ROOT, "data", "*.json"))):
        try:
            p = json.load(open(f, encoding="utf-8"))
            for k in ("id", "title", "problem", "idea", "widgets", "how"):
                assert k in p, f"missing {k}"
            for w in p["widgets"]:
                assert w["type"] in WIDGETS, f"bad widget {w['type']}"
            p["category"] = CATS[(p["id"] - 1) // 15]
        except Exception as e:
            errors.append(f"{os.path.basename(f)}: {e}"); continue
        projects.append(p)
        data = json.dumps(p, ensure_ascii=False).replace("</", "<\\/")
        out = PAGE.format(title=html.escape(p["title"]), desc=html.escape(p["problem"][:150]), data=data)
        open(os.path.join(ROOT, "p", f"{p['id']:03d}.html"), "w", encoding="utf-8").write(out)

    sections = []
    for ci, c in enumerate(CATS):
        items = [p for p in projects if (p["id"] - 1) // 15 == ci]
        links = "".join(
            f'<a href="p/{p["id"]:03d}.html" data-s="{html.escape((p["title"]+" "+p.get("title_te","")).lower())}">'
            f'<b>{p["id"]}.</b>{p.get("emoji","")} {html.escape(p["title"])}</a>' for p in items)
        sections.append(f'<section class="cat"><h2>{ci+1}. {html.escape(c)} <span class="badge">{ci*15+1}–{ci*15+15}</span></h2><div class="list">{links}</div></section>')
    index = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>150 Student AI Projects</title>
<meta name="description" content="150 real-life AI projects made by Class 8 students from rural Telangana using free AI tools.">
<link rel="stylesheet" href="assets/style.css"></head><body><main class="wrap">
<span class="badge">Class 8 Student Edition</span>
<h1>150 Real-Life AI Projects Through My Eyes</h1>
<p class="sub">Solving real problems at home, in our village and in our hostel — using 4 days of AI training (Teachable Machine, PictoBlox/Scratch, Gemini, Google Lens, Canva). Every project below works in your phone browser and can read out loud in Telugu and English.</p>
<input class="search" id="q" placeholder="🔍 Search a project…">
{''.join(sections)}
<p class="foot">Information is for awareness — always check with a teacher, doctor or official office.</p>
</main><script>
document.getElementById('q').addEventListener('input',e=>{{const v=e.target.value.toLowerCase();
document.querySelectorAll('.list a').forEach(a=>a.style.display=a.dataset.s.includes(v)?'':'none');}});
</script></body></html>"""
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(index)
    print(f"built {len(projects)} projects")
    for e in errors: print("ERROR", e)
    missing = sorted(set(range(1, 151)) - {p["id"] for p in projects})
    if missing: print("missing ids:", missing)
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
