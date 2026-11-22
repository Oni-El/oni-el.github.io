/* Oni-El · Paneli i stafit për parkingjet: hyrja, kërkesat, llogaritja, kostot, PDF dhe publikimi i ofertës */
(function () {
  'use strict';
  const E = window.ParkEngine, PC = window.ParkCosts, K = window.KapEngine;
  const CFG = window.KAP_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = E.fmt, f1 = v => fmt(v, 1), f2 = v => fmt(v, 2), kwStr = v => String(v).replace('.', ',');
  const LSget = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const dstr = d => { const p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const ago = d => { const h = (Date.now() - new Date(d).getTime()) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? Math.round(h) + ' orë' : Math.round(h / 24) + ' ditë'; };
  const STATUS = { e_re: ['E re', 'new'], ndryshuar: ['Ndryshuar nga klienti', 'new'], oferte_gati: ['Ofertë e dërguar', 'sent'], konfirmuar: ['Konfirmuar', 'ok'], anulluar: ['Anulluar', 'off'] };
  const OFFER_DEF = { margin: null, currency: 'EUR', validDays: 30, lead: '4–6 javë nga konfirmimi dhe paradhënia',
    pay: '40% paradhënie me konfirmimin, 50% para dërgimit të materialeve, 10% në përfundim të montimit.',
    incl: 'Projekti i strukturës, prodhimi, zinkimi, transporti, themelet dhe montimi; pajisjet dhe opsionet e listuara.',
    excl: 'Leja e ndërtimit, lidhja me OSHEE dhe matësi dypalësh, asfaltimi dhe vijëzimi i parkingut, linja elektrike deri te paneli i objektit.',
    note: 'Çmimet janë pa TVSH. Prodhimi i energjisë diellore është vlerësim (±10%) dhe varet nga hijet dhe moti.',
    client: '', site: '', offerNo: '', showVat: true, showSave: true, tBasis: 'space' };
  // të dhënat e kompanisë merren nga cilësimet e kalkulatorit të kapanonëve (price_settings), që ofertat të jenë njësoj
  let company = { name: 'Oni-El', nipt: '', addr: 'Elbasan, Shqipëri', phone: '+355 68 315 5705', email: '', signer: '' };

  let sb = null, inp = clone(E.DEF), eng = clone(E.ENG), off = clone(OFFER_DEF), prices = null, res = null, cost = null, current = null, list = [], form = null, curTab = 'm3d', built = null;
  function client() { if (sb) return sb; if (!CFG.url || !CFG.anonKey || !window.supabase) return null; sb = window.supabase.createClient(CFG.url, CFG.anonKey); return sb; }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500); }
  const code = r => 'PRK-' + String(r.nr).padStart(4, '0');
  const cur = () => off.currency === 'ALL' ? 'ALL' : 'EUR';
  const rate = () => cur() === 'ALL' ? (+prices.eurAll || 98) : 1;
  const money = (v, d) => fmt(v * rate(), d == null ? 0 : d) + ' ' + (cur() === 'ALL' ? 'Lekë' : '€');
  const amt = (v, d) => fmt(v * rate(), d == null ? 0 : d);

  /* ---------- hyrja ---------- */
  async function isAdmin() { const { data, error } = await client().rpc('is_admin'); return !error && data === true; }
  function loginUI(msg) {
    return new Promise(resolve => {
      const ov = $('#loginOv'); ov.hidden = false;
      const m = $('#loginMsg'); m.textContent = msg || ''; m.hidden = !msg;
      $('#loginForm').onsubmit = async e => {
        e.preventDefault();
        const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Duke hyrë…';
        const { data, error } = await client().auth.signInWithPassword({ email: $('#lgEmail').value.trim(), password: $('#lgPass').value });
        btn.disabled = false; btn.textContent = 'Hyr';
        if (error) { m.textContent = 'Hyrja dështoi: ' + (error.message === 'Invalid login credentials' ? 'email ose fjalëkalim i gabuar.' : error.message); m.hidden = false; return; }
        if (!(await isAdmin())) { await client().auth.signOut(); m.textContent = 'Kjo llogari nuk ka të drejta administratori.'; m.hidden = false; return; }
        ov.hidden = true; resolve(data.session);
      };
    });
  }

  /* ---------- çmimet ---------- */
  async function loadPrices() {
    const { data, error } = await client().from('portal_config').select('value').eq('key', 'parking_prices').maybeSingle();
    if (error) console.warn(error);
    try { prices = data && data.value ? JSON.parse(data.value) : {}; } catch (e) { prices = {}; }
    const wb = $('#warnBar');
    if (!(+prices.stMat > 0)) { wb.hidden = false; wb.innerHTML = '<b>Çmimet e parkingjeve mungojnë.</b> Ekzekuto skedarin supabase-parking.sql te Supabase ose plotësoji te «Çmimet».'; } else wb.hidden = true;
  }
  async function loadCompany() {
    try {
      const { data, error } = await client().from('price_settings').select('data').eq('id', 1).maybeSingle();
      const c = !error && data && data.data && data.data.company;
      if (c) Object.keys(c).forEach(k => { if (c[k]) company[k] = c[k]; });
    } catch (e) { console.warn(e); }
  }
  function openPrices() {
    const box = $('#prBody');
    box.innerHTML = PC.KEYS.map(([g, ks]) => `<fieldset><legend>${esc(g)}</legend>${ks.map(([k, l, u]) => `<label class="pr"><span>${esc(l)}</span><span class="inp"><input type="number" step="any" data-k="${k}" value="${prices[k] != null ? prices[k] : ''}"><span class="u">${esc(u)}</span></span></label>`).join('')}</fieldset>`).join('');
    $('#dlgPrices').showModal();
  }
  async function savePrices() {
    const p = Object.assign({}, prices);
    $$('#prBody input').forEach(i => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) p[i.dataset.k] = v; });
    const { error } = await client().from('portal_config').upsert({ key: 'parking_prices', value: JSON.stringify(p) });
    if (error) { toast('Ruajtja dështoi: ' + error.message); return; }
    prices = p; $('#dlgPrices').close(); $('#warnBar').hidden = +prices.stMat > 0;
    toast('Çmimet u ruajtën.'); compute();
  }

  /* ---------- kërkesat ---------- */
  async function refreshList() {
    const { data, error } = await client().from('kap_requests').select('id,nr,token,status,name,company,email,phone,site,note,config,summary,offer,offer_version,offer_at,confirmed_at,created_at,updated_at,admin_note').order('created_at', { ascending: false }).limit(300);
    if (error) { console.warn(error); return; }
    list = (data || []).filter(r => (r.config || {}).kind === 'parking');
    const n = list.filter(r => r.status === 'e_re' || r.status === 'ndryshuar').length;
    $('#bReq').textContent = 'Kërkesat' + (n ? ' · ' + n : ''); $('#bReq').classList.toggle('pri', n > 0);
    if (current) { const r = list.find(x => x.id === current.id); if (r) { current = r; renderBar(); } }
    if ($('#dlgReq').open) renderList();
  }
  function renderList() {
    const f = $('#reqFilter').value;
    const rows = list.filter(r => f === 'all' ? true : f === 'open' ? (r.status === 'e_re' || r.status === 'ndryshuar') : r.status === f);
    $('#reqList').innerHTML = rows.length ? rows.map(r => {
      const st = STATUS[r.status] || ['?', ''];
      const wait = (r.status === 'e_re' || r.status === 'ndryshuar') ? `<span class="wait${(Date.now() - new Date(r.updated_at)) > 20 * 36e5 ? ' late' : ''}">pret ${ago(r.updated_at)}</span>` : '';
      return `<div class="prow"><div><b>${code(r)} · ${esc(r.name)}${r.company ? ' (' + esc(r.company) + ')' : ''}</b><small>${esc((r.summary && r.summary.text) || '')}</small><small>${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''}${r.site ? ' · ' + esc(r.site) : ''}</small></div><div class="pv"><span class="rst rst-${st[1]}">${st[0]}</span>${wait}${r.offer && r.offer.priceStr ? '<br>' + esc(r.offer.priceStr) : ''}</div><div><button class="btn sm${r.status === 'e_re' || r.status === 'ndryshuar' ? ' pri' : ''}" data-id="${r.id}" type="button">Hap</button></div></div>`;
    }).join('') : '<div class="empty">Nuk ka kërkesa për parkingje në këtë listë.</div>';
    $$('#reqList [data-id]').forEach(b => b.addEventListener('click', () => { $('#dlgReq').close(); openRequest(list.find(x => x.id === b.dataset.id)); }));
  }
  function openRequest(r) {
    current = r;
    inp = Object.assign(clone(E.DEF), r.config || {});
    const prev = LSget('park.req.' + r.id);
    const same = prev && prev.cfgSig === JSON.stringify(r.config);
    eng = Object.assign(clone(E.ENG), same ? prev.eng : {});
    off = Object.assign(clone(OFFER_DEF), same ? prev.off : {});
    if (!off.client) off.client = r.company ? r.company + ' · ' + r.name : r.name;
    if (!off.site) off.site = r.site || '';
    form.refresh(); renderEng(); renderOff(); compute(); renderBar();
    showTab('cost');
    history.replaceState(null, '', location.pathname + '?r=' + r.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function setBar(html, kind) { const b = $('#reqBar'); b.hidden = !html; b.className = 'reqbar ' + (kind || ''); b.innerHTML = html || ''; }
  function renderBar() {
    if (!current) { setBar(''); return; }
    const r = current, st = STATUS[r.status] || ['?', ''], closed = r.status === 'konfirmuar' || r.status === 'anulluar';
    let h = `<div class="rb-main"><span class="rst rst-${st[1]}">${st[0]}</span><b>${code(r)} · ${esc(r.name)}${r.company ? ' (' + esc(r.company) + ')' : ''}</b><span class="rb-sum">${esc(r.email)}${r.phone ? ' · ' + esc(r.phone) : ''}${r.site ? ' · ' + esc(r.site) : ''}</span>`;
    if (r.note) h += `<span class="rb-note">Shënimi i klientit: ${esc(r.note)}</span>`;
    if (r.offer && r.offer.priceStr) h += `<span class="rb-note">Oferta e fundit (v${r.offer_version}): ${esc(r.offer.priceStr)} pa TVSH</span>`;
    if (JSON.stringify(normCfg(inp)) !== JSON.stringify(normCfg(r.config))) h += `<span class="rb-note warn">Ke ndryshuar zgjedhjet e klientit. Oferta do të përshkruajë variantin që sheh këtu.</span>`;
    h += `</div><div class="row">`;
    if (!closed) h += `<button class="btn pri sm" id="bPublish" type="button">${r.offer_version ? 'Publiko ofertën e përditësuar' : 'Publiko ofertën te klienti'}</button>`;
    h += `<button class="btn sm" id="bCopyLink" type="button">Kopjo linkun e klientit</button>`;
    if (!closed) h += `<button class="btn sm danger" id="bCancelReq" type="button">Anullo</button>`;
    h += `<button class="btn sm" id="bCloseReq" type="button">Mbyll</button></div><div class="rb-confirm" id="pubBox" hidden></div>`;
    setBar(h);
    const bp = $('#bPublish'); if (bp) bp.addEventListener('click', askPublish);
    $('#bCopyLink').addEventListener('click', () => copy(location.origin + location.pathname.replace(/admin-parking\.html$/, '') + 'parking.html?k=' + r.token));
    const bc = $('#bCancelReq'); if (bc) bc.addEventListener('click', async e => {
      if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'Konfirmo anullimin'; return; }
      const { error } = await client().rpc('admin_set_status', { p_id: r.id, p_status: 'anulluar' });
      if (error) toast('Nuk u anullua: ' + error.message); else { toast('Kërkesa u anullua.'); refreshList(); }
    });
    $('#bCloseReq').addEventListener('click', () => { current = null; setBar(''); history.replaceState(null, '', location.pathname); });
  }
  const normCfg = c => { const n = E.normalize(c || {}), o = {}; E.CLIENT_KEYS.forEach(k => { o[k] = n[k]; }); return o; };
  async function copy(t) { try { await navigator.clipboard.writeText(t); toast('Linku u kopjua.'); } catch (e) { prompt('Kopjo linkun:', t); } }

  /* ---------- parametrat e inxhinierit dhe oferta ---------- */
  function secOpts(fams, v) {
    const l = fams === 'auto' ? K.famList(['HEA', 'SHS']) : K.famList([fams]);
    return `<option value="">Automatik</option>` + l.map(s => `<option value="${esc(s.name)}"${s.name === v ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  }
  function renderEng() {
    const sel = (k, o) => `<select data-e="${k}">${o.map(x => `<option value="${esc(x[0])}"${String(eng[k]) === String(x[0]) ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`;
    const num = (k, u, st) => `<span class="inp"><input type="number" step="${st || 'any'}" data-e="${k}" value="${eng[k]}"><span class="u">${u}</span></span>`;
    $('#engBox').innerHTML = `
      <label class="f"><span class="fl">Çeliku</span><span class="inp">${sel('grade', [['S235', 'S235'], ['S275', 'S275'], ['S355', 'S355']])}</span></label>
      <label class="f"><span class="fl">Mbrojtja</span><span class="inp">${sel('coat', [['zink', 'Zinkim në të nxehtë'], ['paint', 'Bojë']])}</span></label>
      <label class="f"><span class="fl">Familja e trarëve</span><span class="inp">${sel('beamFam', [['IPE', 'IPE'], ['HEA', 'HEA']])}</span></label>
      <label class="f"><span class="fl">Trau kryesor</span><span class="inp"><select data-e="beamSec">${secOpts(eng.beamFam, eng.beamSec)}</select></span></label>
      <label class="f"><span class="fl">Familja e kolonave</span><span class="inp">${sel('colFam', [['auto', 'Automatike'], ['HEA', 'HEA'], ['SHS', 'SHS'], ['IPE', 'IPE']])}</span></label>
      <label class="f"><span class="fl">Kolona</span><span class="inp"><select data-e="colSec">${secOpts(eng.colFam, eng.colSec)}</select></span></label>
      <label class="f"><span class="fl">Trarët e çatisë</span><span class="inp">${sel('purlinFam', [['RHS', 'RHS'], ['SHS', 'SHS']])}</span></label>
      <label class="f"><span class="fl">Profili i çatisë</span><span class="inp"><select data-e="purlinSec">${secOpts(eng.purlinFam, eng.purlinSec)}</select></span></label>
      <label class="f"><span class="fl">Toka e lejuar</span>${num('soil', 'kPa', 10)}</label>
      <label class="f"><span class="fl">Lidhjet dhe pllakat</span>${num('conn', '% e çelikut', 1)}</label>
      <label class="f"><span class="fl">Paneli diellor</span>${num('pvWp', 'Wp', 5)}</label>
      <label class="f w2"><span class="fl">Paketa e pajisjeve (inverter, bateri, karikues)</span><span class="inp">${sel('pkg', Object.keys(ParkEquip.PKGS).map(k => [k, ParkEquip.PKGS[k].name]))}</span></label>
      <div class="w2 eqbox" id="eqBox"></div>`;
    $$('#engBox [data-e]').forEach(x => x.addEventListener('change', () => {
      const k = x.dataset.e; let v = x.value;
      if (x.type === 'number') v = parseFloat(String(v).replace(',', '.')) || 0;
      eng[k] = v;
      if (k === 'beamFam') eng.beamSec = ''; if (k === 'colFam') eng.colSec = ''; if (k === 'purlinFam') eng.purlinSec = '';
      if (/Fam$/.test(k)) renderEng();
      saveLocal(); compute();
    }));
  }
  // lista e pajisjeve të zgjedhura sipas paketës
  function renderEq() {
    const b = $('#eqBox'); if (!b) return;
    const eq = res && res.equip;
    b.innerHTML = eq ? `<dl class="kv eqkv">${eq.lines.map(x => `<dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd>`).join('')}</dl>` : '<small class="help">Pa pajisje elektrike (pa panele dhe pa karikues).</small>';
  }
  function renderOff() {
    const tx = (k, l, ph) => `<label class="f w2"><span class="fl">${l}</span><span class="inp"><input data-o="${k}" value="${esc(off[k] || '')}" placeholder="${esc(ph || '')}"></span></label>`;
    const cb = (k, l) => `<label class="chk w2"><input type="checkbox" data-o="${k}"${off[k] ? ' checked' : ''}> <span>${l}</span></label>`;
    $('#offBox').innerHTML = `
      ${tx('client', 'Klienti', 'emri ose firma')}
      ${tx('site', 'Vendndodhja', 'qyteti / adresa')}
      <label class="f"><span class="fl">Nr. i ofertës</span><span class="inp"><input data-o="offerNo" value="${esc(off.offerNo)}" placeholder="${esc(autoNo())}"></span></label>
      <label class="f"><span class="fl">Marzhi</span><span class="inp"><input type="number" step="0.5" data-o="margin" value="${off.margin != null ? off.margin : (prices && prices.margin) || 0}"><span class="u">%</span></span></label>
      <label class="f"><span class="fl">Monedha</span><span class="inp"><select data-o="currency"><option value="EUR"${cur() === 'EUR' ? ' selected' : ''}>Euro</option><option value="ALL"${cur() === 'ALL' ? ' selected' : ''}>Lekë</option></select></span></label>
      <label class="f"><span class="fl">E vlefshme</span><span class="inp"><input type="number" step="1" data-o="validDays" value="${off.validDays}"><span class="u">ditë</span></span></label>
      <label class="f w2"><span class="fl">Afati</span><span class="inp"><input data-o="lead" value="${esc(off.lead)}"></span></label>
      <label class="f w2"><span class="fl">Pagesa</span><span class="inp"><textarea rows="2" data-o="pay">${esc(off.pay)}</textarea></span></label>
      <label class="f w2"><span class="fl">Përfshihen</span><span class="inp"><textarea rows="2" data-o="incl">${esc(off.incl)}</textarea></span></label>
      <label class="f w2"><span class="fl">Nuk përfshihen</span><span class="inp"><textarea rows="2" data-o="excl">${esc(off.excl)}</textarea></span></label>
      <label class="f w2"><span class="fl">Shënim</span><span class="inp"><textarea rows="2" data-o="note">${esc(off.note)}</textarea></span></label>
      ${cb('showVat', 'Trego TVSH-në dhe totalin me TVSH në ofertë')}
      ${cb('showSave', 'Trego kursimin vjetor të energjisë (vetëm me panele)')}`;
    $$('#offBox [data-o]').forEach(x => x.addEventListener('change', () => {
      const k = x.dataset.o; off[k] = x.type === 'checkbox' ? x.checked : x.type === 'number' ? parseFloat(String(x.value).replace(',', '.')) || 0 : x.value;
      saveLocal(); compute();
    }));
  }
  function saveLocal() { if (current) LSset('park.req.' + current.id, { cfgSig: JSON.stringify(current.config), eng, off }); else LSset('park.free', { inp, eng, off }); }

  /* ---------- llogaritja ---------- */
  // dita / nata në pamjen 3D (natën duken dritat LED)
  function setNight(v) { $$('#vTime button').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.n === '1') === !!v))); ParkView3D.setNight(v); }
  function setVal(k, v, typing) {
    if (k === 'led' && !!v !== !!inp.led) setTimeout(() => setNight(!!v), 0);
    inp[k] = v;
    if (k === 'model' && v === 'rrjet' && !(inp.nRows >= 4)) inp.nRows = 4;
    const max = E.rowsOf(inp) * inp.nSpaces; if (inp.ev > max) inp.ev = max;
    if (!typing) form.refresh();
    saveLocal();
    clearTimeout(setVal.t); setVal.t = setTimeout(() => { compute(); if (current) renderBar(); }, typing ? 350 : 100);
  }
  function compute() {
    try { res = E.design(inp, eng); } catch (e) { console.error(e); return; }
    cost = prices ? PC.costs(res, prices, { margin: off.margin }) : null;
    renderChips(); renderCalc(); renderCost(); renderEq();
    if (curTab === 'm3d' && ParkView3D.ready) { ParkView3D.build(res); built = res; }
    if (curTab === 'offer') renderOffer();
    if (curTab === 'plan') $('#drPlan').innerHTML = ParkPlan(res);
    if (curTab === 'schema') $('#drSchema').innerHTML = ParkSchema(res, { models: true });
  }
  function renderChips() {
    const g = res.geo, c = [['Vende', g.spaces], ['Strehë', f1(g.L) + ' × ' + f1(g.D) + ' m'], ['Çeliku', fmt(res.qty.steel, 0) + ' kg'], ['kg/m²', f1(res.qty.steel / g.area)], ['Kolona', res.nCol]];
    if (res.pv) c.push(['PV', f1(res.pv.kWp) + ' kWp'], ['Prodhimi', fmt(res.pv.kwh, 0) + ' kWh/vit']);
    if (cost) c.push(['Çmimi pa TVSH', money(cost.price)], ['Për vend', money(cost.perSpace)]);
    $('#chips').innerHTML = c.map(x => `<div class="chip"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('') + (res.ok ? '' : '<div class="chip bad"><span>Kontrolli</span><b>Nuk kalon</b></div>');
  }
  function renderCalc() {
    const r = res, L = r.loads, g = r.geo, u = (n, m) => `<tr><td>${n}</td><td>${esc(m.sec.name)}${m.forced ? ' (zgjedhur)' : ''}</td><td class="n ${m.u > 1 ? 'bad' : ''}">${f2(m.u)}</td><td class="n ${m.d > 1 ? 'bad' : ''}">${f2(m.d)}</td><td>${esc(m.gov || '')}</td></tr>`;
    let h = `<h3>Ngarkesat</h3><table class="dtab"><tr><td>Bora</td><td>sk ${f2(L.sk)} kN/m² · μ ${f2(L.mu)} · s ${f2(L.s)} kN/m²</td></tr><tr><td>Era</td><td>vb ${L.vb} m/s · terreni ${L.terrain} · qp ${f2(L.qp)} kN/m² · cp,net +${f2(L.cpDn)} / ${f2(L.cpUp)}</td></tr>
      <tr><td>E përhershme</td><td>g ${f2(L.g)} kN/m² (mbulesa ${f2(r.cover.g)} + struktura)</td></tr><tr><td>Kombinimet (SHKK)</td><td>poshtë ${f2(L.qdn)} kN/m² · ngritje ${f2(L.qup)} kN/m² · shfrytëzim ${f2(L.qsls)} kN/m²</td></tr></table>`;
    h += `<h3>Elementet</h3><table class="dtab"><tr><th>Elementi</th><th>Profili</th><th class="n">Rezist.</th><th class="n">Deform.</th><th>Kontrolli kryesor</th></tr>${u('Trarët e çatisë · hapësira ' + f2(r.purlin.span) + ' m, çdo ' + f2(r.purlin.sp) + ' m', r.purlin)}${u('Trau kryesor · ' + (inp.model === 'portal' ? 'hapësira ' : inp.model === 'rrjet' ? 'hapësira ' : 'konsola ') + f2(r.beam.span) + ' m · M ' + fmt(r.beam.M, 0) + ' kNm', r.beam)}${u('Kolona · H ' + f2(r.Hc) + ' m · N ' + fmt(r.col.N, 0) + ' kN · M ' + fmt(r.col.M, 0) + ' kNm', r.col)}</table>`;
    h += `<h3>Sasitë</h3><table class="dtab"><tr><td>Gjeometria</td><td>${f2(g.L)} × ${f2(g.D)} m · ${g.nBays} hapësira × ${f2(g.bay)} m · ${r.nF} radhë kolonash × ${g.cols.length} · ${r.nCol} kolona</td></tr>
      <tr><td>Trarët e çatisë</td><td>${r.purlin.n} linja × ${f2(g.L)} m = ${fmt(r.kg.purlins, 0)} kg</td></tr><tr><td>Trarët kryesorë</td><td>${r.nF} × ${f2(r.beamLen)} m = ${fmt(r.kg.beams, 0)} kg</td></tr>
      <tr><td>Kolonat</td><td>${r.nCol} × ${f2(r.Hc)} m = ${fmt(r.kg.cols, 0)} kg</td></tr><tr><td>Kontraventimet</td><td>${fmt(r.kg.brace, 0)} kg</td></tr><tr><td>Lidhjet, pllakat, bulonat</td><td>${fmt(r.kg.conn, 0)} kg</td></tr>
      ${r.opts.closure ? `<tr><td>Mbyllja: skeleti</td><td>${fmt(r.opts.closure.railKg, 0)} kg · ${f1(r.opts.closure.area)} m²</td></tr>` : ''}
      <tr><td><b>Çeliku gjithsej</b></td><td><b>${fmt(r.qty.steel, 0)} kg</b> · ${f1(r.qty.steel / g.area)} kg/m² · ${fmt(r.qty.perSpace, 0)} kg për vend</td></tr>
      <tr><td>Themelet</td><td>${r.found.n} bazamente ${f2(r.found.B)} × ${f2(r.found.B)} × ${f2(r.found.h)} m · ${f1(r.found.V)} m³ beton · ankera ${r.found.bolt}${r.found.fail ? ' · <b class="bad">kontrollo themelin</b>' : ''}</td></tr>
      ${r.pv ? `<tr><td>Panelet</td><td>${r.pv.n} × ${r.pv.Wp} Wp = ${f2(r.pv.kWp)} kWp · ${r.pv.planes.map(p => p.across + '×' + p.along + ' nga ' + E.FACE_NAME[p.face]).join(', ')} · ${fmt(r.pv.kwh, 0)} kWh/vit · inverter ${f1(r.pv.inverterKw)} kW</td></tr>` : `<tr><td>Mbulesa</td><td>${f1(r.qty.coverArea)} m² ${esc(r.cover.name.toLowerCase())}</td></tr>`}
      </table>`;
    if (r.warn.length) h += `<p class="bad">${r.warn.map(esc).join('<br>')}</p>`;
    h += `<p class="muted small">Paradimensionim i thjeshtuar për ofertë (EN 1991-1-3/-4, EN 1993-1-1). Para prodhimit duhet llogaritja e plotë e zbatimit.</p>`;
    $('#calcBox').innerHTML = h;
  }
  /* ---------- analiza e kostos ---------- */
  const COVER_ORDER = ['pv', 'sheet', 'sandwich', 'poly'];
  const yrs = v => v >= 40 ? 'mbi 40 vjet' : fmt(v, 1) + ' vjet';
  // i njëjti parking me mbulesa të tjera, dhe vetëm struktura + mbulesa pa opsione
  function variants() {
    const run = (o, name, cur) => { try { const r = E.design(Object.assign({}, inp, o), eng), c = PC.costs(r, prices, { margin: off.margin }); return { name, r, c, cur, o }; } catch (e) { return null; } };
    const v = COVER_ORDER.map(c => run({ cover: c }, E.COVERS[c].name, c === inp.cover));
    v.push(run({ ev: 0, led: false, gutter: false, closure: 'none', battery: 0 }, 'Pa opsione (' + E.COVERS[inp.cover].name.toLowerCase() + ')', false));
    return v.filter(Boolean);
  }
  function basisInfo() {
    const b = off.tBasis || 'space', n = res.geo.spaces, kwp = res.pv ? res.pv.kWp : 0;
    if (b === 'total') return { b, label: 'Çmimi total', unit: cur() === 'ALL' ? 'Lekë' : '€', mul: 1, now: cost.price };
    if (b === 'kwp' && kwp) return { b, label: 'Çmimi për kWp', unit: (cur() === 'ALL' ? 'Lekë' : '€') + '/kWp', mul: kwp, now: cost.price / kwp };
    if (b === 'm2') return { b, label: 'Çmimi për m²', unit: (cur() === 'ALL' ? 'Lekë' : '€') + '/m²', mul: res.geo.area, now: cost.price / res.geo.area };
    return { b: 'space', label: 'Çmimi për vend', unit: (cur() === 'ALL' ? 'Lekë' : '€') + '/vend', mul: n, now: cost.price / n };
  }
  function renderCost() {
    const box = $('#costBox');
    if (!cost) { box.innerHTML = '<p class="muted">Çmimet nuk janë ngarkuar.</p>'; return; }
    if (curTab !== 'cost') return;
    const r = res, g = r.geo, c = cost, en = c.energy, profit = c.price - c.cost;
    let h = `<div class="mini">
      <div class="m hl"><div class="l">Çmimi i ofertës pa TVSH</div><div class="v">${money(c.price)}</div></div>
      <div class="m"><div class="l">Kosto totale</div><div class="v">${money(c.cost)}</div></div>
      <div class="m"><div class="l">Fitimi</div><div class="v">${money(profit)} <small>${f1(c.realMargin)}%</small></div></div>
      <div class="m"><div class="l">Për vend parkimi</div><div class="v">${money(c.perSpace)}</div></div>
      ${c.perKWp ? `<div class="m"><div class="l">Për kWp</div><div class="v">${money(c.perKWp)}</div></div>` : ''}
      <div class="m"><div class="l">Për m² strehë</div><div class="v">${money(c.price / g.area, cur() === 'EUR' ? 1 : 0)}</div></div>
      <div class="m"><div class="l">Çeliku</div><div class="v">${fmt(r.qty.steel / 1000, 2)} t <small>${f1(r.qty.steel / g.area)} kg/m²</small></div></div>
      <div class="m"><div class="l">Kosto e çelikut / kg</div><div class="v">${fmt(c.steelRate * rate(), cur() === 'EUR' ? 2 : 0)} ${cur() === 'ALL' ? 'Lekë' : '€'}</div></div>
    </div>`;
    const bi = basisInfo();
    const opt = (v, l) => `<option value="${v}"${bi.b === v ? ' selected' : ''}>${l}</option>`;
    h += `<div class="cards">
      <section class="card"><h3>Fitimi për këtë ofertë</h3>
        <div class="engf">
          <label class="f"><span class="fl">Marzhi mbi koston</span><span class="inp"><input type="number" id="cMargin" step="0.5" value="${f1(c.margin).replace(',', '.')}"><span class="u">%</span></span><small class="hint">standardi: ${f1(+prices.margin || 0)}% · fitimi në çmim: ${f1(c.realMargin)}%</small></label>
          <label class="f"><span class="fl">Çmimi i synuar sipas</span><span class="inp"><select id="cBasis">${opt('space', 'vendit të parkimit')}${opt('total', 'totalit')}${opt('m2', 'm² strehë')}${r.pv ? opt('kwp', 'kWp diellor') : ''}</select></span></label>
          <label class="f w2"><span class="fl">${bi.label} i synuar</span><span class="inp"><input type="number" id="cTarget" step="1" placeholder="${fmt(bi.now * rate(), 0).replace(/\./g, '')}"><span class="u">${bi.unit}</span></span><small class="hint" id="cHint">shkruaj çmimin që do t'i japësh klientit dhe shiko fitimin</small></label>
          <div class="row w2"><button class="btn sm pri" id="cApply" type="button">Përdor çmimin e synuar</button><button class="btn sm" id="cReset" type="button">Kthe marzhin standard</button></div>
        </div></section>
      <section class="card"><h3>Ku shkojnë paratë</h3>${shareBars()}</section>
    </div>`;
    const vs = variants(), best = Math.min.apply(null, vs.map(v => v.c.price));
    h += `<div class="cards">
      <section class="card wide"><h3>Variantet për të njëjtin parking</h3><table class="ctab"><tr><th>Varianti</th><th class="n">Çmimi</th><th class="n">Për vend</th><th class="n">Çeliku</th><th></th></tr>${vs.map((v, k) => `<tr class="${v.cur ? 'curv' : ''}"><td>${esc(v.name)}${v.r.pv ? ` <small class="muted">${f1(v.r.pv.kWp)} kWp</small>` : ''}</td><td class="n">${money(v.c.price)}</td><td class="n">${money(v.c.perSpace)}</td><td class="n">${fmt(v.r.qty.steel, 0)} kg</td><td class="n">${v.cur ? '<small class="muted">aktuali</small>' : k < COVER_ORDER.length ? `<button class="btn sm" data-cover="${COVER_ORDER[k]}" type="button">Zgjidh</button>` : ''}</td></tr>`).join('')}</table><p class="muted small">Me të njëjtat përmasa, opsione dhe marzh. Diferenca nga më i liri: ${money(c.price - best)}.</p></section>
      <section class="card"><h3>Pesha e strukturës</h3><dl class="kv">${[['Trarët e çatisë', r.kg.purlins], ['Trarët kryesorë', r.kg.beams], ['Kolonat', r.kg.cols], ['Kontraventimet', r.kg.brace], ['Lidhjet, pllakat, bulonat', r.kg.conn], ['Skeleti i mbylljes', r.opts.closure ? r.opts.closure.railKg : 0]].filter(x => x[1] > 0.5).map(x => `<dt>${x[0]}</dt><dd>${fmt(x[1], 0)} kg</dd>`).join('')}<dt><b>Gjithsej</b></dt><dd><b>${fmt(r.qty.steel, 0)} kg</b></dd><dt>Për vend parkimi</dt><dd>${fmt(r.qty.perSpace, 0)} kg</dd><dt>Kamionë · ditë autovinç</dt><dd>${c.trucks} · ${c.days}</dd></dl></section>
      ${en ? `<section class="card"><h3>Energjia dhe kthimi i investimit</h3><dl class="kv"><dt>Prodhimi i vlerësuar</dt><dd>${fmt(en.kwh, 0)} kWh/vit</dd><dt>Tarifa e biznesit (0,4 kV)</dt><dd>${fmt(en.tariff, 1)} Lekë/kWh</dd><dt>Kursimi vjetor</dt><dd>${money(en.save)}</dd><dt>Sistemi diellor në ofertë</dt><dd>${money(en.pvPrice)}</dd><dt>Kthimi i sistemit diellor</dt><dd>${yrs(en.payPv)}</dd><dt>Kthimi i gjithë investimit</dt><dd>${yrs(en.payAll)}</dd></dl><p class="muted small">Supozim: e gjithë energjia konsumohet në objekt. Tarifa ndryshohet te «Çmimet».</p></section>` : ''}
    </div>`;
    h += `<section class="card"><h3>Preventivi i detajuar</h3><table class="ctab"><tr><th>Zëri</th><th class="n">Sasia</th><th class="n">Çmimi njësi</th><th class="n">Vlera</th><th class="n">%</th></tr>`;
    c.rows.forEach(gr => {
      h += `<tr class="grp"><td colspan="3">${esc(gr.g)}</td><td class="n">${money(gr.sum)}</td><td class="n">${fmt(gr.sum / c.cost * 100, 1)}</td></tr>`;
      gr.items.forEach(x => { h += `<tr><td>${esc(x[0])}</td><td class="n">${fmt(x[1], x[1] < 100 ? 1 : 0)} ${esc(x[2])}</td><td class="n">${amt(x[4], x[4] < 10 ? 2 : 0)}</td><td class="n">${money(x[3])}</td><td class="n">${fmt(x[3] / c.cost * 100, 1)}</td></tr>`; });
    });
    h += `<tr class="tot"><td colspan="3">Kostot direkte</td><td class="n">${money(c.sub)}</td><td></td></tr><tr><td colspan="3">Projekti i zbatimit</td><td class="n">${money(c.design)}</td><td class="n">${fmt(c.design / c.cost * 100, 1)}</td></tr><tr><td colspan="3">Rezerva për të paparashikuara (${f1(+prices.contPct || 0)}%)</td><td class="n">${money(c.cont)}</td><td class="n">${fmt(c.cont / c.cost * 100, 1)}</td></tr>`;
    h += `<tr class="tot"><td colspan="3">Kosto totale</td><td class="n">${money(c.cost)}</td><td class="n">100</td></tr><tr><td colspan="3">Fitimi (marzhi ${f1(c.margin)}%${+prices.round ? ', rrumbullakuar me ' + fmt(+prices.round, 0) + ' €' : ''})</td><td class="n">${money(profit)}</td><td></td></tr>`;
    h += `<tr class="fin"><td colspan="3">Çmimi i ofertës pa TVSH</td><td class="n">${money(c.price)}</td><td></td></tr><tr><td colspan="3">TVSH ${fmt(+prices.vat || 0, 0)}%</td><td class="n">${money(c.vat)}</td><td></td></tr><tr class="tot"><td colspan="3">Çmimi me TVSH</td><td class="n">${money(c.total)}</td><td></td></tr></table></section>`;
    box.innerHTML = h;
    // ngjarjet
    $('#cMargin').addEventListener('change', e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v)) { off.margin = v; saveLocal(); renderOff(); compute(); } });
    $('#cBasis').addEventListener('change', e => { off.tBasis = e.target.value; saveLocal(); renderCost(); });
    const implied = v => { const b = basisInfo(); return (v / rate() * b.mul / c.cost - 1) * 100; };
    const tg = $('#cTarget');
    tg.addEventListener('input', () => { const v = parseFloat(String(tg.value).replace(',', '.')); $('#cHint').textContent = isFinite(v) && v > 0 ? `marzhi rezultues ${f1(implied(v))}% · çmimi total ${money(v / rate() * basisInfo().mul)} · fitimi ${money(v / rate() * basisInfo().mul - c.cost)}` : "shkruaj çmimin që do t'i japësh klientit dhe shiko fitimin"; });
    $('#cApply').addEventListener('click', () => { const v = parseFloat(String(tg.value).replace(',', '.')); if (!(v > 0)) { toast('Shkruaj fillimisht çmimin e synuar.'); return; } const m = Math.round(implied(v) * 10) / 10; if (m < 0) toast('Kujdes: me këtë çmim punon me humbje (' + f1(m) + '%).'); off.margin = m; saveLocal(); renderOff(); compute(); toast('Marzhi u vendos ' + f1(m) + '%.'); });
    $('#cReset').addEventListener('click', () => { off.margin = null; saveLocal(); renderOff(); compute(); });
    $$('#costBox [data-cover]').forEach(b => b.addEventListener('click', () => setVal('cover', b.dataset.cover)));
  }
  function shareBars() {
    const c = cost, parts = c.rows.map(g => [g.g, g.sum]).concat([['Projekti dhe rezerva', c.design + c.cont], ['Fitimi', c.price - c.cost]]);
    const tot = c.price, mx = Math.max.apply(null, parts.map(p => p[1]));
    return `<div class="bars">${parts.filter(p => p[1] > 0).map(p => `<div class="bar"><span class="bl">${esc(p[0])}</span><span class="bt"><i style="width:${(p[1] / mx * 100).toFixed(1)}%"${p[0] === 'Fitimi' ? ' class="pf"' : ''}></i></span><span class="bv">${money(p[1])}</span><span class="bp">${fmt(p[1] / tot * 100, 0)}%</span></div>`).join('')}</div><p class="muted small">Pjesa e secilit grup në çmimin pa TVSH.</p>`;
  }

  /* ---------- oferta për klientin ---------- */
  function describe() {
    const r = res, g = r.geo, i = r.inp, d = [];
    d.push(['Modeli', E.MODELS[i.model].name]);
    d.push(['Vende parkimi', `${g.spaces} makina` + (E.rowsOf(i) > 1 ? ` (${E.rowsOf(i)} rreshta × ${i.nSpaces})` : '') + `, vendi ${f2(i.spaceW)} × ${f2(i.spaceL)} m`]);
    d.push(['Përmasat', `${f2(g.L)} × ${f2(g.D)} m, lartësia e lirë ${f2(i.H)} m, pjerrësia ${fmt(i.tilt, 0)}°`]);
    d.push(['Struktura', `Kolona ${r.col.sec.name}, trarë ${r.beam.sec.name}, trarë çatie ${r.purlin.sec.name}; çelik ${eng.grade}, ${eng.coat === 'paint' ? 'i lyer me bojë' : 'i zinkuar në të nxehtë'}; rreth ${fmt(Math.round(r.qty.steel / 10) * 10, 0)} kg`]);
    const eq = r.equip;
    if (r.pv) d.push(['Sistemi diellor', `${r.pv.n} panele ${r.pv.Wp} Wp, gjithsej ${f2(r.pv.kWp)} kWp` + (r.opts.inverter ? (eq && eq.inv ? `, ${eq.coupling === 'dc' ? 'inverter hibrid' : 'invertera'} ${eq.inv.brand} i lidhur në rrjet` : `, inverter ${f1(r.opts.inverter.kw)} kW i lidhur në rrjet`) : '') + (r.opts.battery ? `, bateri ${fmt(eq && eq.bat ? eq.bat.kwh : r.opts.battery.kwh, 1)} kWh` : '') + `; prodhimi i vlerësuar ${fmt(Math.round(r.pv.kwh / 100) * 100, 0)} kWh/vit`]);
    else d.push(['Mbulesa', `${r.cover.name}, ${f1(r.qty.coverArea)} m²`]);
    const o = [];
    if (r.opts.ev) o.push(`${r.opts.ev.n} karikues ${kwStr(r.opts.ev.kw)} kW`);
    if (r.opts.led) o.push(`${r.opts.led.n} ndriçues LED`);
    if (r.opts.gutter) o.push(`ulluqe ${fmt(r.opts.gutter.m, 0)} m me ${r.opts.gutter.down} zbritëse`);
    if (r.opts.closure) o.push(`mbyllje anësore ${f1(r.opts.closure.area)} m²`);
    if (o.length) d.push(['Opsionet', o.join(', ')]);
    if (eq) eq.lines.forEach(x => d.push([x[0], x[1]]));
    d.push(['Themelet', `${r.found.n} bazamente betoni ${f2(r.found.B)} × ${f2(r.found.B)} × ${f2(r.found.h)} m me ankera ${r.found.bolt}`]);
    d.push(['Zona', i.city]);
    return d;
  }
  function buildOffer() {
    const today = new Date(), valid = new Date(Date.now() + (off.validDays || 30) * 864e5);
    const k = cost.price / Math.max(1, cost.sub);
    const priceRows = cost.rows.map(g => [g.g, amt(g.sum * k)]);
    const curLabel = cur() === 'ALL' ? 'Lekë' : '€';
    const vat = +prices.vat || 0;
    const offerNo = code(current) + '-v' + (current.offer_version + 1);
    return {
      offerNo, dateStr: dstr(today), validStr: dstr(valid), validDays: off.validDays,
      price: Math.round(cost.price * rate()), priceStr: money(cost.price), perSpaceStr: money(cost.perSpace), perM2Str: money(cost.price / res.geo.area),
      currency: cur(), currencyLabel: curLabel, curLabel,
      priceRows, totals: [['Totali pa TVSH', amt(cost.price)], ['TVSH ' + fmt(vat, 0) + '%', amt(cost.vat)], ['Totali me TVSH', amt(cost.total), 1]],
      desc: describe(), lead: off.lead, pay: off.pay, incl: off.incl, excl: off.excl, note: off.note,
      title: E.summary(inp, res).title, spaces: res.geo.spaces, kWp: res.pv ? res.pv.kWp : 0, config: normCfg(inp)
    };
  }
  function askPublish() {
    if (!res || !cost) return;
    const o = buildOffer(), box = $('#pubBox'); box.hidden = false;
    box.innerHTML = `<p>Klienti do të shohë <b>${esc(o.priceStr)}</b> pa TVSH (${esc(o.perSpaceStr)} për vend), ofertën ${esc(o.offerNo)} të vlefshme deri më ${esc(o.validStr)}, dhe merr email menjëherë.${res.ok ? '' : ' <b class="bad">Kujdes: struktura nuk i kalon të gjitha kontrollet.</b>'}</p><div class="row"><button class="btn pri sm" id="bPubYes" type="button">Publiko dhe njofto klientin</button><button class="btn sm" id="bPubNo" type="button">Jo ende</button></div>`;
    $('#bPubNo').addEventListener('click', () => { box.hidden = true; });
    $('#bPubYes').addEventListener('click', publish);
  }
  async function publish() {
    const b = $('#bPubYes'); b.disabled = true; b.textContent = 'Duke publikuar…';
    const { data, error } = await client().rpc('admin_publish_offer', { p_id: current.id, p_offer: buildOffer() });
    if (error) { toast('Publikimi dështoi: ' + error.message); b.disabled = false; b.textContent = 'Publiko dhe njofto klientin'; return; }
    current = Object.assign({}, current, data); saveLocal();
    toast('Oferta u publikua. Klienti mori email.'); renderBar(); refreshList();
  }

  /* ---------- oferta si dokument (PDF, WhatsApp, imazh) ---------- */
  const PRINT_PAL = { ink: '#18212a', dim: '#5d6b77', accent: '#d48c06', steel: '#2f6fa3', bg: '#ffffff', aisle: '#f1f4f6', ev: '#16a34a' };
  const SCHEMA_PAL = { models: true, ink: '#18212a', dim: '#5d6b77', bg: '#ffffff', box: '#f3f6f8', line: '#c9d2d9', ac: '#2f6fa3', dc: '#d97706', ev: '#16a34a', accent: '#d48c06', pv: '#1d3a66' };
  const hasElec = () => !!(res.pv || res.opts.ev || res.opts.led);
  function autoNo() {
    if (current) return code(current) + '-v' + ((current.offer_version || 0) + 1);
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    return 'PRK-' + String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate());
  }
  const safeName = t => String(t || '').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 80);
  function offerData() {
    const r = res, g = r.geo, c = cost, i = r.inp, en = c.energy;
    const d0 = new Date(), vd = off.validDays || 30, dv = new Date(d0.getTime() + vd * 864e5);
    const curLabel = cur() === 'ALL' ? 'Lekë' : '€';
    const desc = describe();
    if (en && off.showSave) desc.push(['Prodhimi dhe kursimi', `Rreth ${fmt(Math.round(en.kwh / 100) * 100, 0)} kWh energji në vit. Me tarifën e biznesit ${fmt(en.tariff, 0)} Lekë/kWh (0,4 kV) kjo vlen rreth ${money(Math.round(en.save / 10) * 10)} në vit, kur energjia konsumohet në objekt; investimi i plotë kthehet për rreth ${fmt(Math.round(en.payAll * 2) / 2, 1)} vjet.`]);
    const priceRows = c.rows.map(gr => [gr.g === 'Transporti dhe mjetet' ? 'Transporti dhe autovinçi' : gr.g, amt(gr.sum * c.kf)]);
    const vat = +prices.vat || 0;
    const totals = off.showVat ? [['Totali pa TVSH', amt(c.price), false], ['TVSH ' + fmt(vat, 0) + '%', amt(c.vat), false], ['Totali me TVSH', amt(c.total), true]] : [['Totali (pa TVSH)', amt(c.price), true]];
    const figs = [['Vende parkimi', g.spaces + ' makina'], ['Sipërfaqja e mbuluar', fmt(g.area, 0) + ' m²'], r.pv ? ['Fuqia diellore', f1(r.pv.kWp) + ' kWp'] : ['Lartësia e lirë', f2(i.H) + ' m'], ['Çmimi pa TVSH', money(c.price)]];
    const s = E.summary(inp, r);
    return {
      company, projectName: s.title, title: s.title, subtitle: `${f1(g.L)} × ${f1(g.D)} m · lartësia e lirë ${f2(i.H)} m · ${i.city}`, desc, priceRows, totals, figs, curLabel,
      offer: { no: off.offerNo || autoNo(), dateStr: dstr(d0), validStr: dstr(dv), validDays: vd, client: off.client, site: off.site, lead: off.lead, pay: off.pay, incl: off.incl, excl: off.excl },
      kgLine: 'Çmimi për vend parkimi: ' + money(c.perSpace) + ' pa TVSH' + (r.pv ? ' · ' + money(c.perKWp) + ' për kWp' : '') + '.',
      note: off.note
    };
  }
  function ensure3D() { if (ParkView3D.ready && built !== res) { ParkView3D.build(res); built = res; } }
  function shot() { ensure3D(); try { return ParkView3D.snapshot(1600, 900); } catch (e) { console.warn(e); return null; } }
  function renderOffer() {
    if (!res || !cost) { $('#offerPrev').innerHTML = '<p class="muted">Çmimet nuk janë ngarkuar.</p>'; return; }
    const o = offerData(), img = shot();
    let h = `<article class="sheet"><div class="sh-band"><div><b>${esc(o.company.name || 'Oni-El')}</b><small>${esc([o.company.addr, o.company.phone, o.company.email].filter(Boolean).join(' · '))}</small></div><div class="r"><b>OFERTË</b><br>Nr. ${esc(o.offer.no)} · ${o.offer.dateStr}<br>E vlefshme deri më ${o.offer.validStr}</div></div><div class="sh-body">`;
    h += `<div class="who"><div><div class="l">Për</div><b>${esc(o.offer.client || '—')}</b>${o.offer.site ? 'Vendndodhja: ' + esc(o.offer.site) : ''}</div><div><div class="l">Objekti</div><b>${esc(o.title)}</b>${esc(o.subtitle)}</div></div>`;
    if (img) h += `<img class="shot" alt="Modeli 3D i strehës së parkingut" src="${img}">`;
    h += `<div class="figs">${o.figs.map(f => `<div><div class="l">${f[0]}</div><div class="v">${esc(f[1])}</div></div>`).join('')}</div>`;
    h += `<div><h4>Përshkrimi teknik</h4><table>${o.desc.map(d => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td></tr>`).join('')}</table></div>`;
    h += `<div><h4>Planimetria</h4><div class="drs">${ParkPlan(res, PRINT_PAL)}</div></div>`;
    if (hasElec()) h += `<div><h4>Skema elektrike parimore</h4><div class="drs">${ParkSchema(res, SCHEMA_PAL)}</div></div>`;
    h += `<div><h4>Oferta ekonomike</h4><table class="pr">${o.priceRows.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]} ${o.curLabel}</td></tr>`).join('')}${o.totals.map(t => `<tr class="${t[2] ? 'tfin' : 'tsub'}"><td>${t[0]}</td><td>${t[1]} ${o.curLabel}</td></tr>`).join('')}</table><p class="note">${esc(o.kgLine)}</p></div>`;
    h += `<div><h4>Kushtet</h4><table><tr><td>Afati</td><td>${esc(o.offer.lead)}</td></tr><tr><td>Pagesa</td><td>${esc(o.offer.pay)}</td></tr><tr><td>Përfshihen</td><td>${esc(o.offer.incl)}</td></tr><tr><td>Nuk përfshihen</td><td>${esc(o.offer.excl)}</td></tr></table></div>${o.note ? `<p class="note">${esc(o.note)}</p>` : ''}`;
    h += `</div></article>`;
    $('#offerPrev').innerHTML = h;
    const c = cost;
    $('#offerCheck').innerHTML = `<dt>Kosto totale</dt><dd>${money(c.cost)}</dd><dt>Fitimi</dt><dd>${money(c.price - c.cost)} (${f1(c.realMargin)}%)</dd><dt>Për vend</dt><dd>${money(c.perSpace)}</dd><dt>Çeliku</dt><dd>${fmt(res.qty.steel, 0)} kg</dd><dt>Kamionë</dt><dd>${c.trucks}</dd>` + (res.ok ? '' : '<dt class="bad">Kontrolli</dt><dd class="bad">Nuk kalon</dd>');
  }
  // SVG → PNG; minAsp shton hapësirë anash që vizatimi të mos zërë gjithë faqen
  function svgPNG(svg, scale, minAsp) {
    return new Promise((ok, ko) => {
      const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1].split(/\s+/).map(Number), w = Math.round(vb[2] * (scale || 2)), h = Math.round(vb[3] * (scale || 2));
      const W = Math.max(w, Math.round(h * (minAsp || 0)));
      const img = new Image();
      img.onload = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = h; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, h); x.drawImage(img, (W - w) / 2, 0, w, h); ok({ url: cv.toDataURL('image/png'), w: W, h }); };
      img.onerror = ko;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${w}" height="${h}" `));
    });
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  async function offerPDF() {
    if (!res || !cost || !window.OfferPDF) return;
    const btn = $('#bPdf'); btn.disabled = true; btn.textContent = 'Duke përgatitur PDF…';
    try {
      const o = offerData();
      const draws = [await svgPNG(ParkPlan(res, PRINT_PAL), 1.6, 3)];
      if (hasElec()) draws.push(await svgPNG(ParkSchema(res, SCHEMA_PAL), 1.4));
      const buf = OfferPDF.build(Object.assign(o, { img3d: shot(), img3dRatio: 16 / 9, draws }));
      download('Oferta ' + safeName(o.offer.no) + ' - ' + safeName(o.offer.client || o.title) + '.pdf', new Blob([buf], { type: 'application/pdf' }));
    } catch (e) { console.error(e); toast('PDF-ja nuk u krijua: ' + (e.message || e)); }
    btn.disabled = false; btn.textContent = 'Shkarko ofertën (PDF)';
  }
  function waText() {
    const o = offerData(), r = res, c = cost, en = c.energy, L = [];
    L.push(`*${o.title}* · ${company.name || 'Oni-El'}`);
    if (o.offer.client) L.push('Për: ' + o.offer.client);
    L.push(`${r.geo.spaces} vende parkimi · ${o.subtitle}`);
    L.push(`Struktura: kolona ${r.col.sec.name}, trarë ${r.beam.sec.name}, ${eng.coat === 'paint' ? 'e lyer' : 'e zinkuar në të nxehtë'}`);
    L.push(r.pv ? `Panele diellore: ${r.pv.n} × ${r.pv.Wp} Wp = ${f1(r.pv.kWp)} kWp, rreth ${fmt(Math.round(r.pv.kwh / 100) * 100, 0)} kWh/vit` : 'Mbulesa: ' + r.cover.name.toLowerCase());
    const op = []; if (r.opts.ev) op.push(r.opts.ev.n + ' karikues ' + kwStr(r.opts.ev.kw) + ' kW'); if (r.opts.battery) op.push('bateri ' + fmt(r.opts.battery.kwh, 0) + ' kWh'); if (r.opts.led) op.push('ndriçim LED'); if (r.opts.closure) op.push('mbyllje anësore');
    if (op.length) L.push('Opsione: ' + op.join(', '));
    if (r.equip) L.push('Pajisjet: ' + r.equip.lines.filter(x => x[0] !== 'Monitorimi').map(x => x[1]).join('; '));
    L.push(`*Çmimi: ${money(c.price)} pa TVSH* (${money(c.perSpace)} për vend)`);
    if (en && off.showSave) L.push(`Kursimi i energjisë: rreth ${money(Math.round(en.save / 10) * 10)} në vit`);
    L.push(`Afati: ${off.lead} · Oferta e vlefshme deri më ${o.offer.validStr}`);
    return L.join('\n');
  }
  async function copyWa() { const t = waText(); try { await navigator.clipboard.writeText(t); toast('Teksti u kopjua. Ngjite në WhatsApp.'); } catch (e) { prompt('Kopjo tekstin:', t); } }
  function saveJPG() { const u = shot(); if (!u) { toast('Modeli 3D nuk është gati.'); return; } fetch(u).then(r => r.blob()).then(b => download('Parking 3D - ' + safeName(off.client || E.summary(inp, res).title) + '.jpg', b)); }

  /* ---------- PDF i kostove të brendshme ---------- */
  async function costPDF() {
    if (!cost || !window.OfferPDF) return;
    const btn = $('#bCostPdf'); btn.disabled = true; btn.textContent = 'Duke përgatitur…';
    try {
      const s = E.summary(inp, res), today = dstr(new Date());
      const u3 = shot(), img = u3 ? { url: u3, w: 1600, h: 900, fmt: 'JPEG' } : null;
      const rows = [];
      cost.rows.forEach(g => { rows.push({ c: [g.g, '', '', amt(g.sum)], grp: 1 }); g.items.forEach(x => rows.push([x[0], fmt(x[1], x[1] < 100 ? 1 : 0) + ' ' + x[2], amt(x[4], x[4] < 10 ? 2 : 0), amt(x[3])])); });
      rows.push({ c: ['Nëntotali', '', '', amt(cost.sub)], tot: 1 }, ['Projekti', '', '', amt(cost.design)], ['Të paparashikuara', '', '', amt(cost.cont)], { c: ['Kosto gjithsej', '', '', amt(cost.cost)], tot: 1 }, ['Marzhi ' + f1(cost.margin) + '%', '', '', amt(cost.price - cost.cost)], { c: ['Çmimi pa TVSH', '', '', amt(cost.price)], fin: 1 }, ['TVSH', '', '', amt(cost.vat)], { c: ['Çmimi me TVSH', '', '', amt(cost.total)], tot: 1 });
      const blocks = [
        { h: 'Përmbledhja', kv: [['Çmimi pa TVSH', money(cost.price)], ['Kosto gjithsej', money(cost.cost)], ['Fitimi', money(cost.price - cost.cost) + ' · marzhi ' + f1(cost.margin) + '% mbi koston (' + f1(cost.realMargin) + '% e çmimit)'], ['Për vend parkimi', money(cost.perSpace)]].concat(cost.perKWp ? [['Për kWp', money(cost.perKWp)]] : []).concat([['Për m² strehë', money(cost.price / res.geo.area, 1)], ['Çeliku', fmt(res.qty.steel, 0) + ' kg · ' + f1(res.qty.steel / res.geo.area) + ' kg/m² · ' + money(cost.steelRate, 2) + '/kg'], ['Transporti', cost.trucks + ' kamion · ' + cost.days + ' ditë autovinç']]) },
        { h: 'Variantet për të njëjtin parking', table: { head: ['Varianti', 'Çmimi pa TVSH', 'Për vend', 'Çeliku (kg)'], widths: [80, 36, 34, 30], right: [0, 1, 1, 1], rows: variants().map(v => (v.cur ? { c: [v.name + ' (aktuali)', amt(v.c.price), amt(v.c.perSpace), fmt(v.r.qty.steel, 0)], tot: 1 } : [v.name, amt(v.c.price), amt(v.c.perSpace), fmt(v.r.qty.steel, 0)])) } },
        { h: 'Preventivi i detajuar (' + (cur() === 'ALL' ? 'Lekë' : '€') + ')', table: { head: ['Zëri', 'Sasia', 'Çmimi', 'Vlera'], widths: [92, 34, 26, 28], right: [0, 1, 1, 1], rows } },
        { h: 'Elementet', util: [['Trarët e çatisë', res.purlin.sec.name, res.purlin.u, res.purlin.gov], ['Trau kryesor', res.beam.sec.name, res.beam.u, res.beam.gov], ['Kolona', res.col.sec.name, res.col.u, res.col.gov]] },
        { h: 'Përshkrimi', kv: describe() }
      ];
      const en = cost.energy;
      if (en) blocks.splice(3, 0, { h: 'Energjia dhe kthimi i investimit', kv: [['Prodhimi i vlerësuar', fmt(en.kwh, 0) + ' kWh/vit'], ['Tarifa e biznesit (0,4 kV)', fmt(en.tariff, 1) + ' Lekë/kWh'], ['Kursimi vjetor', money(en.save)], ['Sistemi diellor në ofertë', money(en.pvPrice)], ['Kthimi i sistemit diellor', yrs(en.payPv)], ['Kthimi i gjithë investimit', yrs(en.payAll)]] });
      if (img) blocks.push({ h: 'Pamja 3D', img });
      blocks.push({ list: ['Dokument i brendshëm i Oni-El. Mos ia dërgo klientit.'] });
      const buf = OfferPDF.report({ company, docTitle: 'KOSTOT E BRENDSHME', docSub: 'Konfidenciale · ' + today, footTitle: 'Kostot e brendshme', dateStr: today, no: current ? code(current) : '', title: s.title, subtitle: offerData().subtitle, client: off.client || '', site: off.site || '', project: s.title, blocks });
      download('Kostot e brendshme - ' + safeName(current ? code(current) + ' ' + (off.client || '') : off.client || s.title) + '.pdf', new Blob([buf], { type: 'application/pdf' }));
    } catch (e) { console.error(e); toast('PDF dështoi: ' + e.message); }
    btn.disabled = false; btn.textContent = 'Shkarko PDF';
  }

  /* ---------- nisja ---------- */
  function showTab(t) {
    curTab = t;
    $$('.vtabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    ['m3d', 'plan', 'schema', 'calc', 'cost', 'offer'].forEach(k => { $('#pane-' + k).hidden = k !== t; });
    $('.viz').classList.toggle('long', t === 'cost' || t === 'offer' || t === 'calc');
    if (t === 'm3d') { ParkView3D.resize(); if (res) { ParkView3D.build(res); built = res; } } else if (t === 'plan' && res) $('#drPlan').innerHTML = ParkPlan(res);
    else if (t === 'schema' && res) $('#drSchema').innerHTML = ParkSchema(res, { models: true });
    else if (t === 'cost') renderCost(); else if (t === 'offer') renderOffer();
  }
  async function init() {
    const c = client();
    if (!c) { $('#warnBar').hidden = false; $('#warnBar').textContent = 'Supabase nuk është konfiguruar.'; return; }
    const { data } = await c.auth.getSession();
    if (!data.session || !(await isAdmin())) await loginUI();
    $('#app').hidden = false;
    await Promise.all([loadPrices(), loadCompany()]);
    const fr = LSget('park.free'); if (fr) { inp = Object.assign(clone(E.DEF), fr.inp); eng = Object.assign(clone(E.ENG), fr.eng); off = Object.assign(clone(OFFER_DEF), fr.off); }
    form = ParkForm.mount($('#cfgSteps'), { get: () => inp, set: setVal, editable: () => true });
    ParkView3D.init($('#viewer'));
    renderEng(); renderOff();
    $$('.vtabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
    $$('#vView button').forEach(b => b.addEventListener('click', () => { $$('#vView button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ParkView3D.setView(b.dataset.v); }));
    $$('#vCars button').forEach(b => b.addEventListener('click', () => { $$('#vCars button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ParkView3D.setCars(b.dataset.c === '1'); }));
    $$('#vTime button').forEach(b => b.addEventListener('click', () => setNight(b.dataset.n === '1')));
    $('#bReq').addEventListener('click', () => { renderList(); $('#dlgReq').showModal(); refreshList(); });
    $('#reqFilter').addEventListener('change', renderList);
    $('#bPrices').addEventListener('click', openPrices);
    $('#bPrSave').addEventListener('click', savePrices);
    $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#bCostPdf').addEventListener('click', costPDF);
    $('#bPdf').addEventListener('click', offerPDF);
    $('#bWa').addEventListener('click', copyWa);
    $('#bJpg').addEventListener('click', saveJPG);
    $('#bNew').addEventListener('click', () => { current = null; setBar(''); history.replaceState(null, '', location.pathname); inp = clone(E.DEF); eng = clone(E.ENG); off = clone(OFFER_DEF); form.refresh(); renderEng(); renderOff(); compute(); });
    $('#bLogout').addEventListener('click', async () => { await client().auth.signOut(); location.reload(); });
    compute();
    await refreshList();
    const rid = new URLSearchParams(location.search).get('r');
    if (rid) { const r = list.find(x => x.id === rid); if (r) openRequest(r); else toast('Kërkesa nuk u gjet në listën e parkingjeve.'); }
    setInterval(refreshList, 120000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.ParkAdmin = { get inp() { return inp; }, get res() { return res; }, get cost() { return cost; }, get off() { return off; }, setVal, buildOffer: () => buildOffer(), offerData: () => offerData(), waText: () => waText(), showTab: t => showTab(t), openRequest: id => openRequest(list.find(x => x.id === id)) };
})();
