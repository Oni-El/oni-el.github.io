/* Dyert dhe dritaret sipas fasadave: redaktues me rreshta (paneli i stafit dhe portali i klientit) */
window.OpenUI = (function () {
  'use strict';
  const SIDES = [['front', 'Ballore'], ['back', 'E pasme'], ['left', 'Anash majtas'], ['right', 'Anash djathtas']];
  const TYPES = [['seks', 'Seksionale'], ['roll', 'Rrotulluese'], ['kemb', 'Këmbësore']];
  const LIM = { n: [1, 50], nw: [1, 200], w: [0.5, 15], h: [0.3, 12], sill: [0, 15], top: [0, 15] };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const num = v => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const r2 = v => Math.round(v * 100) / 100;
  const fc = v => r2(v).toFixed(2).replace('.', ',');
  let cssDone = false;
  function addCSS() {
    if (cssDone) return; cssDone = true;
    const st = document.createElement('style');
    st.textContent = `
.oui { display: grid; gap: 8px; min-width: 0 }
.oui-h { display: flex; align-items: baseline; gap: 8px; font-weight: 600; font-size: 13px; margin-top: 6px }
.oui-h small { color: var(--muted); font-weight: 400; font-size: 11.5px }
.oui-row { border: 1px solid var(--line); border-radius: 6px; padding: 8px; display: grid; gap: 7px; background: var(--panel-2) }
.oui-row .inp { background: var(--panel) }
.oui-top { display: flex; gap: 6px; align-items: center; min-width: 0 }
.oui-top .inp { flex: 1 1 0; min-width: 0 }
.oui-top .inp select { padding: 6px 4px 6px 7px; width: 100%; font-size: 13px; text-overflow: ellipsis }
.oui-x { border: 0; background: none; color: var(--muted); font-size: 20px; line-height: 1; padding: 2px 7px; cursor: pointer; border-radius: 4px; flex: 0 0 auto }
.oui-x:hover { color: var(--bad, #c0392b) }
.oui-g { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px }
.oui-g.two { grid-template-columns: repeat(2, minmax(0, 1fr)) }
.oui-g label { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; color: var(--muted); min-width: 0 }
.oui-g .inp input { padding: 6px 7px; width: 100%; min-width: 0 }
.oui-g .inp .u { padding-right: 7px }
.oui-add { justify-self: start; border: 1px dashed var(--line); background: transparent; color: var(--ink); border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 12.5px; font: inherit; font-size: 12.5px }
.oui-add:hover { border-color: var(--accent) }
.oui-bad { color: var(--bad, #d9534f) !important }
.oui-note { font-size: 11.5px; color: var(--muted); margin: 0 }
.oui .tog { font-size: 12.5px }
.oui.off .oui-add, .oui.off .oui-x { display: none }
`;
    document.head.appendChild(st);
  }
  const opt = (list, v) => list.map(o => `<option value="${o[0]}"${o[0] === v ? ' selected' : ''}>${esc(o[1])}</option>`).join('');
  const numIn = (f, v, lim, u, step) => `<div class="inp"><input type="number" inputmode="decimal" data-f="${f}" value="${v}" min="${lim[0]}" max="${lim[1]}" step="${step}">${u ? `<span class="u">${u}</span>` : ''}</div>`;

  function mount(el, o) {
    addCSS();
    const st = { el, o, enabled: true };
    el.classList.add('oui');
    el.addEventListener('input', e => edit(st, e, true));
    el.addEventListener('change', e => edit(st, e, false));
    el.addEventListener('click', e => click(st, e));
    render(st);
    return {
      refresh() { if (!el.contains(document.activeElement)) render(st); else live(st); },
      setEnabled(v) { st.enabled = !!v; render(st); }
    };
  }
  function data(st) { const d = st.o.get(); return { doors: (d.doors || []).map(x => Object.assign({}, x)), wins: (d.wins || []).map(x => Object.assign({}, x)) }; }
  function render(st) {
    const { doors, wins } = data(st), H = st.o.H(), dis = st.enabled ? '' : ' disabled';
    let h = `<div class="oui-h"><span>Dyert</span><small>zgjidh fasadën për secilën</small></div>`;
    if (!doors.length) h += `<p class="oui-note">Pa dyer.</p>`;
    doors.forEach((d, i) => {
      const k = d.type === 'kemb';
      h += `<div class="oui-row" data-g="doors" data-i="${i}"><div class="oui-top"><div class="inp"><select data-f="side" aria-label="Fasada"${dis}>${opt(SIDES, d.side)}</select></div><div class="inp"><select data-f="type" aria-label="Lloji i derës"${dis}>${opt(TYPES, d.type)}</select></div><button type="button" class="oui-x" data-act="del" aria-label="Hiq derën" title="Hiq">×</button></div>`;
      h += `<div class="oui-g"><label>Copë${numIn('n', d.n, LIM.n, '', 1)}</label><label>Gjerësia${numIn('w', d.w, LIM.w, 'm', 0.1)}</label><label>Lartësia${numIn('h', d.h, LIM.h, 'm', 0.1)}</label></div>`;
      if (!k) h += `<label class="tog"><input type="checkbox" data-f="motor"${d.motor ? ' checked' : ''}${dis}><span>Me motor elektrik</span></label>`;
      h += `</div>`;
    });
    h += `<button type="button" class="oui-add" data-act="addDoor">+ Shto derë</button>`;
    h += `<div class="oui-h"><span>Dritaret</span><small>një rresht për çdo lartësi</small></div>`;
    if (!wins.length) h += `<p class="oui-note">Pa dritare.</p>`;
    wins.forEach((w, i) => {
      const top = H - w.sill - w.h;
      h += `<div class="oui-row" data-g="wins" data-i="${i}"><div class="oui-top"><div class="inp"><select data-f="side" aria-label="Fasada"${dis}>${opt(SIDES, w.side)}</select></div><button type="button" class="oui-x" data-act="del" aria-label="Hiq rreshtin" title="Hiq">×</button></div>`;
      h += `<div class="oui-g"><label>Copë${numIn('n', w.n, LIM.nw, '', 1)}</label><label>Gjerësia${numIn('w', w.w, LIM.w, 'm', 0.1)}</label><label>Lartësia${numIn('h', w.h, LIM.h, 'm', 0.1)}</label></div>`;
      h += `<div class="oui-g two"><label>Nga toka (parapeti)${numIn('sill', r2(w.sill), LIM.sill, 'm', 0.05)}</label><label class="${top < 0.2 ? 'oui-bad' : ''}" data-top>Deri te streha${numIn('top', r2(top), [-15, 15], 'm', 0.05)}</label></div>`;
      h += `</div>`;
    });
    h += `<button type="button" class="oui-add" data-act="addWin">+ Shto rresht dritaresh</button>`;
    h += `<p class="oui-note">Për dy rreshta dritaresh në të njëjtën fasadë shto një rresht të dytë me lartësi tjetër nga toka.</p>`;
    st.el.innerHTML = h;
    st.el.classList.toggle('off', !st.enabled);
    if (!st.enabled) st.el.querySelectorAll('input, select').forEach(x => { x.disabled = true; });
  }
  // përditëson vetëm fushat e llogaritura pa prekur atë ku shkruan përdoruesi
  function live(st) {
    const { wins } = data(st), H = st.o.H();
    st.el.querySelectorAll('.oui-row[data-g="wins"]').forEach(r => {
      const w = wins[+r.dataset.i]; if (!w) return;
      const t = $in(r, 'top'), s = $in(r, 'sill'), top = H - w.sill - w.h;
      if (t && document.activeElement !== t) t.value = r2(top);
      if (s && document.activeElement !== s) s.value = r2(w.sill);
      const lb = r.querySelector('[data-top]'); if (lb) lb.classList.toggle('oui-bad', top < 0.2);
    });
  }
  const $in = (r, f) => r.querySelector(`[data-f="${f}"]`);
  function edit(st, e, typing) {
    const t = e.target, f = t.dataset && t.dataset.f; if (!f || !st.enabled) return;
    const row = t.closest('.oui-row'); if (!row) return;
    const g = row.dataset.g, i = +row.dataset.i, d = data(st), it = d[g][i]; if (!it) return;
    if (typing && t.tagName !== 'INPUT') return;
    if (typing && t.type === 'checkbox') return;
    if (f === 'side') it.side = t.value;
    else if (f === 'type') {
      const was = it.type === 'kemb'; it.type = t.value;
      if (t.value === 'kemb' && !was) { it.w = 1; it.h = 2.2; it.motor = false; }
      if (t.value !== 'kemb' && was) { it.w = 4; it.h = 4.5; it.motor = true; }
    } else if (f === 'motor') it.motor = t.checked;
    else {
      let v = num(t.value);
      const lim = f === 'n' ? (g === 'wins' ? LIM.nw : LIM.n) : f === 'top' ? [-15, 15] : LIM[f];
      if (v == null) { if (typing) return; v = f === 'top' ? st.o.H() - it.sill - it.h : it[f]; }
      if (typing && (v < lim[0] || v > lim[1])) return;
      v = Math.min(lim[1], Math.max(lim[0], v));
      if (f === 'n') v = Math.round(v);
      if (f === 'top') it.sill = r2(Math.max(0, st.o.H() - v - it.h));
      else it[f] = r2(v);
    }
    st.o.set(d.doors, d.wins, typing);
    if (typing) live(st); else render(st);
  }
  function click(st, e) {
    const b = e.target.closest('[data-act]'); if (!b || !st.enabled) return;
    const d = data(st), act = b.dataset.act;
    if (act === 'del') { const r = b.closest('.oui-row'); d[r.dataset.g].splice(+r.dataset.i, 1); }
    if (act === 'addDoor') {
      const used = d.doors.filter(x => x.type !== 'kemb').map(x => x.side);
      const side = (SIDES.find(s => !used.includes(s[0])) || SIDES[0])[0];
      const last = d.doors.filter(x => x.type !== 'kemb').slice(-1)[0];
      d.doors.push({ side, type: last ? last.type : 'seks', n: 1, w: last ? last.w : 4, h: last ? last.h : 4.5, motor: last ? !!last.motor : true });
    }
    if (act === 'addWin') {
      const last = d.wins.slice(-1)[0], H = st.o.H();
      if (last) {
        const sill = r2(last.sill + last.h + 1);
        d.wins.push(sill + last.h <= H - 0.3 ? { side: last.side, n: last.n, w: last.w, h: last.h, sill } : { side: SIDES.map(s => s[0]).find(s => !d.wins.some(w => w.side === s)) || last.side, n: last.n, w: last.w, h: last.h, sill: last.sill });
      } else d.wins.push({ side: 'left', n: 4, w: 2, h: 1.2, sill: r2(Math.min(2.4, Math.max(0.9, H - 2))) });
    }
    st.o.set(d.doors, d.wins, false);
    render(st);
  }
  return { mount, SIDES, TYPES };
})();
