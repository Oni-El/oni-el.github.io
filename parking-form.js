/* Oni-El · Parkingje: formulari i zgjedhjeve (i përbashkët për klientin dhe panelin) */
window.ParkForm = (function () {
  'use strict';
  const E = window.ParkEngine;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const isMono = i => i.model === 'konsol' || i.model === 'portal';

  // piktogramet e modeleve (prerje tërthore)
  const ICON = {
    konsol: '<svg viewBox="0 0 120 64"><path d="M20 58V14M14 14l90 6" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="40" y="38" width="48" height="16" rx="5" fill="currentColor" opacity=".35"/></svg>',
    portal: '<svg viewBox="0 0 120 64"><path d="M18 58V16M102 58V20M12 15l96 6" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="36" y="38" width="48" height="16" rx="5" fill="currentColor" opacity=".35"/></svg>',
    ty: '<svg viewBox="0 0 120 64"><path d="M60 58V20M8 12l52 8 52-8" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="38" width="40" height="16" rx="5" fill="currentColor" opacity=".35"/><rect x="72" y="38" width="40" height="16" rx="5" fill="currentColor" opacity=".35"/></svg>',
    rrjet: '<svg viewBox="0 0 120 64"><path d="M30 58V22M90 58V22M4 16l26 6 30-6 30 6 26-6" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="40" width="20" height="14" rx="4" fill="currentColor" opacity=".35"/><rect x="34" y="40" width="20" height="14" rx="4" fill="currentColor" opacity=".35"/><rect x="66" y="40" width="20" height="14" rx="4" fill="currentColor" opacity=".35"/><rect x="94" y="40" width="20" height="14" rx="4" fill="currentColor" opacity=".35"/></svg>'
  };
  const FACES = [['S', 'Jugu (më e mira)'], ['SE', 'Juglindja'], ['SW', 'Jugperëndimi'], ['E', 'Lindja'], ['W', 'Perëndimi'], ['N', 'Veriu'], ['X', 'Nuk e di']];
  const AXES = [['EW', 'Lindje–perëndim (gjysma nga jugu)'], ['NS', 'Veri–jug (gjysma nga lindja)'], ['D1', 'Diagonal (juglindje–veriperëndim)'], ['D2', 'Diagonal (jugperëndim–verilindje)'], ['X', 'Nuk e di']];

  const SECTIONS = [
    { id: 'model', t: 'Modeli', f: [{ k: 'model', t: 'model', w2: 1 }] },
    { id: 'spaces', t: 'Vendet e parkimit', f: [
      { k: 'nSpaces', l: () => 'Vende në ' + (E.rowsOf(cur()) > 1 ? 'çdo rresht' : 'rresht'), u: 'copë', min: 1, max: 80, step: 1 },
      { k: 'nRows', l: 'Rreshta makinash', t: 'seg', num: 1, w2: 1, o: [[4, '4'], [6, '6'], [8, '8'], [10, '10'], [12, '12']], show: i => i.model === 'rrjet', help: 'Rreshtat vendosen dy nga dy, me korsi kalimi mes tyre.' },
      { k: 'spaceW', l: 'Gjerësia e vendit', u: 'm', min: 2.3, max: 3.5, step: 0.05 },
      { k: 'spaceL', l: 'Gjatësia e vendit', u: 'm', min: 4.5, max: 6.5, step: 0.1 },
      { k: 'aisle', l: 'Gjerësia e korsisë', u: 'm', min: 5, max: 8, step: 0.5, show: i => i.model === 'rrjet' },
      { k: 'perBay', l: 'Kolonat', t: 'seg', num: 1, w2: 1, o: [[2, 'Çdo 2 vende'], [3, 'Çdo 3 vende']], help: 'Me kolona çdo 3 vende parkohet më lirshëm; me çdo 2 vende struktura del më e lehtë.' }
    ] },
    { id: 'roof', t: 'Lartësia dhe çatia', f: [
      { k: 'H', l: 'Lartësia e lirë nën strehë', u: 'm', min: 2.2, max: 4.5, step: 0.05, help: 'Pika më e ulët nën strehë. 2,3–2,5 m për makina, 3,5 m e lart për furgonë.' },
      { k: 'tilt', l: 'Pjerrësia e çatisë', u: '°', min: 0, max: 15, step: 1 },
      { k: 'lowSide', l: 'Ana e ulët e çatisë', t: 'seg', w2: 1, o: [['back', 'Nga pas'], ['front', 'Nga para']], show: isMono },
      { k: 'vshape', l: 'Forma e çatisë', t: 'seg', w2: 1, o: [['V', 'V: ujërat në mes'], ['A', 'A: ujërat anash']], show: i => i.model === 'ty' }
    ] },
    { id: 'cover', t: 'Mbulesa', f: [
      { k: 'cover', l: 'Materiali', t: 'seg', w2: 1, wrap: 1, o: [['pv', 'Panele diellore'], ['sheet', 'Llamarinë trapezoidale'], ['sandwich', 'Panel sanduiç'], ['poly', 'Polikarbonat']] },
      { k: 'face', l: 'Panelet kthehen nga', t: 'sel', w2: 1, o: FACES, show: i => i.cover === 'pv' && isMono(i), help: 'Drejtimi nga ulet çatia. Jugu jep më shumë energji.' },
      { k: 'axis', l: 'Gjatësia e parkingut shtrihet', t: 'sel', w2: 1, o: AXES, show: i => i.cover === 'pv' && !isMono(i), help: 'Gjysma e paneleve kthehet nga njëra anë, gjysma nga tjetra.' },
      { k: '_pvnote', t: 'note', w2: 1, show: i => i.cover === 'pv', text: 'Panelet diellore shërbejnë edhe si çati. Mes tyre mbeten fuga të vogla, ndaj nuk janë plotësisht të papërshkueshme nga uji.' }
    ] },
    { id: 'opt', t: 'Opsionet', f: [
      { k: 'ev', l: 'Karikues për makina elektrike', u: 'copë', min: 0, max: 200, step: 1 },
      { k: 'evKw', l: 'Fuqia e karikuesit', t: 'sel', num: 1, o: [[7.4, '7,4 kW (njëfazor)'], [11, '11 kW'], [22, '22 kW']], show: i => i.ev > 0 },
      { k: 'inverter', l: 'Inverter dhe lidhje në rrjet', t: 'tog', w2: 1, show: i => i.cover === 'pv' },
      { k: 'battery', l: 'Bateri për ruajtjen e energjisë', t: 'sel', num: 1, w2: 1, o: [[0, 'Pa bateri'], [5, '5 kWh'], [10, '10 kWh'], [15, '15 kWh'], [20, '20 kWh'], [30, '30 kWh'], [50, '50 kWh'], [100, '100 kWh']], show: i => i.cover === 'pv' },
      { k: 'led', l: 'Ndriçim LED nën strehë', t: 'tog', w2: 1 },
      { k: 'gutter', l: 'Ulluqe dhe ulluqe zbritëse', t: 'tog', w2: 1 },
      { k: 'closure', l: 'Mbyllje anësore', t: 'sel', w2: 1, o: [['none', 'Pa mbyllje'], ['back', 'Nga pas'], ['back_ends', 'Nga pas dhe në të dy anët']] }
    ] },
    { id: 'loc', t: 'Vendndodhja', f: [
      { k: 'city', l: 'Zona', t: 'sel', w2: 1, o: E.CITIES.map(c => [c[0], c[0]]), help: 'Përdoret për borën, erën dhe prodhimin e energjisë diellore.' }
    ] }
  ];
  let state = null;
  const cur = () => state ? state.o.get() : E.DEF;
  const lab = f => typeof f.l === 'function' ? f.l() : f.l;

  function fieldHTML(f) {
    const id = 'pf-' + f.k, cls = 'f' + (f.w2 ? ' w2' : '');
    const help = f.help ? `<small class="help">${f.help}</small>` : '';
    if (f.t === 'model') return `<div class="f w2" data-k="model"><div class="models">${Object.keys(E.MODELS).map(k => `<button type="button" class="mcard" data-v="${k}" aria-pressed="false">${ICON[k]}<b>${esc(E.MODELS[k].name)}</b><small>${esc(E.MODELS[k].rows)}</small></button>`).join('')}</div></div>`;
    if (f.t === 'note') return `<div class="${cls}" data-k="${f.k}"><small class="help note">${esc(f.text)}</small></div>`;
    if (f.t === 'tog') return `<div class="${cls}" data-k="${f.k}"><label class="tog"><input type="checkbox" id="${id}"><span>${lab(f)}</span></label>${help}</div>`;
    if (f.t === 'seg') return `<div class="${cls}" data-k="${f.k}"><span class="fl" id="${id}-l">${lab(f)}</span><div class="seg${f.wrap ? ' wrap' : ''}" role="group" aria-labelledby="${id}-l">${f.o.map(o => `<button type="button" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>${help}</div>`;
    if (f.t === 'sel') return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${lab(f)}</label><div class="inp"><select id="${id}">${f.o.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div>${help}</div>`;
    return `<div class="${cls}" data-k="${f.k}"><label for="${id}" class="lbl-dyn">${lab(f)}</label><div class="inp"><input type="number" inputmode="decimal" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}">${f.u ? `<span class="u">${f.u}</span>` : ''}</div>${help}</div>`;
  }
  const FIELD = {}; SECTIONS.forEach(s => s.f.forEach(f => { FIELD[f.k] = f; }));

  // o: { get(), set(k, v, typing), editable(), startNo }
  function mount(container, o) {
    state = { el: container, o };
    const n0 = o.startNo || 1;
    container.innerHTML = SECTIONS.map((s, k) => `<section class="step" id="pst-${s.id}"><h3><span class="sn">${n0 + k}</span>${s.t}</h3><div class="fields">${s.f.map(fieldHTML).join('')}</div></section>`).join('');
    container.querySelectorAll('.f').forEach(el => {
      const f = FIELD[el.dataset.k];
      if (!f || f.t === 'note') return;
      if (f.t === 'model') el.querySelectorAll('.mcard').forEach(b => b.addEventListener('click', () => { if (o.editable()) o.set('model', b.dataset.v); }));
      else if (f.t === 'seg') el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (o.editable()) o.set(f.k, f.num ? +b.dataset.v : b.dataset.v); }));
      else if (f.t === 'tog') el.querySelector('input').addEventListener('change', e => o.set(f.k, e.target.checked));
      else if (f.t === 'sel') el.querySelector('select').addEventListener('change', e => o.set(f.k, f.num ? +e.target.value : e.target.value));
      else {
        const i = el.querySelector('input');
        i.addEventListener('input', e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v) && v >= f.min && v <= f.max) o.set(f.k, f.step >= 1 ? Math.round(v) : v, true); });
        i.addEventListener('change', e => { let v = parseFloat(String(e.target.value).replace(',', '.')); if (!isFinite(v)) v = o.get()[f.k]; v = Math.min(f.max, Math.max(f.min, v)); if (f.step >= 1) v = Math.round(v); e.target.value = v; o.set(f.k, v); });
      }
    });
    refresh();
    return { refresh };
  }
  function refresh() {
    if (!state) return;
    const i = state.o.get(), ed = state.o.editable();
    SECTIONS.forEach(s => s.f.forEach(f => {
      const el = state.el.querySelector(`[data-k="${f.k}"]`); if (!el) return;
      el.hidden = f.show ? !f.show(i) : false;
      const v = i[f.k];
      if (f.t === 'model') el.querySelectorAll('.mcard').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.v === v)); b.disabled = !ed; });
      else if (f.t === 'seg') el.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', String(String(v) === b.dataset.v)); b.disabled = !ed; });
      else if (f.t === 'tog') { const x = el.querySelector('input'); x.checked = !!v; x.disabled = !ed; }
      else if (f.t === 'sel') { const x = el.querySelector('select'); x.value = String(v); x.disabled = !ed; }
      else if (f.t !== 'note') {
        const x = el.querySelector('input'); if (document.activeElement !== x) x.value = v; x.disabled = !ed;
        if (f.k === 'ev') x.max = E.rowsOf(i) * i.nSpaces;
        const lb = el.querySelector('label'); if (lb && typeof f.l === 'function') lb.textContent = lab(f);
      }
    }));
    const st = state.el.querySelector('#pst-spaces .sn'); if (st) st.hidden = false;
  }
  return { mount, refresh, SECTIONS, FACES, AXES, ICON };
})();
