/* Oni-El · Parkingje me strehë (me ose pa panele diellore)
   Gjeometria, paradimensionimi i thjeshtuar (EN 1990 / EN 1991-1-3, -1-4 / EN 1993-1-1) dhe sasitë.
   Pa çmime: kostot llogariten vetëm në panelin e stafit.
   Njësitë: m, kN, kNm. Përdor profilet dhe kontrollet e KapEngine. */
(function (root) {
  'use strict';
  const K = root.KapEngine;
  const EK = 2.1e8;           // kN/m²
  const KG = 9.81e-3;         // kg/m → kN/m
  const r2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rad = d => d * Math.PI / 180;

  const MODELS = {
    konsol: { name: 'Konsol me një kolonë', short: 'Konsol', rows: 'Një rresht makinash, kolonat vetëm nga pas.' },
    portal: { name: 'Portal me dy kolona', short: 'Portal', rows: 'Një rresht makinash, kolona para dhe pas.' },
    ty: { name: 'Formë T/Y me kolonë në mes', short: 'T/Y', rows: 'Dy rreshta makinash nga të dy anët e kolonës.' },
    rrjet: { name: 'Rrjet me shumë rreshta', short: 'Rrjet', rows: 'Strehë e vazhduar mbi disa rreshta dhe korsitë mes tyre.' }
  };
  // g: pesha e mbulesës me fiksimet (kN/m²); sp: hapi maksimal i trarëve të çatisë (m)
  const COVERS = {
    pv: { name: 'Panele diellore', g: 0.16, sp: 1.25 },
    sheet: { name: 'Llamarinë trapezoidale', g: 0.07, sp: 1.6 },
    sandwich: { name: 'Panel sanduiç 40 mm', g: 0.12, sp: 2.0 },
    poly: { name: 'Polikarbonat 16 mm', g: 0.05, sp: 1.0 }
  };
  // emri, ngarkesa e borës sk (kN/m²), vb (m/s), kategoria e terrenit, prodhimi PV në horizontale (kWh/kWp/vit, vlerësim)
  const CITIES = [['Elbasan', 0.8, 24, 'III', 1330], ['Tiranë', 0.8, 25, 'III', 1320], ['Durrës', 0.6, 27, 'II', 1340], ['Shkodër', 1.0, 26, 'III', 1270],
    ['Vlorë', 0.6, 28, 'II', 1400], ['Fier', 0.6, 26, 'II', 1370], ['Lushnjë', 0.6, 25, 'II', 1360], ['Kavajë', 0.6, 26, 'II', 1340], ['Lezhë', 0.8, 26, 'III', 1290],
    ['Krujë / Fushë-Krujë', 0.8, 25, 'III', 1310], ['Berat', 0.8, 24, 'III', 1360], ['Korçë', 2.0, 25, 'III', 1340], ['Pogradec', 1.8, 25, 'III', 1330],
    ['Gjirokastër', 1.2, 25, 'III', 1360], ['Sarandë', 0.6, 27, 'II', 1420], ['Përmet', 1.2, 24, 'III', 1350], ['Kukës', 2.0, 24, 'III', 1270],
    ['Peshkopi', 2.0, 24, 'III', 1280], ['Kosovë / tjetër', 1.2, 25, 'III', 1250]];
  // ndryshimi i prodhimit për çdo gradë pjerrësie, sipas drejtimit nga kthehet paneli (deri në ~15°)
  const FACE_K = { S: 0.0075, SE: 0.005, SW: 0.005, E: -0.001, W: -0.001, NE: -0.0055, NW: -0.0055, N: -0.0085, X: -0.001 };
  const FACE_NAME = { S: 'jugu', SE: 'juglindja', SW: 'jugperëndimi', E: 'lindja', W: 'perëndimi', NE: 'verilindja', NW: 'veriperëndimi', N: 'veriu', X: 'e panjohur' };
  const OPP = { S: 'N', N: 'S', E: 'W', W: 'E', SE: 'NW', NW: 'SE', SW: 'NE', NE: 'SW' };
  // orientimi i boshtit të gjatë për modelet me dy faqe (T/Y, rrjet): nga kthehen gjysmat
  const AXIS = { EW: ['S', 'N'], NS: ['E', 'W'], D1: ['SE', 'NW'], D2: ['SW', 'NE'], X: ['E', 'W'] };

  const PV = { Wp: 610, L: 2.382, W: 1.134, gap: 0.02 };
  const DEF = {
    kind: 'parking', model: 'konsol', nSpaces: 6, nRows: 4, spaceW: 2.5, spaceL: 5.0, perBay: 3, aisle: 6.0,
    H: 2.5, tilt: 7, lowSide: 'back', vshape: 'V', face: 'S', axis: 'EW',
    cover: 'pv', ev: 0, evKw: 11, inverter: true, battery: 0, led: true, gutter: true, closure: 'none', city: 'Elbasan'
  };
  const CLIENT_KEYS = Object.keys(DEF);
  // parametrat e inxhinierit (vetëm në panel)
  const ENG = { grade: 'S275', beamFam: 'IPE', colFam: 'auto', purlinFam: 'RHS', coat: 'zink', soil: 150, conn: 12, beamSec: '', colSec: '', purlinSec: '', pvWp: PV.Wp, endOver: 0.15 };

  function cityOf(n) { return CITIES.find(c => c[0] === n) || CITIES[0]; }
  function rowsOf(i) { return i.model === 'ty' ? 2 : i.model === 'rrjet' ? i.nRows : 1; }
  function normalize(src) {
    const i = Object.assign({}, DEF, src || {});
    if (!MODELS[i.model]) i.model = 'konsol';
    if (!COVERS[i.cover]) i.cover = 'pv';
    i.nSpaces = clamp(Math.round(+i.nSpaces || 1), 1, 80);
    i.nRows = clamp(2 * Math.round((+i.nRows || 4) / 2), 4, 12);
    i.spaceW = clamp(+i.spaceW || 2.5, 2.3, 3.5);
    i.spaceL = clamp(+i.spaceL || 5, 4.5, 6.5);
    i.perBay = [2, 3].includes(+i.perBay) ? +i.perBay : 3;
    i.aisle = clamp(+i.aisle || 6, 5, 8);
    i.H = clamp(+i.H || 2.5, 2.2, 4.5);
    i.tilt = clamp(+i.tilt, 0, 15);
    i.ev = clamp(Math.round(+i.ev || 0), 0, i.nSpaces * rowsOf(i));
    i.evKw = [7.4, 11, 22].includes(+i.evKw) ? +i.evKw : 11;
    i.battery = clamp(+i.battery || 0, 0, 200);
    if (i.cover !== 'pv') { i.inverter = false; i.battery = 0; }
    if (i.battery > 0) i.inverter = true;          // bateria kërkon inverter hibrid
    return i;
  }

  /* ---------- gjeometria ---------- */
  function geometry(i, e) {
    const t = Math.tan(rad(i.tilt));
    const rows = rowsOf(i);
    const L = i.nSpaces * i.spaceW + 2 * e.endOver;
    const nBays = Math.max(1, Math.ceil(i.nSpaces / i.perBay));
    const bay = i.nSpaces * i.spaceW / nBays;
    const ys = []; for (let j = 0; j <= nBays; j++) ys.push(e.endOver + j * bay);
    let D, cols, planes = [], carRows = [], aisles = [];
    const sl = i.spaceL;
    if (i.model === 'konsol' || i.model === 'portal') {
      D = sl;
      cols = i.model === 'konsol' ? [0.25] : [0.25, D - 0.25];
      const back = i.lowSide === 'back';
      planes.push({ x0: 0, x1: D, low: back ? 0 : D, face: i.face });
      carRows.push({ x0: 0, x1: D, dir: 1 });
    } else if (i.model === 'ty') {
      D = 2 * sl; cols = [sl];
      const [fa, fb] = AXIS[i.axis] || AXIS.EW;
      if (i.vshape === 'V') { planes.push({ x0: 0, x1: sl, low: sl, face: fb }, { x0: sl, x1: D, low: sl, face: fa }); }
      else { planes.push({ x0: 0, x1: sl, low: 0, face: fa }, { x0: sl, x1: D, low: D, face: fb }); }
      carRows.push({ x0: 0, x1: sl, dir: -1 }, { x0: sl, x1: D, dir: 1 });
    } else {
      const nP = rows / 2, S = 2 * sl + i.aisle;
      D = nP * 2 * sl + (nP - 1) * i.aisle;
      cols = []; for (let k = 0; k < nP; k++) cols.push(sl + k * S);
      const [fa, fb] = AXIS[i.axis] || AXIS.EW;
      cols.forEach((xc, k) => {
        const left = k === 0 ? 0 : xc - S / 2, right = k === nP - 1 ? D : xc + S / 2;
        planes.push({ x0: left, x1: xc, low: xc, face: fb }, { x0: xc, x1: right, low: xc, face: fa });
        carRows.push({ x0: xc - sl, x1: xc, dir: -1 }, { x0: xc, x1: xc + sl, dir: 1 });
        if (k < nP - 1) aisles.push({ x0: xc + sl, x1: xc + sl + i.aisle });
      });
    }
    planes.forEach(p => {
      const far = Math.abs((p.low === p.x0 ? p.x1 : p.x0) - p.low);
      p.ext = p.x1 - p.x0; p.rise = far * t; p.slope = p.ext / Math.cos(rad(i.tilt));
      p.zLow = i.H; p.zHigh = i.H + p.rise;
    });
    const zAt = x => { const p = planes.find(q => x >= q.x0 - 1e-6 && x <= q.x1 + 1e-6) || planes[0]; return i.H + Math.abs(x - p.low) * t; };
    const hmax = Math.max(...planes.map(p => p.zHigh));
    return { L, D, nBays, bay, ys, cols, planes, carRows, aisles, rows, t, zAt, hmin: i.H, hmax, spaces: i.nSpaces * rows, area: L * D };
  }

  /* ---------- ngarkesat ---------- */
  function cpNet(a) {
    // EN 1991-1-4 Tab. 7.6 (strehë me një pjerrësi, zona A, φ = 0), për rrjedhje të lirë
    const A = [0, 5, 10, 15], dn = [0.5, 0.8, 1.2, 1.4], up = [-0.6, -1.1, -1.5, -1.8];
    return { dn: K.interp(A, dn, a), up: K.interp(A, up, a) };
  }
  function loads(i, g0, geo) {
    const c = cityOf(i.city);
    const vshape = i.model === 'rrjet' || (i.model === 'ty' && i.vshape === 'V');
    const mu = vshape ? Math.min(1.6, 0.8 + 0.8 * i.tilt / 30) * 0.5 + 0.4 : 0.8;
    const s = mu * c[1];
    const qp = K.qpeak(c[2], c[3], Math.max(3, geo.hmax + 0.6));
    const cp = cpNet(i.tilt);
    const wdn = cp.dn * qp, wup = -cp.up * qp;
    const g = g0;
    const qdn = Math.max(1.35 * g + 1.5 * s + 0.9 * wdn, 1.35 * g + 1.5 * wdn + 0.75 * s);
    const qup = 1.5 * wup - 1.0 * g;               // > 0 do të thotë ngritje
    const qsls = g + Math.max(s, wdn);
    const qvar = Math.max(s, wdn);
    return { sk: c[1], vb: c[2], terrain: c[3], mu, s, qp, cpDn: cp.dn, cpUp: cp.up, wdn, wup, g, qdn, qup: Math.max(0, qup), qsls, qvar };
  }

  /* ---------- zgjedhja e profileve ---------- */
  function famList(f) { return f === 'auto' ? K.famList(['HEA', 'SHS']) : K.famList([f]); }
  function pick(list, forced, test) {
    if (forced && K.ALL[forced]) { const r = test(K.ALL[forced]); return Object.assign({ sec: K.ALL[forced], forced: true }, r); }
    let last = null;
    for (const s of list) { const r = test(s); last = Object.assign({ sec: s }, r); if (r.u <= 1 && r.d <= 1) return last; }
    return Object.assign(last || {}, { fail: true });
  }
  const chk = (s, grade, o) => s.type === 'I' ? K.checkI(s, grade, o) : K.checkRHS(s, grade, o);

  function design(src, engIn) {
    const i = normalize(src), e = Object.assign({}, ENG, engIn || {});
    const geo = geometry(i, e);
    const cov = COVERS[i.cover];
    const warn = [];
    let gStruct = 0.12, out = null;
    for (let it = 0; it < 3; it++) {
      out = solve(i, e, geo, cov, cov.g + gStruct, warn);
      const gNew = (out.kg.purlins + out.kg.beams) * KG / geo.area;
      if (Math.abs(gNew - gStruct) < 0.005) break;
      gStruct = gNew; warn.length = 0;
    }
    const res = Object.assign({ inp: i, eng: e, geo, cover: cov, model: MODELS[i.model], warn }, out);
    res.pv = pvLayout(i, e, geo);
    res.opts = options(i, res);
    res.qty = quantities(i, e, res);
    res.ok = res.purlin.u <= 1 && res.purlin.d <= 1 && res.beam.u <= 1 && res.beam.d <= 1 && res.col.u <= 1 && res.col.d <= 1;
    if (!res.ok) warn.push('Disa elemente nuk i kalojnë kontrollet me profilet e zgjedhura.');
    return res;
  }

  function solve(i, e, geo, cov, g, warn) {
    const ld = loads(i, g, geo);
    const grade = e.grade;
    const bay = geo.bay, multi = geo.nBays > 1;
    // trarët e çatisë (përgjatë parkingut), hapësira = hapi i kolonave
    const pvRails = i.cover === 'pv';
    const lines = geo.planes.map(p => {
      if (pvRails) { const n = Math.max(1, Math.floor((p.slope - 0.05) / (PV.L + PV.gap))); return { n: 2 * n + (p.slope - n * (PV.L + PV.gap) > 0.6 ? 1 : 0), sp: Math.min(PV.L / 2 + 0.1, p.slope / 2) }; }
      const n = Math.ceil(p.slope / cov.sp) + 1; return { n, sp: p.slope / (n - 1) };
    });
    const sp = Math.max(...lines.map(l => l.sp));
    const nPurl = lines.reduce((a, l) => a + l.n, 0);
    const kM = multi ? 10 : 8, kD = multi ? 0.55 : 1;
    const Mp = Math.max(ld.qdn, ld.qup) * sp * bay * bay / kM;
    const purlin = pick(K.famList([e.purlinFam]), e.purlinSec, s => {
      const r = chk(s, grade, { M: Mp, V: ld.qdn * sp * bay / 2, Llt: sp, Lcy: bay, Lcz: bay });
      const d = kD * 5 * ld.qsls * sp * Math.pow(bay, 4) / (384 * EK * s.Iy * 1e-8) / (bay / 200);
      return { u: r.u, d, gov: r.gov };
    });
    purlin.M = Mp; purlin.sp = sp; purlin.n = nPurl; purlin.span = bay;
    // trau kryesor në çdo rresht kolonash (tërthor), për portalin e brendshëm
    const w = ld.qdn * bay, wu = ld.qup * bay, ws = ld.qsls * bay;
    const sl = i.spaceL;
    let beamCase, colCase;
    if (i.model === 'konsol') {
      const c = geo.D - geo.cols[0];
      beamCase = { M: w * c * c / 2, Mu: wu * c * c / 2, V: w * c, Llt: c, C1: 1.0, dfn: I => ws * Math.pow(c, 4) / (8 * EK * I) / (c / 125), span: c };
      const N = w * geo.D, M = w * c * c / 2 - w * 0.25 * 0.25 / 2;
      colCase = { N, M, Mu: wu * c * c / 2, Nk: ws * geo.D, Mk: ws * c * c / 2, MkUp: Math.max(0, ld.wup - ld.g) * bay * c * c / 2, Ly: 2, Lz: 2, base: 'moment' };
    } else if (i.model === 'portal') {
      const S = geo.D - 0.5;
      beamCase = { M: w * S * S / 8, Mu: wu * S * S / 8, V: w * S / 2, Llt: sp, LltU: S, C1: 1.13, dfn: I => 5 * ws * Math.pow(S, 4) / (384 * EK * I) / (S / 200), span: S };
      const N = w * geo.D / 2, Hh = 0.1 * ld.qp * bay * geo.D + N * 2 / 200;
      colCase = { N, M: Hh * geo.hmax / 2, Mu: 0, Nk: ws * geo.D / 2, Mk: Hh * geo.hmax / 3, MkUp: 0, Ly: 2, Lz: 1, base: 'pin' };
    } else if (i.model === 'ty') {
      const c = sl;
      beamCase = { M: w * c * c / 2, Mu: wu * c * c / 2, V: w * c, Llt: c, C1: 1.0, dfn: I => ws * Math.pow(c, 4) / (8 * EK * I) / (c / 125), span: c };
      const qa = Math.max(ld.qvar, 0.5 * (ld.wdn + ld.wup));
      colCase = { N: w * geo.D, M: 1.5 * qa * bay * c * c / 2, Mu: 0, Nk: ws * geo.D, Mk: qa * bay * c * c / 2, MkUp: Math.max(0, ld.wup - ld.g) * bay * c * c / 2, Ly: 2, Lz: 1, base: 'moment' };
    } else {
      const nP = geo.cols.length, S = 2 * sl + i.aisle, c = sl;
      const cb = contBeam(nP, S, c);
      const Ms = Math.max(...cb.sup) , Mm = Math.max(...cb.mid, 0);
      beamCase = { M: w * Math.max(Ms, Mm), Mu: wu * Math.max(Ms, Mm), V: w * cb.V, Llt: Math.max(c, 0.25 * S), LltU: 0.4 * S, C1: 1.3,
        dfn: I => Math.max(ws * Math.pow(c, 4) / (8 * EK * I) / (c / 125), (5 * ws * Math.pow(S, 4) / (384 * EK * I) - ws * cb.supMin * S * S / (8 * EK * I)) / (S / 200)), span: S };
      const qa = Math.max(ld.qvar, 0.5 * (ld.wdn + ld.wup));
      colCase = { N: w * cb.R, M: 1.5 * qa * bay * Math.max(c, S / 2) ** 2 / 4, Mu: 0, Nk: ws * cb.R, Mk: qa * bay * Math.max(c, S / 2) ** 2 / 4, MkUp: Math.max(0, ld.wup - ld.g) * bay * Math.max(c, S / 2) ** 2 / 4, Ly: 2, Lz: 1, base: 'moment' };
    }
    const beamTest = s => {
      const r1 = chk(s, grade, { M: beamCase.M, V: beamCase.V, Llt: beamCase.Llt, C1: beamCase.C1, Lcy: 1, Lcz: 1 });
      const r2u = beamCase.Mu ? chk(s, grade, { M: beamCase.Mu, V: 0, Llt: beamCase.LltU || sp, C1: 1.13, Lcy: 1, Lcz: 1 }) : { u: 0 };
      const d = beamCase.dfn(s.Iy * 1e-8);
      return { u: Math.max(r1.u, r2u.u), d, gov: r1.u >= r2u.u ? r1.gov : 'Ngritja nga era: ' + r2u.gov };
    };
    const beam = pick(K.famList([e.beamFam]), e.beamSec, beamTest);
    if (beam.fail && !e.beamSec && e.beamFam !== 'HEA') {
      const alt = pick(K.famList(['HEA']), '', beamTest);
      if (!alt.fail) { Object.assign(beam, alt); delete beam.fail; warn.push('Trau kryesor kaloi në HEA, sepse IPE-ja më e madhe nuk mjafton.'); }
    }
    Object.assign(beam, { M: beamCase.M, Mu: beamCase.Mu, V: beamCase.V, span: beamCase.span });
    // kolonat
    const Hc = Math.max(...geo.cols.map(x => geo.zAt(x)));
    const colFam = e.colFam === 'auto' ? (i.model === 'portal' ? 'SHS' : 'HEA') : e.colFam;
    const col = pick(famList(colFam), e.colSec, s => {
      const N = colCase.N + 0, M = Math.max(colCase.M, colCase.Mu || 0);
      const r = chk(s, grade, { N, M, V: M / Math.max(1, Hc), Llt: colCase.base === 'moment' ? 2 * Hc : Hc, C1: 1.0, Lcy: colCase.Ly * Hc, Lcz: colCase.Lz * Hc });
      // zhvendosja në majë (kolonë konsol): h/150
      const Ik = s.Iy * 1e-8, d = colCase.base === 'moment' ? (colCase.Mk * Hc * Hc / (2 * EK * Ik)) / (Hc / 150) : 0;
      return { u: r.u, d, gov: r.gov };
    });
    Object.assign(col, { N: colCase.N, M: Math.max(colCase.M, colCase.Mu || 0), H: Hc, base: colCase.base, Nk: colCase.Nk, Mk: colCase.Mk });
    // themelet (bazamente të veçuara)
    const found = footing(i, e, geo, ld, col, colCase);
    // sasitë e çelikut
    const nF = geo.nBays + 1, nCol = nF * geo.cols.length;
    const beamLen = geo.planes.reduce((a, p) => a + p.slope, 0) * (i.model === 'portal' || i.model === 'konsol' ? 1 : 1);
    const kg = {
      purlins: purlin.sec.kg * geo.L * nPurl,
      beams: beam.sec.kg * beamLen * nF,
      cols: col.sec.kg * (Hc + 0.05) * nCol,
      brace: 0
    };
    if (i.model !== 'konsol' && geo.nBays >= 2) {
      const lb = Math.sqrt(bay * bay + Hc * Hc), rod = 1.58; // Ø16
      kg.brace = 2 * 2 * lb * rod * geo.cols.length * (geo.nBays >= 6 ? 2 : 1);
    }
    kg.conn = (kg.beams + kg.cols) * e.conn / 100 + kg.purlins * 0.04;
    return { loads: ld, purlin, beam, col, found, kg, nF, nCol, Hc, beamLen, depth: beam.sec.h / 1000 + purlin.sec.h / 1000 };
  }

  // tra i vazhduar me nP mbështetje, hapësira S dhe konsola c në të dy skajet; vlerat për w = 1
  function contBeam(nP, S, c) {
    const Mc = c * c / 2;
    if (nP === 1) return { sup: [Mc], mid: [0], R: 2 * c, V: c, supMin: Mc };
    const n = nP; const M = new Array(n).fill(0); M[0] = Mc; M[n - 1] = Mc;
    if (n > 2) {
      // ekuacioni i tre momenteve për mbështetjet e brendshme (momente negative pozitive këtu)
      const m = n - 2, a = new Array(m).fill(S), b = new Array(m).fill(4 * S), cc = new Array(m).fill(S), d = new Array(m).fill(S * S * S / 2);
      d[0] -= S * Mc; d[m - 1] -= S * Mc;
      for (let k = 1; k < m; k++) { const f = a[k] / b[k - 1]; b[k] -= f * cc[k - 1]; d[k] -= f * d[k - 1]; }
      const x = new Array(m); x[m - 1] = d[m - 1] / b[m - 1];
      for (let k = m - 2; k >= 0; k--) x[k] = (d[k] - cc[k] * x[k + 1]) / b[k];
      for (let k = 0; k < m; k++) M[k + 1] = x[k];
    }
    const mid = []; for (let k = 0; k < n - 1; k++) mid.push(S * S / 8 - (M[k] + M[k + 1]) / 2);
    let R = 0, V = c;
    for (let k = 0; k < n; k++) {
      const left = k === 0 ? c : S / 2 + (M[k] - M[k - 1]) / S;
      const right = k === n - 1 ? c : S / 2 + (M[k] - M[k + 1]) / S;
      R = Math.max(R, left + right); V = Math.max(V, left, right);
    }
    return { sup: M, mid, R, V, supMin: Math.min(...M) };
  }

  function footing(i, e, geo, ld, col, cc) {
    const sig = e.soil, Nk = cc.Nk + col.sec.kg * col.H * KG, Mk = cc.Mk || 0;
    const up = ld.qup > 0 ? (ld.qup / 1.5) * geo.bay * (geo.D / geo.cols.length) : 0; // ngritja karakteristike për kolonë
    let best = null;
    for (let B = 0.8; B <= 3.6; B += 0.1) {
      const h = Math.max(0.8, Math.min(1.4, 0.3 * B + 0.4));
      const Wf = 25 * B * B * h + 18 * B * B * 0.3;
      const N = Nk + Wf, ex = Mk / N;
      let q;
      if (ex <= B / 6) q = N / (B * B) * (1 + 6 * ex / B);
      else if (ex < B / 3) q = 2 * N / (3 * B * (B / 2 - ex));
      else continue;
      const okUp = Wf >= 1.2 * up;
      // përmbysja nga era që ngre strehën, vetëm me peshën e përhershme
      const exU = (cc.MkUp || 0) / Math.max(1, Wf + col.sec.kg * col.H * KG + ld.g * geo.bay * geo.D / geo.cols.length);
      if (q <= sig && okUp && exU < B / 2.2) { best = { B: r2(B), h: r2(h), q, ex }; break; }
    }
    if (!best) best = { B: 3.6, h: 1.4, q: 0, ex: 0, fail: true };
    const n = (geo.nBays + 1) * geo.cols.length;
    const V1 = best.B * best.B * best.h;
    const bolt = col.M > 60 ? 'M27' : col.M > 25 ? 'M24' : 'M20';
    return Object.assign(best, { n, V: V1 * n, rebar: V1 * n * 60, excav: (best.B + 0.4) * (best.B + 0.4) * (best.h + 0.1) * n, bolt, plate: col.sec.h + 160 });
  }

  /* ---------- panelet diellore ---------- */
  function pvYield(city, face, tilt) { const Yh = cityOf(city)[4]; return Yh * (1 + (FACE_K[face] || 0) * Math.min(tilt, 15)); }
  function pvLayout(i, e, geo) {
    if (i.cover !== 'pv') return null;
    const Wp = e.pvWp || PV.Wp;
    const along = Math.max(0, Math.floor((geo.L - 0.05) / (PV.W + PV.gap)));
    let n = 0, kwh = 0;
    const planes = geo.planes.map(p => {
      const across = Math.max(0, Math.floor((p.slope - 0.05) / (PV.L + PV.gap)));
      const np = across * along, kWp = np * Wp / 1000;
      const y = pvYield(i.city, p.face, i.tilt);
      n += np; kwh += kWp * y;
      return { across, along, n: np, kWp, face: p.face, yield: y };
    });
    const kWp = n * Wp / 1000;
    return { n, Wp, kWp, kwh, planes, inverterKw: Math.max(3, Math.round(kWp / 1.15 * 2) / 2), area: n * PV.L * PV.W, spec: PV };
  }

  /* ---------- opsionet dhe sasitë ---------- */
  function options(i, res) {
    const geo = res.geo;
    const o = {};
    o.ev = i.ev ? { n: i.ev, kw: i.evKw, total: i.ev * i.evKw, cable: i.ev * 18 + geo.L + geo.D } : null;
    o.led = i.led ? { n: Math.max(2, Math.ceil(geo.spaces / 2)), w: 36 } : null;
    o.inverter = i.inverter && res.pv ? { kw: res.pv.inverterKw } : null;
    o.battery = i.battery && res.pv ? { kwh: i.battery } : null;
    // ulluqet: në vijat e ulëta
    const low = new Set(); geo.planes.forEach(p => low.add(r2(p.low)));
    const lowEdges = [...low];
    o.gutter = i.gutter ? { lines: lowEdges.length, m: lowEdges.length * geo.L } : null;
    if (o.gutter) {
      const atCol = lowEdges.filter(x => geo.cols.some(c => Math.abs(c - x) < 0.6)).length;
      const free = lowEdges.length - atCol;
      o.gutter.down = atCol * res.nF + free * 2;
      o.gutter.downM = atCol * res.nF * (res.Hc + 0.3) + free * 2 * (i.H + 0.3);
    }
    if (i.closure !== 'none') {
      const back = geo.L * Math.max(0.5, geo.zAt(0.01) - 0.3);
      const ends = i.closure === 'back_ends' ? 2 * geo.planes.reduce((a, p) => a + p.ext * (p.zLow + p.zHigh) / 2, 0) : 0;
      const area = back + ends;
      const mat = i.cover === 'sandwich' || i.cover === 'sheet' ? i.cover : i.cover === 'poly' ? 'poly' : 'sheet';
      const rails = Math.ceil(Math.max(0.5, geo.zAt(0.01) - 0.3) / 1.5) * geo.L + (ends ? 2 * Math.ceil(i.H / 1.5) * geo.D : 0);
      o.closure = { area, back, ends, mat, rails, railKg: rails * 6.71 };
    } else o.closure = null;
    return o;
  }
  function quantities(i, e, res) {
    const geo = res.geo, kg = res.kg;
    const coverArea = geo.planes.reduce((a, p) => a + p.slope, 0) * geo.L;
    const steel = kg.purlins + kg.beams + kg.cols + kg.brace + kg.conn + (res.opts.closure ? res.opts.closure.railKg : 0);
    const trims = i.cover === 'pv' ? 0 : 2 * geo.L + 2 * geo.D;
    return { steel, coverArea, trims, spaces: geo.spaces, area: geo.area, perSpace: steel / Math.max(1, geo.spaces) };
  }

  /* ---------- përmbledhja ---------- */
  const fmt = (v, d) => { d = d || 0; if (v == null || !isFinite(v)) return '–'; const p = Math.abs(v).toFixed(d).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (v < 0 ? '−' : '') + p.join(','); };
  function summary(src, res) {
    const i = normalize(src), r = res || design(i), g = r.geo;
    const rows = rowsOf(i);
    const parts = [`${MODELS[i.model].name} për ${g.spaces} makina` + (rows > 1 ? ` (${rows} rreshta × ${i.nSpaces})` : ''), `${fmt(g.L, 1)} × ${fmt(g.D, 1)} m`, `lartësia e lirë ${fmt(i.H, 2)} m`];
    if (i.cover === 'pv' && r.pv) parts.push(`panele diellore ${fmt(r.pv.kWp, 1)} kWp (${r.pv.n} panele)`); else parts.push(COVERS[i.cover].name.toLowerCase());
    if (i.ev) parts.push(`${i.ev} karikues ${fmt(i.evKw, 1)} kW`);
    if (i.battery) parts.push(`bateri ${fmt(i.battery, 0)} kWh`);
    if (i.closure !== 'none') parts.push(i.closure === 'back' ? 'mbyllje nga pas' : 'mbyllje pas dhe anash');
    parts.push(i.city);
    return { kind: 'parking', title: `Parking ${MODELS[i.model].short} · ${g.spaces} makina`, text: parts.join(', '), spaces: g.spaces, area: r2(g.area), L: r2(g.L), D: r2(g.D), kWp: r.pv ? r2(r.pv.kWp) : 0 };
  }

  root.ParkEngine = { MODELS, COVERS, CITIES, FACE_NAME, AXIS, PV, DEF, ENG, CLIENT_KEYS, normalize, geometry, design, summary, pvYield, rowsOf, cityOf, contBeam, fmt };
})(typeof window !== 'undefined' ? window : globalThis);
