/* Oni-El · Parkingje: skema elektrike parimore (njëvijore) e strehës
   panele diellore → kuti DC → inverter (hibrid me bateri) → paneli AC i strehës → paneli kryesor → matësi → rrjeti
   Nga paneli i strehës ushqehen karikuesit EV dhe ndriçimi LED. */
window.ParkSchema = function (res, P) {
  'use strict';
  P = P || {};
  const ink = P.ink || '#e8eaf0', dim = P.dim || '#8392a6', bg = P.bg || '#162030', boxF = P.box || '#1c2838', line = P.line || '#2e3b4d';
  const ac = P.ac || '#7fb0d8', dc = P.dc || '#f4a012', evc = P.ev || '#22c55e', acc = P.accent || '#f4a012', pvc = P.pv || '#2a4a7a';
  const fmt = (v, d) => (+v).toLocaleString('sq-AL', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }).replace(/ /g, '.');
  const kw = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const STD = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
  const brk = a => { const x = a * 1.25; return STD.find(s => s >= x) || null; };
  const amps = (kW, three) => kW * 1000 / (three ? 692.8 : 230);
  const W = 1200, H = 700;
  const o = res.opts || {}, pv = res.pv, inv = o.inverter, bat = o.battery, ev = o.ev, led = o.led;
  const EQ = P.models && res.equip ? res.equip : null;
  const cut = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
  if (!pv && !ev && !led) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 220" font-family="Inter, Arial, Helvetica, sans-serif"><rect width="${W}" height="220" fill="${bg}"/><text x="${W / 2}" y="100" fill="${ink}" font-size="26" font-weight="700" text-anchor="middle">Kjo strehë nuk ka pajisje elektrike</text><text x="${W / 2}" y="140" fill="${dim}" font-size="18" text-anchor="middle">Shto panele diellore, karikues ose ndriçim LED për të parë skemën.</text></svg>`;
  }
  let h = '';
  const T = (x, y, t, o2) => { o2 = o2 || {}; h += `<text x="${x}" y="${y}" fill="${o2.c || ink}" font-size="${o2.s || 15}" font-weight="${o2.b ? 700 : 400}" text-anchor="${o2.a || 'start'}"${o2.i ? ' font-style="italic"' : ''}>${esc(t)}</text>`; };
  const L = (pts, c, w, dash) => { h += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w || 2.5}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`; };
  const BOX = (x, y, w, hh, title, lines, o2) => {
    o2 = o2 || {};
    h += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="8" fill="${boxF}" stroke="${o2.c || line}" stroke-width="${o2.c ? 2 : 1.5}"${o2.dash ? ' stroke-dasharray="7 5"' : ''}/>`;
    const tx = x + (o2.ix || 14);
    T(tx, y + 26, title, { b: 1, s: 16.5 });
    (lines || []).forEach((t, k) => T(tx, y + 50 + k * 20, t, { c: dim, s: 14 }));
  };
  // shenjat e 3 fazave mbi një vijë horizontale
  const tick3 = (x, y) => { for (let k = -1; k <= 1; k++) L([[x + k * 7 - 5, y + 7], [x + k * 7 + 5, y - 7]], ac, 2); };
  // ndërprerës automatik në vijë horizontale (x1 → x2)
  const breaker = (x1, x2, y, c) => { const m = (x1 + x2) / 2; L([[x1, y], [m - 10, y]], c, 2.5); L([[m - 10, y], [m + 8, y - 12]], c, 2.5); h += `<circle cx="${m - 10}" cy="${y}" r="3" fill="${c}"/>`; L([[m + 10, y], [x2, y]], c, 2.5); L([[m + 6, y - 4], [m + 12, y + 4]], c, 2); };
  const earth = (x, y, c) => { L([[x, y], [x, y + 10]], c, 2); [[14, 10], [9, 16], [4, 22]].forEach(([w2, yy]) => L([[x - w2, y + yy], [x + w2, y + yy]], c, 2)); };

  h += `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  // ---------- paneli AC i strehës (në qendër) ----------
  const PX = 760, PY = 40, PW = 150, PH = 380, BUS = PX + 95;
  BOX(PX, PY, PW, PH, 'Paneli AC', [], { c: acc });
  T(PX + 14, PY + 46, 'i strehës', { c: dim, s: 14 });
  L([[BUS, PY + 70], [BUS, PY + PH - 20]], ac, 5);
  // SPD AC
  L([[BUS, PY + 290], [PX + 30, PY + 290], [PX + 30, PY + 300]], ac, 2); h += `<rect x="${PX + 20}" y="${PY + 300}" width="20" height="26" fill="none" stroke="${ac}" stroke-width="2"/>`; earth(PX + 30, PY + 326, ac);
  T(PX + 46, PY + 318, 'SPD', { c: dim, s: 13 });

  // ---------- prodhimi: panele → kuti DC → inverter → bateri ----------
  let invKw = 0, three = true, hybrid = false, nInv = 1;
  if (pv) {
    invKw = inv ? inv.kw : pv.inverterKw;
    three = invKw > 6; hybrid = !!bat && (EQ ? EQ.coupling === 'dc' : invKw <= 50);
    nInv = invKw > 110 ? Math.ceil(invKw / 100) : 1;
    const maxPer = three ? 16 : 12, S = Math.max(1, Math.ceil(pv.n / maxPer)), mMin = Math.floor(pv.n / S), mMax = Math.ceil(pv.n / S);
    // fusha fotovoltaike
    const FX = 30, FY = 40;
    h += `<rect x="${FX}" y="${FY}" width="215" height="170" rx="8" fill="${boxF}" stroke="${line}" stroke-width="1.5"/>`;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) h += `<rect x="${FX + 16 + c * 38}" y="${FY + 14 + r * 30}" width="34" height="26" fill="${pvc}" stroke="${ac}" stroke-width="1"/><line x1="${FX + 16 + c * 38}" y1="${FY + 27 + r * 30}" x2="${FX + 50 + c * 38}" y2="${FY + 27 + r * 30}" stroke="${ac}" stroke-width=".6"/>`;
    T(FX + 14, FY + 98, 'Panelet diellore', { b: 1, s: 16.5 });
    T(FX + 14, FY + 120, `${pv.n} × ${pv.Wp} Wp = ${kw(pv.kWp)} kWp`, { c: dim, s: 14 });
    T(FX + 14, FY + 140, S === 1 ? `1 varg me ${pv.n} panele` : mMin === mMax ? `${S} vargje × ${mMin} panele` : `${S} vargje me ${mMin}–${mMax} panele`, { c: dim, s: 14 });
    T(FX + 14, FY + 160, 'në seri', { c: dim, s: 14 });
    // vargjet → kutia DC
    const DX = 300, DY = 55, ns = Math.min(S, 4);
    for (let k = 0; k < ns; k++) { const y = ns === 1 ? DY + 65 : DY + 25 + k * 80 / (ns - 1); L([[FX + 215, y], [DX, y]], dc, 2.5); }
    T(FX + 222, DY - 8, 'DC ≤ ' + (three ? '1000' : '600') + ' V', { c: dc, s: 13, b: 1 });
    BOX(DX, DY, 160, 130, 'Kuti DC', ['ndërprerës DC', 'siguresa gPV', 'mbrojtje', 'mbitensioni (SPD)']);
    // kutia DC → inverteri
    const IX = 520, IY = 45;
    L([[DX + 160, DY + 55], [IX, DY + 55]], dc, 3); L([[DX + 160, DY + 70], [IX, DY + 70]], dc, 3);
    T(DX + 168, DY + 47, '+', { c: dc, s: 15, b: 1 }); T(DX + 168, DY + 92, '−', { c: dc, s: 15, b: 1 });
    const invTitle = inv ? (hybrid ? 'Inverter hibrid' : 'Inverter rrjeti') : 'Inverter';
    const invLines = inv ? (EQ && EQ.inv ? EQ.inv.units.filter(u => u.role !== 'bat').slice(0, 2).map(u => cut((u.n > 1 ? u.n + ' × ' : '') + u.model.replace(/^(Sungrow|Deye|Huawei|SMA) /, '').replace('Sunny Tripower', 'STP'), 22)).concat([kw(EQ.invKw) + ' kW · ' + (hybrid ? 'hibrid' : 'rrjeti') + (three ? ' · 3F' : ' · 1F')]) : [(nInv > 1 ? nInv + ' × ' + kw(invKw / nInv) : kw(invKw)) + ' kW · ' + (three ? 'trefazor' : 'njëfazor'), hybrid ? 'panele + bateri' : 'lidhje në rrjet', 'kontroll vetëkonsumi']) : ['nuk përfshihet', 'në këtë ofertë'];
    const invT = EQ && EQ.inv ? 'Inverter ' + EQ.inv.brand : invTitle;
    BOX(IX, IY, 175, 160, cut(invT, 20), invLines, inv ? {} : { dash: 1 });
    // simboli i inverterit
    const sx = IX + 120, sy = IY + 108;
    h += `<rect x="${sx}" y="${sy}" width="44" height="44" fill="none" stroke="${ink}" stroke-width="1.8"/><line x1="${sx}" y1="${sy + 44}" x2="${sx + 44}" y2="${sy}" stroke="${ink}" stroke-width="1.5"/>`;
    T(sx + 5, sy + 17, '=', { s: 16, b: 1 }); T(sx + 26, sy + 40, '~', { s: 18, b: 1 });
    // inverteri → paneli AC
    const yI = PY + 95, Ii = amps(invKw, three), bI = brk(Ii);
    L([[IX + 175, yI], [PX, yI]], ac, 3); if (three) tick3(IX + 205, yI);
    breaker(PX, BUS, yI, ac);
    T(IX + 186, yI - 12, 'AC', { c: ac, s: 13, b: 1 });
    T(PX + 6, yI + 26, (bI ? 'C' + bI : '') + (three ? ' 3P' : ' 1P+N'), { c: dim, s: 13 }); T(PX + 6, yI + 43, '+ RCD', { c: dim, s: 13 });
    // bateria
    if (bat) {
      const BX = IX, BY = hybrid ? 280 : 300;
      const bk = EQ && EQ.bat ? EQ.bat.kwh : bat.kwh, bm = EQ && EQ.bat ? cut(EQ.bat.model.replace(/^(\d+ × )?(Sungrow|Deye|Huawei|SMA|BYD Battery-Box Premium) /, '$1'), 21) : null;
      BOX(BX, BY, 175, 110, hybrid ? 'Bateri LFP' : 'Bateri + PCS', bm ? [bm, kw(bk) + ' kWh'] : [kw(bk) + ' kWh', hybrid ? 'BMS · siguresë DC' : 'inverter baterie'], { ix: 14 });
      // simboli i baterisë
      const cx = BX + 128, cy = BY + 24;
      for (let k = 0; k < 3; k++) { L([[cx + k * 13, cy - 13], [cx + k * 13, cy + 13]], ink, 2); L([[cx + k * 13 + 6, cy - 7], [cx + k * 13 + 6, cy + 7]], ink, 4); }
      if (hybrid) { L([[IX + 70, IY + 160], [IX + 70, BY]], dc, 3); L([[IX + 85, IY + 160], [IX + 85, BY]], dc, 3); T(IX + 94, (IY + 160 + BY) / 2 + 5, 'DC', { c: dc, s: 13, b: 1 }); }
      else { const yb = PY + 240; L([[BX + 175, BY + 40], [PX - 40, BY + 40], [PX - 40, yb], [PX, yb]], ac, 3); breaker(PX, BUS, yb, ac); tick3(PX - 20, yb); T(PX + 6, yb + 26, 'C' + (brk(amps(Math.max(10, bat.kwh / 2), true)) || 63) + ' 3P', { c: dim, s: 13 }); }
    }
  } else {
    BOX(30, 40, 430, 110, 'Mbulesë pa panele diellore', ['Paneli i strehës ushqehet nga paneli kryesor i objektit', 'dhe furnizon karikuesit dhe ndriçimin.']);
  }

  // ---------- daljet: karikuesit EV dhe LED ----------
  const DXo = 980, Dw = 195;
  let Iev = 0;
  if (ev) {
    const y = PY + 95, ph3 = ev.kw > 7.4, Ia = ev.kw >= 22 ? 32 : ev.kw >= 11 ? 16 : 32, b = brk(Ia);
    Iev = Ia * ev.n;
    breaker(BUS, PX + PW, y, evc); L([[PX + PW, y], [DXo, y]], evc, 3); if (ph3) tick3(PX + PW + 30, y);
    T(BUS + 4, y + 26, `${ev.n}×C${b}`, { c: dim, s: 12.5 });
    const evm = EQ && EQ.ev ? cut(EQ.ev.model.replace(/ \(vendosur.*$/, '').replace(/^(Sungrow|Huawei|SMA) /, '').replace(/^karikues AC me OCPP, p\.sh\. (.*?) [\d,]+ kW$/, '$1 (OCPP)'), 24) : null;
    BOX(DXo, PY + 20, Dw, 150, 'Karikues EV', [`${ev.n} × ${kw(ev.kw)} kW`].concat(evm ? [evm] : [], [ph3 ? 'trefazor 400 V' : 'njëfazor 230 V', 'RCD tip A + 6 mA DC']).concat(evm ? [] : ['menaxhim ngarkese']), { c: evc });
    // spina
    const px = DXo + Dw - 40, py = PY + 36;
    h += `<rect x="${px}" y="${py}" width="26" height="32" rx="5" fill="none" stroke="${evc}" stroke-width="2"/><circle cx="${px + 13}" cy="${py + 16}" r="5" fill="${evc}"/>`;
  }
  if (led) {
    const y = PY + 210, Wt = led.n * led.w;
    breaker(BUS, PX + PW, y, ac); L([[PX + PW, y], [DXo, y]], ac, 2.5);
    T(BUS + 6, y + 26, 'C10 1P', { c: dim, s: 13 });
    BOX(DXo, y - 40, Dw, 112, 'Ndriçimi LED', [`${led.n} ndriçues · ${fmt(Wt, 0)} W`, 'RCD 30 mA', 'sensor muzgu / orar']);
    const lx = DXo + Dw - 28, ly = y - 18; h += `<circle cx="${lx}" cy="${ly}" r="11" fill="none" stroke="${ink}" stroke-width="2"/><line x1="${lx - 8}" y1="${ly - 8}" x2="${lx + 8}" y2="${ly + 8}" stroke="${ink}" stroke-width="1.6"/><line x1="${lx + 8}" y1="${ly - 8}" x2="${lx - 8}" y2="${ly + 8}" stroke="${ink}" stroke-width="1.6"/>`;
  }
  // ---------- paneli kryesor, matësi dhe rrjeti ----------
  const MY = PY + 330, MBY = 345;
  const Ifeed = Math.max(pv ? amps(invKw, three) : 0, (ev ? Iev : 0) + (led ? amps(led.n * led.w / 1000, false) : 0));
  const bF = brk(Ifeed);
  breaker(BUS, PX + PW, MY, ac); L([[PX + PW, MY], [DXo, MY]], ac, 3); tick3(PX + PW + 30, MY);
  T(BUS + 4, MY - 14, bF ? 'C' + bF + ' 3P' : '≥250 A', { c: dim, s: 12.5 });
  BOX(DXo, MBY, Dw, 90, 'Paneli kryesor', ['i objektit', 'çelësi kryesor ekzistues']);
  // ngarkesat e objektit
  L([[DXo, MBY + 75], [930, MBY + 75], [930, 520], [PX + PW, 520]], ac, 2.5);
  BOX(PX, 480, PW, 80, 'Objekti', ['konsumi ekzistues']);
  // matësi dydrejtimësh dhe rrjeti
  const mx = DXo + 125, my = 520;
  L([[mx, MBY + 90], [mx, my - 30]], ac, 3);
  h += `<circle cx="${mx}" cy="${MBY + 116}" r="9" fill="${bg}" stroke="${ink}" stroke-width="2"/>`; T(mx - 14, MBY + 121, 'CT' + (EQ && EQ.meterShort ? ' · ' + EQ.meterShort : ''), { s: 13, b: 1, a: 'end' });
  h += `<circle cx="${mx}" cy="${my}" r="30" fill="${boxF}" stroke="${acc}" stroke-width="2.5"/>`;
  T(mx, my - 2, 'kWh', { s: 15, b: 1, a: 'middle' }); T(mx, my + 16, '⇄', { s: 15, b: 1, a: 'middle', c: acc });
  T(mx - 38, my - 4, 'Matës', { s: 14, b: 1, a: 'end' }); T(mx - 38, my + 14, 'dydrejtimësh', { s: 13, c: dim, a: 'end' });
  L([[mx, my + 30], [mx, 600]], ac, 3);
  // shtylla e rrjetit
  const gx = mx, gy = 600;
  L([[gx - 18, gy + 70], [gx, gy], [gx + 18, gy + 70]], ink, 2.2); L([[gx - 26, gy + 16], [gx + 26, gy + 16]], ink, 2.2); L([[gx - 18, gy + 34], [gx + 18, gy + 34]], ink, 2);
  L([[gx - 12, gy + 46], [gx + 12, gy + 62]], ink, 1.4); L([[gx + 12, gy + 46], [gx - 12, gy + 62]], ink, 1.4);
  T(gx - 36, gy + 38, 'Rrjeti 0,4 kV', { s: 14, b: 1, a: 'end' }); T(gx - 36, gy + 56, 'OSHEE', { s: 13, c: dim, a: 'end' });
  // komunikimi: CT → inverter / karikues
  if (pv && inv || ev) {
    const cy = 12;
    L([[mx + 9, MBY + 116], [W - 14, MBY + 116], [W - 14, cy], [pv && inv ? 607 : DXo + 100, cy]], dim, 1.6, '6 5');
    if (pv && inv) L([[607, cy], [607, 45]], dim, 1.6, '6 5');
    if (ev) L([[DXo + 100, cy], [DXo + 100, PY + 20]], dim, 1.6, '6 5');
    if (pv && inv) T(640, cy + 16, 'komunikim: vetëkonsum' + (ev ? ', menaxhim ngarkese' : ''), { c: dim, s: 12.5, i: 1 });
    else T(DXo + 90, cy + 16, 'komunikim: menaxhim ngarkese', { c: dim, s: 12.5, i: 1, a: 'end' });
  }
  // legjenda dhe shënimi
  const lgY = 600;
  if (pv) { L([[30, lgY], [70, lgY]], dc, 3); T(78, lgY + 5, 'DC', { c: dim, s: 13 }); }
  L([[130, lgY], [170, lgY]], ac, 3); tick3(150, lgY); T(178, lgY + 5, 'AC (/// trefazor)', { c: dim, s: 13 });
  L([[330, lgY], [370, lgY]], dim, 1.6, '6 5'); T(378, lgY + 5, 'komunikim', { c: dim, s: 13 });
  T(30, 640, 'Skemë parimore njëvijore. Seksionet e kabllove, mbrojtjet dhe lidhja me rrjetin', { c: dim, s: 13, i: 1 });
  T(30, 660, 'përcaktohen në projektin elektrik të zbatimit dhe miratohen nga OSHEE.', { c: dim, s: 13, i: 1 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, Arial, Helvetica, sans-serif">${h}</svg>`;
};
