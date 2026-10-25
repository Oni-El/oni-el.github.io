/* Oni-El · Paneli i administratorit: hyrja, çmimet në Supabase, kërkesat nga website-i, publikimi i ofertës */
(function () {
  'use strict';
  const CFG = window.KAP_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LSget = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  let sb = null, app = null, current = null, list = [], factory = null;
  const CITY = { 'Elbasan': [0.8, 24, 'III', 0.25], 'Tiranë': [0.8, 25, 'III', 0.25], 'Durrës': [0.6, 27, 'II', 0.30], 'Shkodër': [1.0, 26, 'III', 0.28], 'Vlorë': [0.6, 28, 'II', 0.30], 'Fier': [0.6, 26, 'II', 0.27], 'Lushnjë': [0.6, 25, 'II', 0.25], 'Kavajë': [0.6, 26, 'II', 0.28], 'Lezhë': [0.8, 26, 'III', 0.28], 'Krujë / Fushë-Krujë': [0.8, 25, 'III', 0.27], 'Berat': [0.8, 24, 'III', 0.22], 'Korçë': [2.0, 25, 'III', 0.25], 'Pogradec': [1.8, 25, 'III', 0.27], 'Gjirokastër': [1.2, 25, 'III', 0.22], 'Sarandë': [0.6, 27, 'II', 0.30], 'Përmet': [1.2, 24, 'III', 0.24], 'Kukës': [2.0, 24, 'III', 0.18], 'Peshkopi': [2.0, 24, 'III', 0.22], 'Kosovë / tjetër': [1.2, 25, 'III', 0.25] };
  const G2 = { A: 1.0, B: 1.0, D: 0.5, I: 0.3, E: 0.3, X: 0.5 };
  const STATUS = { e_re: ['E re', 'new'], ndryshuar: ['Ndryshuar nga klienti', 'new'], oferte_gati: ['Ofertë e dërguar', 'sent'], konfirmuar: ['Konfirmuar', 'ok'], anulluar: ['Anulluar', 'off'] };

  function client() {
    if (sb) return sb;
    if (!CFG.url || !CFG.anonKey || !window.supabase) return null;
    sb = window.supabase.createClient(CFG.url, CFG.anonKey);
    return sb;
  }
  const ago = d => { const h = (Date.now() - new Date(d).getTime()) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? Math.round(h) + ' orë' : Math.round(h / 24) + ' ditë'; };

  /* ---------- ruajtja e çmimeve në Supabase ---------- */
  window.KAP_STORE = {
    mode: 'supabase',
    async init() { },
    async getSettings() {
      const c = client(); if (!c) return LSget('kap.settings');
      const { data, error } = await c.from('price_settings').select('data').eq('id', 1).maybeSingle();
      if (error) { console.warn(error); return LSget('kap.settings'); }
      const d = data ? data.data : null;
      // vlerat fillestare ruhen vetëm në Supabase (skedari publik ka zero)
      if (d && d.factory) {
        factory = d.factory;
        const D = window.KapEngine.DEFAULT_PRICES;
        Object.keys(factory).forEach(k => { if (D[k] && typeof D[k] === 'object') Object.assign(D[k], factory[k]); else D[k] = factory[k]; });
        if (!d.prices) d.prices = JSON.parse(JSON.stringify(factory));
      }
      return d;
    },
    async setSettings(v) {
      const c = client(); if (!c) { LSset('kap.settings', v); return; }
      const payload = factory ? Object.assign({}, v, { factory }) : v;
      const { error } = await c.from('price_settings').upsert({ id: 1, data: payload, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async list() { return LSget('kap.projects') || []; },
    async save(id, data) { const l = (LSget('kap.projects') || []).filter(p => p.id !== id); l.unshift(Object.assign({ id }, data)); LSset('kap.projects', l); },
    async del(id) { LSset('kap.projects', (LSget('kap.projects') || []).filter(p => p.id !== id)); }
  };

  /* ---------- hyrja ---------- */
  function loginUI(msg) {
    return new Promise(resolve => {
      const ov = $('#loginOv'); ov.hidden = false;
      const m = $('#loginMsg'); m.textContent = msg || ''; m.hidden = !msg;
      const f = $('#loginForm');
      f.onsubmit = async e => {
        e.preventDefault();
        const c = client();
        const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Duke hyrë…';
        const { data, error } = await c.auth.signInWithPassword({ email: $('#lgEmail').value.trim(), password: $('#lgPass').value });
        btn.disabled = false; btn.textContent = 'Hyr';
        if (error) { m.textContent = 'Hyrja dështoi: ' + (error.message === 'Invalid login credentials' ? 'email ose fjalëkalim i gabuar.' : error.message); m.hidden = false; return; }
        const ok = await isAdmin();
        if (!ok) { await c.auth.signOut(); m.textContent = 'Kjo llogari nuk ka të drejta administratori.'; m.hidden = false; return; }
        ov.hidden = true; resolve(data.session);
      };
    });
  }
  async function isAdmin() { const { data, error } = await client().rpc('is_admin'); return !error && data === true; }

  window.KapAdmin = {
    async beforeStore() {
      const c = client();
      if (!c) { setBar('<b>Supabase nuk është konfiguruar.</b> Plotëso kapanon/config.js me Project URL dhe çelësin anon.', 'warn'); return; }
      const { data } = await c.auth.getSession();
      if (!data.session || !(await isAdmin())) await loginUI();
      // erdhi nga paneli i dokumenteve: pas hyrjes kthehet atje
      if (new URLSearchParams(location.search).get('next') === 'panel.html') { location.replace('panel.html'); return new Promise(() => { }); }
      $('#bLogout').hidden = false;
    },
    onReady(api) {
      app = api;
      $('#bReq').hidden = false;
      $('#bReq').addEventListener('click', openList);
      const bd = $('#bDocs'); if (bd) { bd.hidden = false; bd.addEventListener('click', () => { location.href = 'panel.html'; }); }
      $('#bLogout').addEventListener('click', async () => { await client().auth.signOut(); location.reload(); });
      refreshList().then(() => {
        const rid = new URLSearchParams(location.search).get('r');
        if (rid) { const r = list.find(x => x.id === rid); if (r) openRequest(r); }
      });
      setInterval(refreshList, 120000);
    }
  };

  /* ---------- kërkesat ---------- */
  async function refreshList() {
    const c = client(); if (!c) return;
    const { data, error } = await c.from('kap_requests').select('id,nr,token,status,name,company,email,phone,site,note,config,summary,offer,offer_version,offer_at,confirmed_at,created_at,updated_at,admin_note').order('created_at', { ascending: false }).limit(200);
    if (error) { console.warn(error); return; }
    list = data || [];
    const n = list.filter(r => r.status === 'e_re' || r.status === 'ndryshuar').length;
    $('#bReq').textContent = 'Kërkesat' + (n ? ' · ' + n : '');
    $('#bReq').classList.toggle('pri', n > 0);
    if (current) { const r = list.find(x => x.id === current.id); if (r) { current = r; renderBar(); } }
    if ($('#dlgReq').open) renderList();
  }
  function code(r) { return 'KAP-' + String(r.nr).padStart(4, '0'); }
  function openList() { renderList(); $('#dlgReq').showModal(); refreshList(); }
  function renderList() {
    const f = $('#reqFilter').value;
    const rows = list.filter(r => f === 'all' ? true : f === 'open' ? (r.status === 'e_re' || r.status === 'ndryshuar') : r.status === f);
    $('#reqList').innerHTML = rows.length ? rows.map(r => {
      const st = STATUS[r.status] || ['?', ''];
      const wait = (r.status === 'e_re' || r.status === 'ndryshuar') ? `<span class="wait${(Date.now() - new Date(r.updated_at)) > 20 * 36e5 ? ' late' : ''}">pret ${ago(r.updated_at)}</span>` : '';
      return `<div class="prow"><div><b>${code(r)} · ${esc(r.name)}${r.company ? ' (' + esc(r.company) + ')' : ''}</b><small>${esc((r.summary && r.summary.text) || '')}</small><small>${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''}${r.site ? ' · ' + esc(r.site) : ''}</small></div><div class="pv"><span class="rst rst-${st[1]}">${st[0]}</span>${wait}${r.offer && r.offer.priceStr ? '<br>' + esc(r.offer.priceStr) : ''}</div><div class="row"><button class="btn sm${r.status === 'e_re' || r.status === 'ndryshuar' ? ' pri' : ''}" data-id="${r.id}" type="button">Hap</button></div></div>`;
    }).join('') : '<div class="empty">Nuk ka kërkesa në këtë listë.</div>';
    $$('#reqList [data-id]').forEach(b => b.addEventListener('click', () => { const r = list.find(x => x.id === b.dataset.id); $('#dlgReq').close(); openRequest(r); }));
  }
  function openRequest(r) {
    current = r;
    const today = new Date().toISOString().slice(0, 10);
    const base = Object.assign({}, r.config || {});
    const cp = CITY[base.city];
    if (cp) { base.sk = cp[0]; base.vb = cp[1]; base.terrain = cp[2]; base.ag = cp[3]; }
    if (base.mUse) base.mG2 = G2[base.mUse] != null ? G2[base.mUse] : 0.5;
    const extra = {
      name: code(r) + ' · ' + r.name,
      client: r.company ? r.company + ' (' + r.name + ')' : r.name,
      site: r.site || '',
      offerNo: code(r) + '-v' + (r.offer_version + 1),
      offerDate: today
    };
    const prev = LSget('kap.req.' + r.id);
    app.loadInputs(Object.assign(base, prev && prev.cfgSig === JSON.stringify(r.config) ? prev.adm : {}, extra));
    renderBar();
    app.showTab('cost');
    history.replaceState(null, '', location.pathname + '?r=' + r.id);
  }
  function setBar(html, kind) { const b = $('#reqBar'); b.hidden = !html; b.className = 'reqbar ' + (kind || ''); b.innerHTML = html || ''; }
  function renderBar() {
    if (!current) { setBar(''); return; }
    const r = current, st = STATUS[r.status] || ['?', ''];
    const closed = r.status === 'konfirmuar' || r.status === 'anulluar';
    let h = `<div class="rb-main"><span class="rst rst-${st[1]}">${st[0]}</span><b>${code(r)} · ${esc(r.name)}</b><span class="rb-sum">${esc((r.summary && r.summary.text) || '')}</span>`;
    if (r.note) h += `<span class="rb-note">Shënimi i klientit: ${esc(r.note)}</span>`;
    if (r.offer && r.offer.priceStr) h += `<span class="rb-note">Oferta e fundit (v${r.offer_version}): ${esc(r.offer.priceStr)} pa TVSH</span>`;
    h += `</div><div class="row">`;
    if (!closed) h += `<button class="btn pri sm" id="bPublish" type="button">${r.offer_version ? 'Publiko ofertën e përditësuar' : 'Publiko ofertën te klienti'}</button>`;
    h += `<button class="btn sm" id="bCopyLink" type="button">Kopjo linkun e klientit</button>`;
    if (!closed) h += `<button class="btn sm danger" id="bCancelReq" type="button">Anullo</button>`;
    h += `<button class="btn sm" id="bCloseReq" type="button">Mbyll</button></div><div class="rb-confirm" id="pubBox" hidden></div>`;
    setBar(h);
    const bp = $('#bPublish'); if (bp) bp.addEventListener('click', askPublish);
    $('#bCopyLink').addEventListener('click', () => copy(location.origin + location.pathname.replace(/admin-kapanon\.html$/, '') + 'kapanon.html?k=' + r.token));
    const bc = $('#bCancelReq'); if (bc) bc.addEventListener('click', async e => {
      if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'Konfirmo anullimin'; return; }
      const { error } = await client().rpc('admin_set_status', { p_id: r.id, p_status: 'anulluar' });
      if (error) app.toast('Nuk u anullua: ' + error.message); else { app.toast('Kërkesa u anullua.'); refreshList(); }
    });
    $('#bCloseReq').addEventListener('click', () => { current = null; setBar(''); history.replaceState(null, '', location.pathname); });
  }
  async function copy(t) { try { await navigator.clipboard.writeText(t); app.toast('Linku u kopjua.'); } catch (e) { prompt('Kopjo linkun:', t); } }

  function buildOffer() {
    const o = app.offerData(), c = app.cost, res = app.res, s = app.settings;
    const eur = app.cur() === 'ALL' ? s.prices.eurAll : 1;
    return {
      offerNo: o.offer.no, dateStr: o.offer.dateStr, validStr: o.offer.validStr, validDays: o.offer.validDays,
      price: Math.round(c.price * eur), perM2: Math.round(c.perM2 * eur * 10) / 10,
      priceStr: app.money(c.price), perM2Str: app.money(c.perM2, app.cur() === 'EUR' ? 1 : 0),
      currency: app.cur(), currencyLabel: o.curLabel, curLabel: o.curLabel,
      priceRows: o.priceRows, totals: o.totals, figs: o.figs, desc: o.desc,
      lead: o.offer.lead, pay: o.offer.pay, incl: o.offer.incl, excl: o.offer.excl, note: o.note,
      kgLine: o.kgLine || '', title: o.title, subtitle: o.subtitle,
      area: res.qty.area.ground, mezzArea: res.qty.area.mezz
    };
  }
  function askPublish() {
    if (!app.res || !app.cost) return;
    const res = app.res;
    const ok = res.frame.ok && res.purlin.u <= 1 && res.rail.u <= 1;
    const o = buildOffer();
    const box = $('#pubBox'); box.hidden = false;
    box.innerHTML = `<p>Klienti do të shohë <b>${esc(o.priceStr)}</b> pa TVSH (${esc(o.perM2Str)}/m²), ofertën ${esc(o.offerNo)} të vlefshme deri më ${esc(o.validStr)}, dhe merr email menjëherë.${ok ? '' : ' <b class="bad">Kujdes: struktura nuk i kalon të gjitha kontrollet.</b>'}</p><div class="row"><button class="btn pri sm" id="bPubYes" type="button">Publiko dhe njofto klientin</button><button class="btn sm" id="bPubNo" type="button">Jo ende</button></div>`;
    $('#bPubNo').addEventListener('click', () => { box.hidden = true; });
    $('#bPubYes').addEventListener('click', publish);
  }
  async function publish() {
    const b = $('#bPubYes'); b.disabled = true; b.textContent = 'Duke publikuar…';
    const offer = buildOffer();
    // konfigurimi që klienti sheh nuk ndryshon; ruajmë vetëm shifrat për klientin
    const { data, error } = await client().rpc('admin_publish_offer', { p_id: current.id, p_offer: offer });
    if (error) { app.toast('Publikimi dështoi: ' + error.message); b.disabled = false; b.textContent = 'Publiko dhe njofto klientin'; return; }
    const adm = {}; ['grade', 'colFam', 'rafFam', 'colSec', 'rafSec', 'purlinFam', 'purlinSec', 'purlinCont', 'purlinAuto', 'purlinSp', 'railFam', 'railSec', 'railAuto', 'railSp', 'postFam', 'postSec', 'postSp', 'limV', 'limH', 'connPct', 'coat', 'margin', 'bayMax', 'base', 'haunch', 'mGrid', 'mSlab', 'mBeamFam', 'mColFam', 'stairTread', 'q', 'soil', 'sk', 'vb', 'ag', 'terrain', 'gExtra', 'pay', 'excl', 'leadTime', 'validDays', 'showVat', 'showKg', 'showProfiles', 'currency'].forEach(k => { adm[k] = app.inp[k]; });
    LSset('kap.req.' + current.id, { cfgSig: JSON.stringify(current.config), adm });
    current = Object.assign({}, current, data);
    app.toast('Oferta u publikua. Klienti mori email.');
    renderBar(); refreshList();
  }
})();
