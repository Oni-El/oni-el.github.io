/* Vizatimet 2D (SVG): prerja tërthore, planimetria, fasada anësore */
window.Draw = (function () {
  'use strict';
  const LET = 'ABCDEFGHIJKLMN';
  const f2 = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function head(w, h, pal) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Barlow Condensed, Arial Narrow, Arial, sans-serif" style="width:100%;height:auto;display:block">` +
      `<rect x="0" y="0" width="${w}" height="${h}" fill="${pal.bg}"/>` +
      `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${pal.dim}" stroke-width="0.8" opacity="0.55"/></pattern>` +
      `<pattern id="hatchM" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${pal.accent}" stroke-width="1.1" opacity="0.5"/></pattern></defs>`;
  }
  function txt(x, y, s, pal, o) {
    o = o || {};
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size || 12}" fill="${o.fill || pal.ink}" text-anchor="${o.anchor || 'middle'}" font-weight="${o.w || 500}"${o.rot ? ` transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`;
  }
  function line(x1, y1, x2, y2, c, w, dash) {
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${w || 1}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  }
  // kuotë (dimension) horizontale ose vertikale
  function dimH(x1, x2, y, label, pal, yRef) {
    let s = line(x1, y, x2, y, pal.dim, 0.9);
    [x1, x2].forEach(x => { s += line(x - 4, y + 4, x + 4, y - 4, pal.dim, 1.2); if (yRef != null) s += line(x, yRef, x, y + 3, pal.dim, 0.5, '2 2'); });
    s += txt((x1 + x2) / 2, y - 4, label, pal, { size: 11, fill: pal.ink });
    return s;
  }
  function dimV(y1, y2, x, label, pal, xRef, left) {
    let s = line(x, y1, x, y2, pal.dim, 0.9);
    [y1, y2].forEach(y => { s += line(x - 4, y + 4, x + 4, y - 4, pal.dim, 1.2); if (xRef != null) s += line(xRef, y, x + (left ? -3 : 3), y, pal.dim, 0.5, '2 2'); });
    s += txt(x - 5, (y1 + y2) / 2, label, pal, { size: 11, rot: -90 });
    return s;
  }
  function bubble(x, y, t, pal) {
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${pal.bg}" stroke="${pal.steel}" stroke-width="1.3"/>` + txt(x, y + 4, t, pal, { size: 11, w: 600 });
  }
  function titleBlock(w, h, pal, meta, title) {
    if (meta && meta.bare) return '';
    const bw = 230, bh = 38, x = w - bw - 10, y = h - bh - 8;
    return line(10, h - 52, w - 10, h - 52, pal.dim, 0.4) + txt(14, h - 22, 'Vizatim paraprak për ofertë · kuotat në metra', pal, { size: 10.5, anchor: 'start', fill: pal.dim }) + `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="0.9"/>` +
      line(x + 64, y, x + 64, y + bh, pal.ink, 0.7) + line(x + 64, y + bh / 2, x + bw, y + bh / 2, pal.ink, 0.5) +
      txt(x + 32, y + 23, meta.company || 'ONI-EL', pal, { size: 13, w: 700, ls: 1 }) +
      txt(x + 70, y + 14, title, pal, { size: 11, w: 600, anchor: 'start' }) +
      txt(x + 70, y + 32, (meta.project || '') + ' · paraprak', pal, { size: 10, anchor: 'start', fill: pal.dim });
  }
  function wm(w, h, pal, meta) {
    if (!meta || !meta.watermark) return '';
    let s = `<g opacity="0.075" fill="${pal.ink}" font-size="40" font-weight="700" letter-spacing="3" pointer-events="none">`;
    for (let y = 90; y < h + 120; y += 150) for (let x = -200; x < w + 200; x += 520) s += `<text x="${x + (y / 150 % 2) * 260}" y="${y}" transform="rotate(-18 ${x} ${y})">${esc(meta.watermark)}</text>`;
    return s + '</g>';
  }
  function slopesOf(res, inp) {
    const xs = res.frame.fr.xs, out = [];
    if (inp.roof === 'duo') for (let i = 0; i < xs.length - 1; i++) { const xm = (xs[i] + xs[i + 1]) / 2; out.push([xs[i], xm]); out.push([xm, xs[i + 1]]); }
    else out.push([0, inp.W]);
    return out;
  }

  /* ---------- PRERJA TËRTHORE ---------- */
  function section(res, inp, pal, meta) {
    const fr = res.frame.fr, yR = fr.yRoof, xs = fr.xs;
    const col = res.frame.col, raf = res.frame.raf;
    const W = inp.W, Hm = Math.max(...xs.map(yR), ...slopesOf(res, inp).map(s => Math.max(yR(s[0]), yR(s[1]))));
    const VW = 900, mL = 90, mR = 90, mT = 58, mB = 92;
    const k = Math.min((VW - mL - mR) / W, 330 / Hm);
    const VH = Math.round(mT + Hm * k + mB) + 52;
    const X = x => mL + x * k + ((VW - mL - mR) - W * k) / 2;
    const Y = y => mT + (Hm - y) * k;
    let s = head(VW, VH, pal);
    s += txt(16, 24, 'PRERJA TËRTHORE · PORTALI TIPIK', pal, { size: 14, w: 700, anchor: 'start', ls: 1 });
    // toka
    s += `<rect x="${X(-1.2)}" y="${Y(0)}" width="${(W + 2.4) * k}" height="8" fill="url(#hatch)"/>` + line(X(-1.2), Y(0), X(W + 1.2), Y(0), pal.ink, 1.2);
    // mezanina
    if (res.mezz) {
      const m = res.mezz, th = inp.mDeck === 'komp' ? inp.mSlab / 100 : 0.05;
      const x0 = 0.35, x1 = Math.min(W - 0.35, 0.35 + m.W);
      s += `<rect x="${X(x0)}" y="${Y(m.Hm + th)}" width="${(x1 - x0) * k}" height="${Math.max(3, (th + m.sec1.sec.h / 1000) * k)}" fill="url(#hatchM)" stroke="${pal.accent}" stroke-width="1"/>`;
      for (let i = 0; i <= m.nx; i++) { const x = x0 + (x1 - x0) * i / m.nx; s += line(X(x), Y(0), X(x), Y(m.Hm), pal.accent, Math.max(1.5, m.col.sec.h / 1000 * k)); }
      s += txt(X((x0 + x1) / 2), Y(m.Hm + th) - 6, 'Mezaninë +' + f2(m.Hm), pal, { size: 11, fill: pal.ink, w: 600 });
    }
    // kolonat
    const cw = Math.max(4, col.h / 1000 * k);
    xs.forEach(x => {
      const ht = yR(x);
      s += `<rect x="${(X(x) - cw / 2).toFixed(1)}" y="${Y(ht).toFixed(1)}" width="${cw.toFixed(1)}" height="${(ht * k).toFixed(1)}" fill="${pal.steel}" opacity="0.92"/>`;
      s += `<rect x="${(X(x) - cw / 2 - 5).toFixed(1)}" y="${(Y(0) - 3).toFixed(1)}" width="${(cw + 10).toFixed(1)}" height="3" fill="${pal.ink}"/>`;
      if (inp.base === 'pinned') s += `<path d="M${X(x) - 7} ${Y(0) + 12} L${X(x)} ${Y(0) + 1} L${X(x) + 7} ${Y(0) + 12} Z" fill="none" stroke="${pal.ink}" stroke-width="1"/>`;
    });
    // trarët e çatisë
    const rw = Math.max(4, raf.h / 1000 * k);
    slopesOf(res, inp).forEach(([xa, xb]) => {
      const ax = X(xa), ay = Y(yR(xa)), bx = X(xb), by = Y(yR(xb));
      const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L * rw / 2, ny = (bx - ax) / L * rw / 2;
      s += `<path d="M${(ax - nx).toFixed(1)} ${(ay - ny).toFixed(1)} L${(bx - nx).toFixed(1)} ${(by - ny).toFixed(1)} L${(bx + nx).toFixed(1)} ${(by + ny).toFixed(1)} L${(ax + nx).toFixed(1)} ${(ay + ny).toFixed(1)} Z" fill="${pal.steel}"/>`;
      // rigla
      const n = res.purlin.nPerSlope;
      for (let q = 0; q < n; q++) {
        const t = Math.min(0.985, Math.max(0.015, q / (n - 1)));
        const px = ax + (bx - ax) * t + nx * (1 + 3 / rw * 2), py = ay + (by - ay) * t + ny * (1 + 3 / rw * 2);
        s += `<rect x="${(px - 3).toFixed(1)}" y="${(py - 3).toFixed(1)}" width="6" height="6" fill="${pal.dim}" transform="rotate(${(Math.atan2(by - ay, bx - ax) * 180 / Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`;
      }
    });
    // haunch
    if (fr.Lh > 0) xs.forEach(x => [-1, 1].forEach(sd => {
      const xe = x + sd * fr.Lh; if (xe < -1e-6 || xe > W + 1e-6) return;
      const y0 = Y(yR(x)) + rw / 2, y1 = Y(yR(xe)) + rw / 2;
      s += `<path d="M${X(x)} ${y0} L${X(xe)} ${y1} L${X(x)} ${y0 + rw} Z" fill="${pal.steel}" opacity="0.85"/>`;
    }));
    // kuotat
    const yb = Y(0) + 30;
    xs.forEach((x, i) => { s += line(X(x), Y(0) + 10, X(x), yb + 28, pal.dim, 0.5, '6 3 2 3'); s += bubble(X(x), yb + 40, LET[i] || '?', pal); });
    for (let i = 0; i < xs.length - 1; i++) s += dimH(X(xs[i]), X(xs[i + 1]), yb, f2(xs[i + 1] - xs[i]), pal);
    if (xs.length > 2) s += dimH(X(0), X(W), yb + 14, f2(W), pal);
    s += dimV(Y(inp.H), Y(0), X(0) - 40, 'H = ' + f2(inp.H), pal, X(0) - cw / 2 - 2, true);
    const xTop = inp.roof === 'duo' ? xs[0] + (xs[1] - xs[0]) / 2 : W;
    s += dimV(Y(yR(xTop)), Y(0), X(W) + 46, (inp.roof === 'duo' ? 'Kulmi ' : 'H max ') + f2(yR(xTop)), pal, X(xTop) + 4, false);
    // pjerrësia
    const xsl = inp.roof === 'duo' ? xs[0] + (xs[1] - xs[0]) * 0.3 : W * 0.35;
    const sx = X(xsl), sy = Y(yR(xsl)) + rw / 2 + 20;
    s += `<path d="M${(sx - 22).toFixed(1)} ${(sy - 4).toFixed(1)} l44 ${(-44 * inp.slopePct / 100).toFixed(1)}" stroke="${pal.accent}" stroke-width="1.4" fill="none"/>`;
    s += txt(sx, sy + 10, String(inp.slopePct).replace('.', ',') + '%', pal, { size: 12, w: 700, fill: pal.accent });
    // etiketat e profileve
    const xc = X(xs[0]) + cw / 2 + 8, yc = Y(inp.H * 0.45);
    s += txt(xc, yc, 'Kolona ' + col.name, pal, { size: 12, w: 600, anchor: 'start' });
    const xr = inp.roof === 'duo' ? (xs[0] + (xs[1] - xs[0]) * 0.62) : W * 0.7;
    s += txt(X(xr), Y(yR(xr)) + rw + 18, 'Trau ' + raf.name, pal, { size: 12, w: 600 });
    s += txt(X(xr), Y(yR(xr)) + rw + 32, 'Rigla ' + res.purlin.sec.name + ' / ' + f2(res.purlin.sp) + ' m', pal, { size: 10.5, fill: pal.dim });
    s += titleBlock(VW, VH, pal, meta, 'Prerja tërthore');
    s += wm(VW, VH, pal, meta);
    return s + '</svg>';
  }

  /* ---------- PLANIMETRIA ---------- */
  function plan(res, inp, pal, meta) {
    const fr = res.frame.fr, xs = fr.xs;
    const W = inp.W, L = inp.L, nb = res.nBays, sb = res.bay;
    const VW = 900, mL = 74, mR = 40, mT = 74, mB = 64;
    const k = Math.min((VW - mL - mR) / L, 360 / W);
    const VH = Math.round(mT + W * k + mB) + 52;
    const X = z => mL + z * k + ((VW - mL - mR) - L * k) / 2;
    const Y = x => mT + (W - x) * k;
    let s = head(VW, VH, pal);
    s += txt(16, 24, 'PLANIMETRIA E KOLONAVE', pal, { size: 14, w: 700, anchor: 'start', ls: 1 });
    // konturi i ndërtesës
    s += `<rect x="${X(0) - 3}" y="${Y(W) - 3}" width="${L * k + 6}" height="${W * k + 6}" fill="none" stroke="${pal.ink}" stroke-width="1.6"/>`;
    // mezanina
    if (res.mezz) {
      const m = res.mezz;
      const x0 = 0.35, z0 = 0.35, x1 = Math.min(W - 0.35, x0 + m.W), z1 = Math.min(L - 0.35, z0 + m.L);
      s += `<rect x="${X(z0)}" y="${Y(x1)}" width="${(z1 - z0) * k}" height="${(x1 - x0) * k}" fill="url(#hatchM)" stroke="${pal.accent}" stroke-width="1.2"/>`;
      for (let i = 0; i <= m.nx; i++) for (let j = 0; j <= m.ny; j++) { const xx = x0 + (x1 - x0) * i / m.nx, zz = z0 + (z1 - z0) * j / m.ny; s += `<rect x="${X(zz) - 3}" y="${Y(xx) - 3}" width="6" height="6" fill="${pal.accent}"/>`; }
      const lbl = 'Mezaninë ' + f1(m.L) + ' × ' + f1(m.W) + ' m · +' + f2(m.Hm);
      s += `<rect x="${X((z0 + z1) / 2) - 92}" y="${Y((x0 + x1) / 2) - 13}" width="184" height="20" fill="${pal.bg}" opacity="0.92"/>`;
      s += txt(X((z0 + z1) / 2), Y((x0 + x1) / 2) + 2, lbl, pal, { size: 11.5, w: 600 });
    }
    // kontraventimet e çatisë
    const bays = new Set([0, nb - 1]);
    if (res.brace.nbb >= 3) bays.add(Math.floor((nb - 1) / 2));
    if (res.brace.nbb >= 4) bays.add(Math.min(nb - 2, Math.floor((nb - 1) / 2) + 1));
    bays.forEach(bi => {
      if (bi < 0 || bi >= nb) return;
      const z0 = bi * sb, z1 = (bi + 1) * sb;
      const np = Math.max(1, Math.round(W / Math.max(2.5, res.brace.bp)));
      for (let q = 0; q < np; q++) {
        const x0 = W * q / np, x1 = W * (q + 1) / np;
        s += line(X(z0), Y(x0), X(z1), Y(x1), pal.accent, 1, '5 3') + line(X(z0), Y(x1), X(z1), Y(x0), pal.accent, 1, '5 3');
      }
      [0, W].forEach(x => { s += `<path d="M${X(z0)} ${Y(x)} l${(sb * k / 4).toFixed(1)} ${x ? 5 : -5} l${(sb * k / 4).toFixed(1)} ${x ? -10 : 10} l${(sb * k / 4).toFixed(1)} ${x ? 10 : -10} l${(sb * k / 4).toFixed(1)} ${x ? -5 : 5}" fill="none" stroke="${pal.accent}" stroke-width="1.6"/>`; });
    });
    // akset
    for (let i = 0; i <= nb; i++) { const z = i * sb; s += line(X(z), Y(W) - 26, X(z), Y(0) + 8, pal.dim, 0.5, '8 3 2 3'); s += bubble(X(z), Y(W) - 36, String(i + 1), pal); }
    xs.forEach((x, i) => { s += line(X(0) - 26, Y(x), X(L) + 8, Y(x), pal.dim, 0.5, '8 3 2 3'); s += bubble(X(0) - 36, Y(x), LET[i] || '?', pal); });
    // kolonat (simbol I)
    const col = res.frame.col;
    const ch = Math.max(7, col.h / 1000 * k), cb = Math.max(5, col.b / 1000 * k);
    for (let i = 0; i <= nb; i++) xs.forEach(x => {
      const cx = X(i * sb), cy = Y(x);
      s += `<rect x="${(cx - cb / 2).toFixed(1)}" y="${(cy - ch / 2).toFixed(1)}" width="${cb.toFixed(1)}" height="2.2" fill="${pal.steel}"/><rect x="${(cx - cb / 2).toFixed(1)}" y="${(cy + ch / 2 - 2.2).toFixed(1)}" width="${cb.toFixed(1)}" height="2.2" fill="${pal.steel}"/><rect x="${(cx - 0.9).toFixed(1)}" y="${(cy - ch / 2).toFixed(1)}" width="1.8" height="${ch.toFixed(1)}" fill="${pal.steel}"/>`;
    });
    // kolonat e timpanit
    res.posts.forEach(p => [0, L].forEach(z => { s += `<rect x="${X(z) - 2.5}" y="${Y(p.x) - 4}" width="5" height="8" fill="${pal.dim}"/>`; }));
    // dyert dhe dritaret
    s += planOpenings(res, inp, pal, X, Y, k);
    // shkallët
    if (res.stairs && res.mezz) {
      const st = res.stairs, m = res.mezz;
      const x1 = Math.min(W - 0.35, 0.35 + m.W);
      const foot = st.flights.length > 1 ? Math.max(...st.flights.map(f => (f - 1) * st.going)) + st.w : (st.flights[0] - 1) * st.going;
      const tv = st.flights.length > 1 ? 2 * st.w + 0.15 : st.w;
      if (!st.ext && W - x1 >= foot + 0.8) {
        const zc = 0.35 + Math.min(L - 0.7, m.L) / 2;
        s += `<rect x="${X(zc - tv / 2)}" y="${Y(x1 + 0.05 + foot)}" width="${tv * k}" height="${foot * k}" fill="none" stroke="${pal.ink}" stroke-width="1"/>`;
        s += txt(X(zc), Y(x1 + 0.05 + foot / 2) + 4, 'Shkallë', pal, { size: 10.5 });
      } else if (st.ext) {
        s += `<rect x="${X(1.0)}" y="${Y(-1.0)}" width="${foot * k}" height="${tv * k}" fill="none" stroke="${pal.ink}" stroke-width="1"/>`;
      }
    }
    // kuotat
    const yb = Y(0) + 28 + (res.stairs && res.stairs.ext ? (res.stairs.flights.length > 1 ? 2 * res.stairs.w + 0.15 : res.stairs.w) * k + 1.0 * k : 0);
    for (let i = 0; i < nb; i++) s += dimH(X(i * sb), X((i + 1) * sb), yb, f2(sb), pal);
    s += dimH(X(0), X(L), yb + 16, 'L = ' + f2(L), pal);
    const xr = X(L) + 22;
    for (let i = 0; i < xs.length - 1; i++) s += dimV(Y(xs[i]), Y(xs[i + 1]), xr, f2(xs[i + 1] - xs[i]), pal);
    if (xs.length > 2) s += dimV(Y(0), Y(W), xr + 16, 'W = ' + f2(W), pal);
    s += titleBlock(VW, VH, pal, meta, 'Planimetria');
    s += wm(VW, VH, pal, meta);
    return s + '</svg>';
  }

  /* ---------- hapjet në planimetri ---------- */
  function planOpenings(res, inp, pal, X, Y, k) {
    const lay = res.open && res.open.lay; if (!lay) return '';
    const W = inp.W, L = inp.L;
    let s = '';
    Object.keys(lay).forEach(sd => lay[sd].forEach(it => {
      const a = it.c - it.w / 2, b = it.c + it.w / 2, win = it.kind === 'win';
      const st = win ? `fill="${pal.bg}" stroke="${pal.steel}" stroke-width="1"` : `fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.1"`;
      const t = win ? 4 : 8;
      if (sd === 'front' || sd === 'back') {
        const x0 = sd === 'front' ? X(0) : X(L);
        s += `<rect x="${(x0 - t / 2).toFixed(1)}" y="${Y(b).toFixed(1)}" width="${t}" height="${(it.w * k).toFixed(1)}" ${st}/>`;
        if (!win) s += txt(sd === 'front' ? x0 + 8 : x0 - 8, Y(it.c) + 4, it.tag, pal, { size: 10.5, anchor: sd === 'front' ? 'start' : 'end', w: 600 });
      } else {
        const y0 = sd === 'left' ? Y(W) : Y(0);
        s += `<rect x="${X(a).toFixed(1)}" y="${(y0 - t / 2).toFixed(1)}" width="${(it.w * k).toFixed(1)}" height="${t}" ${st}/>`;
        if (!win) s += txt(X(it.c), sd === 'left' ? y0 + 16 : y0 - 9, it.tag, pal, { size: 10.5, w: 600 });
      }
    }));
    return s;
  }

  /* ---------- FASADAT (pamje nga jashtë) ---------- */
  const FTITLE = { front: 'FASADA BALLORE', back: 'FASADA E PASME', left: 'FASADA ANËSORE MAJTAS', right: 'FASADA ANËSORE DJATHTAS' };
  const FNAME = { front: 'Fasada ballore', back: 'Fasada e pasme', left: 'Fasada anësore majtas', right: 'Fasada anësore djathtas' };
  function facade(res, inp, pal, meta, sd) {
    const fr = res.frame.fr, yR = fr.yRoof, xs = fr.xs;
    const W = inp.W, L = inp.L, H = inp.H, nb = res.nBays, sb = res.bay;
    const gab = sd === 'front' || sd === 'back', Lw = gab ? W : L;
    // u matet nga e majta e atij që e sheh fasadën nga jashtë
    const flip = sd === 'front' || sd === 'left';
    const U = c => flip ? Lw - c : c;
    const tops = [];
    xs.forEach((x, i) => { tops.push([x, yR(x)]); if (inp.roof === 'duo' && i < xs.length - 1) { const xm = (x + xs[i + 1]) / 2; tops.push([xm, yR(xm)]); } });
    const Hr = Math.max(...tops.map(t => t[1]));
    const hw = gab ? H : yR(sd === 'left' ? W : 0);
    const items = (res.open && res.open.lay && res.open.lay[sd]) || [];
    const winRows = [];
    items.filter(it => it.kind === 'win').forEach(it => { if (!winRows.some(r => Math.abs(r.y0 - it.y0) < 1e-3 && Math.abs(r.y1 - it.y1) < 1e-3)) winRows.push({ y0: it.y0, y1: it.y1 }); });
    winRows.sort((a, b) => a.y0 - b.y0);
    const nV = Math.min(3, winRows.length);
    const VW = 900, mL = 90, mR = 96 + nV * 20, mT = 58, mB = 112;
    const k = Math.min((VW - mL - mR) / Lw, (gab ? 330 : 270) / Hr);
    const VH = Math.round(mT + Hr * k + mB) + 52;
    const X = u => mL + u * k + ((VW - mL - mR) - Lw * k) / 2;
    const Y = y => mT + (Hr - y) * k;
    const sock = Math.min(inp.sockel || 0, H - 1);
    let s = head(VW, VH, pal);
    const axisName = gab ? 'AKSI ' + (sd === 'front' ? '1' : String(nb + 1)) : 'AKSI ' + (sd === 'left' ? (LET[xs.length - 1] || '?') : 'A');
    s += txt(16, 24, FTITLE[sd] + ' · ' + axisName, pal, { size: 14, w: 700, anchor: 'start', ls: 1 });
    if (gab) {
      const outline = [[0, 0], ...tops.map(t => [U(t[0]), t[1]]).sort((a, b) => a[0] - b[0]), [W, 0]];
      const d = 'M' + outline.map(p => X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' L') + ' Z';
      const cid = 'gab' + sd;
      s += `<defs><clipPath id="${cid}"><path d="${d}"/></clipPath></defs>`;
      s += `<path d="${d}" fill="${pal.steel}" fill-opacity="0.08" stroke="none"/>`;
      let j = '';
      for (let y = Math.max(sock, 0) + 1; y < Hr; y += 1) j += line(X(0), Y(y), X(W), Y(y), pal.dim, 0.5);
      s += `<g clip-path="url(#${cid})" opacity="0.6">${j}</g>`;
      if (sock > 0.05) s += `<rect x="${X(0)}" y="${Y(sock)}" width="${W * k}" height="${sock * k}" fill="url(#hatch)" stroke="${pal.dim}" stroke-width="0.7"/>`;
      xs.forEach(x => { s += line(X(U(x)), Y(0), X(U(x)), Y(yR(x)), pal.steel, 1, '6 4'); });
      res.posts.forEach(p => { s += line(X(U(p.x)), Y(0), X(U(p.x)), Y(yR(p.x)), pal.steel, 0.8, '3 4'); });
      s += `<path d="${d}" fill="none" stroke="${pal.ink}" stroke-width="1.8"/>`;
      const tp = tops.map(t => [U(t[0]), t[1]]).sort((a, b) => a[0] - b[0]);
      s += `<path d="M${tp.map(p => X(p[0]).toFixed(1) + ' ' + (Y(p[1]) - 3).toFixed(1)).join(' L')}" fill="none" stroke="${pal.steel}" stroke-width="3"/>`;
    } else {
      if (Hr > hw + 0.05) s += `<path d="M${X(0)} ${Y(hw)} L${X(L)} ${Y(hw)} L${X(L)} ${Y(Hr)} L${X(0)} ${Y(Hr)} Z" fill="${pal.dim}" opacity="0.12" stroke="${pal.dim}" stroke-width="0.8"/>`;
      s += `<rect x="${X(0)}" y="${Y(hw)}" width="${L * k}" height="${hw * k}" fill="${pal.steel}" fill-opacity="0.06"/>`;
      if (sock > 0.05) s += `<rect x="${X(0)}" y="${Y(sock)}" width="${L * k}" height="${sock * k}" fill="url(#hatch)" stroke="${pal.dim}" stroke-width="0.7"/>`;
      const rl = res.rail;
      for (let q = 0; q < rl.n; q++) { const y = Math.min(hw - 0.15, sock + 0.25 + q * (hw - sock - 0.25) / Math.max(1, rl.n - 1)); s += line(X(0), Y(y), X(L), Y(y), pal.dim, 1.4); }
      const cb = Math.max(3, res.frame.col.b / 1000 * k);
      for (let i = 0; i <= nb; i++) s += `<rect x="${(X(U(i * sb)) - cb / 2).toFixed(1)}" y="${Y(hw).toFixed(1)}" width="${cb.toFixed(1)}" height="${(hw * k).toFixed(1)}" fill="${pal.steel}"/>`;
      s += line(X(0), Y(hw), X(L), Y(hw), pal.steel, 3);
      const bays = new Set([0, nb - 1]);
      if (res.brace.nbb >= 3) bays.add(Math.floor((nb - 1) / 2));
      if (res.brace.nbb >= 4) bays.add(Math.min(nb - 2, Math.floor((nb - 1) / 2) + 1));
      bays.forEach(bi => {
        if (bi < 0 || bi >= nb) return;
        const t = res.brace.tiers, u0 = Math.min(U(bi * sb), U((bi + 1) * sb)), u1 = Math.max(U(bi * sb), U((bi + 1) * sb));
        for (let q = 0; q < t; q++) { const ya = hw * q / t, yb2 = hw * (q + 1) / t; s += line(X(u0), Y(ya), X(u1), Y(yb2), pal.accent, 1.6) + line(X(u0), Y(yb2), X(u1), Y(ya), pal.accent, 1.6); }
      });
      if (res.mezz) { const za = 0.35, zb = 0.35 + Math.min(L - 0.7, res.mezz.L); s += line(X(Math.min(U(za), U(zb))), Y(res.mezz.Hm), X(Math.max(U(za), U(zb))), Y(res.mezz.Hm), pal.accent, 1.2, '7 4'); }
    }
    // hapjet
    items.forEach(it => {
      const u0 = U(it.c) - it.w / 2, x0 = X(u0), w = it.w * k, y0 = Y(it.y1), h = (it.y1 - it.y0) * k;
      if (it.kind === 'win') {
        s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${pal.steel}" fill-opacity="0.16" stroke="${pal.steel}" stroke-width="1.1"/>`;
        if (it.w > 1.4) s += line(x0 + w / 2, y0, x0 + w / 2, y0 + h, pal.steel, 0.7);
        return;
      }
      const ped = it.type === 'kemb';
      s += `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${ped ? pal.bg : pal.dim}" fill-opacity="${ped ? 1 : 0.35}" stroke="${pal.ink}" stroke-width="1.1"/>`;
      if (it.type === 'seks') for (let y = 0.6; y < it.h - 0.05; y += 0.6) s += line(x0, Y(y), x0 + w, Y(y), pal.ink, 0.4);
      if (it.type === 'roll') for (let y = 0.25; y < it.h - 0.05; y += 0.25) s += line(x0, Y(y), x0 + w, Y(y), pal.ink, 0.25);
      if (ped) s += `<circle cx="${(x0 + w * 0.8).toFixed(1)}" cy="${Y(1.05).toFixed(1)}" r="1.6" fill="${pal.ink}"/>`;
      s += txt(x0 + w / 2, y0 - 6, it.tag + (ped ? '' : ' · ' + f2(it.w) + ' × ' + f2(it.h)), pal, { size: ped ? 10 : 11, w: 600 });
    });
    s += `<rect x="${X(-1.2)}" y="${Y(0)}" width="${(Lw + 2.4) * k}" height="8" fill="url(#hatch)"/>` + line(X(-1.2), Y(0), X(Lw + 1.2), Y(0), pal.ink, 1.2);
    // kuotat horizontale: dyert, rreshti i parë i dritareve, totali
    let yb = Y(0) + 26;
    const chain = (list) => {
      const pts = [0, Lw];
      list.forEach(it => { pts.push(U(it.c) - it.w / 2, U(it.c) + it.w / 2); });
      const u = Array.from(new Set(pts.map(v => Math.round(v * 1000) / 1000))).sort((a, b) => a - b);
      for (let i = 0; i < u.length - 1; i++) if (u[i + 1] - u[i] > 0.01) s += dimH(X(u[i]), X(u[i + 1]), yb, (u[i + 1] - u[i]) * k > 26 ? f2(u[i + 1] - u[i]) : '', pal);
      yb += 16;
    };
    const dl = items.filter(it => it.kind === 'door');
    if (dl.length) chain(dl);
    if (winRows.length) { const r0 = winRows[0], wl = items.filter(it => it.kind === 'win' && Math.abs(it.y0 - r0.y0) < 1e-3); if (wl.length <= 14) chain(wl); }
    if (gab && xs.length > 2) { for (let i = 0; i < xs.length - 1; i++) { const a = Math.min(U(xs[i]), U(xs[i + 1])), b = Math.max(U(xs[i]), U(xs[i + 1])); s += dimH(X(a), X(b), yb, f2(b - a), pal); } yb += 16; }
    s += dimH(X(0), X(Lw), yb, (gab ? 'W = ' : 'L = ') + f2(Lw), pal);
    // akset
    if (gab) xs.forEach((x, i) => { s += line(X(U(x)), Y(0) + 10, X(U(x)), yb + 18, pal.dim, 0.5, '6 3 2 3') + bubble(X(U(x)), yb + 28, LET[i] || '?', pal); });
    else for (let i = 0; i <= nb; i++) { s += line(X(U(i * sb)), Y(0) + 10, X(U(i * sb)), yb + 18, pal.dim, 0.5, '6 3 2 3') + bubble(X(U(i * sb)), yb + 28, String(i + 1), pal); }
    // kuotat vertikale
    const hL = gab ? yR(flip ? W : 0) : hw;
    s += dimV(Y(hL), Y(0), X(0) - 40, (gab ? 'H = ' : '') + f2(hL), pal, X(0) - 2, true);
    if (Hr > hw + 0.05) s += dimV(Y(Hr), Y(0), X(Lw) + 34, (inp.roof === 'duo' ? 'Kulmi ' : 'H max ') + f2(Hr), pal, X(Lw) + 2, false);
    winRows.slice(0, 3).forEach((r, i) => {
      const xv = X(Lw) + 56 + i * 20;
      s += dimV(Y(r.y0), Y(0), xv, f2(r.y0), pal, X(Lw) + 2, false);
      s += dimV(Y(r.y1), Y(r.y0), xv, f2(r.y1 - r.y0), pal, null, false);
      s += dimV(Y(hw), Y(r.y1), xv, f2(hw - r.y1), pal, null, false);
    });
    if (!items.length) s += txt(X(Lw / 2), Y(hw / 2), 'pa hapje', pal, { size: 12, fill: pal.dim });
    s += titleBlock(VW, VH, pal, meta, FNAME[sd]);
    s += wm(VW, VH, pal, meta);
    return s + '</svg>';
  }
  const side = (res, inp, pal, meta) => facade(res, inp, pal, meta, 'right');
  const front = (res, inp, pal, meta) => facade(res, inp, pal, meta, 'front');

  // SVG → PNG (dataURL) për PDF
  function toPNG(svg, scale) {
    return new Promise((resolve, reject) => {
      const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      const w = +m[1], h = +m[2], sc = scale || 2;
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc;
        const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ url: c.toDataURL('image/png'), w, h });
      };
      img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }
  return { section, plan, side, front, facade, FNAME, toPNG };
})();
