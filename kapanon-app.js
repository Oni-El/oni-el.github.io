(function () {
  'use strict';
  const E = window.KapEngine;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function fmt(v, d) {
    d = d || 0;
    if (v == null || !isFinite(v)) return '–';
    const neg = v < 0; const p = Math.abs(v).toFixed(d).split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + p.join(',');
  }
  const f2 = v => fmt(v, 2), f1 = v => fmt(v, 1);

  /* ---------------- të dhënat fillestare ---------------- */
  const CITIES = [
    ['Elbasan', 0.8, 24, 'III', 0.25], ['Tiranë', 0.8, 25, 'III', 0.25], ['Durrës', 0.6, 27, 'II', 0.30], ['Shkodër', 1.0, 26, 'III', 0.28],
    ['Vlorë', 0.6, 28, 'II', 0.30], ['Fier', 0.6, 26, 'II', 0.27], ['Lushnjë', 0.6, 25, 'II', 0.25], ['Kavajë', 0.6, 26, 'II', 0.28],
    ['Lezhë', 0.8, 26, 'III', 0.28], ['Krujë / Fushë-Krujë', 0.8, 25, 'III', 0.27], ['Berat', 0.8, 24, 'III', 0.22], ['Korçë', 2.0, 25, 'III', 0.25],
    ['Pogradec', 1.8, 25, 'III', 0.27], ['Gjirokastër', 1.2, 25, 'III', 0.22], ['Sarandë', 0.6, 27, 'II', 0.30], ['Përmet', 1.2, 24, 'III', 0.24],
    ['Kukës', 2.0, 24, 'III', 0.18], ['Peshkopi', 2.0, 24, 'III', 0.22], ['Tjetër (vlera manuale)', null]
  ];
  const DEF_COMPANY = { name: 'Oni-El', nipt: '', addr: 'Elbasan, Shqipëri', phone: '', email: '', signer: '' };
  const DEF_OFFER = {
    validDays: 30,
    pay: '40% paradhënie me nënshkrimin e kontratës, 40% me dorëzimin e strukturës në objekt, 20% në përfundim të montimit.',
    excl: 'Themelet, dyshemeja dhe punimet civile\nInstalimet elektrike, hidraulike dhe të ventilimit\nLejet dhe tarifat e ndërtimit'
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const newOfferNo = () => { const d = new Date(); return 'OE-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0'); };
  const DEF = {
    name: 'Kapanon i ri', client: '', site: '', city: 'Elbasan',
    L: 40, W: 20, H: 6, roof: 'duo', slopePct: 10, nSpans: 1, bayMax: 6, base: 'fixed', haunch: true, sockel: 0,
    roofType: 'panel', roofT: 40, roofCore: 'PU', wallType: 'panel', wallT: 40, wallCore: 'PU', skyPct: 0, pv: false, gExtra: 0.10,
    mezz: false, mL: 12, mW: 10, mH: 3.5, mUse: 'B', mQ: 5, mDeck: 'komp', mSlab: 12, mG2: 1.0, mGrid: 5, mBeamFam: 'IPE', mColFam: 'SHS',
    stairs: 'none', stairShape: 'auto', stairW: 1.1, stairTread: 'grile', stairCount: 1, stairRise: 3.0,
    doorN: 1, doorW: 4, doorH: 4.5, doorType: 'seks', doorMotor: true, pDoorN: 1, winA: 0, partA: 0,
    sk: 0.8, vb: 24, terrain: 'III', ag: 0.25, soil: 'C', q: 1.5,
    grade: 'S275', colFam: 'both', rafFam: 'IPE', colSec: '', rafSec: '', purlinFam: 'RHS', purlinSec: '', purlinCont: true, purlinAuto: true, purlinSp: 1.8,
    railFam: 'RHS', railSec: '', railAuto: true, railSp: 2.0, postFam: 'IPE', postSec: '', postSp: 6, limV: 200, limH: 150, connPct: 10, coat: 'paint',
    offerNo: '', offerDate: '', validDays: null, leadTime: '', pay: null, excl: null, showKg: false, showProfiles: true, showVat: true, currency: 'EUR', margin: null
  };
  let settings = { prices: clone(E.DEFAULT_PRICES), company: clone(DEF_COMPANY), offer: clone(DEF_OFFER) };
  let inp = clone(DEF);
  let res = null, cost = null, engIn = null, projId = null, dirty = {}, curTab = 'm3d';
  let restricted = false, clientMode = false;

  /* ---------------- ruajtja ---------------- */
  const LS = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bosh */ } }
  };
  const Store = {
    db: null, uid: null, mode: 'local',
    async init() {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      try {
        const user = await window.claude.use('user');
        if (user) {
          try { restricted = !(await user.isOwner()); } catch (e) { restricted = false; }
          try { this.uid = await user.id(); } catch (e) { this.uid = null; }
        }
        const db = await window.claude.use('db');
        if (db && this.uid) { this.db = db; this.mode = 'db'; }
      } catch (e) { /* pa kapacitete */ }
    },
    p(x) { return 'data/users/' + this.uid + '/' + x; },
    async getSettings() {
      if (this.db) { try { const s = await this.db.doc(this.p('settings')).get(); if (s.exists) return s.data(); } catch (e) { } return null; }
      return LS.get('kap.settings');
    },
    async setSettings(v) { if (this.db) return this.db.doc(this.p('settings')).set(v); LS.set('kap.settings', v); },
    col() { return this.db.doc(this.p('main')).collection('projects'); },
    async list() {
      if (this.db) { const q = await this.col().orderBy('updated', 'desc').limit(300).get(); return q.docs.map(d => Object.assign({ id: d.id }, d.data())); }
      return LS.get('kap.projects') || [];
    },
    async save(id, data) {
      if (this.db) { await this.col().doc(id).set(data); return; }
      const l = (LS.get('kap.projects') || []).filter(p => p.id !== id); l.unshift(Object.assign({ id }, data)); LS.set('kap.projects', l);
    },
    async del(id) {
      if (this.db) { await this.col().doc(id).delete(); return; }
      LS.set('kap.projects', (LS.get('kap.projects') || []).filter(p => p.id !== id));
    }
  };

  if (window.KAP_STORE) Object.assign(Store, window.KAP_STORE);

  /* ---------------- përshkrimi i fushave ---------------- */
  const profOpts = fams => [['', 'Automatik (më i lehti që kalon)']].concat(fams.reduce((a, f) => a.concat(E.SEC[f].map(s => [s.name, s.name])), []));
  const deg = () => (Math.atan(inp.slopePct / 100) * 180 / Math.PI);
  const SECTIONS = [
    { id: 'obj', t: 'Objekti', open: true, ss: () => `${f1(inp.L)} × ${f1(inp.W)} × ${f1(inp.H)} m`, f: [
      { k: 'L', l: 'Gjatësia', u: 'm', min: 6, max: 300, step: 0.5 },
      { k: 'W', l: 'Gjerësia', u: 'm', min: 5, max: 120, step: 0.5 },
      { k: 'H', l: 'Lartësia në strehë', u: 'm', min: 3, max: 16, step: 0.1 },
      { k: 'slopePct', l: 'Pjerrësia e çatisë', u: '%', min: 3, max: 45, step: 0.5, hint: () => f1(deg()) + '° · kulmi ' + (res ? f2(res.cl.hr) + ' m' : '') },
      { k: 'roof', l: 'Forma e çatisë', t: 'seg', w2: 1, o: [['duo', 'Me dy ujëra'], ['mono', 'Me një ujë']] },
      { k: 'nSpans', l: 'Hapësira tërthore (kolona të ndërmjetme)', t: 'seg', w2: 1, num: 1, o: [[1, '1'], [2, '2'], [3, '3'], [4, '4']], hint: () => 'drita ' + f2(inp.W / inp.nSpans) + ' m' + (inp.W / inp.nSpans > 30 ? ' · mbi 30 m konsidero kolona të ndërmjetme' : '') },
      { k: 'bayMax', l: 'Interaksi maks. i portaleve', u: 'm', min: 3, max: 9, step: 0.25, hint: () => res ? res.nFrames + ' portale × ' + f2(res.bay) + ' m' : '' },
      { k: 'sockel', l: 'Mur betoni (soklë)', u: 'm', min: 0, max: 3, step: 0.1 },
      { k: 'base', l: 'Bazamenti i kolonave', t: 'seg', w2: 1, o: [['fixed', 'I ngurtë (inkastruar)'], ['pinned', 'Me nyje']] },
      { k: 'haunch', l: 'Haunch (përforcim) në strehë', t: 'tog', w2: 1 }
    ] },
    { id: 'clad', t: 'Mbulesa dhe fasada', ss: () => (inp.roofType === 'panel' ? inp.roofT + ' mm' : 'llamarinë') + ' / ' + (inp.wallType === 'panel' ? inp.wallT + ' mm' : 'llamarinë'), f: [
      { k: 'roofType', l: 'Çatia', t: 'seg', w2: 1, o: [['panel', 'Panel sandwich'], ['sheet', 'Llamarinë grekë']] },
      { k: 'roofT', l: 'Trashësia (çati)', t: 'sel', num: 1, o: [30, 40, 50, 60, 80, 100, 120, 150].map(v => [v, v + ' mm']), show: () => inp.roofType === 'panel', hint: () => res ? 'rigla çdo ' + f2(res.purlin.sp) + ' m' : '' },
      { k: 'roofCore', l: 'Bërthama (çati)', t: 'sel', o: [['PU', 'PIR / PU'], ['MW', 'Lesh guri']], show: () => inp.roofType === 'panel' },
      { k: 'wallType', l: 'Fasada', t: 'seg', w2: 1, o: [['panel', 'Panel sandwich'], ['sheet', 'Llamarinë grekë']] },
      { k: 'wallT', l: 'Trashësia (fasadë)', t: 'sel', num: 1, o: [40, 50, 60, 80, 100, 120, 150].map(v => [v, v + ' mm']), show: () => inp.wallType === 'panel', hint: () => res ? 'rigla çdo ' + f2(res.rail.sp) + ' m' : '' },
      { k: 'wallCore', l: 'Bërthama (fasadë)', t: 'sel', o: [['PU', 'PIR / PU'], ['MW', 'Lesh guri']], show: () => inp.wallType === 'panel' },
      { k: 'skyPct', l: 'Shirita drite (polikarbonat)', u: '% e çatisë', min: 0, max: 20, step: 1 },
      { k: 'gExtra', l: 'Instalime të varura', u: 'kN/m²', min: 0, max: 1.5, step: 0.05 },
      { k: 'pv', l: 'Panele fotovoltaike në çati (+0,15 kN/m²)', t: 'tog', w2: 1 }
    ] },
    { id: 'mezz', t: 'Mezaninë / kat', ss: () => inp.mezz ? `${f1(inp.mL)} × ${f1(inp.mW)} · +${f2(inp.mH)}` : 'Jo', f: [
      { k: 'mezz', l: 'Ka mezaninë ose kat të ndërmjetëm', t: 'tog', w2: 1 },
      { k: 'mL', l: 'Gjatësia', u: 'm', min: 2, max: 300, step: 0.5, show: () => inp.mezz, hint: () => inp.mL >= inp.L ? 'gjatësia e plotë' : '' },
      { k: 'mW', l: 'Gjerësia', u: 'm', min: 2, max: 120, step: 0.5, show: () => inp.mezz, hint: () => inp.mW >= inp.W ? 'gjerësia e plotë' : '' },
      { k: 'mH', l: 'Kuota e dyshemesë', u: 'm', min: 2.2, max: 12, step: 0.05, show: () => inp.mezz, hint: () => inp.mezz && inp.H - inp.mH < 2.4 ? 'lartësi e lirë e vogël sipër' : '' },
      { k: 'mGrid', l: 'Interaksi i kolonave', u: 'm', min: 2.5, max: 9, step: 0.25, show: () => inp.mezz, hint: () => res && res.mezz ? 'rrjeta ' + f2(res.mezz.gx) + ' × ' + f2(res.mezz.gy) + ' m' : '' },
      { k: 'mUse', l: 'Përdorimi', t: 'sel', w2: 1, show: () => inp.mezz, o: Object.entries(E.USES).map(([k, v]) => [k, v.name + (k !== 'X' ? ' · ' + fmt(v.q, 1) + ' kN/m²' : '')]) },
      { k: 'mQ', l: 'Ngarkesa e përkohshme', u: 'kN/m²', min: 1, max: 20, step: 0.5, show: () => inp.mezz && inp.mUse === 'X' },
      { k: 'mG2', l: 'Shtresa dhe ndarje (G2)', u: 'kN/m²', min: 0, max: 5, step: 0.1, show: () => inp.mezz },
      { k: 'mDeck', l: 'Soleta', t: 'sel', w2: 1, show: () => inp.mezz, o: Object.entries(E.DECKS).map(([k, v]) => [k, v.name]) },
      { k: 'mSlab', l: 'Trashësia e soletës', u: 'cm', min: 10, max: 20, step: 1, show: () => inp.mezz && inp.mDeck === 'komp' },
      { k: 'mBeamFam', l: 'Trarët', t: 'seg', show: () => inp.mezz, o: [['IPE', 'IPE'], ['HEA', 'HEA']] },
      { k: 'mColFam', l: 'Kolonat', t: 'seg', show: () => inp.mezz, o: [['SHS', 'Tub katror'], ['HEA', 'HEA']] }
    ] },
    { id: 'st', t: 'Shkallët', ss: () => inp.stairs === 'none' ? 'Jo' : (inp.stairs === 'int' ? 'E brendshme' : 'E jashtme') + ' × ' + inp.stairCount, f: [
      { k: 'stairs', l: 'Shkalla', t: 'seg', w2: 1, o: [['none', 'Pa shkallë'], ['int', 'E brendshme'], ['ext', 'E jashtme']] },
      { k: 'stairShape', l: 'Forma', t: 'sel', show: () => inp.stairs !== 'none', o: [['auto', 'Automatike'], ['drejt', 'Drejt'], ['U', 'Me sheshpushim (U)']] },
      { k: 'stairW', l: 'Gjerësia', u: 'm', min: 0.7, max: 2.5, step: 0.05, show: () => inp.stairs !== 'none', hint: () => res && res.stairs ? res.stairs.n + ' ngritje × ' + fmt(res.stairs.riser * 100, 1) + ' cm' : '' },
      { k: 'stairTread', l: 'Shkelëset', t: 'seg', w2: 1, show: () => inp.stairs !== 'none', o: [['grile', 'Grilë'], ['lot', 'Llamarinë me lot']] },
      { k: 'stairCount', l: 'Numri i shkallëve', min: 1, max: 4, step: 1, show: () => inp.stairs !== 'none' },
      { k: 'stairRise', l: 'Lartësia që kapërcen', u: 'm', min: 0.5, max: 10, step: 0.05, show: () => inp.stairs !== 'none' && !inp.mezz }
    ] },
    { id: 'open', t: 'Dyer, dritare, ndarje', ss: () => inp.doorN + ' dyer · ' + inp.pDoorN + ' këmbësore', f: [
      { k: 'doorN', l: 'Dyer industriale', u: 'copë', min: 0, max: 20, step: 1 },
      { k: 'doorType', l: 'Lloji', t: 'sel', o: [['seks', 'Seksionale'], ['roll', 'Rrotulluese']], show: () => inp.doorN > 0 },
      { k: 'doorW', l: 'Gjerësia e derës', u: 'm', min: 1, max: 12, step: 0.1, show: () => inp.doorN > 0 },
      { k: 'doorH', l: 'Lartësia e derës', u: 'm', min: 2, max: 10, step: 0.1, show: () => inp.doorN > 0 },
      { k: 'doorMotor', l: 'Me motor elektrik', t: 'tog', w2: 1, show: () => inp.doorN > 0 },
      { k: 'pDoorN', l: 'Dyer këmbësore', u: 'copë', min: 0, max: 20, step: 1 },
      { k: 'winA', l: 'Dritare', u: 'm²', min: 0, max: 500, step: 1 },
      { k: 'partA', l: 'Mure ndarëse me panel', u: 'm²', min: 0, max: 5000, step: 5, w2: 1 }
    ] },
    { id: 'load', t: 'Vendndodhja dhe ngarkesat', ss: () => inp.city.split(' ')[0] + ' · sk ' + f2(inp.sk), f: [
      { k: 'city', l: 'Qyteti (vlera orientuese)', t: 'sel', w2: 1, o: CITIES.map(c => [c[0], c[0]]) },
      { k: 'sk', l: 'Bora në tokë sk', u: 'kN/m²', min: 0.2, max: 6, step: 0.05 },
      { k: 'vb', l: 'Shpejtësia bazë e erës', u: 'm/s', min: 18, max: 40, step: 0.5 },
      { k: 'terrain', l: 'Kategoria e terrenit', t: 'sel', w2: 1, o: [['0', '0 · det, bregdet i hapur'], ['I', 'I · liqen, zonë e sheshtë pa pengesa'], ['II', 'II · fushë me pak pengesa'], ['III', 'III · periferi, zonë industriale'], ['IV', 'IV · qytet i dendur']] },
      { k: 'ag', l: 'Nxitimi i truallit ag', u: 'g', min: 0.05, max: 0.5, step: 0.01 },
      { k: 'soil', l: 'Trualli', t: 'sel', o: [['A', 'A · shkëmb'], ['B', 'B · shumë i dendur'], ['C', 'C · i dendur / mesatar'], ['D', 'D · i shkrifët'], ['E', 'E · shtresë sipërfaqësore']] },
      { k: '_note', t: 'note', html: () => res ? `Presioni i erës <b>qp = ${f2(res.cl.qp)} kN/m²</b> në z = ${f1(res.cl.hr)} m · bora në çati <b>s = ${f2(res.cl.s)} kN/m²</b> (μ = ${f2(res.cl.mu)}) · spektri <b>Sd = ${f2(res.cl.Sd)} g</b> (q = ${fmt(inp.q, 1)}). Kontrollo vlerat me hartat zyrtare për vendin konkret.` : '' }
    ] },
    { id: 'str', t: 'Struktura (e avancuar)', ss: () => inp.grade + (inp.colSec || inp.rafSec ? ' · manuale' : ' · auto'), f: [
      { k: 'grade', l: 'Çeliku', t: 'seg', w2: 1, o: [['S275', 'S275'], ['S355', 'S355']] },
      { k: 'colFam', l: 'Kolonat e portalit', t: 'sel', o: [['both', 'IPE ose HEA'], ['IPE', 'Vetëm IPE'], ['HEA', 'Vetëm HEA']] },
      { k: 'rafFam', l: 'Trarët e çatisë', t: 'sel', o: [['IPE', 'Vetëm IPE'], ['both', 'IPE ose HEA'], ['HEA', 'Vetëm HEA']] },
      { k: 'colSec', l: 'Kolona (manuale)', t: 'sel', o: profOpts(['IPE', 'HEA']), hint: () => res ? 'zgjedhur: ' + res.frame.col.name : '' },
      { k: 'rafSec', l: 'Trau (manual)', t: 'sel', o: profOpts(['IPE', 'HEA']), hint: () => res ? 'zgjedhur: ' + res.frame.raf.name : '' },
      { k: 'purlinFam', l: 'Riglat e çatisë', t: 'seg', o: [['RHS', 'Tub'], ['IPE', 'IPE']] },
      { k: 'purlinSec', l: 'Rigla (manuale)', t: 'sel', o: () => profOpts([inp.purlinFam]), hint: () => res ? 'zgjedhur: ' + res.purlin.sec.name : '' },
      { k: 'purlinCont', l: 'Riglat të vazhduara mbi 2 interakse', t: 'tog', w2: 1 },
      { k: 'purlinAuto', l: 'Interaksi i riglave sipas panelit', t: 'tog', w2: 1 },
      { k: 'purlinSp', l: 'Interaksi i riglave', u: 'm', min: 0.8, max: 4, step: 0.05, show: () => !inp.purlinAuto },
      { k: 'railFam', l: 'Riglat e fasadës', t: 'seg', o: [['RHS', 'Tub'], ['IPE', 'IPE']] },
      { k: 'railSec', l: 'Rigla fasade (manuale)', t: 'sel', o: () => profOpts([inp.railFam]), hint: () => res ? 'zgjedhur: ' + res.rail.sec.name : '' },
      { k: 'railAuto', l: 'Interaksi i riglave të fasadës sipas panelit', t: 'tog', w2: 1 },
      { k: 'railSp', l: 'Interaksi i riglave të fasadës', u: 'm', min: 0.8, max: 4.5, step: 0.05, show: () => !inp.railAuto },
      { k: 'postFam', l: 'Kolonat e fasadës ballore', t: 'seg', w2: 1, o: [['IPE', 'IPE'], ['HEA', 'HEA'], ['RHS', 'Tub']] },
      { k: 'postSp', l: 'Interaksi maks. i tyre', u: 'm', min: 2, max: 9, step: 0.25 },
      { k: 'postSec', l: 'Kolona ballore (manuale)', t: 'sel', o: () => profOpts([inp.postFam]), hint: () => res && res.post ? 'zgjedhur: ' + res.post.sec.name : '' },
      { k: 'limV', l: 'Zhvendosja vertikale e lejuar', t: 'sel', num: 1, o: [[150, 'L/150'], [200, 'L/200'], [250, 'L/250'], [300, 'L/300']] },
      { k: 'limH', l: 'Zhvendosja horizontale e lejuar', t: 'sel', num: 1, o: [[100, 'H/100'], [150, 'H/150'], [200, 'H/200'], [300, 'H/300']] },
      { k: 'q', l: 'Faktori i sjelljes q', min: 1, max: 4, step: 0.1 },
      { k: 'connPct', l: 'Lidhje, pllaka, bulona', u: '% e peshës', min: 0, max: 30, step: 0.5 },
      { k: 'coat', l: 'Mbrojtja kundër korrozionit', t: 'seg', w2: 1, o: [['paint', 'Bojë antikorrozive + përfundimtare'], ['zink', 'Zinkim në të nxehtë']] }
    ] },
    { id: 'offer', t: 'Klienti dhe oferta', money: 1, ss: () => inp.client || '—', f: [
      { k: 'client', l: 'Klienti', t: 'text', w2: 1 },
      { k: 'site', l: 'Vendndodhja e objektit', t: 'text', w2: 1 },
      { k: 'offerNo', l: 'Nr. i ofertës', t: 'text' },
      { k: 'offerDate', l: 'Data', t: 'date' },
      { k: 'validDays', l: 'Vlefshmëria', u: 'ditë', min: 1, max: 180, step: 1 },
      { k: 'leadTime', l: 'Afati i realizimit', t: 'text', ph: () => autoLead() },
      { k: 'currency', l: 'Monedha', t: 'seg', o: [['EUR', 'Euro'], ['ALL', 'Lekë']] },
      { k: 'showVat', l: 'Shfaq TVSH-në', t: 'tog' },
      { k: 'showProfiles', l: 'Shfaq profilet në ofertë', t: 'tog', w2: 1 },
      { k: 'showKg', l: 'Shfaq peshën e çelikut (zbulon €/kg)', t: 'tog', w2: 1, cls: 'int' },
      { k: 'pay', l: 'Kushtet e pagesës', t: 'area', w2: 1 },
      { k: 'excl', l: 'Nuk përfshihen (një rresht për çdo pikë)', t: 'area', w2: 1 }
    ] }
  ];
  const FIELD = {}; SECTIONS.forEach(s => s.f.forEach(f => { FIELD[f.k] = f; f.sec = s.id; }));

  /* ---------------- formulari ---------------- */
  function fieldVal(f) {
    const v = inp[f.k];
    if (f.k === 'validDays' && v == null) return settings.offer.validDays;
    if ((f.k === 'pay' || f.k === 'excl') && v == null) return settings.offer[f.k];
    return v;
  }
  function renderForm() {
    const side = $('#side');
    side.innerHTML = SECTIONS.map(s => `<details class="sec${s.money ? ' money' : ''}" id="sec-${s.id}"${s.open ? ' open' : ''}><summary><span class="st">${s.t}</span><span class="ss" id="ss-${s.id}"></span></summary><div class="fields">${s.f.map(fieldHTML).join('')}</div></details>`).join('');
    bindForm();
    refreshForm();
  }
  function fieldHTML(f) {
    const id = 'f-' + f.k, cls = 'f' + (f.w2 ? ' w2' : '') + (f.cls ? ' ' + f.cls : '');
    if (f.t === 'note') return `<div class="sub-note" data-k="${f.k}" id="${id}"></div>`;
    if (f.t === 'tog') return `<div class="${cls}" data-k="${f.k}"><label class="tog"><input type="checkbox" id="${id}"><span>${f.l}</span></label><small class="hint"></small></div>`;
    if (f.t === 'seg') return `<div class="${cls}" data-k="${f.k}"><span class="fl" id="${id}-l">${f.l}</span><div class="seg" role="group" aria-labelledby="${id}-l">${f.o.map(o => `<button type="button" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div><small class="hint"></small></div>`;
    if (f.t === 'sel') { const opts = typeof f.o === 'function' ? f.o() : f.o; return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><div class="inp"><select id="${id}">${opts.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></div><small class="hint"></small></div>`; }
    if (f.t === 'area') return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><textarea class="ta" id="${id}" rows="3"></textarea></div>`;
    if (f.t === 'text' || f.t === 'date') return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><div class="inp"><input type="${f.t}" id="${id}" autocomplete="off"></div><small class="hint"></small></div>`;
    return `<div class="${cls}" data-k="${f.k}"><label for="${id}">${f.l}</label><div class="inp"><input type="number" inputmode="decimal" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}">${f.u ? `<span class="u">${f.u}</span>` : ''}</div><small class="hint"></small></div>`;
  }
  function bindForm() {
    $$('#side .f, #side .sub-note').forEach(el => {
      const f = FIELD[el.dataset.k]; if (!f) return;
      if (f.t === 'seg') el.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setVal(f.k, f.num ? +b.dataset.v : b.dataset.v)));
      else if (f.t === 'tog') $('input', el).addEventListener('change', e => setVal(f.k, e.target.checked));
      else if (f.t === 'sel') $('select', el).addEventListener('change', e => setVal(f.k, f.num ? +e.target.value : e.target.value));
      else if (f.t === 'area' || f.t === 'text' || f.t === 'date') { const i = $('textarea, input', el); i.addEventListener('input', e => setVal(f.k, e.target.value, true)); }
      else if (f.t !== 'note') {
        const i = $('input', el);
        i.addEventListener('input', e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v)) setVal(f.k, v, true); });
        i.addEventListener('change', e => {
          let v = parseFloat(String(e.target.value).replace(',', '.'));
          if (!isFinite(v)) v = inp[f.k];
          v = Math.min(f.max, Math.max(f.min, v));
          if (f.step >= 1) v = Math.round(v);
          e.target.value = v; setVal(f.k, v);
        });
      }
    });
  }
  function refreshForm() {
    SECTIONS.forEach(s => {
      const ss = $('#ss-' + s.id); if (ss) ss.textContent = s.ss();
      s.f.forEach(f => {
        const el = $(`#side [data-k="${f.k}"]`); if (!el) return;
        el.hidden = f.show ? !f.show() : false;
        if (f.t === 'note') { el.innerHTML = f.html(); return; }
        const v = fieldVal(f);
        if (f.t === 'seg') el.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(String(v) === b.dataset.v)));
        else if (f.t === 'tog') $('input', el).checked = !!v;
        else if (f.t === 'sel') {
          const sel = $('select', el);
          if (typeof f.o === 'function') { const cur = sel.value; const opts = f.o(); const sig = opts.map(o => o[0]).join('|'); if (sel.dataset.sig !== sig) { sel.innerHTML = opts.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join(''); sel.dataset.sig = sig; } }
          sel.value = String(v);
        } else {
          const i = $('input, textarea', el);
          if (document.activeElement !== i) i.value = v == null ? '' : v;
          if (f.ph) i.placeholder = f.ph();
        }
        const h = $('.hint', el); if (h) h.textContent = f.hint ? f.hint() : '';
      });
    });
  }
  function setVal(k, v, typing) {
    inp[k] = v;
    if (k === 'city') { const c = CITIES.find(x => x[0] === v); if (c && c[1] != null) { inp.sk = c[1]; inp.vb = c[2]; inp.terrain = c[3]; inp.ag = c[4]; if (!inp.site) inp.site = c[0]; } }
    if (k === 'sk' || k === 'vb' || k === 'ag' || k === 'terrain') inp.city = 'Tjetër (vlera manuale)';
    if (k === 'mUse' && E.USES[v]) inp.mG2 = E.USES[v].g2;
    if (k === 'purlinFam') inp.purlinSec = '';
    if (k === 'railFam') inp.railSec = '';
    if (k === 'postFam') inp.postSec = '';
    if (k === 'mezz' && v && inp.stairs === 'none') inp.stairs = 'int';
    if (k === 'name') $('#projName').value = v;
    saveDraft();
    if (['client', 'site', 'offerNo', 'offerDate', 'validDays', 'leadTime', 'pay', 'excl', 'showKg', 'showProfiles', 'showVat', 'currency'].includes(k)) { refreshForm(); markDirty(['offer', 'kpi']); renderVisible(); renderKPIs(); return; }
    if (!typing) refreshForm();
    schedule(typing ? 450 : 120);
  }
  let draftT = 0;
  function saveDraft() { clearTimeout(draftT); draftT = setTimeout(() => LS.set('kap.draft', { inp, projId }), 400); }

  /* ---------------- llogaritja ---------------- */
  let calcT = 0;
  function schedule(ms) {
    clearTimeout(calcT);
    setStatus('busy', 'Duke llogaritur…');
    calcT = setTimeout(compute, ms);
  }
  function pricesNow() { const P = Object.assign({}, settings.prices); if (inp.margin != null && isFinite(inp.margin)) P.margin = inp.margin; return P; }
  function buildEngIn() {
    const o = clone(inp);
    o.slope = inp.slopePct / 100;
    ['colSec', 'rafSec', 'purlinSec', 'railSec', 'postSec'].forEach(k => { o[k] = inp[k] || null; });
    o.mW = Math.min(inp.mW, inp.W); o.mL = Math.min(inp.mL, inp.L);
    o.mH = Math.min(inp.mH, inp.H - 0.5);
    return o;
  }
  function compute() {
    engIn = buildEngIn();
    try {
      res = E.design(engIn);
      cost = E.costs(engIn, res, pricesNow());
    } catch (e) {
      console.error(e);
      setStatus('bad', 'Gabim në llogaritje');
      return;
    }
    const ok = res.frame.ok && (!res.mezz || (res.mezz.sec1.u <= 1 && res.mezz.sec2.u <= 1 && res.mezz.col.u <= 1)) && res.purlin.u <= 1 && res.rail.u <= 1 && (!res.post || res.post.u <= 1);
    setStatus(ok ? 'ok' : 'bad', ok ? 'Struktura kalon · ' + fmt(res.frame.util, 2) : 'Struktura nuk kalon');
    const wb = $('#warnBar');
    const warns = res.warn.slice();
    if (!ok && !warns.length) warns.push('Disa elemente kalojnë kufirin e shfrytëzimit. Shiko skedën "Llogaritja strukturore".');
    wb.hidden = !warns.length;
    wb.innerHTML = warns.length ? '<b>Kujdes</b>' + warns.map(w => `<span>${esc(w)}</span>`).join('') : '';
    refreshForm();
    renderKPIs();
    $('#lgM').hidden = !res.mezz; $('#lgS').hidden = !res.stairs;
    $('#vDims').textContent = `${f2(inp.L)} × ${f2(inp.W)} m · H ${f2(inp.H)} m · ${res.nFrames} portale`;
    markDirty(['m3d', 'draw', 'calc', 'cost', 'offer']);
    renderVisible();
  }
  function setStatus(cls, t) { const s = $('#kStatus'); s.className = 'status ' + cls; s.lastElementChild.textContent = t; }
  function markDirty(l) { l.forEach(k => { dirty[k] = true; }); }
  function renderVisible() {
    if (!res) return;
    if (dirty.m3d && curTab === 'm3d') { View3D.build(res, engIn); dirty.m3d = false; }
    if (dirty.draw && curTab === 'draw') { renderDrawings(); dirty.draw = false; }
    if (dirty.calc && curTab === 'calc') { renderReport(); dirty.calc = false; }
    if (dirty.cost && curTab === 'cost') { renderCosts(); dirty.cost = false; }
    if (dirty.offer && curTab === 'offer') { renderOffer(); dirty.offer = false; }
  }
  const cur = () => inp.currency === 'ALL' ? 'ALL' : 'EUR';
  function money(v, d) { if (cur() === 'ALL') return fmt(v * settings.prices.eurAll, 0) + ' Lekë'; return fmt(v, d || 0) + ' €'; }
  function renderKPIs() {
    if (!res) return;
    const q = res.qty;
    $('#kPrice').textContent = money(cost.price);
    $('#kM2').textContent = money(cost.perM2, cur() === 'EUR' ? 1 : 0);
    $('#kArea').textContent = fmt(q.area.ground, 0) + (q.area.mezz ? ' + ' + fmt(q.area.mezz, 0) : '') + ' m²';
    $('#kSteel').textContent = fmt(q.steelTotal / 1000, 1) + ' t · ' + fmt(q.steelTotal / q.area.ground, 1) + ' kg/m²';
    $('#kProfit').textContent = money(cost.profit) + ' · ' + fmt(cost.profit / cost.price * 100, 1) + '%';
  }

  /* ---------------- vizatimet ---------------- */
  function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function screenPal() { return { bg: cssv('--panel'), ink: cssv('--ink'), dim: cssv('--muted'), steel: cssv('--steel'), accent: cssv('--draw-acc') }; }
  const PRINT_PAL = { bg: '#ffffff', ink: '#18212a', dim: '#5a6874', steel: '#33597a', accent: '#b8740b' };
  function meta() { return { company: (settings.company.name || 'Oni-El').toUpperCase(), project: inp.name }; }
  function renderDrawings() {
    const p = screenPal(), m = meta();
    $('#drawings').innerHTML = [Draw.section(res, engIn, p, m), Draw.plan(res, engIn, p, m), Draw.side(res, engIn, p, m)].map(s => `<div class="card">${s}</div>`).join('');
  }

  /* ---------------- raporti strukturor ---------------- */
  function ubar(u) { const c = u > 1 ? 'b' : u > 0.9 ? 'w' : ''; return `<span class="ubar ${c}"><i style="width:${Math.min(100, u * 100).toFixed(0)}%"></i></span>`; }
  function urow(name, sec, u, gov, extra) {
    return `<div class="urow"><div class="n">${esc(name)}<small>${esc(sec)}</small></div>${ubar(u)}<div class="uval">${fmt(u, 2)}${u > 1 ? ' ✕' : ''}</div><div class="g" style="grid-column:2/4">${esc(gov || '')}${extra ? ' · ' + extra : ''}</div></div>`;
  }
  function pill(ok, t) { return `<span class="pill ${ok ? 'ok' : 'bad'}">${t || (ok ? 'Kalon' : 'Nuk kalon')}</span>`; }
  function renderReport() {
    const r = res, fr = r.frame, cl = r.cl, q = r.qty, b = r.brace, ctx = r.ctx;
    let h = '<div class="cards">';
    h += `<section class="card"><h3>Korniza portale ${pill(fr.ok)}</h3>`;
    const mc = fr.members.col || { u: 0 }, mr = fr.members.raf || { u: 0 };
    h += urow('Kolona', fr.col.name + ' · ' + inp.grade, mc.u, mc.gov, esc(mc.combo || '') + ` · N ${fmt(mc.N, 0)} kN, M ${fmt(Math.abs(mc.M || 0), 0)} kNm`);
    h += urow('Trau i çatisë', fr.raf.name + (inp.haunch ? ' + haunch' : ''), mr.u, mr.gov, esc(mr.combo || '') + ` · M ${fmt(Math.abs(mr.M || 0), 0)} kNm`);
    h += urow('Zhvendosja vert.', fmt(fr.dv * 1000, 0) + ' / ' + fmt(fr.dvLim * 1000, 0) + ' mm', fr.uDv, 'G + S, në kulm (L/' + inp.limV + ')');
    h += urow('Zhvendosja horiz.', fmt(fr.dh * 1000, 0) + ' / ' + fmt(fr.dhLim * 1000, 0) + ' mm', fr.uDh, 'Era karakteristike, në strehë (H/' + inp.limH + ')');
    h += `<dl class="kv" style="margin-top:10px"><dt>Portale × interaksi</dt><dd>${r.nFrames} × ${f2(r.bay)} m</dd><dt>Drita e hapësirës</dt><dd>${f2(r.B)} m</dd><dt>Gjatësia e haunch-it</dt><dd>${fr.fr.Lh ? f2(fr.fr.Lh) + ' m' : '—'}</dd><dt>αcr minimal (Horne)</dt><dd>${fmt(fr.alphaMin, 1)}${fr.alphaMin < 10 ? ' · efektet P-Δ të amplifikuara' : ''}</dd><dt>Profile të provuara</dt><dd>${r.evals}</dd></dl></section>`;
    h += `<section class="card"><h3>Ngarkesat e projektimit</h3><dl class="kv">
      <dt>Mbulesa + rigla + instalime (G)</dt><dd>${f2(ctx.gRoof)} kN/m²</dd>
      <dt>Bora në tokë sk / në çati s</dt><dd>${f2(inp.sk)} / ${f2(cl.s)} kN/m²</dd>
      <dt>Era vb · kategoria</dt><dd>${fmt(inp.vb, 1)} m/s · ${inp.terrain}</dd>
      <dt>Presioni maksimal qp(z = ${f1(cl.hr)} m)</dt><dd>${f2(cl.qp)} kN/m²</dd>
      <dt>Sizmika ag · truall · q</dt><dd>${f2(inp.ag)} g · ${inp.soil} (S = ${f2(cl.soilS)}) · ${fmt(inp.q, 1)}</dd>
      <dt>Spektri i projektimit Sd</dt><dd>${f2(cl.Sd)} g</dd>
      ${inp.pv ? '<dt>Panele fotovoltaike</dt><dd>0,15 kN/m²</dd>' : ''}
      </dl></section>`;
    h += `<section class="card"><h3>Elementet dytësore</h3>`;
    h += urow('Rigla çatie', r.purlin.sec.name + ' · @' + f2(r.purlin.sp) + ' m', r.purlin.u, r.purlin.gov, r.purlin.cont ? 'e vazhduar' : 'e thjeshtë');
    h += urow('Rigla fasade', r.rail.sec.name + ' · @' + f2(r.rail.sp) + ' m', r.rail.u, r.rail.gov);
    if (r.post) h += urow('Kolona ballore', r.post.sec.name + ' · h ' + f2(r.post.hMax) + ' m', r.post.u, r.post.gov);
    h += urow('Kontr. çatie', b.roofRod.name + ' · ' + b.nbb + ' interakse', b.roofRod.u, 'N = ' + fmt(b.Rg, 0) + ' kN në skaj');
    h += urow('Kontr. muri', b.wallRod.name + (b.tiers > 1 ? ' · ' + b.tiers + ' kate' : ''), b.wallRod.u, 'F = ' + fmt(b.Fbay, 0) + ' kN për interaks (' + (b.Fseis > b.FwindLong ? 'sizmika' : 'era') + ')');
    h += urow('Shufra strehe', b.strut.sec.name, b.strut.u, b.strut.gov);
    h += `</section>`;
    if (r.mezz) {
      const m = r.mezz;
      h += `<section class="card"><h3>Mezanina ${pill(m.sec1.u <= 1 && m.sec2.u <= 1 && m.col.u <= 1)}</h3>`;
      h += urow('Trarë kryesorë', m.sec1.sec.name + ' · L ' + f2(m.gx) + ' m', m.sec1.u, m.sec1.gov);
      h += urow('Trarë dytësorë', m.sec2.sec.name + ' · L ' + f2(m.gy) + ' m @' + f2(m.d), m.sec2.u, m.sec2.gov);
      h += urow('Kolonat', m.col.sec.name + ' · h ' + f2(m.Hm) + ' m', m.col.u, m.col.gov, 'N = ' + fmt(m.Ncol, 0) + ' kN');
      h += urow('Kontraventimet', m.rod.name + ' · ' + m.nbb + ' interakse', m.rod.u || 0, 'F sizmike = ' + fmt(m.F, 0) + ' kN');
      h += `<dl class="kv" style="margin-top:10px"><dt>Sipërfaqja · përdorimi</dt><dd>${fmt(m.area, 0)} m² · ${esc(m.use.name)}</dd><dt>G1 + G2 + Q</dt><dd>${f2(m.g1)} + ${f2(m.g2)} + ${f2(m.Q)} kN/m²</dd><dt>Soleta</dt><dd>${esc(m.deck.name)}</dd></dl></section>`;
    }
    if (r.stairs) {
      const s = r.stairs;
      h += `<section class="card"><h3>Shkallët</h3>`;
      h += urow('Trarët anësorë', s.st.sec.name + ' · ' + f2(s.runMax) + ' m', s.st.u, s.st.gov);
      h += `<dl class="kv" style="margin-top:10px"><dt>Lartësia · ngritje</dt><dd>${f2(s.rise)} m · ${s.n} × ${fmt(s.riser * 100, 1)} cm</dd><dt>Shkelja · gjerësia</dt><dd>${fmt(s.going * 100, 0)} cm · ${f2(s.w)} m</dd><dt>Forma · krahët</dt><dd>${s.shape === 'U' ? 'U me sheshpushim' : 'drejt'} · ${s.flights.join(' + ')}</dd><dt>Pesha</dt><dd class="int">${fmt(s.kg, 0)} kg</dd></dl></section>`;
    }
    // reaksionet
    const rx = r.reactions;
    h += `<section class="card wide"><h3>Reaksionet në bazë · portal i brendshëm</h3><p style="margin:0 0 8px;color:var(--muted);font-size:12.5px">Vlera karakteristike për çdo rast ngarkimi (V lart = shtypje në themel, H në drejtim të x) dhe mbështjella e kombinimeve GKQ. Për projektin e themeleve.</p><div class="tblw"><table class="t"><thead><tr><th>Kolona</th><th class="r">G: V / H / M</th><th class="r">S: V / H / M</th><th class="r">W→ presion</th><th class="r">W→ thithje</th><th class="r">W gjatësore</th><th class="r">GKQ: Nmax / Nmin</th><th class="r">GKQ: |H| / |M|</th></tr></thead><tbody>`;
    const trip = p => `${fmt(p.V, 1)} / ${fmt(p.H, 1)} / ${fmt(p.M, 1)}`;
    rx.forEach(x => {
      h += `<tr><td>${'ABCDEFG'[x.col]}</td><td class="num">${trip(x.per.G)}</td><td class="num">${trip(x.per.S)}</td><td class="num">${trip(x.per.WP)}</td><td class="num">${trip(x.per.WN)}</td><td class="num">${trip(x.per.W90)}</td><td class="num">${fmt(x.env.Nc, 1)} / ${fmt(x.env.Nt, 1)}</td><td class="num">${fmt(x.env.H, 1)} / ${fmt(x.env.M, 1)}</td></tr>`;
    });
    h += `</tbody></table></div><p style="margin:8px 0 0;color:var(--muted);font-size:12px">Njësitë: kN dhe kNm. ${inp.base === 'pinned' ? 'Bazament me nyje: M = 0.' : ''}</p></section>`;
    h += `<section class="card wide"><h3>Supozimet e modelit</h3><ul class="as">
      <li>Analizë elastike e rendit të parë e kornizës 2D (metoda e ngurtësisë); efektet e rendit të dytë me metodën e amplifikimit (αcr sipas EN 1993-1-1 §5.2.1) dhe imperfeksionet globale si forca horizontale ekuivalente.</li>
      <li>Kombinimet sipas EN 1990 (6.10): γG = 1,35 · γQ = 1,5 · ψ0 bora 0,5 · ψ0 era 0,6; rasti sizmik G + E me spektër plato (EN 1998-1, lloji 1).</li>
      <li>Era sipas EN 1991-1-4 me koeficientë cpe,10 të mesatarizuar për zonat G/H/I/J dhe cpi = +0,2 / −0,3; bora μ1 = 0,8 me rastin asimetrik.</li>
      <li>Fllanxha e sipërme e traut mbahet nga riglat; fllanxha e poshtme dhe ajo e brendshme e kolonës me brinjë stabilizuese (fly-brace) çdo ${f2(ctx.flyRaf)} m në tra dhe ${f2(ctx.flyCol)} m në kolonë.</li>
      <li>Portalet fundore dimensionohen si ato të brendshme. Kolonat e fasadës ballore për erë me +1,1·qp. Riglat në zonat e skajeve të çatisë kontrollohen me cpe mesatar G/H.</li>
      <li>Mezanina është strukturë e pavarur, e mbështetur në themelet e veta, me kontraventime kryq për sizmikën. Soleta mban fllanxhën e sipërme të trarëve.</li>
      <li>Rezultati është paradimensionim për ofertë. Projekti i zbatimit (lidhjet, pllakat e bazës, themelet) bëhet veçmas.</li>
    </ul></section>`;
    h += '</div>';
    $('#report').innerHTML = h;
  }

  /* ---------------- kostot e brendshme ---------------- */
  function renderCosts() {
    const c = cost, q = res.qty, P = pricesNow();
    let h = `<div class="mini">
      <div class="m hl"><div class="l">Çmimi i ofertës</div><div class="v">${money(c.price)}</div></div>
      <div class="m"><div class="l">Kosto totale</div><div class="v">${money(c.cost)}</div></div>
      <div class="m"><div class="l">Fitimi</div><div class="v">${money(c.profit)}</div></div>
      <div class="m"><div class="l">Çeliku · për m²</div><div class="v">${fmt(q.steelTotal / 1000, 1)} t · ${fmt(q.steelTotal / q.area.ground, 1)} kg</div></div>
      <div class="m"><div class="l">Kosto e çelikut / kg</div><div class="v">${fmt(c.steelRate + P.stMont, 2)} €</div></div>
      <div class="m"><div class="l">Çmim efektiv / kg (gjithçka)</div><div class="v">${fmt(c.effKg, 2)} €</div></div>
    </div>`;
    h += `<div class="cards"><section class="card"><h3>Fitimi për këtë ofertë</h3>
      <div class="fields" style="padding:0;grid-template-columns:1fr 1fr">
        <div class="f"><label for="cMargin">Fitimi</label><div class="inp"><input type="number" id="cMargin" step="0.5" min="0" max="80" value="${P.margin}"><span class="u">%</span></div><small class="hint">standardi në çmimet e tua: ${fmt(settings.prices.margin, 1)}%</small></div>
        <div class="f"><label for="cTarget">Çmimi i synuar për m²</label><div class="inp"><input type="number" id="cTarget" step="1" min="1" placeholder="${fmt(c.perM2, 0)}"><span class="u">€/m²</span></div><small class="hint" id="cTargetHint"></small></div>
        <div class="f w2 row" style="flex-direction:row"><button class="btn sm" id="cApply" type="button">Përdor çmimin e synuar</button><button class="btn sm" id="cReset" type="button">Kthe fitimin standard</button></div>
      </div></section>
      <section class="card"><h3>Pesha sipas elementeve</h3><dl class="kv">${[['portal', 'Portalet'], ['purlin', 'Riglat e çatisë'], ['rail', 'Riglat e fasadës'], ['post', 'Kolonat ballore'], ['brace', 'Kontraventimet'], ['doors', 'Kornizat e dyerve'], ['mezz', 'Mezanina'], ['stairs', 'Shkallët'], ['conn', 'Lidhje dhe pllaka']].filter(([k]) => q.steel[k] > 0).map(([k, n]) => `<dt>${n}</dt><dd>${fmt(q.steel[k], 0)} kg</dd>`).join('')}</dl></section></div>`;
    h += `<section class="card" style="margin-top:12px"><h3>Preventivi i detajuar</h3><div class="tblw"><table class="t"><thead><tr><th>Zëri</th><th class="r">Sasia</th><th>Njësia</th><th class="r">Çmimi</th><th class="r">Vlera</th></tr></thead><tbody>`;
    let g = null;
    c.items.forEach(i => {
      if (i.grp !== g) { g = i.grp; h += `<tr class="grp"><td colspan="5">${esc(g)}</td></tr>`; }
      h += `<tr><td>${esc(i.name)}</td><td class="num">${fmt(i.qty, i.unit === 'kg' || i.unit === 'copë' || i.unit === 'udhëtim' || i.unit === 'ditë' || i.unit === 'shërbim' ? 0 : 1)}</td><td>${i.unit}</td><td class="num">${fmt(i.rate, 2)} €</td><td class="num">${fmt(i.v, 0)} €</td></tr>`;
    });
    h += `<tr class="tot"><td colspan="4">Kostot direkte + projektimi</td><td class="num">${fmt(c.direct + c.design, 0)} €</td></tr>`;
    h += `<tr><td colspan="4">Rezerva për të paparashikuara (${fmt(P.contPct, 1)}%)</td><td class="num">${fmt(c.cont, 0)} €</td></tr>`;
    h += `<tr class="tot"><td colspan="4">Kosto totale</td><td class="num">${fmt(c.cost, 0)} €</td></tr>`;
    h += `<tr><td colspan="4">Fitimi (${fmt(P.margin, 1)}%${P.round ? ', rrumbullakuar me ' + fmt(P.round, 0) + ' €' : ''})</td><td class="num">${fmt(c.profit, 0)} €</td></tr>`;
    h += `<tr class="fin"><td colspan="4">Çmimi i ofertës pa TVSH · ${fmt(c.perM2, 1)} €/m²</td><td class="num">${fmt(c.price, 0)} €</td></tr>`;
    h += `</tbody></table></div></section>`;
    $('#costs').innerHTML = h;
    $('#cMargin').addEventListener('change', e => { const v = parseFloat(e.target.value); if (isFinite(v)) { inp.margin = v; saveDraft(); schedule(50); } });
    const tgt = $('#cTarget'), th = $('#cTargetHint');
    const implied = v => (v * q.area.ground / c.cost - 1) * 100;
    tgt.addEventListener('input', () => { const v = parseFloat(tgt.value); th.textContent = isFinite(v) ? 'fitimi rezultues: ' + fmt(implied(v), 1) + '%' : ''; });
    $('#cApply').addEventListener('click', () => { const v = parseFloat(tgt.value); if (!isFinite(v)) { toast('Shkruaj fillimisht çmimin e synuar për m².'); return; } inp.margin = Math.round(implied(v) * 10) / 10; saveDraft(); schedule(10); toast('Fitimi u vendos ' + fmt(inp.margin, 1) + '%.'); });
    $('#cReset').addEventListener('click', () => { inp.margin = null; saveDraft(); schedule(10); });
  }

  /* ---------------- oferta ---------------- */
  function autoLead() {
    if (!res) return '';
    const a = Math.max(3, Math.ceil(res.qty.steelTotal / 1000 / 8) + 2);
    return a + '–' + (a + 2) + ' javë nga paradhënia';
  }
  const dstr = d => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  function offerData() {
    const r = res, q = r.qty, c = cost, fr = r.frame;
    const vd = inp.validDays || settings.offer.validDays || 30;
    const d0 = inp.offerDate ? new Date(inp.offerDate + 'T12:00:00') : new Date();
    const dv = new Date(d0.getTime() + vd * 864e5);
    const hr = r.cl.hr;
    const roofTxt = inp.roof === 'duo' ? 'me dy ujëra' : 'me një ujë';
    const title = `Kapanon metalik ${f1(inp.L)} × ${f1(inp.W)} m`;
    const subtitle = `Sipërfaqja ${fmt(q.area.ground, 0)} m²${q.area.mezz ? ' + mezaninë ' + fmt(q.area.mezz, 0) + ' m²' : ''} · lartësia në strehë ${f2(inp.H)} m`;
    const sp = inp.showProfiles;
    const desc = [];
    desc.push(['Dimensionet', `${f2(inp.L)} × ${f2(inp.W)} m, sipërfaqja përdhese ${fmt(q.area.ground, 0)} m². Lartësia në strehë ${f2(inp.H)} m, në kulm ${f2(hr)} m.`]);
    desc.push(['Çatia', `Çati ${roofTxt}, pjerrësia ${fmt(inp.slopePct, 1)}% (${f1(deg())}°)` + (inp.nSpans > 1 ? `, ${inp.nSpans} hapësira me drita ${f2(r.B)} m dhe kolona të ndërmjetme.` : `, një hapësirë pa kolona të ndërmjetme (drita ${f2(r.B)} m).`)]);
    desc.push(['Struktura kryesore', `${r.nFrames} portale çeliku me interaks ${f2(r.bay)} m` + (sp ? `: kolona ${fr.col.name}, trarë çatie ${fr.raf.name}` : ' me profile të petëzuara IPE/HEA') + (inp.haunch ? ', me përforcim (haunch) në nyjet e strehës' : '') + `. Çeliku ${inp.grade}, bazamenti ${inp.base === 'fixed' ? 'i ngurtë' : 'me nyje'}.`]);
    desc.push(['Riglat', sp ? `Rigla çatie ${r.purlin.sec.name} çdo ${f2(r.purlin.sp)} m; rigla fasade ${r.rail.sec.name} çdo ${f2(r.rail.sp)} m` + (r.post ? `; kolona të fasadës ballore ${r.post.sec.name}.` : '.') : 'Rigla çatie dhe fasade nga tuba çeliku sipas llogaritjes.']);
    desc.push(['Kontraventimet', `Lidhje kryq në çati dhe në muret anësore në ${r.brace.nbb} interakse` + (sp ? ` (shufra ${r.brace.roofRod.name} / ${r.brace.wallRod.name}), shufra strehe ${r.brace.strut.sec.name}.` : '.')]);
    desc.push(['Mbulesa e çatisë', inp.roofType === 'panel' ? `Panel sandwich ${inp.roofT} mm me bërthamë ${inp.roofCore === 'MW' ? 'lesh guri' : 'poliuretani (PIR/PU)'}` + (inp.skyPct ? `, me shirita drite polikarbonat ${fmt(inp.skyPct, 0)}% e sipërfaqes` : '') + '.' : 'Llamarinë grekë e parangjyrosur.' + (inp.skyPct ? ` Shirita drite polikarbonat ${fmt(inp.skyPct, 0)}%.` : '')]);
    desc.push(['Fasadat', (inp.wallType === 'panel' ? `Panel sandwich ${inp.wallT} mm me bërthamë ${inp.wallCore === 'MW' ? 'lesh guri' : 'PIR/PU'}` : 'Llamarinë grekë e parangjyrosur') + (inp.sockel > 0 ? ` mbi mur betoni ${f2(inp.sockel)} m (muri nuk përfshihet).` : '.')]);
    if (r.mezz) { const m = r.mezz; desc.push(['Mezanina', `${f2(m.L)} × ${f2(m.W)} m (${fmt(m.area, 0)} m²) në kuotën +${f2(m.Hm)} m; përdorimi: ${m.use.name}, ${fmt(m.Q, 1)} kN/m². Soleta: ${m.deck.name.toLowerCase()}` + (sp ? `; trarë ${m.sec1.sec.name} / ${m.sec2.sec.name}, kolona ${m.col.sec.name}` : '') + '; kontraventime kryq' + (q.len.mezzRail ? ', parmak në buzët e lira.' : '.')]); }
    if (r.stairs) { const s = r.stairs; desc.push(['Shkallët', `${s.count > 1 ? s.count + ' shkallë' : 'Shkallë'} ${s.ext ? 'e jashtme e zinkuar' : 'e brendshme'} ${s.shape === 'U' ? 'me sheshpushim' : 'e drejtë'}, gjerësia ${f2(s.w)} m, ${s.n} ngritje × ${fmt(s.riser * 100, 1)} cm, shkelëse ${inp.stairTread === 'grile' ? 'grilë' : 'llamarinë me lot'}, me parmak.`]); }
    const op = [];
    if (inp.doorN) op.push(`${inp.doorN} ${inp.doorN > 1 ? 'dyer industriale' : 'derë industriale'} ${inp.doorType === 'seks' ? 'seksionale' : 'rrotulluese'} ${f1(inp.doorW)} × ${f1(inp.doorH)} m${inp.doorMotor ? ' me motor' : ''}`);
    if (inp.pDoorN) op.push(`${inp.pDoorN} ${inp.pDoorN > 1 ? 'dyer këmbësore' : 'derë këmbësore'}`);
    if (inp.winA) op.push(`dritare ${fmt(inp.winA, 0)} m²`);
    if (inp.partA) op.push(`mure ndarëse me panel ${fmt(inp.partA, 0)} m²`);
    if (op.length) desc.push(['Dyer dhe hapje', op.join('; ') + '.']);
    desc.push(['Ulluqe dhe llamarina', `Ulluqe ${fmt(q.len.gutter, 0)} m, ${q.count.down} gypa shkarkimi, llamarina mbuluese në kulm, qoshe dhe buzë.`]);
    desc.push(['Mbrojtja', inp.coat === 'zink' ? 'Zinkim në të nxehtë i strukturës metalike.' : 'Pastrim mekanik, shtresë antikorrozive dhe bojë përfundimtare.']);
    desc.push(['Ngarkesat', `Bora sk = ${f2(inp.sk)} kN/m², era vb = ${fmt(inp.vb, 1)} m/s (terreni ${inp.terrain}), sizmika ag = ${f2(inp.ag)} g` + (inp.pv ? ', panele fotovoltaike në çati' : '') + (r.mezz ? `, mezanina ${fmt(r.mezz.Q, 1)} kN/m²` : '') + '. Sipas EN 1990, EN 1991, EN 1993 dhe EN 1998.']);
    const order = ['Struktura metalike', 'Mbulesa e çatisë', 'Fasadat', 'Ulluqe dhe llamarina', 'Dyer dhe dritare', 'Ndarjet e brendshme', 'Mezanina', 'Shkallët', 'Transporti', 'Projektimi'];
    const groups = Object.keys(c.groups).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const mm = v => cur() === 'ALL' ? fmt(v * settings.prices.eurAll, 0) : fmt(v, 0);
    const priceRows = groups.map(g => [g === 'Transporti' ? 'Transporti dhe pajisjet ngritëse' : g === 'Projektimi' ? 'Projekti i zbatimit dhe vizatimet' : g, mm(c.groups[g])]);
    const vat = settings.prices.vat || 20;
    const totals = inp.showVat ? [['Totali pa TVSH', mm(c.price), false], ['TVSH ' + fmt(vat, 0) + '%', mm(c.price * vat / 100), false], ['Totali me TVSH', mm(c.price * (1 + vat / 100)), true]] : [['Totali (pa TVSH)', mm(c.price), true]];
    const curLabel = cur() === 'ALL' ? 'Lekë' : '€';
    const figs = [['Sipërfaqja', fmt(q.area.ground, 0) + (q.area.mezz ? ' + ' + fmt(q.area.mezz, 0) : '') + ' m²'], ['Lartësia', f1(inp.H) + ' / ' + f1(hr) + ' m'], ['Çmimi për m²', money(c.perM2, cur() === 'EUR' ? 1 : 0)], ['Çmimi pa TVSH', money(c.price)]];
    const incl = [];
    incl.push('projekti i zbatimit dhe vizatimet e punëtorisë');
    incl.push('prodhimi, ' + (inp.coat === 'zink' ? 'zinkimi' : 'lyerja') + ', transporti dhe montimi i strukturës metalike');
    incl.push('furnizimi dhe montimi i mbulesës, fasadës, ulluqeve dhe llamarinave');
    if (inp.doorN || inp.pDoorN || inp.winA) incl.push('dyert dhe dritaret e përshkruara');
    if (r.mezz) incl.push('mezanina me soletën' + (inp.mDeck === 'komp' ? ' (përfshirë betonin)' : ''));
    if (r.stairs) incl.push('shkallët me parmak');
    incl.push('bulonat e ankorimit me dado dhe pllakat e bazës');
    const excl = (inp.excl != null ? inp.excl : settings.offer.excl || '').split('\n').map(s => s.trim()).filter(Boolean);
    return {
      company: settings.company, projectName: inp.name, title, subtitle, desc, priceRows, totals, figs, curLabel,
      offer: { no: inp.offerNo || '—', dateStr: dstr(d0), validStr: dstr(dv), validDays: vd, client: inp.client, site: inp.site, lead: inp.leadTime || autoLead(), pay: inp.pay != null ? inp.pay : settings.offer.pay, incl: (s0 => s0.charAt(0).toUpperCase() + s0.slice(1))(incl.join('; ')) + '.', excl: excl.join('; ') + (excl.length ? '.' : '') },
      kgLine: inp.showKg ? 'Pesha e përafërt e strukturës metalike: ' + fmt(q.steelTotal / 1000, 1) + ' ton.' : '',
      note: 'Dimensionimi i strukturës është paraprak, sipas Eurokodeve dhe ngarkesave të mësipërme. Profilet përfundimtare konfirmohen në projektin e zbatimit pas nënshkrimit të kontratës. Reaksionet në bazë për projektin e themeleve jepen me kërkesë.'
    };
  }
  function ensure3D() { if (dirty.m3d && res && View3D.ready) { View3D.build(res, engIn); dirty.m3d = false; } }
  let lastShot = null;
  function renderOffer() {
    ensure3D();
    const o = offerData();
    if (View3D.ready) { try { lastShot = View3D.snapshot(1280, 720, true); } catch (e) { lastShot = null; } }
    const pal = PRINT_PAL, m = meta();
    let h = `<article class="sheet"><div class="sh-band"><div><b>${esc(o.company.name || 'Oni-El')}</b><small>${esc([o.company.addr, o.company.phone, o.company.email].filter(Boolean).join(' · '))}</small></div><div class="r"><b>OFERTË</b><br>Nr. ${esc(o.offer.no)} · ${o.offer.dateStr}<br>E vlefshme deri më ${o.offer.validStr}</div></div><div class="sh-body">`;
    h += `<div class="who"><div><div class="l">Për</div><b>${esc(o.offer.client || '—')}</b>${o.offer.site ? 'Vendndodhja: ' + esc(o.offer.site) : ''}</div><div><div class="l">Objekti</div><b>${esc(o.title)}</b>${esc(o.subtitle)}</div></div>`;
    if (lastShot) h += `<img class="shot" alt="Modeli 3D i kapanonit" src="${lastShot}">`;
    h += `<div class="figs">${o.figs.map(f => `<div><div class="l">${f[0]}</div><div class="v">${esc(f[1])}</div></div>`).join('')}</div>`;
    h += `<div><h4>Përshkrimi teknik</h4><table>${o.desc.map(d => `<tr><td>${d[0]}</td><td>${esc(d[1])}</td></tr>`).join('')}</table></div>`;
    h += `<div><h4>Vizatime paraprake</h4><div class="drs">${Draw.section(res, engIn, pal, m)}${Draw.plan(res, engIn, pal, m)}</div></div>`;
    h += `<div><h4>Oferta ekonomike</h4><table class="pr">${o.priceRows.map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]} ${o.curLabel}</td></tr>`).join('')}${o.totals.map(t => `<tr class="${t[2] ? 'tfin' : 'tsub'}"><td>${t[0]}</td><td>${t[1]} ${o.curLabel}</td></tr>`).join('')}</table>${o.kgLine ? `<p class="note">${esc(o.kgLine)}</p>` : ''}</div>`;
    h += `<div><h4>Kushtet</h4><table><tr><td>Afati</td><td>${esc(o.offer.lead)}</td></tr><tr><td>Pagesa</td><td>${esc(o.offer.pay)}</td></tr><tr><td>Përfshihen</td><td>${esc(o.offer.incl)}</td></tr><tr><td>Nuk përfshihen</td><td>${esc(o.offer.excl)}</td></tr></table></div><p class="note">${esc(o.note)}</p>`;
    h += `</div></article>`;
    $('#offerPrev').innerHTML = h;
    const c = cost, q = res.qty;
    $('#offerCheck').innerHTML = `<dt>Kosto totale</dt><dd>${fmt(c.cost, 0)} €</dd><dt>Fitimi</dt><dd>${fmt(c.profit, 0)} € (${fmt(c.profit / c.price * 100, 1)}%)</dd><dt>Çeliku</dt><dd>${fmt(q.steelTotal, 0)} kg</dd><dt>Çmim efektiv / kg</dt><dd>${fmt(c.effKg, 2)} €</dd><dt>Kamionë</dt><dd>${c.trucks}</dd>`;
  }
  function waText() {
    const o = offerData(), r = res, fr = r.frame;
    const L = [];
    L.push(`*${o.title}* · ${o.company.name || 'Oni-El'}`);
    if (o.offer.client) L.push('Për: ' + o.offer.client);
    L.push(o.subtitle);
    L.push(`Çatia ${inp.roof === 'duo' ? 'me dy ujëra' : 'me një ujë'} ${fmt(inp.slopePct, 0)}% · kulmi ${f2(r.cl.hr)} m`);
    if (inp.showProfiles) L.push(`Struktura: ${r.nFrames} portale, kolona ${fr.col.name}, trarë ${fr.raf.name}, çelik ${inp.grade}`);
    L.push(`Mbulesa: ${inp.roofType === 'panel' ? 'panel sandwich ' + inp.roofT + ' mm' : 'llamarinë grekë'} (çati) · ${inp.wallType === 'panel' ? 'panel ' + inp.wallT + ' mm' : 'llamarinë'} (fasadë)`);
    if (r.mezz) L.push(`Mezaninë ${fmt(r.mezz.area, 0)} m² në +${f2(r.mezz.Hm)} m`);
    L.push(`*Çmimi: ${money(cost.price)} pa TVSH* (${money(cost.perM2, cur() === 'EUR' ? 1 : 0)}/m²)`);
    L.push(`Afati: ${o.offer.lead} · Oferta e vlefshme deri më ${o.offer.validStr}`);
    L.push('Themelet dhe punimet civile nuk përfshihen.');
    return L.join('\n');
  }
  async function saveFile(name, blob) {
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename: name, data: blob }); toast('U ruajt: ' + name); }
      catch (e) { const c = e && e.code; toast(c === 'declined' ? 'Ruajtja u anulua.' : c === 'rate_limited' ? 'Prit pak dhe provo përsëri.' : 'Skedari nuk u ruajt (' + (c || 'gabim') + ').'); }
      return;
    }
    if (window.claude) { toast('Shkarkimi nuk është i disponueshëm në këtë pamje.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  const safeName = s => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
  async function makePDF() {
    if (!res) return;
    if (!window.jspdf) { toast('Biblioteka PDF nuk u ngarkua. Rifresko faqen.'); return; }
    const btn = $('#bPdf'); btn.disabled = true; btn.textContent = 'Duke përgatitur PDF…';
    try {
      const o = offerData();
      ensure3D();
      const img = View3D.ready ? View3D.snapshot(1600, 900, true) : null;
      const m = meta();
      const svgs = [Draw.section(res, engIn, PRINT_PAL, m), Draw.plan(res, engIn, PRINT_PAL, m), Draw.side(res, engIn, PRINT_PAL, m)];
      const draws = await Promise.all(svgs.map(s => Draw.toPNG(s, 2)));
      const buf = OfferPDF.build(Object.assign(o, { img3d: img, img3dRatio: 16 / 9, draws }));
      await saveFile('Oferta ' + safeName(inp.offerNo || '') + ' - ' + safeName(inp.client || inp.name) + '.pdf', new Blob([buf], { type: 'application/pdf' }));
    } catch (e) { console.error(e); toast('PDF-ja nuk u krijua: ' + (e.message || e)); }
    btn.disabled = false; btn.textContent = 'Shkarko ofertën (PDF)';
  }
  async function makePNG() {
    if (!View3D.ready) { toast('Modeli 3D nuk është gati.'); return; }
    ensure3D();
    const url = View3D.snapshot(1920, 1080, true);
    const b = await (await fetch(url)).blob();
    await saveFile('Kapanon ' + safeName(inp.name) + '.jpg', b);
  }
  async function copyWA() {
    const t = waText();
    try { await navigator.clipboard.writeText(t); toast('Përmbledhja u kopjua. Ngjite në WhatsApp.'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Përmbledhja u kopjua.'); } catch (e2) { toast('Kopjimi nuk u lejua. Zgjidhe tekstin me dorë.'); }
      ta.remove();
    }
  }

  /* ---------------- çmimet ---------------- */
  const PSPEC = [
    ['Çeliku', '€/kg', [['stMat', 'Materiali'], ['stFab', 'Prodhimi (punë + konsumabile)'], ['stPaint', 'Lyerja'], ['stZink', 'Zinkimi në të nxehtë'], ['stMont', 'Montimi'], ['stairExtra', 'Shtesë për shkallët']]],
    ['Panel sandwich çatie', '€/m²', [30, 40, 50, 60, 80, 100, 120, 150].map(t => ['roofPanel.' + t, t + ' mm'])],
    ['Panel sandwich fasade', '€/m²', [40, 50, 60, 80, 100, 120, 150].map(t => ['wallPanel.' + t, t + ' mm'])],
    ['Mbulesa të tjera', '', [['mwFactor', 'Koeficienti për lesh guri (×)'], ['sheetRoof', 'Llamarinë grekë çatie €/m²'], ['sheetWall', 'Llamarinë grekë fasade €/m²'], ['roofMont', 'Montimi i çatisë €/m²'], ['wallMont', 'Montimi i fasadës €/m²'], ['waste', 'Humbje panelesh %'], ['sky', 'Polikarbonat, diferenca €/m²']]],
    ['Llamarina', '€/m', [['gutter', 'Ulluqe'], ['down', 'Gypa shkarkimi'], ['flash', 'Llamarina mbuluese']]],
    ['Dyer dhe dritare', '', [['doorSek', 'Derë seksionale €/m²'], ['doorRoll', 'Derë rrotulluese €/m²'], ['motor', 'Motor €/copë'], ['pDoor', 'Derë këmbësore €/copë'], ['win', 'Dritare €/m²']]],
    ['Mezanina dhe shkallët', '', [['deck', 'Llamarinë kolaborante €/m²'], ['concrete', 'Beton C25/30 €/m³'], ['mesh', 'Armaturë €/kg'], ['slabWork', 'Hedhja e betonit €/m²'], ['grating', 'Grilë €/m²'], ['rail', 'Parmak €/m']]],
    ['Transporti dhe montimi', '', [['truck', 'Kamion €/udhëtim'], ['truckKg', 'Ngarkesa kg/kamion'], ['crane', 'Gru / platformë €/ditë (0 = në montim)'], ['tPerDay', 'Montim ton/ditë']]],
    ['Marzhet', '', [['designPct', 'Projektimi %'], ['designMin', 'Projektimi minimum €'], ['contPct', 'Rezerva %'], ['margin', 'Fitimi standard %'], ['round', 'Rrumbullakimi €'], ['vat', 'TVSH %'], ['eurAll', 'Kursi 1 € = Lekë']]]
  ];
  const getP = (P, k) => k.includes('.') ? P[k.split('.')[0]][k.split('.')[1]] : P[k];
  const setP = (P, k, v) => { if (k.includes('.')) P[k.split('.')[0]][k.split('.')[1]] = v; else P[k] = v; };
  function openPrices() {
    const P = settings.prices, C = settings.company, O = settings.offer;
    let h = `<div class="pgroup"><h4>Kompania (del në ofertë)</h4><div class="pgrid">${[['name', 'Emri'], ['nipt', 'NIPT'], ['addr', 'Adresa'], ['phone', 'Telefoni'], ['email', 'Email'], ['signer', 'Nënshkruesi']].map(([k, l]) => `<div class="f"><label for="pc-${k}">${l}</label><div class="inp"><input id="pc-${k}" data-c="${k}" value="${esc(C[k] || '')}"></div></div>`).join('')}</div></div>`;
    PSPEC.forEach(([t, u, items]) => {
      h += `<div class="pgroup"><h4>${t}${u ? ' · ' + u : ''}</h4><div class="pgrid">${items.map(([k, l]) => `<div class="f"><label for="pp-${k.replace('.', '-')}">${l}</label><div class="inp"><input type="number" step="any" id="pp-${k.replace('.', '-')}" data-p="${k}" value="${getP(P, k)}"></div></div>`).join('')}</div></div>`;
    });
    h += `<div class="pgroup"><h4>Tekstet standarde të ofertës</h4><div class="pgrid" style="grid-template-columns:1fr"><div class="f"><label for="po-validDays">Vlefshmëria (ditë)</label><div class="inp" style="max-width:160px"><input type="number" id="po-validDays" data-o="validDays" value="${O.validDays}"></div></div><div class="f"><label for="po-pay">Kushtet e pagesës</label><textarea class="ta" id="po-pay" data-o="pay">${esc(O.pay)}</textarea></div><div class="f"><label for="po-excl">Nuk përfshihen (një rresht për pikë)</label><textarea class="ta" id="po-excl" data-o="excl" rows="4">${esc(O.excl)}</textarea></div></div></div>`;
    h += `<div class="row"><button class="btn sm" id="bPricesDef" type="button">Rikthe vlerat fillestare të çmimeve</button></div>`;
    $('#pricesForm').innerHTML = h;
    $('#storeNote').textContent = Store.mode === 'supabase' ? 'Çmimet ruhen në databazën tënde (Supabase), të mbrojtura me hyrje. Klientët nuk i shohin dhe nuk dalin kurrë në ofertë.' : Store.mode === 'db' ? 'Çmimet ruhen në llogarinë tënde, private. Askush tjetër që hap këtë faqe nuk i sheh, dhe nuk dalin kurrë në ofertë.' : 'Çmimet ruhen vetëm në këtë shfletues. Nuk dalin kurrë në ofertë.';
    $('#bPricesDef').addEventListener('click', () => { $$('#pricesForm [data-p]').forEach(i => { i.value = getP(E.DEFAULT_PRICES, i.dataset.p); }); });
    $('#dlgPrices').showModal();
  }
  async function savePrices() {
    const P = clone(settings.prices);
    $$('#pricesForm [data-p]').forEach(i => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) setP(P, i.dataset.p, v); });
    const C = {}; $$('#pricesForm [data-c]').forEach(i => { C[i.dataset.c] = i.value.trim(); });
    const O = {}; $$('#pricesForm [data-o]').forEach(i => { O[i.dataset.o] = i.dataset.o === 'validDays' ? (parseInt(i.value, 10) || 30) : i.value; });
    settings = { prices: P, company: C, offer: O };
    $('#brandMark').textContent = (C.name || 'Oni-El').toUpperCase();
    try { await Store.setSettings(settings); toast('Çmimet u ruajtën.'); } catch (e) { toast('Çmimet nuk u ruajtën: ' + (e.code || e.message || 'gabim')); }
    $('#dlgPrices').close();
    schedule(10);
  }

  /* ---------------- projektet ---------------- */
  async function openProjects() {
    $('#projList').innerHTML = '<div class="empty">Duke ngarkuar…</div>';
    $('#dlgProjects').showModal();
    let list = [];
    try { list = await Store.list(); } catch (e) { $('#projList').innerHTML = '<div class="empty">Projektet nuk u ngarkuan. Provo përsëri.</div>'; return; }
    if (!list.length) { $('#projList').innerHTML = '<div class="empty">Nuk ka ende projekte të ruajtura. Shtyp "Ruaj" në krye për të ruajtur këtë projekt.</div>'; return; }
    $('#projList').innerHTML = list.map(p => `<div class="prow" data-id="${esc(p.id)}"><div><b>${esc(p.name || 'Pa emër')}</b><small>${esc(p.client || '—')} · ${p.updated ? dstr(new Date(p.updated)) : ''} · ${fmt(p.area || 0, 0)} m²</small></div><div class="pv">${fmt(p.price || 0, 0)} €</div><div class="row"><button class="btn sm" data-a="open" type="button">Hap</button><button class="btn sm danger" data-a="del" type="button">Fshi</button></div></div>`).join('');
    $$('#projList .prow').forEach(row => {
      const id = row.dataset.id, p = list.find(x => x.id === id);
      row.querySelector('[data-a=open]').addEventListener('click', () => { loadProject(p); $('#dlgProjects').close(); });
      const del = row.querySelector('[data-a=del]');
      del.addEventListener('click', async () => {
        if (del.dataset.confirm !== '1') { del.dataset.confirm = '1'; del.textContent = 'Konfirmo fshirjen'; return; }
        try { await Store.del(id); row.remove(); if (projId === id) projId = null; toast('Projekti u fshi.'); } catch (e) { toast('Nuk u fshi: ' + (e.code || 'gabim')); }
      });
    });
  }
  function loadProject(p) {
    inp = Object.assign(clone(DEF), p.inp || {});
    projId = p.id;
    $('#projName').value = inp.name;
    build3dReset();
    refreshForm(); saveDraft(); schedule(10);
    toast('U hap: ' + inp.name);
  }
  async function saveProject() {
    if (!res) return;
    if (!projId) projId = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const data = { name: inp.name, client: inp.client, updated: new Date().toISOString(), inp: clone(inp), price: Math.round(cost.price), area: Math.round(res.qty.area.ground) };
    try { await Store.save(projId, data); saveDraft(); toast('Projekti u ruajt' + (Store.mode === 'db' ? ' në llogarinë tënde.' : ' në këtë shfletues.')); }
    catch (e) { toast('Nuk u ruajt: ' + (e.code === 'quota_exceeded' ? 'hapësira e ruajtjes është plot' : (e.code || e.message || 'gabim'))); }
  }
  function newProject() {
    inp = clone(DEF); inp.offerNo = newOfferNo(); inp.offerDate = today(); projId = null;
    $('#projName').value = inp.name; build3dReset(); refreshForm(); saveDraft(); schedule(10);
  }
  function build3dReset() { if (View3D.ready) { View3D.build.done = false; } }

  /* ---------------- ndihmëse UI ---------------- */
  let toastT = 0;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
  function showTab(t) {
    curTab = t;
    $$('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    $$('.tab').forEach(s => s.classList.toggle('on', s.id === 't-' + t));
    if (t === 'm3d') { View3D.resize(); }
    renderVisible();
  }
  function setClientMode(on) {
    clientMode = on; document.body.classList.toggle('client-mode', on);
    $('#clientMode').checked = on;
    if (on && (curTab === 'cost')) showTab('offer');
    LS.set('kap.client', on);
  }
  function watchTheme() {
    const re = () => { View3D.applyTheme(); markDirty(['draw']); renderVisible(); };
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', re); } catch (e) { }
    new MutationObserver(re).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }

  /* ---------------- nisja ---------------- */
  function trackHeader() {
    const top = $('#top');
    const upd = () => document.documentElement.style.setProperty('--head-h', top.offsetHeight + 'px');
    try { new ResizeObserver(upd).observe(top); } catch (e) { }
    upd();
  }
  async function init() {
    trackHeader();
    const draft = LS.get('kap.draft');
    if (draft && draft.inp) { inp = Object.assign(clone(DEF), draft.inp); projId = draft.projId || null; }
    if (!inp.offerNo) inp.offerNo = newOfferNo();
    if (!inp.offerDate) inp.offerDate = today();
    $('#projName').value = inp.name;
    $('#projName').addEventListener('input', e => { inp.name = e.target.value; saveDraft(); markDirty(['offer']); });
    renderForm();
    View3D.init($('#viewer'));
    $$('.tabs [role=tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $$('#vgView button').forEach(b => b.addEventListener('click', () => { $$('#vgView button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); View3D.setView(b.dataset.v); }));
    $$('#vgClad button').forEach(b => b.addEventListener('click', () => { $$('#vgClad button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); View3D.setClad(+b.dataset.c); markDirty(['offer']); }));
    $$('#vgVis button').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); View3D.toggle(b.dataset.t, on); }));
    $('#bPdf').addEventListener('click', makePDF);
    $('#bWa').addEventListener('click', copyWA);
    $('#bPng').addEventListener('click', makePNG);
    $('#bPrices').addEventListener('click', openPrices);
    $('#bPricesSave').addEventListener('click', savePrices);
    $('#bProjects').addEventListener('click', openProjects);
    $('#bSave').addEventListener('click', saveProject);
    $('#bNew').addEventListener('click', newProject);
    $('#clientMode').addEventListener('change', e => setClientMode(e.target.checked));
    $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    if (LS.get('kap.client')) setClientMode(true);
    watchTheme();
    compute();
    if (window.KapAdmin && KapAdmin.beforeStore) await KapAdmin.beforeStore();
    // kapacitetet e platformës vijnë më vonë
    await Store.init();
    if (restricted) { document.body.classList.add('restricted'); setClientMode(true); $('#cmWrap').hidden = true; if (curTab === 'offer' || curTab === 'cost') showTab('m3d'); }
    const s = await Store.getSettings();
    if (s && s.prices) {
      settings = { prices: Object.assign(clone(E.DEFAULT_PRICES), s.prices), company: Object.assign(clone(DEF_COMPANY), s.company || {}), offer: Object.assign(clone(DEF_OFFER), s.offer || {}) };
      settings.prices.roofPanel = Object.assign(clone(E.DEFAULT_PRICES.roofPanel), (s.prices || {}).roofPanel || {});
      settings.prices.wallPanel = Object.assign(clone(E.DEFAULT_PRICES.wallPanel), (s.prices || {}).wallPanel || {});
      $('#brandMark').textContent = (settings.company.name || 'Oni-El').toUpperCase();
      compute();
    }
    if (window.KapAdmin && KapAdmin.onReady) KapAdmin.onReady(window.KapApp);
  }
  function loadInputs(o) {
    inp = Object.assign(clone(DEF), o || {});
    projId = null;
    $('#projName').value = inp.name;
    build3dReset(); refreshForm(); saveDraft(); compute();
  }
  window.KapApp = {
    get res() { return res; }, get cost() { return cost; }, get inp() { return inp; }, get settings() { return settings; },
    setVal, showTab, compute, offerData, makePDF, money, toast, loadInputs, fmt, cur
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
