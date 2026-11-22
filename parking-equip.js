/* Oni-El · Parkingje: paketat e pajisjeve elektrike (inverter, bateri, karikues, matës)
   Çdo paketë mban pajisje të së njëjtës markë ose nga lista e saj e përputhshmërisë, që të mos ketë konflikte.
   Këtu nuk ka çmime: çmimet janë vetëm në panelin e administratorit. */
window.ParkEquip = (function () {
  'use strict';
  const PKGS = {
    std: { name: 'Standard (Sungrow / Deye)', short: 'Standard' },
    huawei: { name: 'Huawei FusionSolar', short: 'Huawei' },
    eu: { name: 'Europiane (SMA + BYD)', short: 'Europiane' }
  };
  const nr = (v, d) => String(Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).replace('.', ',');
  const pickUp = (list, v) => list.find(x => x >= v - 1e-6) || list[list.length - 1];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ndan fuqinë në n njësi të njëjta, secila jo më e madhe se maks.
  const split = (kw, max) => { const n = Math.max(1, Math.ceil(kw / max - 1e-6)); return { n, each: kw / n }; };
  const unit = (model, kw, n, role) => ({ model, kw, n: n || 1, role: role || 'pv' });

  /* ---------- Sungrow / Deye ---------- */
  const SG_RT = [5, 6, 8, 10, 12, 15, 17, 20], SG_CX = [25, 30, 33, 36, 40, 50], SH_RT = [5, 6, 8, 10], SH_T = [15, 20, 25], DEYE = [29.9, 30, 35, 40, 50];
  const sgName = k => (k < 10 ? k.toFixed(1) : String(k));
  function stdInv(kw, kwh) {
    const o = { brand: 'Sungrow', units: [], coupling: kwh ? 'dc' : null, meter: 'Sungrow DTSU666-20 + CT', mon: 'iSolarCloud (WiNet-S)', logger: false };
    if (kwh) {
      if (kw <= 10 && kwh <= 25.6) {
        const k = pickUp(SH_RT, kw); o.units.push(unit(`Sungrow SH${sgName(k)}RT`, k, 1, 'hyb'));
        const m = clamp(Math.ceil(kwh / 3.2), 3, 8); o.bat = { model: `Sungrow SBR${String(m * 32).padStart(3, '0')}`, kwh: m * 3.2, detail: `${m} module × 3,2 kWh` };
      } else if (kw <= 25 && kwh <= 80) {
        const k = pickUp(SH_T, kw); o.units.push(unit(`Sungrow SH${k}T`, k, 1, 'hyb'));
        if (kwh <= 25.6) { const m = clamp(Math.ceil(kwh / 3.2), 4, 8); o.bat = { model: `Sungrow SBR${String(m * 32).padStart(3, '0')}`, kwh: m * 3.2, detail: `${m} module × 3,2 kWh` }; }
        else if (kwh <= 40) { const m = clamp(Math.ceil(kwh / 5), 3, 8); o.bat = { model: `Sungrow SBH${m * 50}`, kwh: m * 5, detail: `${m} module × 5 kWh` }; }
        else { const m = clamp(Math.ceil(kwh / 10), 3, 8); o.bat = { model: `2 × Sungrow SBH${m * 50}`, kwh: 2 * m * 5, detail: `2 kulla × ${m} module × 5 kWh` }; }
      } else {
        // Deye: hibrid i tensionit të lartë, deri 10 njësi paralel, bateri BOS-G Pro
        const s = split(kw, 50), k = pickUp(DEYE, s.each);
        o.brand = 'Deye'; o.meter = 'matës trefazor i miratuar nga Deye + CT'; o.mon = 'Deye Cloud'; o.logger = s.n > 1;
        o.units.push(unit(`Deye SUN-${String(k).replace('.', ',')}K-SG01HP3-EU-${k >= 40 ? 'BM4' : 'BM3'}`, k, s.n, 'hyb'));
        let mod = Math.ceil(kwh / 5.12); const st = Math.max(s.n, Math.ceil(mod / 16)); mod = Math.max(mod, 5 * st); const per = Math.ceil(mod / st);
        const nm = { 5: 'BOS-G25 Pro', 8: 'BOS-G40 Pro', 12: 'BOS-G60 Pro', 16: 'BOS-G80 Pro' }[per] || `BOS-G Pro me ${per} module`;
        o.bat = { model: (st > 1 ? st + ' × ' : '') + 'Deye ' + nm, kwh: per * st * 5.12, detail: `${st > 1 ? st + ' kulla × ' : ''}${per} module × 5,12 kWh` };
      }
    } else if (kw <= 20) { const k = pickUp(SG_RT, kw); o.units.push(unit(`Sungrow SG${sgName(k)}RT`, k)); }
    else { const s = split(kw, 50), k = pickUp(SG_CX, s.each); o.units.push(unit(`Sungrow SG${k}CX-P2`, k, s.n)); o.logger = s.n > 1; if (o.logger) o.mon = 'iSolarCloud (Logger1000)'; }
    return o;
  }
  function stdEv(inv, ev) {
    const sh = inv && inv.brand === 'Sungrow' ? inv.units[0].model : '';
    if (ev.n <= 4 && sh && ev.kw >= 11) {
      if (/SH[\d.]+RT$/.test(sh)) return { model: ev.kw === 11 ? 'Sungrow AC011E-01' : 'Sungrow AC22E-01', ocpp: false };
      if (/(SH\d+T|SG[\d.]+RT)$/.test(sh)) return { model: 'Sungrow AC22E-01' + (ev.kw === 11 ? ' (vendosur në 11 kW)' : ''), ocpp: false };
    }
    return { model: `karikues AC me OCPP, p.sh. ABB Terra AC ${nr(ev.kw, 1)} kW`, ocpp: true };
  }

  /* ---------- Huawei ---------- */
  const HW_MB0 = [12, 15, 17, 20, 25], HW_M1 = [5, 6, 8, 10], HW_M3 = [30, 36, 40, 50], LUNA = [5, 7, 10, 12, 14, 15, 17, 19, 21];
  function hwInv(kw, kwh) {
    const o = { brand: 'Huawei', units: [], coupling: kwh ? 'dc' : null, meter: 'Huawei Smart Power Sensor DTSU666-H', mon: 'FusionSolar (Smart Dongle)', logger: false };
    if (kwh && kw <= 75 && kwh <= 252) {
      const s = split(kw, 25), k = pickUp(HW_MB0, s.each); o.units.push(unit(`Huawei SUN2000-${k}K-MB0`, k, s.n, 'hyb'));
      const st = clamp(Math.ceil(kwh / 21), 1, 4 * s.n), c = pickUp(LUNA, kwh / st);
      o.bat = { model: (st > 1 ? st + ' × ' : '') + `Huawei LUNA2000-${c}-S1`, kwh: c * st, detail: st > 1 ? `${st} kulla × ${c} kWh` : 'një kullë' };
      if (s.n > 1) { o.logger = true; o.mon = 'FusionSolar (SmartLogger3000A)'; }
      return o;
    }
    if (kw <= 10) o.units.push(unit(`Huawei SUN2000-${pickUp(HW_M1, kw)}KTL-M1`, pickUp(HW_M1, kw)));
    else if (kw <= 25) o.units.push(unit(`Huawei SUN2000-${pickUp(HW_MB0, kw)}K-MB0`, pickUp(HW_MB0, kw)));
    else if (kw <= 50) o.units.push(unit(`Huawei SUN2000-${pickUp(HW_M3, kw)}KTL-M3`, pickUp(HW_M3, kw)));
    else { const s = split(kw, 100); if (s.each <= 50) o.units.push(unit(`Huawei SUN2000-${pickUp(HW_M3, s.each)}KTL-M3`, pickUp(HW_M3, s.each), s.n)); else o.units.push(unit('Huawei SUN2000-100KTL-M2', 100, s.n)); o.logger = true; o.mon = 'FusionSolar (SmartLogger3000A)'; }
    if (kwh) {   // bateri e madhe: sistem më vete në anën AC
      o.coupling = 'ac'; o.logger = true; o.mon = 'FusionSolar (SmartLogger3000A)';
      o.units.push(unit('Huawei PCS për baterinë C&I', Math.max(30, Math.round(kwh / 2)), 1, 'bat'));
      o.bat = { model: 'Huawei LUNA2000 C&I (Smart String ESS)', kwh, detail: 'kabinet i jashtëm' };
    }
    return o;
  }
  const hwEv = ev => ev.n <= 4 ? { model: ev.kw <= 7.4 ? 'Huawei SCharger-7KS-S0' : 'Huawei SCharger-22KT-S0' + (ev.kw === 11 ? ' (vendosur në 11 kW)' : ''), ocpp: false } : { model: `karikues AC me OCPP, p.sh. ABB Terra AC ${nr(ev.kw, 1)} kW`, ocpp: true };

  /* ---------- SMA + BYD ---------- */
  const STP_SE = [5, 6, 8, 10], STP_X = [12, 15, 20, 25];
  const stpX = kw => kw <= 25 ? [unit(`SMA Sunny Tripower X ${pickUp(STP_X, kw)}`, pickUp(STP_X, kw))] : (() => { const s = split(kw, 60), k = s.each <= 50 ? 50 : 60; return [unit(`SMA Sunny Tripower X ${k}`, k, s.n)]; })();
  function byd(kwh) {
    if (kwh <= 22.1) { const m = clamp(Math.ceil(kwh / 2.76), 3, 8); return { model: `BYD Battery-Box Premium HVM ${nr(m * 2.76, 1)}`, kwh: m * 2.76, detail: `${m} module × 2,76 kWh` }; }
    const m = clamp(Math.ceil(kwh / 5.52), 3, 8); return { model: `2 × BYD Battery-Box Premium HVM ${nr(m * 2.76, 1)}`, kwh: 2 * m * 2.76, detail: `2 kulla × ${m} module` };
  }
  function euInv(kw, kwh) {
    const o = { brand: 'SMA', units: [], coupling: kwh ? 'dc' : null, meter: 'SMA Energy Meter', mon: 'Sunny Portal (ennexOS)', logger: false };
    if (kwh && kwh <= 44.2) {
      const kse = kw <= 10 ? pickUp(STP_SE, kw) : 10;
      o.units.push(unit(`SMA Sunny Tripower Smart Energy ${kse}.0`, kse, 1, 'hyb'));
      if (kw > 10) { stpX(kw - 10).forEach(u => o.units.push(u)); o.logger = true; o.meter = 'SMA Sunny Home Manager 2.0'; }
      o.bat = byd(kwh);
      return o;
    }
    if (kw <= 10 && !kwh) o.units.push(unit(`SMA Sunny Tripower X 12`, 12)); else stpX(kw).forEach(u => o.units.push(u));
    if (o.units[0].n > 1) { o.logger = true; o.mon = 'Sunny Portal (SMA Data Manager M)'; }
    if (kwh) {   // SMA Storage XL: inverter baterie 30/50 kW + kabinete të jashtme 107 ose 197 kWh
      o.coupling = 'ac'; o.logger = false; o.mon = 'Sunny Portal (System Manager i integruar)';
      const cab = kwh <= 107 ? 107 : 197, n = clamp(Math.ceil(kwh / cab), 1, 4);
      o.units.push(unit(`SMA Sunny Tripower Storage X ${cab === 107 && kw <= 40 ? 30 : 50}`, cab === 107 && kw <= 40 ? 30 : 50, 1, 'bat'));
      o.bat = { model: `${n > 1 ? n + ' × ' : ''}SMA Storage XL CSS-${cab}`, kwh: cab * n, detail: `${n > 1 ? n + ' kabinete × ' : ''}${cab} kWh, i jashtëm` };
    }
    return o;
  }
  const euEv = ev => ({ model: ev.kw <= 7.4 ? 'SMA EV Charger 7.4' : 'SMA EV Charger Business' + (ev.kw === 11 ? ' (vendosur në 11 kW)' : ''), ocpp: ev.kw > 7.4 });

  // zgjedhja për një parking të llogaritur (res nga ParkEngine.design)
  function pick(i, res, pkg) {
    pkg = PKGS[pkg] ? pkg : 'std';
    const o = res.opts || {}, out = { pkg, name: PKGS[pkg].name, inv: null, bat: null, ev: null };
    if (res.pv && o.inverter) {
      const kwh = o.battery ? o.battery.kwh : 0, kw = o.inverter.kw;
      const v = pkg === 'huawei' ? hwInv(kw, kwh) : pkg === 'eu' ? euInv(kw, kwh) : stdInv(kw, kwh);
      out.inv = v; out.bat = v.bat || null; out.coupling = v.coupling; out.meter = v.meter; out.mon = v.mon; out.logger = v.logger;
      out.invKw = v.units.filter(u => u.role !== 'bat').reduce((a, u) => a + u.kw * u.n, 0);
      out.batInvKw = v.units.filter(u => u.role === 'bat').reduce((a, u) => a + u.kw * u.n, 0);
    }
    if (o.ev) {
      const e = pkg === 'huawei' ? hwEv(o.ev) : pkg === 'eu' ? euEv(o.ev) : stdEv(out.inv, o.ev);
      out.ev = Object.assign({ n: o.ev.n, kw: o.ev.kw }, e);
      if (!out.meter && e.ocpp) out.meter = 'matës te paneli kryesor për ndarjen e fuqisë';
    }
    if (!out.inv && !out.ev) return null;
    // rreshtat për përshkrimin
    const L = [];
    if (out.inv) out.inv.units.forEach(u => L.push([u.role === 'bat' ? 'Inverteri i baterisë' : u.role === 'hyb' ? 'Inverteri hibrid' : 'Inverteri', `${u.n > 1 ? u.n + ' × ' : ''}${u.model}`]));
    if (out.bat) L.push(['Bateria', `${out.bat.model} · ${nr(out.bat.kwh, 1)} kWh (${out.bat.detail})`]);
    if (out.ev) L.push(['Karikuesit', `${out.ev.n} × ${out.ev.model}`]);
    if (out.meter) L.push(['Matësi', out.meter]);
    if (out.mon) L.push(['Monitorimi', out.mon]);
    out.lines = L;
    // emri i shkurtër i matësit për skemën
    out.meterShort = !out.meter ? '' : out.meter.indexOf('DTSU666-20') >= 0 ? 'DTSU666-20' : out.meter.indexOf('DTSU666-H') >= 0 ? 'DTSU666-H' : out.meter.indexOf('Home Manager') >= 0 ? 'Home Manager 2.0' : out.meter.indexOf('SMA Energy') >= 0 ? 'SMA Energy Meter' : out.meter.indexOf('Deye') >= 0 ? 'matës Deye' : '';
    out.short = L.map(x => x[1]).join(' · ');
    return out;
  }
  return { PKGS, pick };
})();
