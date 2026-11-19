// Sanity-checks every project's widgets: calculator formulas run with defaults, quiz answers valid, etc.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'data');
let bad = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const err = m => { bad++; console.log(`${f}: ${m}`); };
  if (!p.widgets.some(w => ['picker', 'calculator', 'checklist', 'quiz'].includes(w.type))) err('no interactive widget');
  for (const w of p.widgets) {
    if (w.type === 'calculator') {
      try {
        const fn = new Function(...w.inputs.map(i => i.id), w.formula);
        const vals = w.inputs.map(i => {
          const v = i.value ?? (i.options ? i.options[0].value : '');
          return isNaN(parseFloat(v)) ? String(v) : parseFloat(v);
        });
        const r = fn(...vals);
        if (!r) err('calculator returns null with defaults');
        else {
          const keys = [...w.result.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
          for (const k of keys) if (r[k] === undefined) err(`result key {${k}} missing`);
          for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !isFinite(v)) err(`result ${k} not finite`);
        }
      } catch (e) { err('calculator error: ' + e.message); }
    }
    if (w.type === 'quiz') w.questions.forEach((q, i) => { if (!(q.answer >= 0 && q.answer < q.options.length)) err(`quiz q${i + 1} bad answer`); });
    if (w.type === 'picker' && !(w.options || []).length) err('picker without options');
    if (w.type === 'checklist' && !(w.items || []).length) err('empty checklist');
    if (['cards', 'steps'].includes(w.type) && !(w.items || []).length) err(`empty ${w.type}`);
  }
}
console.log(bad ? `${bad} problems` : 'all checks passed');
process.exit(bad ? 1 : 0);
