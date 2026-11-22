/* Oni-El · Parkingje: kostot e brendshme (vetëm paneli i stafit).
   Ky skedar nuk ka asnjë çmim: çmimet vijnë nga Supabase pas hyrjes (portal_config → parking_prices). */
(function (root) {
  'use strict';
  const KEYS = [
    ['Çeliku', [['stMat', 'Materiali i çelikut', '€/kg'], ['stFab', 'Prodhimi në punëtori', '€/kg'], ['stZink', 'Zinkimi në të nxehtë', '€/kg'], ['stPaint', 'Bojatisja (alternativë)', '€/kg'], ['stMont', 'Montimi i strukturës', '€/kg']]],
    ['Mbulesa', [['sheet', 'Llamarinë trapezoidale', '€/m²'], ['sandwich', 'Panel sanduiç 40 mm', '€/m²'], ['poly', 'Polikarbonat 16 mm', '€/m²'], ['coverMont', 'Montimi i mbulesës', '€/m²'], ['flash', 'Bordura dhe mbyllje skajesh', '€/m']]],
    ['Panelet diellore', [['pvWp', 'Panelet', '€/Wp'], ['pvMount', 'Kapëset dhe fiksimet', '€/Wp'], ['pvInst', 'Montimi i paneleve', '€/Wp'], ['pvBos', 'Kabllot DC/AC, mbrojtjet, tokëzimi', '€/kWp'], ['inverter', 'Inverteri i rrjetit', '€/kW'], ['invHybrid', 'Inverteri hibrid / i baterisë', '€/kW'], ['invMin', 'Inverteri, minimumi për copë', '€'], ['battery', 'Bateria', '€/kWh'], ['meter', 'Matësi i energjisë me CT', '€'], ['logger', 'Logger / menaxheri i energjisë', '€']]],
    ['Karikuesit dhe ndriçimi', [['ev7', 'Karikues 7,4 kW', '€/copë'], ['ev11', 'Karikues 11 kW', '€/copë'], ['ev22', 'Karikues 22 kW', '€/copë'], ['evInst', 'Montimi i karikuesit', '€/copë'], ['evOcpp', 'Shtesë për karikues biznesi me OCPP', '€/copë'], ['evCable', 'Kabllo për karikuesit', '€/m'], ['led', 'Ndriçues LED me kabllim', '€/copë']]],
    ['Ulluqe dhe mbyllje', [['gutter', 'Ulluk', '€/m'], ['down', 'Ulluk zbritës', '€/m'], ['closeSheet', 'Mbyllje me llamarinë', '€/m²'], ['closeSandwich', 'Mbyllje me panel sanduiç', '€/m²'], ['closePoly', 'Mbyllje me polikarbonat', '€/m²'], ['closeMont', 'Montimi i mbylljes', '€/m²']]],
    ['Themelet', [['concrete', 'Betoni', '€/m³'], ['rebar', 'Hekuri', '€/kg'], ['excav', 'Gërmimi dhe largimi', '€/m³'], ['anchorM20', 'Ankera M20, kompleti', '€'], ['anchorM24', 'Ankera M24, kompleti', '€'], ['anchorM27', 'Ankera M27, kompleti', '€']]],
    ['Transporti dhe mjetet', [['truck', 'Kamioni', '€/udhëtim'], ['truckKg', 'Ngarkesa e kamionit', 'kg'], ['crane', 'Autovinçi', '€/ditë'], ['tPerDay', 'Montim në ditë', 't/ditë']]],
    ['Totali', [['designPct', 'Projekti', '%'], ['designMin', 'Projekti, minimumi', '€'], ['contPct', 'Të paparashikuara', '%'], ['margin', 'Marzhi', '%'], ['round', 'Rrumbullakimi', '€'], ['vat', 'TVSH', '%'], ['eurAll', 'Kursi', 'Lekë/€']]],
    ['Paketat e pajisjeve', [['pkgHuawei', 'Huawei: shtesë mbi inverter, bateri dhe karikues', '%'], ['pkgEu', 'Europiane (SMA + BYD): shtesë mbi inverter, bateri dhe karikues', '%']]],
    ['Energjia', [['tariff', 'Tarifa e energjisë për biznes (0,4 kV)', 'Lekë/kWh']]]
  ];
  const EV_KEY = { 7.4: 'ev7', 11: 'ev11', 22: 'ev22' };

  function costs(res, P, o) {
    o = o || {};
    const i = res.inp, q = res.qty, op = res.opts, f = res.found;
    const p = k => +P[k] || 0;
    // pajisjet sipas paketës (marka dhe modelet); pa paketë përdoren zërat e përgjithshëm
    const eq = res.equip, fk = eq ? 1 + (eq.pkg === 'huawei' ? p('pkgHuawei') : eq.pkg === 'eu' ? p('pkgEu') : 0) / 100 : 1;
    const nr1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
    function eqRows() {
      if (!eq || !eq.inv) return [op.inverter ? it(`Inverter ${op.inverter.kw} kW`, 1, 'copë', Math.max(p('invMin'), op.inverter.kw * p('inverter'))) : null, op.battery ? it('Bateri', op.battery.kwh, 'kWh', p('battery')) : null];
      const out = eq.inv.units.map(u => { const r = u.role === 'pv' ? p('inverter') : (p('invHybrid') || p('inverter')); return it(`${u.role === 'bat' ? 'Inverter baterie' : u.role === 'hyb' ? 'Inverter hibrid' : 'Inverter'} ${u.model}`, u.n, 'copë', Math.max(p('invMin'), u.kw * r) * fk); });
      if (eq.bat) out.push(it(`Bateri ${eq.bat.model} (${nr1(eq.bat.kwh)} kWh)`, eq.bat.kwh, 'kWh', p('battery') * fk));
      if (eq.meter) out.push(it(`Matës ${eq.meter}`, 1, 'copë', p('meter')));
      if (eq.logger) out.push(it(`Monitorim: ${eq.mon}`, 1, 'copë', p('logger')));
      return out;
    }
    const rows = [];
    const grp = (g, items) => { const its = items.filter(x => x && x[3] > 0.004); if (its.length) rows.push({ g, items: its, sum: its.reduce((a, x) => a + x[3], 0) }); };
    const it = (name, qty, unit, price) => [name, qty, unit, qty * price, price];
    const coat = res.eng.coat === 'paint' ? p('stPaint') : p('stZink');
    const kg = q.steel;
    grp('Struktura metalike', [
      it('Çeliku: material, prodhim' + (res.eng.coat === 'paint' ? ', bojë' : ', zinkim'), kg, 'kg', p('stMat') + p('stFab') + coat),
      it('Montimi i strukturës', kg, 'kg', p('stMont'))
    ]);
    if (i.cover === 'pv' && res.pv) {
      const Wp = res.pv.n * res.pv.Wp;
      grp('Sistemi fotovoltaik', [
        it(`Panele ${res.pv.Wp} Wp`, res.pv.n, 'copë', res.pv.Wp * p('pvWp')),
        it('Kapëse dhe fiksime', Wp, 'Wp', p('pvMount')),
        it('Montimi i paneleve', Wp, 'Wp', p('pvInst')),
        it('Kabllot, mbrojtjet dhe tokëzimi', res.pv.kWp, 'kWp', p('pvBos')),
      ].concat(eqRows()));
    } else {
      const pr = { sheet: p('sheet'), sandwich: p('sandwich'), poly: p('poly') }[i.cover] || 0;
      grp('Mbulesa', [
        it(res.cover.name, q.coverArea * 1.05, 'm²', pr),
        it('Montimi i mbulesës', q.coverArea, 'm²', p('coverMont')),
        it('Bordura dhe skaje', q.trims, 'm', p('flash'))
      ]);
    }
    const ext = [];
    if (op.ev) {
      const e = eq && eq.ev, evp = (p(EV_KEY[op.ev.kw] || 'ev11') + (e && e.ocpp ? p('evOcpp') : 0)) * fk + p('evInst');
      ext.push(it(e ? `Karikues ${e.model}` : `Karikues ${String(op.ev.kw).replace('.', ',')} kW`, op.ev.n, 'copë', evp), it('Kabllo për karikuesit', op.ev.cable, 'm', p('evCable')));
      if (eq && !eq.inv && eq.meter && op.ev.n > 1) ext.push(it('Matës për ndarjen e fuqisë', 1, 'copë', p('meter')));
    }
    if (op.led) ext.push(it('Ndriçues LED', op.led.n, 'copë', p('led')));
    if (op.gutter) ext.push(it('Ulluqe', op.gutter.m, 'm', p('gutter')), it('Ulluqe zbritëse', op.gutter.downM, 'm', p('down')));
    if (op.closure) {
      const cp = { sheet: p('closeSheet'), sandwich: p('closeSandwich'), poly: p('closePoly') }[op.closure.mat] || p('closeSheet');
      ext.push(it('Mbyllje anësore', op.closure.area, 'm²', cp + p('closeMont')));
    }
    grp('Pajisje dhe opsione', ext);
    grp('Themelet', [
      it('Gërmimi', f.excav, 'm³', p('excav')),
      it('Betoni', f.V, 'm³', p('concrete')),
      it('Hekuri', f.rebar, 'kg', p('rebar')),
      it(`Ankera ${f.bolt}`, f.n, 'komplet', p('anchor' + f.bolt))
    ]);
    const mass = kg + (res.pv ? res.pv.n * 32 : q.coverArea * (i.cover === 'sandwich' ? 11 : i.cover === 'poly' ? 3 : 5));
    const trucks = Math.max(1, Math.ceil(mass / Math.max(1000, p('truckKg') || 20000)));
    const days = Math.max(1, Math.ceil(kg / 1000 / Math.max(0.5, p('tPerDay') || 4)));
    grp('Transporti dhe mjetet', [it('Transporti', trucks, 'udhëtim', p('truck')), it('Autovinçi', days, 'ditë', p('crane'))]);
    const sub = rows.reduce((a, r) => a + r.sum, 0);
    const design = Math.max(p('designMin'), sub * p('designPct') / 100);
    const cont = (sub + design) * p('contPct') / 100;
    const cost = sub + design + cont;
    const margin = o.margin != null ? +o.margin : p('margin');
    let price = cost * (1 + margin / 100);
    const rd = p('round');
    if (rd > 0) price = Math.ceil(price / rd) * rd;
    const vat = price * p('vat') / 100;
    // ndarja e çmimit sipas grupeve (projekti, rezerva dhe fitimi shpërndahen në mënyrë proporcionale)
    const kf = price / Math.max(1, sub);
    const grpPrice = g => { const r = rows.find(x => x.g === g); return r ? r.sum * kf : 0; };
    // energjia: kursimi vjetor me tarifën e biznesit, nëse energjia konsumohet në objekt
    let energy = null;
    if (res.pv) {
      const tariff = p('tariff') || 14, eur = p('eurAll') || 98, save = res.pv.kwh * tariff / eur;
      const pvPrice = grpPrice('Sistemi fotovoltaik');
      energy = { kwh: res.pv.kwh, tariff, save, pvPrice, payPv: pvPrice / Math.max(1, save), payAll: price / Math.max(1, save) };
    }
    const steelRate = p('stMat') + p('stFab') + coat + p('stMont');
    return { rows, sub, design, cont, cost, margin, price, vat, total: price + vat, kf, energy, steelRate, steelCost: kg * steelRate, realMargin: (price - cost) / Math.max(1, price) * 100, perSpace: price / Math.max(1, res.geo.spaces), perKWp: res.pv ? price / Math.max(0.1, res.pv.kWp) : null, trucks, days, mass, missing: !(p('stMat') > 0) };
  }
  root.ParkCosts = { KEYS, costs };
})(typeof window !== 'undefined' ? window : globalThis);
