/* Oni-El · Konfiguruesi i parkingjeve për klientët (pa çmime) + portali i ofertës */
(function () {
  'use strict';
  const E = window.ParkEngine;
  const CFG = window.KAP_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = E.fmt, f1 = v => fmt(v, 1), f2 = v => fmt(v, 2);
  const dstr = (v, t) => { const d = new Date(v), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + (t ? ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) : ''); };
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

  let inp = clone(E.DEF), res = null, mode = 'new', token = null, reqData = null, editing = true, curTab = 'm3d', changed = false, form = null;
  let sb = null;
  function client() {
    if (sb) return sb;
    if (!CFG.url || !CFG.anonKey || !window.supabase) return null;
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: false } });
    return sb;
  }

  // dita / nata në pamjen 3D (natën duken dritat LED)
  function setNight(v) { $$('#vTime button').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.n === '1') === !!v))); ParkView3D.setNight(v); }
  function setVal(k, v, typing) {
    if (!editing) return;
    if (k === 'led' && !!v !== !!inp.led) setTimeout(() => setNight(!!v), 0);
    inp[k] = v;
    if (k === 'model' && v === 'rrjet' && !(inp.nRows >= 4)) inp.nRows = 4;
    if (k === 'cover' && v === 'pv' && inp.tilt < 3) inp.tilt = 7;
    const max = E.rowsOf(inp) * inp.nSpaces; if (inp.ev > max) inp.ev = max;
    if (mode === 'new') LS.set('park.client.draft', inp); else markChanged();
    if (!typing) form.refresh();
    clearTimeout(setVal.t); setVal.t = setTimeout(compute, typing ? 350 : 100);
  }

  function compute() {
    try { res = E.design(inp); } catch (e) { console.error(e); return; }
    const g = res.geo;
    const chips = [
      ['Vende parkimi', g.spaces + ' makina'],
      ['Strehë', f1(g.L) + ' × ' + f1(g.D) + ' m'],
      ['Sipërfaqja e mbuluar', fmt(g.area, 0) + ' m²'],
      ['Lartësia', f2(g.hmin) + (g.hmax - g.hmin > 0.05 ? '–' + f2(g.hmax + res.depth) : '') + ' m'],
      ['Kolona', String(res.nCol)]
    ];
    if (res.pv) chips.push(['Fuqia diellore', f1(res.pv.kWp) + ' kWp', 'pv'], ['Prodhimi', fmt(Math.round(res.pv.kwh / 100) * 100, 0) + ' kWh/vit', 'pv']);
    if (res.opts.ev) chips.push(['Karikues', res.opts.ev.n + ' × ' + f1(res.opts.ev.kw) + ' kW']);
    $('#chips').innerHTML = chips.map(c => `<div class="chip ${c[2] || ''}"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
    const pc = $('#pvCard');
    if (res.pv) {
      const km = res.pv.kwh / 0.17;
      const faces = [...new Set(res.pv.planes.map(p => p.face))].map(f => E.FACE_NAME[f]).join(' dhe ');
      pc.hidden = false;
      pc.innerHTML = `<b>${res.pv.n} panele ${res.pv.Wp} Wp</b> në ${f1(res.pv.area)} m², të kthyer nga ${esc(faces)}, me pjerrësi ${fmt(inp.tilt, 0)}°. Prodhimi i vlerësuar: <b>${fmt(Math.round(res.pv.kwh / 100) * 100, 0)} kWh në vit</b> (±10%), sa për rreth ${fmt(Math.round(km / 1000) * 1000, 0)} km me makina elektrike.`;
    } else pc.hidden = true;
    if (window.ParkView3D && ParkView3D.ready && curTab === 'm3d') ParkView3D.build(res);
    if (curTab === 'plan') $('#drPlan').innerHTML = ParkPlan(res);
  }

  /* ---------------- dërgimi ---------------- */
  function pickConfig() { const n = E.normalize(inp), c = {}; E.CLIENT_KEYS.forEach(k => { c[k] = n[k]; }); c.kind = 'parking'; return c; }
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
      const { data, error } = await c.rpc('submit_request', { p_contact: contact, p_config: pickConfig(), p_summary: E.summary(inp, res) });
      if (error) throw error;
      const mine = LS.get('park.client.mine') || []; mine.unshift({ token: data.token, code: data.code, at: Date.now() }); LS.set('park.client.mine', mine.slice(0, 10));
      LS.set('park.client.draft', null);
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
    if ((data.config || {}).kind !== 'parking') { location.replace('kapanon.html?k=' + encodeURIComponent(tok)); return; }
    reqData = data;
    inp = Object.assign(clone(E.DEF), data.config || {});
    editing = false; changed = false;
    renderPortal(flash);
    form.refresh(); compute();
  }
  function markChanged() { if (!changed) { changed = true; $('#editBar').hidden = false; } }
  function renderPortal(flash) {
    const d = reqData, st = STATUS[d.status] || STATUS.e_re;
    const steps = [['Kërkesa u dërgua', true], ['Oferta', ['oferte_gati', 'konfirmuar'].includes(d.status)], ['Porosia u konfirmua', d.status === 'konfirmuar']];
    let h = '';
    if (flash) h += `<div class="flash">${esc(flash)}</div>`;
    h += `<div class="card status-card"><div class="sc-head"><div><span class="code">${esc(d.code)}</span><h2>${esc((d.summary && d.summary.title) || 'Parking me strehë')}</h2><p class="muted">${esc(d.name)}${d.company ? ' · ' + esc(d.company) : ''} · dërguar më ${dstr(d.created_at)}</p></div><span class="pill st-${d.status}">${st[0]}</span></div>`;
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
    const o = d.offer, done = d.status === 'konfirmuar', cl = o.curLabel || '€';
    let h = `<div class="card offer"><div class="of-head"><div><span class="lbl">Oferta ${esc(o.offerNo || '')}</span><div class="price">${esc(o.priceStr)}</div><span class="muted">pa TVSH${o.perSpaceStr ? ' · ' + esc(o.perSpaceStr) + ' për vend parkimi' : ''}</span></div><div class="valid"><span class="lbl">E vlefshme deri</span><b>${esc(o.validStr || '')}</b></div></div>`;
    h += `<table class="pt">${(o.priceRows || []).map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])} ${esc(cl)}</td></tr>`).join('')}${(o.totals || []).map(t => `<tr class="${t[2] ? 'fin' : 'sub'}"><td>${esc(t[0])}</td><td>${esc(t[1])} ${esc(cl)}</td></tr>`).join('')}</table>`;
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
    form.refresh();
    $('#cfgSteps').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function saveEdit() {
    const c = client(); if (!c) return;
    const btn = $('#bSaveEdit'); btn.disabled = true; btn.textContent = 'Duke ruajtur…';
    try {
      const { data, error } = await c.rpc('update_request', { p_token: token, p_config: pickConfig(), p_summary: E.summary(inp, res), p_note: $('#editMsg').value || null });
      if (error) throw error;
      reqData = data; editing = false; changed = false; $('#editBar').hidden = true; $('#editMsg').value = '';
      renderPortal('Ndryshimet u ruajtën. Do t\'ju njoftojmë me email kur oferta të jetë gati.'); form.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { showMsg($('#editErr'), err.message || 'Ruajtja dështoi.', 'err'); }
    btn.disabled = false; btn.textContent = 'Ruaj ndryshimet';
  }
  async function confirmOrder() {
    const c = client(); if (!c) return;
    const b = $('#bYes'); b.disabled = true; b.textContent = 'Duke konfirmuar…';
    try {
      const { data, error } = await c.rpc('confirm_request', { p_token: token, p_version: reqData.offer_version });
      if (error) throw error;
      reqData = data; renderPortal('Porosia u konfirmua. Faleminderit!'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { showMsg($('#confMsg'), err.message || 'Konfirmimi dështoi.', 'err'); b.disabled = false; b.textContent = 'Po, konfirmoj porosinë'; }
  }

  /* ---------------- nisja ---------------- */
  function showTab(t) {
    curTab = t;
    $$('.vtabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    $('#pane-m3d').hidden = t !== 'm3d'; $('#pane-plan').hidden = t !== 'plan';
    if (t === 'm3d') { ParkView3D.resize(); if (res) ParkView3D.build(res); } else if (res) $('#drPlan').innerHTML = ParkPlan(res);
  }
  function init() {
    form = ParkForm.mount($('#cfgSteps'), { get: () => inp, set: setVal, editable: () => editing, startNo: 1 });
    if (window.ParkView3D) ParkView3D.init($('#viewer'));
    $$('.vtabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
    $$('#vView button').forEach(b => b.addEventListener('click', () => { $$('#vView button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ParkView3D.setView(b.dataset.v); }));
    $$('#vCars button').forEach(b => b.addEventListener('click', () => { $$('#vCars button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ParkView3D.setCars(b.dataset.c === '1'); }));
    $$('#vTime button').forEach(b => b.addEventListener('click', () => setNight(b.dataset.n === '1')));
    $$('.nodl').forEach(el => { el.addEventListener('contextmenu', e => e.preventDefault()); el.addEventListener('dragstart', e => e.preventDefault()); });
    $('#reqForm').addEventListener('submit', submit);
    $('#bSaveEdit').addEventListener('click', saveEdit);
    $('#bCancelEdit').addEventListener('click', () => openPortal(token));
    const k = new URLSearchParams(location.search).get('k');
    if (k) { openPortal(k); return; }
    const draft = LS.get('park.client.draft');
    if (draft) inp = Object.assign(clone(E.DEF), draft);
    const q = new URLSearchParams(location.search), m = q.get('m'), v = q.get('v');
    if (m && E.MODELS[m]) { inp.model = m; if (m === 'rrjet' && !(inp.nRows >= 4)) inp.nRows = 4; }
    if (v === 'V' || v === 'A') inp.vshape = v;
    const mine = LS.get('park.client.mine') || [];
    if (mine.length) { const a = $('#myReq'); a.hidden = false; a.innerHTML = 'Keni dërguar më parë kërkesën <a href="?k=' + encodeURIComponent(mine[0].token) + '">' + esc(mine[0].code) + '</a>. Hapeni për të parë statusin.'; }
    form.refresh(); compute();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.ParkClient = { get inp() { return inp; }, get res() { return res; }, openPortal, setVal };
})();
