// Renders one project page from window.P (project data). Simple widgets, no libraries.
(function () {
  const P = window.P;
  const $ = (t, a = {}, ...kids) => {
    const e = document.createElement(t);
    for (const [k, v] of Object.entries(a)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };

  // Read aloud using the phone/computer voice. Telugu if available, else English.
  function speak(text, lang) {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const want = lang || 'en-IN';
    u.lang = want;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(want.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  const speakBtns = (en, te) => $('span', { class: 'row' },
    en ? $('button', { class: 'speak', onclick: () => speak(en, 'en-IN') }, '🔊 English') : null,
    te ? $('button', { class: 'speak', onclick: () => speak(te, 'te-IN') }, '🔊 తెలుగు') : null);

  const W = {
    // Info cards: [{icon,title,text,te}]
    cards(w) {
      return $('div', { class: 'grid' }, w.items.map(it => $('div', { class: 'card' },
        it.icon ? $('div', { class: 'ic' }, it.icon) : null,
        $('h3', {}, it.title),
        it.text ? $('p', {}, it.text) : null,
        it.te ? $('p', { class: 'te' }, it.te) : null,
        speakBtns(it.title + '. ' + (it.text || ''), it.te))));
    },
    // Picker: pretend "AI recogniser" - choose what the camera sees, get answer + voice.
    picker(w) {
      const out = $('div', { class: 'out' }, w.hint || 'Choose one above 👆');
      const btns = w.options.map(o => $('button', {
        onclick: e => {
          btns.forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on');
          out.className = 'out ' + (o.level || '');
          out.replaceChildren($('div', {}, $('b', {}, (o.icon ? o.icon + ' ' : '') + o.result)),
            o.te ? $('div', { class: 'te' }, o.te) : null, o.tip ? $('div', { style: 'font-size:15px;margin-top:6px' }, o.tip) : null);
          speak(o.te || o.result, o.te ? 'te-IN' : 'en-IN');
        }
      }, (o.icon ? o.icon + ' ' : '') + o.label));
      return $('div', {}, w.question ? $('p', {}, $('b', {}, w.question)) : null, $('div', { class: 'pick' }, btns), out);
    },
    // Calculator: inputs [{id,label,value,type:'number'|'select',options:[{label,value}]}], formula JS using ids,
    // result: template string with {x} placeholders from formula's returned object.
    calculator(w) {
      const out = $('div', { class: 'out' });
      const fields = w.inputs.map(i => {
        const el = i.type === 'select'
          ? $('select', { id: 'in_' + i.id }, i.options.map(o => $('option', { value: o.value }, o.label)))
          : $('input', { id: 'in_' + i.id, type: 'number', value: i.value ?? '', step: 'any', inputmode: 'decimal' });
        if (i.type === 'select' && i.value != null) el.value = i.value;
        el.addEventListener('input', calc);
        return $('label', { class: 'f' }, $('span', {}, i.label), el);
      });
      const fn = new Function(...w.inputs.map(i => i.id), w.formula);
      function calc() {
        const vals = w.inputs.map(i => { const v = document.getElementById('in_' + i.id).value; return isNaN(parseFloat(v)) ? v : parseFloat(v); });
        let r; try { r = fn(...vals); } catch (e) { r = null; }
        if (!r) { out.textContent = 'Fill all boxes'; return; }
        const fmt = x => typeof x === 'number' ? (Math.round(x * 100) / 100).toLocaleString('en-IN') : x;
        const text = w.result.replace(/\{(\w+)\}/g, (_, k) => fmt(r[k]));
        out.className = 'out ' + (r.level || '');
        out.replaceChildren(...text.split('\n').map(l => $('div', {}, l)));
      }
      setTimeout(calc);
      return $('div', {}, fields, out, $('div', { class: 'row', style: 'margin-top:8px' },
        $('button', { class: 'speak', onclick: () => speak(out.textContent, 'en-IN') }, '🔊 Read result')));
    },
    // Checklist: items [string|{text,te}], scoring bands
    checklist(w) {
      const out = $('div', { class: 'out' });
      const boxes = [];
      const rows = w.items.map(it => {
        const t = typeof it === 'string' ? { text: it } : it;
        const cb = $('input', { type: 'checkbox', onchange: upd }); boxes.push(cb);
        return $('label', { class: 'ck' }, cb, $('span', {}, t.text, t.te ? $('div', { class: 'te', style: 'font-size:14px' }, t.te) : null));
      });
      function upd() {
        const n = boxes.filter(b => b.checked).length, tot = boxes.length;
        const band = (w.bands || []).find(b => n / tot >= b.min) || { text: '', level: '' };
        out.className = 'out ' + (band.level || '');
        out.textContent = `✅ ${n} of ${tot} done. ${band.text}`;
      }
      upd();
      return $('div', {}, rows, out);
    },
    // Quiz: questions [{q,options:[],answer:index,why}]
    quiz(w) {
      let score = 0, done = 0;
      const sc = $('div', { class: 'out' }, `Score: 0 / ${w.questions.length}`);
      const qs = w.questions.map((q, qi) => {
        const why = $('div', { class: 'why' });
        const btns = q.options.map((o, oi) => $('button', {
          onclick: () => {
            if (btns.answered) return; btns.answered = true; done++;
            btns[q.answer].classList.add('right');
            if (oi === q.answer) score++; else btns[oi].classList.add('wrong');
            why.textContent = (oi === q.answer ? '✅ Correct! ' : '❌ Not quite. ') + (q.why || '');
            sc.textContent = `Score: ${score} / ${w.questions.length}` + (done === w.questions.length ? (score === w.questions.length ? ' 🏆 Perfect!' : ' 👍 Try again to get full marks!') : '');
          }
        }, o));
        return $('div', { class: 'q' }, $('b', {}, `${qi + 1}. ${q.q}`), $('div', { class: 'opts' }, btns), why);
      });
      return $('div', {}, qs, sc);
    },
    // Steps: [{title,text,te}] numbered guide with read-aloud
    steps(w) {
      return $('ol', { class: 'steps' }, w.items.map(s => {
        const t = typeof s === 'string' ? { text: s } : s;
        return $('li', {}, t.title ? $('b', {}, t.title + ': ') : null, t.text || '',
          t.te ? $('div', { class: 'te', style: 'font-size:15px' }, t.te) : null,
          $('div', {}, speakBtns((t.title ? t.title + '. ' : '') + (t.text || ''), t.te)));
      }));
    },
    // Text: a paragraph block
    text(w) { return $('div', {}, (w.paras || [w.text]).map(p => $('p', {}, p))); }
  };

  const app = document.getElementById('app');
  app.append(
    $('div', { class: 'top' }, $('a', { href: '../index.html' }, '← All 150 projects'), $('span', { class: 'badge' }, `Project ${P.id} of 150`)),
    $('span', { class: 'badge' }, P.category),
    $('h1', {}, (P.emoji ? P.emoji + ' ' : '') + P.title),
    P.title_te ? $('p', { class: 'sub te' }, P.title_te) : null,
    $('div', { class: 'box problem' }, $('h2', {}, '👀 What I See & Feel'), $('p', {}, P.problem),
      $('h2', {}, '💡 My Idea'), $('p', {}, P.idea)),
    ...P.widgets.map(w => $('div', { class: 'box tool' }, $('h2', {}, w.heading || 'Try it'), w.intro ? $('p', {}, w.intro) : null, W[w.type](w))),
    $('div', { class: 'box' }, $('h2', {}, '🛠️ How I Made This (you can too!)'),
      $('div', { class: 'tools' }, (P.tools || []).map(t => $('span', {}, t))),
      $('ol', { class: 'steps', style: 'margin-top:10px' }, (P.how || []).map(h => $('li', {}, h)))),
    P.prompt ? $('div', { class: 'box' }, $('h2', {}, '🤖 The Gemini prompt I used'),
      $('div', { class: 'prompt' }, P.prompt),
      $('div', { class: 'row', style: 'margin-top:8px' }, $('button', { class: 'ghost', onclick: e => { navigator.clipboard && navigator.clipboard.writeText(P.prompt); e.currentTarget.textContent = '✔ Copied'; } }, '📋 Copy prompt'))) : null,
    $('p', { class: 'foot' }, 'Made by a Class 8 student with free AI tools • Information is for awareness — always check with a teacher, doctor or official office.')
  );
})();
