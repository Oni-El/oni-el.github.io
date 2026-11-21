/* Oni-El · Paneli i stafit për parkingjet: hyrja, kërkesat, llogaritja, kostot, PDF dhe publikimi i ofertës */
(function () {
  'use strict';
  const E = window.ParkEngine, PC = window.ParkCosts, K = window.KapEngine;
  const CFG = window.KAP_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = E.fmt, f1 = v => fmt(v, 1), f2 = v => fmt(v, 2);
  const LSget = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const LSset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const dstr = d => { const p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const ago = d => { const h = (Date.now() - new Date(d).getTime()) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? Math.round(h) + ' orë' : Math.round(h / 24) + ' ditë'; };
  const STATUS = { e_re: ['E re', 'new'], ndryshuar: ['Ndryshuar nga klienti', 'new'], oferte_gati: ['Ofertë e dërguar', 'sent'], konfirmuar: ['Konfirmuar', 'ok'], anulluar: ['Anulluar', 'off'] };
  const OFFER_DEF = { margin: null, currency: 'EUR', validDays: 30, lead: '4–6 javë nga konfirmimi dhe paradhënia',
    pay: '40% paradhënie me konfirmimin, 50% para dërgimit të materialeve, 10% në përfundim të montimit.',
    incl: 'Projekti i strukturës, prodhimi, zinkimi, transporti, themelet dhe montimi; pajisjet dhe opsionet e listuara.',
    excl: 'Leja e ndërtimit, lidhja me OSHEE dhe matësi dypalësh, asfaltimi dhe vijëzimi i parkingut, linja elektrike deri te paneli i objektit.',
    note: 'Çmimet janë pa TVSH. Prodhimi i energjisë diellore është vlerësim (±10%) dhe varet nga hijet dhe moti.' };

  let sb = null, inp = clone(E.DEF), eng = clone(E.ENG), off = clone(OFFER_DEF), prices = null, res = null, cost = null, current = null, list = [], form = null, curTab = 'm3d';
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
      <label class="f"><span class="fl">Paneli diellor</span>${num('pvWp', 'Wp', 5)}</label>`;
    $$('#engBox [data-e]').forEach(x => x.addEventListener('change', () => {
      const k = x.dataset.e; let v = x.value;
      if (x.type === 'number') v = parseFloat(String(v).replace(',', '.')) || 0;
      eng[k] = v;
      if (k === 'beamFam') eng.beamSec = ''; if (k === 'colFam') eng.colSec = ''; if (k === 'purlinFam') eng.purlinSec = '';
      if (/Fam$/.test(k)) renderEng();
      saveLocal(); compute();
    }));
  }
  function renderOff() {
    $('#offBox').innerHTML = `
      <label class="f"><span class="fl">Marzhi</span><span class="inp"><input type="number" step="0.5" data-o="margin" value="${off.margin != null ? off.margin : (prices && prices.margin) || 0}"><span class="u">%</span></span></label>
      <label class="f"><span class="fl">Monedha</span><span class="inp"><select data-o="currency"><option value="EUR"${cur() === 'EUR' ? ' selected' : ''}>Euro</option><option value="ALL"${cur() === 'ALL' ? ' selected' : ''}>Lekë</option></select></span></label>
      <label class="f"><span class="fl">E vlefshme</span><span class="inp"><input type="number" step="1" data-o="validDays" value="${off.validDays}"><span class="u">ditë</span></span></label>
      <label class="f w2"><span class="fl">Afati</span><span class="inp"><input data-o="lead" value="${esc(off.lead)}"></span></label>
      <label class="f w2"><span class="fl">Pagesa</span><span class="inp"><textarea rows="2" data-o="pay">${esc(off.pay)}</textarea></span></label>
      <label class="f w2"><span class="fl">Përfshihen</span><span class="inp"><textarea rows="2" data-o="incl">${esc(off.incl)}</textarea></span></label>
      <label class="f w2"><span class="fl">Nuk përfshihen</span><span class="inp"><textarea rows="2" data-o="excl">${esc(off.excl)}</textarea></span></label>
      <label class="f w2"><span class="fl">Shënim</span><span class="inp"><textarea rows="2" data-o="note">${esc(off.note)}</textarea></span></label>`;
    $$('#offBox [data-o]').forEach(x => x.addEventListener('change', () => {
      const k = x.dataset.o; off[k] = x.type === 'number' ? parseFloat(String(x.value).replace(',', '.')) || 0 : x.value;
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
    renderChips(); renderCalc(); renderCost();
    if (curTab === 'm3d' && ParkView3D.ready) ParkView3D.build(res);
    if (curTab === 'plan') $('#drPlan').innerHTML = ParkPlan(res);
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
  function renderCost() {
    const box = $('#costBox');
    if (!cost) { box.innerHTML = '<p class="muted">Çmimet nuk janë ngarkuar.</p>'; return; }
    let h = `<table class="ctab"><tr><th>Zëri</th><th class="n">Sasia</th><th class="n">Çmimi</th><th class="n">Vlera</th></tr>`;
    cost.rows.forEach(g => {
      h += `<tr class="grp"><td colspan="3">${esc(g.g)}</td><td class="n">${money(g.sum)}</td></tr>`;
      g.items.forEach(x => { h += `<tr><td>${esc(x[0])}</td><td class="n">${fmt(x[1], x[1] < 100 ? 1 : 0)} ${esc(x[2])}</td><td class="n">${amt(x[4], x[4] < 10 ? 2 : 0)}</td><td class="n">${money(x[3])}</td></tr>`; });
    });
    h += `<tr class="tot"><td colspan="3">Nëntotali</td><td class="n">${money(cost.sub)}</td></tr><tr><td colspan="3">Projekti</td><td class="n">${money(cost.design)}</td></tr><tr><td colspan="3">Të paparashikuara</td><td class="n">${money(cost.cont)}</td></tr>`;
    h += `<tr class="tot"><td colspan="3">Kosto gjithsej</td><td class="n">${money(cost.cost)}</td></tr><tr><td colspan="3">Marzhi ${f1(cost.margin)}%</td><td class="n">${money(cost.price - cost.cost)}</td></tr>`;
    h += `<tr class="fin"><td colspan="3">Çmimi pa TVSH</td><td class="n">${money(cost.price)}</td></tr><tr><td colspan="3">TVSH ${fmt(prices.vat || 0, 0)}%</td><td class="n">${money(cost.vat)}</td></tr><tr class="tot"><td colspan="3">Çmimi me TVSH</td><td class="n">${money(cost.total)}</td></tr></table>`;
    h += `<p class="muted small">${money(cost.perSpace)} për vend parkimi${cost.perKWp ? ' · ' + money(cost.perKWp) + ' për kWp' : ''} · ${cost.trucks} kamion · ${cost.days} ditë autovinç</p>`;
    box.innerHTML = h;
  }

  /* ---------- oferta për klientin ---------- */
  function describe() {
    const r = res, g = r.geo, i = r.inp, d = [];
    d.push(['Modeli', E.MODELS[i.model].name]);
    d.push(['Vende parkimi', `${g.spaces} makina` + (E.rowsOf(i) > 1 ? ` (${E.rowsOf(i)} rreshta × ${i.nSpaces})` : '') + `, vendi ${f2(i.spaceW)} × ${f2(i.spaceL)} m`]);
    d.push(['Përmasat', `${f2(g.L)} × ${f2(g.D)} m, lartësia e lirë ${f2(i.H)} m, pjerrësia ${fmt(i.tilt, 0)}°`]);
    d.push(['Struktura', `Kolona ${r.col.sec.name}, trarë ${r.beam.sec.name}, trarë çatie ${r.purlin.sec.name}; çelik ${eng.grade}, ${eng.coat === 'paint' ? 'i lyer me bojë' : 'i zinkuar në të nxehtë'}; rreth ${fmt(Math.round(r.qty.steel / 10) * 10, 0)} kg`]);
    if (r.pv) d.push(['Sistemi diellor', `${r.pv.n} panele ${r.pv.Wp} Wp, gjithsej ${f2(r.pv.kWp)} kWp` + (r.opts.inverter ? `, inverter ${f1(r.opts.inverter.kw)} kW i lidhur në rrjet` : '') + (r.opts.battery ? `, bateri ${fmt(r.opts.battery.kwh, 0)} kWh` : '') + `; prodhimi i vlerësuar ${fmt(Math.round(r.pv.kwh / 100) * 100, 0)} kWh/vit`]);
    else d.push(['Mbulesa', `${r.cover.name}, ${f1(r.qty.coverArea)} m²`]);
    const o = [];
    if (r.opts.ev) o.push(`${r.opts.ev.n} karikues ${f1(r.opts.ev.kw)} kW`);
    if (r.opts.led) o.push(`${r.opts.led.n} ndriçues LED`);
    if (r.opts.gutter) o.push(`ulluqe ${fmt(r.opts.gutter.m, 0)} m me ${r.opts.gutter.down} zbritëse`);
    if (r.opts.closure) o.push(`mbyllje anësore ${f1(r.opts.closure.area)} m²`);
    if (o.length) d.push(['Opsionet', o.join(', ')]);
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

  /* ---------- PDF i kostove të brendshme ---------- */
  async function costPDF() {
    if (!cost || !window.OfferPDF) return;
    const btn = $('#bCostPdf'); btn.disabled = true; btn.textContent = 'Duke përgatitur…';
    try {
      const s = E.summary(inp, res), today = dstr(new Date());
      let img = null;
      if (ParkView3D.ready) { const prev = curTab; if (prev !== 'm3d') showTab('m3d'); await new Promise(r => setTimeout(r, 250)); const url = ParkView3D.snapshot(); if (url) { const c = $('#viewer canvas'); img = { url, w: c.width, h: c.height }; } if (prev !== 'm3d') showTab(prev); }
      const rows = [];
      cost.rows.forEach(g => { rows.push({ c: [g.g, '', '', amt(g.sum)], grp: 1 }); g.items.forEach(x => rows.push([x[0], fmt(x[1], x[1] < 100 ? 1 : 0) + ' ' + x[2], amt(x[4], x[4] < 10 ? 2 : 0), amt(x[3])])); });
      rows.push({ c: ['Nëntotali', '', '', amt(cost.sub)], tot: 1 }, ['Projekti', '', '', amt(cost.design)], ['Të paparashikuara', '', '', amt(cost.cont)], { c: ['Kosto gjithsej', '', '', amt(cost.cost)], tot: 1 }, ['Marzhi ' + f1(cost.margin) + '%', '', '', amt(cost.price - cost.cost)], { c: ['Çmimi pa TVSH', '', '', amt(cost.price)], fin: 1 }, ['TVSH', '', '', amt(cost.vat)], { c: ['Çmimi me TVSH', '', '', amt(cost.total)], tot: 1 });
      const blocks = [
        { h: 'Përmbledhja', kv: [['Çmimi pa TVSH', money(cost.price)], ['Kosto gjithsej', money(cost.cost)], ['Marzhi', f1(cost.margin) + '% · ' + money(cost.price - cost.cost)], ['Për vend parkimi', money(cost.perSpace)]].concat(cost.perKWp ? [['Për kWp', money(cost.perKWp)]] : []).concat([['Çeliku', fmt(res.qty.steel, 0) + ' kg · ' + f1(res.qty.steel / res.geo.area) + ' kg/m²']]) },
        { h: 'Preventivi i detajuar (' + (cur() === 'ALL' ? 'Lekë' : '€') + ')', table: { head: ['Zëri', 'Sasia', 'Çmimi', 'Vlera'], widths: [92, 34, 26, 28], right: [0, 1, 1, 1], rows } },
        { h: 'Elementet', util: [['Trarët e çatisë', res.purlin.sec.name, res.purlin.u, res.purlin.gov], ['Trau kryesor', res.beam.sec.name, res.beam.u, res.beam.gov], ['Kolona', res.col.sec.name, res.col.u, res.col.gov]] },
        { h: 'Përshkrimi', kv: describe() }
      ];
      if (img) blocks.push({ h: 'Pamja 3D', img });
      blocks.push({ list: ['Dokument i brendshëm i Oni-El. Mos ia dërgo klientit.'] });
      const buf = OfferPDF.report({ company: { name: 'Oni-El', addr: 'Elbasan, Shqipëri', phone: '+355 68 315 5705' }, docTitle: 'KOSTOT E BRENDSHME', docSub: 'Konfidenciale · ' + today, footTitle: 'Kostot e brendshme', dateStr: today, no: current ? code(current) : '', title: s.title, subtitle: s.text, client: current ? (current.company ? current.company + ' (' + current.name + ')' : current.name) : '', site: current ? current.site : '', project: s.title, blocks });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/pdf' }));
      a.download = (current ? code(current) + '_' : '') + 'Parking_kostot_e_brendshme.pdf'; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); toast('PDF dështoi: ' + e.message); }
    btn.disabled = false; btn.textContent = 'Shkarko PDF';
  }

  /* ---------- nisja ---------- */
  function showTab(t) {
    curTab = t;
    $$('.vtabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    ['m3d', 'plan', 'calc', 'cost'].forEach(k => { $('#pane-' + k).hidden = k !== t; });
    if (t === 'm3d') { ParkView3D.resize(); if (res) ParkView3D.build(res); } else if (t === 'plan' && res) $('#drPlan').innerHTML = ParkPlan(res);
  }
  async function init() {
    const c = client();
    if (!c) { $('#warnBar').hidden = false; $('#warnBar').textContent = 'Supabase nuk është konfiguruar.'; return; }
    const { data } = await c.auth.getSession();
    if (!data.session || !(await isAdmin())) await loginUI();
    $('#app').hidden = false;
    await loadPrices();
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
    $('#bNew').addEventListener('click', () => { current = null; setBar(''); history.replaceState(null, '', location.pathname); inp = clone(E.DEF); eng = clone(E.ENG); off = clone(OFFER_DEF); form.refresh(); renderEng(); renderOff(); compute(); });
    $('#bLogout').addEventListener('click', async () => { await client().auth.signOut(); location.reload(); });
    compute();
    await refreshList();
    const rid = new URLSearchParams(location.search).get('r');
    if (rid) { const r = list.find(x => x.id === rid); if (r) openRequest(r); else toast('Kërkesa nuk u gjet në listën e parkingjeve.'); }
    setInterval(refreshList, 120000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.ParkAdmin = { get inp() { return inp; }, get res() { return res; }, get cost() { return cost; }, setVal, buildOffer: () => buildOffer(), openRequest: id => openRequest(list.find(x => x.id === id)) };
})();
