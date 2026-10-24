/* Oni-El · Konfiguruesi i kapanonëve për klientët (pa çmime) + portali i ofertës */
(function () {
  'use strict';
  const E = window.KapEngine;
  const CFG = window.KAP_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function fmt(v, d) { d = d || 0; if (v == null || !isFinite(v)) return '–'; const neg = v < 0; const p = Math.abs(v).toFixed(d).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '−' : '') + p.join(','); }
  const f1 = v => fmt(v, 1), f2 = v => fmt(v, 2);
  const dstr = (v, t) => { const d = new Date(v), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + (t ? ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) : ''); };
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

  const CITIES = [['Elbasan', 0.8, 24, 'III', 0.25], ['Tiranë', 0.8, 25, 'III', 0.25], ['Durrës', 0.6, 27, 'II', 0.30], ['Shkodër', 1.0, 26, 'III', 0.28], ['Vlorë', 0.6, 28, 'II', 0.30], ['Fier', 0.6, 26, 'II', 0.27], ['Lushnjë', 0.6, 25, 'II', 0.25], ['Kavajë', 0.6, 26, 'II', 0.28], ['Lezhë', 0.8, 26, 'III', 0.28], ['Krujë / Fushë-Krujë', 0.8, 25, 'III', 0.27], ['Berat', 0.8, 24, 'III', 0.22], ['Korçë', 2.0, 25, 'III', 0.25], ['Pogradec', 1.8, 25, 'III', 0.27], ['Gjirokastër', 1.2, 25, 'III', 0.22], ['Sarandë', 0.6, 27, 'II', 0.30], ['Përmet', 1.2, 24, 'III', 0.24], ['Kukës', 2.0, 24, 'III', 0.18], ['Peshkopi', 2.0, 24, 'III', 0.22], ['Kosovë / tjetër', 1.2, 25, 'III', 0.25]];
  // vetëm këto fusha i zgjedh klienti; pjesa tjetër vendoset nga inxhinieri
  const CLIENT_KEYS = ['L', 'W', 'H', 'roof', 'slopePct', 'nSpans', 'sockel', 'roofType', 'roofT', 'roofCore', 'wallType', 'wallT', 'wallCore', 'skyPct', 'pv',
    'mezz', 'mL', 'mW', 'mH', 'mUse', 'mDeck', 'stairs', 'stairShape', 'stairW', 'stairCount', 'stairRise', 'doorN', 'doorW', 'doorH', 'doorType', 'doorMotor', 'pDoorN', 'winA', 'partA', 'city'];
  const DEF = {
    L: 40, W: 20, H: 6, roof: 'duo', slopePct: 10, nSpans: 1, sockel: 0,
    roofType: 'panel', roofT: 40, roofCore: 'PU', wallType: 'panel', wallT: 40, wallCore: 'PU', skyPct: 0, pv: false,
    mezz: false, mL: 12, mW: 10, mH: 3.5, mUse: 'B', mDeck: 'komp', stairs: 'none', stairShape: 'auto', stairW: 1.1, stairCount: 1, stairRise: 3,
    doorN: 1, doorW: 4, doorH: 4.5, doorType: 'seks', doorMotor: true, pDoorN: 1, winA: 0, partA: 0, city: 'Elbasan'
  };
  const ENG_FIXED = { bayMax: 6, base: 'fixed', haunch: true, gExtra: 0.1, mQ: 5, mSlab: 12, mGrid: 5, mBeamFam: 'IPE', mColFam: 'SHS', stairTread: 'grile',
    grade: 'S275', colFam: 'both', rafFam: 'IPE', purlinFam: 'RHS', purlinCont: true, purlinAuto: true, purlinSp: 1.8, railFam: 'RHS', railAuto: true, railSp: 2,
    postFam: 'IPE', postSp: 6, limV: 200, limH: 150, connPct: 10, coat: 'paint', q: 1.5, soil: 'C' };

  let inp = clone(DEF), res = null, engIn = null, mode = 'new', token = null, reqData = null, editing = true, curTab = 'm3d', dirtyDraw = true;
  let sb = null;
  function client() {
    if (sb) return sb;
    if (!CFG.url || !CFG.anonKey || !window.supabase) return null;
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: false } });
    return sb;
  }

  /* ---------------- fushat ---------------- */
  const SECTIONS = [
    { id: 'dim', n: 1, t: 'Dimensionet', f: [
      { k: 'L', l: 'Gjatësia', u: 'm', min: 6, max: 200, step: 0.5 },
      { k: 'W', l: 'Gjerësia', u: 'm', min: 5, max: 80, step: 0.5 },
      { k: 'H', l: 'Lartësia e murit', u: 'm', min: 3, max: 14, step: 0.1, help: 'Lartësia në strehë, nga dyshemeja te çatia.' },
      { k: 'slopePct', l: 'Pjerrësia e çatisë', u: '%', min: 3, max: 30, step: 0.5 },
      { k: 'roof', l: 'Forma e çatisë', t: 'seg', w2: 1, o: [['duo', 'Me dy ujëra'], ['mono', 'Me një ujë']] },
      { k: 'nSpans', l: 'Rreshta kolonash në mes', t: 'seg', w2: 1, num: 1, o: [[1, 'Asnjë'], [2, '1 rresht'], [3, '2 rreshta'], [4, '3 rreshta']], hint: () => inp.W / inp.nSpans > 30 ? 'Për gjerësi mbi 30 m pa kolona inxhinieri mund të propozojë kolona të ndërmjetme.' : '' },
      { k: 'sockel', l: 'Mur betoni në bazë (nëse ka)', u: 'm', min: 0, max: 3, step: 0.1, w2: 1 }
    ] },
    { id: 'clad', n: 2, t: 'Mbulesa dhe muret', f: [
      { k: 'roofType', l: 'Çatia', t: 'seg', w2: 1, o: [['panel', 'Panel i izoluar'], ['sheet', 'Llamarinë e thjeshtë']] },
      { k: 'roofT', l: 'Izolimi i çatisë', t: 'sel', num: 1, o: [30, 40, 50, 60, 80, 100, 120, 150].map(v => [v, v + ' mm']), show: () => inp.roofType === 'panel' },
      { k: 'roofCore', l: 'Materiali izolues', t: 'sel', o: [['PU', 'Poliuretan'], ['MW', 'Lesh guri (zjarrdurues)']], show: () => inp.roofType === 'panel' },
      { k: 'wallType', l: 'Muret', t: 'seg', w2: 1, o: [['panel', 'Panel i izoluar'], ['sheet', 'Llamarinë e thjeshtë']] },
      { k: 'wallT', l: 'Izolimi i mureve', t: 'sel', num: 1, o: [40, 50, 60, 80, 100, 120, 150].map(v => [v, v + ' mm']), show: () => inp.wallType === 'panel' },
      { k: 'wallCore', l: 'Materiali izolues', t: 'sel', o: [['PU', 'Poliuretan'], ['MW', 'Lesh guri (zjarrdurues)']], show: () => inp.wallType === 'panel' },
      { k: 'skyPct', l: 'Dritë natyrale në çati', u: '%', min: 0, max: 20, step: 1 },
      { k: 'pv', l: 'Do të vendos panele diellore në çati', t: 'tog', w2: 1 }
    ] },
    { id: 'mezz', n: 3, t: 'Kat i ndërmjetëm', f: [
      { k: 'mezz', l: 'Dua mezaninë / kat të ndërmjetëm', t: 'tog', w2: 1 },
      { k: 'mL', l: 'Gjatësia', u: 'm', min: 2, max: 200, step: 0.5, show: () => inp.mezz },
      { k: 'mW', l: 'Gjerësia', u: 'm', min: 2, max: 80, step: 0.5, show: () => inp.mezz },
      { k: 'mH', l: 'Lartësia e dyshemesë', u: 'm', min: 2.4, max: 10, step: 0.1, show: () => inp.mezz },
      { k: 'mUse', l: 'Përdorimi', t: 'sel', show: () => inp.mezz, o: [['B', 'Zyra'], ['A', 'Banim'], ['D', 'Dyqan / ekspozitë'], ['I', 'Punëtori e lehtë'], ['E', 'Depo / magazinim']] },
      { k: 'mDeck', l: 'Dysheme', t: 'sel', w2: 1, show: () => inp.mezz, o: [['komp', 'Soletë betoni mbi llamarinë'], ['lot', 'Llamarinë çeliku me lot'], ['grile', 'Grilë metalike']] },
      { k: 'stairs', l: 'Shkalla', t: 'seg', w2: 1, o: [['none', 'Pa shkallë'], ['int', 'E brendshme'], ['ext', 'E jashtme']] },
      { k: 'stairShape', l: 'Forma e shkallës', t: 'sel', show: () => inp.stairs !== 'none', o: [['auto', 'Ta zgjedhë inxhinieri'], ['drejt', 'E drejtë'], ['U', 'Me sheshpushim']] },
      { k: 'stairW', l: 'Gjerësia e shkallës', u: 'm', min: 0.8, max: 2, step: 0.05, show: () => inp.stairs !== 'none' },
      { k: 'stairRise', l: 'Lartësia që kapërcen shkalla', u: 'm', min: 0.5, max: 10, step: 0.1, show: () => inp.stairs !== 'none' && !inp.mezz, w2: 1 }
    ] },
    { id: 'open', n: 4, t: 'Dyer dhe dritare', f: [
      { k: 'doorN', l: 'Dyer të mëdha', u: 'copë', min: 0, max: 12, step: 1 },
      { k: 'doorType', l: 'Lloji', t: 'sel', o: [['seks', 'Seksionale'], ['roll', 'Rrotulluese']], show: () => inp.doorN > 0 },
      { k: 'doorW', l: 'Gjerësia e derës', u: 'm', min: 1.5, max: 10, step: 0.1, show: () => inp.doorN > 0 },
      { k: 'doorH', l: 'Lartësia e derës', u: 'm', min: 2, max: 8, step: 0.1, show: () => inp.doorN > 0 },
      { k: 'doorMotor', l: 'Me motor elektrik', t: 'tog', w2: 1, show: () => inp.doorN > 0 },
      { k: 'pDoorN', l: 'Dyer për njerëz', u: 'copë', min: 0, max: 10, step: 1 },
      { k: 'winA', l: 'Dritare (sipërfaqe)', u: 'm²', min: 0, max: 400, step: 1 },
      { k: 'partA', l: 'Mure ndarëse brenda', u: 'm²', min: 0, max: 3000, step: 5, w2: 1 }
    ] },
    { id: 'loc', n: 5, t: 'Vendndodhja', f: [
      { k: 'city', l: 'Zona', t: 'sel', w2: 1, o: CITIES.map(c => [c[0], c[0]]), help: 'Përdoret për borën, erën dhe sizmikën e zonës.' }
    ] }
  ];
  const FIELD = {}; SECTIONS.forEach(s => s.f.forEach(f => { FIELD[f.k] = f; }));

  function fieldHTML(f) {
    const id = 'c-' + f.k, cls = 'f' + (f.w2 ? ' w2' : '');
    const help = f.help ? `<small class="help">${f.help}</small>` : '';
    if (f.t === 'tog') return `<div class="${cls}" data-k="${f.k}"><label class="tog"><input type="checkbox" id="${id}"><span>${f.l}</span></label><small class="hint"></small></div>`;
    if (f.t === 'seg') return `<div class="${cls}" data-k="${f.k}"><span class="fl" id="${id}-l">${f.l}</span><div class="seg" role="group" aria-labelledby="${id}-l">${f.o.map(o => `<button type="button" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div><small class="hint"></small>${help}</div>`;
    if (f.t === 'sel') return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><div class="inp"><select id="${id}">${f.o.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div><small class="hint"></small>${help}</div>`;
    return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><div class="inp"><input type="number" inputmode="decimal" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}">${f.u ? `<span class="u">${f.u}</span>` : ''}</div><small class="hint"></small>${help}</div>`;
  }
  function renderForm() {
    $('#cfgSteps').innerHTML = SECTIONS.map(s => `<section class="step" id="st-${s.id}"><h3><span class="sn">${s.n}</span>${s.t}</h3><div class="fields">${s.f.map(fieldHTML).join('')}</div></section>`).join('');
    $$('#cfgSteps .f').forEach(el => {
      const f = FIELD[el.dataset.k];
      if (f.t === 'seg') el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (editing) setVal(f.k, f.num ? +b.dataset.v : b.dataset.v); }));
      else if (f.t === 'tog') $('input', el).addEventListener('change', e => setVal(f.k, e.target.checked));
      else if (f.t === 'sel') $('select', el).addEventListener('change', e => setVal(f.k, f.num ? +e.target.value : e.target.value));
      else {
        const i = $('input', el);
        i.addEventListener('input', e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v) && v >= f.min && v <= f.max) setVal(f.k, v, true); });
        i.addEventListener('change', e => { let v = parseFloat(String(e.target.value).replace(',', '.')); if (!isFinite(v)) v = inp[f.k]; v = Math.min(f.max, Math.max(f.min, v)); if (f.step >= 1) v = Math.round(v); e.target.value = v; setVal(f.k, v); });
      }
    });
    refreshForm();
  }
  function refreshForm() {
    SECTIONS.forEach(s => s.f.forEach(f => {
      const el = $(`#cfgSteps [data-k="${f.k}"]`); if (!el) return;
      el.hidden = f.show ? !f.show() : false;
      const v = inp[f.k];
      if (f.t === 'seg') el.querySelectorAll('button').forEach(b => { b.setAttribute('aria-pressed', String(String(v) === b.dataset.v)); b.disabled = !editing; });
      else if (f.t === 'tog') { const i = $('input', el); i.checked = !!v; i.disabled = !editing; }
      else if (f.t === 'sel') { const sl = $('select', el); sl.value = String(v); sl.disabled = !editing; }
      else { const i = $('input', el); if (document.activeElement !== i) i.value = v; i.disabled = !editing; }
      const h = $('.hint', el); if (h) h.textContent = f.hint ? f.hint() : '';
    }));
  }
  function setVal(k, v, typing) {
    if (!editing) return;
    inp[k] = v;
    if (k === 'mezz' && v && inp.stairs === 'none') inp.stairs = 'int';
    if (mode === 'new') LS.set('kap.client.draft', inp);
    else markChanged();
    if (!typing) refreshForm();
    clearTimeout(setVal.t); setVal.t = setTimeout(compute, typing ? 400 : 120);
  }

  /* ---------------- llogaritja (vetëm për modelin) ---------------- */
  function engineInput(src) {
    const o = Object.assign({}, ENG_FIXED, src);
    const c = CITIES.find(x => x[0] === src.city) || CITIES[0];
    o.sk = c[1]; o.vb = c[2]; o.terrain = c[3]; o.ag = c[4];
    o.slope = src.slopePct / 100;
    o.mW = Math.min(src.mW, src.W); o.mL = Math.min(src.mL, src.L); o.mH = Math.min(src.mH, src.H - 0.5);
    o.mG2 = (E.USES[src.mUse] || E.USES.B).g2;
    return o;
  }
  function summary(i, r) {
    const parts = [`Kapanon ${f1(i.L)} × ${f1(i.W)} m`, `H ${f2(i.H)} m`, (i.roof === 'duo' ? 'çati me dy ujëra ' : 'çati me një ujë ') + fmt(i.slopePct, 1) + '%'];
    parts.push(i.roofType === 'panel' ? `panel ${i.roofT}/${i.wallType === 'panel' ? i.wallT : 0} mm` : 'llamarinë');
    if (i.mezz) parts.push(`mezaninë ${fmt(Math.min(i.mL, i.L) * Math.min(i.mW, i.W), 0)} m² në +${f2(i.mH)}`);
    if (i.stairs !== 'none') parts.push((i.stairs === 'ext' ? 'shkallë e jashtme' : 'shkallë e brendshme'));
    if (i.doorN) parts.push(`${i.doorN} dyer ${f1(i.doorW)}×${f1(i.doorH)}`);
    if (i.pv) parts.push('me panele diellore');
    parts.push(i.city);
    return { title: `Kapanon ${f1(i.L)} × ${f1(i.W)} m`, text: parts.join(', '), area: i.L * i.W, mezzArea: i.mezz ? Math.min(i.mL, i.L) * Math.min(i.mW, i.W) : 0, L: i.L, W: i.W, H: i.H };
  }
  function compute() {
    engIn = engineInput(inp);
    try { res = E.design(engIn); } catch (e) { console.error(e); return; }
    const q = res.qty;
    $('#chips').innerHTML = [
      ['Sipërfaqja', fmt(q.area.ground, 0) + ' m²'],
      q.area.mezz ? ['Mezanina', fmt(q.area.mezz, 0) + ' m²'] : null,
      ['Lartësia në kulm', f2(res.cl.hr) + ' m'],
      ['Portale çeliku', res.nFrames + ' × ' + f2(res.bay) + ' m'],
      ['Mbulesa', fmt(q.area.roof + q.area.wall, 0) + ' m²']
    ].filter(Boolean).map(c => `<div class="chip"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
    if (window.View3D && View3D.ready && curTab === 'm3d') View3D.build(res, engIn);
    dirtyDraw = true; if (curTab !== 'm3d') renderDrawings();
  }
  function wmText() { return 'ONI-EL · PARAPRAK' + (reqData && reqData.code ? ' · ' + reqData.code : ''); }
  const PAL = { bg: '#162030', ink: '#e8eaf0', dim: '#8392a6', steel: '#7fb0d8', accent: '#f4a012' };
  function renderDrawings() {
    if (!res || !dirtyDraw) return;
    const m = { company: 'ONI-EL', project: summary(inp).title, watermark: wmText() };
    $('#drPlan').innerHTML = Draw.plan(res, engIn, PAL, m);
    $('#drFront').innerHTML = Draw.front(res, engIn, PAL, m);
    dirtyDraw = false;
  }

  /* ---------------- dërgimi ---------------- */
  function pickConfig() { const c = {}; CLIENT_KEYS.forEach(k => { c[k] = inp[k]; }); return c; }
  function showMsg(el, t, kind) { el.textContent = t; el.className = 'msg ' + (kind || ''); el.hidden = !t; }
  async function submit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const contact = { name: (fd.get('name') || '').trim(), company: (fd.get('company') || '').trim(), email: (fd.get('email') || '').trim(), phone: (fd.get('phone') || '').trim(), site: (fd.get('site') || '').trim(), note: (fd.get('note') || '').trim() };
    const msg = $('#sendMsg');
    if (!fd.get('consent')) { showMsg(msg, 'Ju lutem pranoni që t\'ju kontaktojmë për ofertën.', 'err'); return; }
    const c = client();
    if (!c) { showMsg(msg, 'Dërgimi online nuk është aktiv ende. Na shkruani te kontakti në faqen kryesore.', 'err'); return; }
    const btn = $('#bSend'); btn.disabled = true; btn.textContent = 'Duke dërguar…';
    try {
      const { data, error } = await c.rpc('submit_request', { p_contact: contact, p_config: pickConfig(), p_summary: summary(inp) });
      if (error) throw error;
      const mine = LS.get('kap.client.mine') || []; mine.unshift({ token: data.token, code: data.code, at: Date.now() }); LS.set('kap.client.mine', mine.slice(0, 10));
      LS.set('kap.client.draft', null);
      history.replaceState(null, '', location.pathname + '?k=' + data.token);
      await openPortal(data.token, 'Kërkesa ' + data.code + ' u dërgua. Ju dërguam me email linkun personal për ta ndjekur.');
    } catch (err) {
      showMsg(msg, (err && err.message) || 'Dërgimi dështoi. Provoni përsëri.', 'err');
    }
    btn.disabled = false; btn.textContent = 'Dërgo kërkesën për ofertë';
  }

  /* ---------------- portali ---------------- */
  const STATUS = {
    e_re: ['Në përgatitje', 'Inxhinieri ynë po e shqyrton kërkesën. Oferta do t\'ju vijë me email brenda 24 orësh.'],
    ndryshuar: ['Në rishikim', 'Morëm variantin tuaj të ri. Çmimi i përditësuar do t\'ju vijë me email brenda 24 orësh.'],
    oferte_gati: ['Oferta gati', 'Oferta është gati. Mund ta konfirmoni porosinë ose ta ndryshoni variantin.'],
    konfirmuar: ['Porosi e konfirmuar', 'Faleminderit! Porosia u konfirmua. Do t\'ju kontaktojmë për kontratën dhe paradhënien.'],
    anulluar: ['E mbyllur', 'Kjo kërkesë është mbyllur. Për pyetje na kontaktoni.']
  };
  async function openPortal(tok, flash) {
    const c = client();
    mode = 'portal'; token = tok; document.body.classList.add('portal');
    $('#heroNew').hidden = true; $('#portal').hidden = false; $('#contactStep').hidden = true;
    if (!c) { $('#portal').innerHTML = '<div class="card"><p>Portali nuk është konfiguruar ende.</p></div>'; return; }
    $('#portal').innerHTML = '<div class="card"><p class="muted">Duke ngarkuar…</p></div>';
    const { data, error } = await c.rpc('get_request', { p_token: tok });
    if (error || !data) { $('#portal').innerHTML = `<div class="card"><h2>Linku nuk u gjet</h2><p class="muted">Kontrolloni linkun në email ose na kontaktoni.</p></div>`; return; }
    reqData = data;
    inp = Object.assign(clone(DEF), data.config || {});
    editing = false; changed = false;
    renderPortal(flash);
    refreshForm(); compute();
  }
  let changed = false;
  function markChanged() { if (!changed) { changed = true; $('#editBar').hidden = false; } }
  function renderPortal(flash) {
    const d = reqData, st = STATUS[d.status] || STATUS.e_re;
    const steps = [['Kërkesa u dërgua', true], ['Oferta', ['oferte_gati', 'konfirmuar'].includes(d.status)], ['Porosia u konfirmua', d.status === 'konfirmuar']];
    let h = '';
    if (flash) h += `<div class="flash">${esc(flash)}</div>`;
    h += `<div class="card status-card"><div class="sc-head"><div><span class="code">${esc(d.code)}</span><h2>${esc((d.summary && d.summary.title) || 'Kapanon')}</h2><p class="muted">${esc(d.name)}${d.company ? ' · ' + esc(d.company) : ''} · dërguar më ${dstr(d.created_at)}</p></div><span class="pill st-${d.status}">${st[0]}</span></div>`;
    h += `<ol class="tl">${steps.map((s, i) => `<li class="${s[1] ? 'done' : ''}"><i>${s[1] ? '✓' : i + 1}</i><span>${s[0]}</span></li>`).join('')}</ol><p class="lead">${st[1]}</p></div>`;
    if (d.offer && (d.status === 'oferte_gati' || d.status === 'konfirmuar')) h += offerHTML(d);
    else if (d.status !== 'konfirmuar' && d.status !== 'anulluar') h += `<div class="card"><div class="row"><button class="btn" id="bEdit" type="button">Ndrysho kërkesën</button></div></div>`;
    $('#portal').innerHTML = h;
    const be = $('#bEdit'); if (be) be.addEventListener('click', startEdit);
    const bc = $('#bConfirm'); if (bc) bc.addEventListener('click', () => { $('#confirmBox').hidden = false; bc.hidden = true; });
    const bn = $('#bNo'); if (bn) bn.addEventListener('click', () => { $('#confirmBox').hidden = true; $('#bConfirm').hidden = false; });
    const by = $('#bYes'); if (by) by.addEventListener('click', confirmOrder);
  }
  function offerHTML(d) {
    const o = d.offer, done = d.status === 'konfirmuar';
    let h = `<div class="card offer"><div class="of-head"><div><span class="lbl">Oferta ${esc(o.offerNo || '')}</span><div class="price">${esc(o.priceStr)}</div><span class="muted">pa TVSH · ${esc(o.perM2Str)} për m²</span></div><div class="valid"><span class="lbl">E vlefshme deri</span><b>${esc(o.validStr || '')}</b></div></div>`;
    h += `<table class="pt">${(o.priceRows || []).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])} ${esc(o.curLabel || '€')}</td></tr>`).join('')}${(o.totals || []).map(t => `<tr class="${t[2] ? 'fin' : 'sub'}"><td>${esc(t[0])}</td><td>${esc(t[1])} ${esc(o.curLabel || '€')}</td></tr>`).join('')}</table>`;
    h += `<details class="desc"><summary>Përshkrimi teknik dhe kushtet</summary><table class="dt">${(o.desc || []).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}<tr><td>Afati</td><td>${esc(o.lead || '')}</td></tr><tr><td>Pagesa</td><td>${esc(o.pay || '')}</td></tr><tr><td>Përfshihen</td><td>${esc(o.incl || '')}</td></tr><tr><td>Nuk përfshihen</td><td>${esc(o.excl || '')}</td></tr></table><p class="muted small">${esc(o.note || '')}</p></details>`;
    if (!done) h += `<div class="row acts"><button class="btn pri" id="bConfirm" type="button">Konfirmo porosinë</button><button class="btn" id="bEdit" type="button">Ndrysho variantin</button></div>
      <div class="confirm" id="confirmBox" hidden><p>Duke konfirmuar, pranoni ofertën <b>${esc(o.offerNo || '')}</b> prej <b>${esc(o.priceStr)}</b> pa TVSH dhe kushtet e mësipërme.</p><div class="row"><button class="btn pri" id="bYes" type="button">Po, konfirmoj porosinë</button><button class="btn" id="bNo" type="button">Jo tani</button></div><p class="msg" id="confMsg" hidden></p></div>`;
    else h += `<p class="ok-line">✓ Konfirmuar më ${dstr(d.confirmed_at, true)}</p>`;
    return h + '</div>';
  }
  function startEdit() {
    editing = true; changed = false;
    $('#editBar').hidden = false;
    $('#editNote').textContent = reqData.status === 'oferte_gati' ? 'Pas ruajtjes, oferta aktuale fshihet dhe inxhinieri ju dërgon çmimin e ri brenda 24 orësh.' : 'Ndryshoni opsionet dhe ruani.';
    refreshForm();
    $('#cfgSteps').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function saveEdit() {
    const c = client(); if (!c) return;
    const btn = $('#bSaveEdit'); btn.disabled = true; btn.textContent = 'Duke ruajtur…';
    try {
      const { data, error } = await c.rpc('update_request', { p_token: token, p_config: pickConfig(), p_summary: summary(inp), p_note: $('#editMsg').value || null });
      if (error) throw error;
      reqData = data; editing = false; changed = false; $('#editBar').hidden = true; $('#editMsg').value = '';
      renderPortal('Ndryshimet u ruajtën. Do t\'ju njoftojmë me email kur oferta të jetë gati.'); refreshForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alertBar(err.message || 'Ruajtja dështoi.'); }
    btn.disabled = false; btn.textContent = 'Ruaj ndryshimet';
  }
  async function cancelEdit() { await openPortal(token); }
  async function confirmOrder() {
    const c = client(); if (!c) return;
    const b = $('#bYes'); b.disabled = true; b.textContent = 'Duke konfirmuar…';
    try {
      const { data, error } = await c.rpc('confirm_request', { p_token: token, p_version: reqData.offer_version });
      if (error) throw error;
      reqData = data; renderPortal('Porosia u konfirmua. Faleminderit!'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { const m = $('#confMsg'); showMsg(m, err.message || 'Konfirmimi dështoi.', 'err'); b.disabled = false; b.textContent = 'Po, konfirmoj porosinë'; }
  }
  function alertBar(t) { const m = $('#editErr'); showMsg(m, t, 'err'); }

  /* ---------------- nisja ---------------- */
  function showTab(t) {
    curTab = t;
    $$('.vtabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    $('#pane-m3d').hidden = t !== 'm3d'; $('#pane-plan').hidden = t !== 'plan'; $('#pane-front').hidden = t !== 'front';
    if (t === 'm3d') { View3D.resize(); if (res) View3D.build(res, engIn); } else renderDrawings();
  }
  function init() {
    renderForm();
    if (window.View3D) View3D.init($('#viewer'));
    if (View3D.ready) { View3D.setClad(2); }
    $$('.vtabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
    $$('#vClad button').forEach(b => b.addEventListener('click', () => { $$('#vClad button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); View3D.setClad(+b.dataset.c); }));
    $$('#vView button').forEach(b => b.addEventListener('click', () => { $$('#vView button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); View3D.setView(b.dataset.v); }));
    $$('.nodl').forEach(el => { el.addEventListener('contextmenu', e => e.preventDefault()); el.addEventListener('dragstart', e => e.preventDefault()); });
    $('#reqForm').addEventListener('submit', submit);
    $('#bSaveEdit').addEventListener('click', saveEdit);
    $('#bCancelEdit').addEventListener('click', cancelEdit);
    const k = new URLSearchParams(location.search).get('k');
    if (k) { openPortal(k); return; }
    const draft = LS.get('kap.client.draft');
    if (draft) inp = Object.assign(clone(DEF), draft);
    const mine = LS.get('kap.client.mine') || [];
    if (mine.length) { const a = $('#myReq'); a.hidden = false; a.innerHTML = 'Keni dërguar më parë kërkesën <a href="?k=' + encodeURIComponent(mine[0].token) + '">' + esc(mine[0].code) + '</a>. Hapeni për të parë statusin.'; }
    refreshForm(); compute();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.KapClient = { get inp() { return inp; }, get res() { return res; }, openPortal, setVal };
})();
