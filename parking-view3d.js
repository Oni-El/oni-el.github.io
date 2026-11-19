/* Oni-El · Parkingje: modeli 3D (three.js r128). Boshtet: X = gjatësia e parkingut, Y = lart, Z = thellësia (para = +Z). */
window.ParkView3D = (function () {
  'use strict';
  let el, renderer, scene, camera, controls, root, ready = false, cars = true, last = null, raf = 0, dirty = true, sun;
  const C = { steel: 0x9aa7b4, pv: 0x1d2c4a, pvFrame: 0xc9d1d9, sheet: 0xb9c2ca, sandwich: 0xe9e6dc, poly: 0xcfe6ff, ground: 0x2a3036, line: 0xe8eaf0, grass: 0x23382a, gutter: 0x8d99a6, close: 0xb9c2ca, led: 0xfff3c4, ev: 0x16a34a };
  const CAR = [0xd9dde2, 0x2b2f36, 0x8a1c1c, 0x2f4f7f, 0x6b7280, 0xf1f1ef, 0x3f5d4a, 0x9c6b2f];

  function init(container) {
    el = container;
    if (!window.THREE) return;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch (e) { el.insertAdjacentHTML('beforeend', '<p style="padding:20px;color:#a0aab8">Shfletuesi nuk e shfaq dot modelin 3D.</p>'); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0f1722);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.addEventListener('change', () => { dirty = true; });
    scene.add(new THREE.HemisphereLight(0xdfe8f5, 0x2a2f36, 0.75));
    sun = new THREE.DirectionalLight(0xffffff, 0.95); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006;
    scene.add(sun); scene.add(sun.target);
    ready = true;
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el);
    resize(); loop();
  }
  function resize() { if (!ready) return; const w = el.clientWidth || 600, h = el.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; }
  function loop() { raf = requestAnimationFrame(loop); if (controls.update() || dirty) { renderer.render(scene, camera); dirty = false; } }
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.15 }, o || {}));
  function box(w, h, d, m, x, y, z, parent) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.castShadow = true; g.receiveShadow = true; (parent || root).add(g); return g; }

  // element i pjerrët në drejtimin Z (nga z0,y0 te z1,y1), me prerje w × h, në X = x
  function slant(w, h, m, x, z0, y0, z1, y1, parent) {
    const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy);
    const g = box(w, h, len, m, x, (y0 + y1) / 2, (z0 + z1) / 2, parent);
    g.rotation.x = -Math.atan2(dy, dz);
    return g;
  }

  function build(res) {
    if (!ready || !res) return;
    last = res;
    if (root) { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    root = new THREE.Group(); scene.add(root);
    const i = res.inp, g = res.geo, L = g.L, D = g.D;
    const bh = res.beam.sec.h / 1000, bb = res.beam.sec.b / 1000;
    const ph = res.purlin.sec.h / 1000, pb = res.purlin.sec.b / 1000;
    const ch = res.col.sec.h / 1000, cb = res.col.sec.b / 1000;
    const mSteel = mat(C.steel, { metalness: 0.45, roughness: 0.45 });
    // sipërfaqja e parkingut
    const pad = 3;
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(L, D) + 400, Math.max(L, D) + 400), mat(C.grass, { roughness: 1 }));
    gr.rotation.x = -Math.PI / 2; gr.position.set(L / 2, -0.02, D / 2); gr.receiveShadow = true; root.add(gr);
    const asph = new THREE.Mesh(new THREE.PlaneGeometry(L + 2 * pad, D + 2 * pad + (i.model === 'konsol' || i.model === 'portal' ? 6 : 6)), mat(C.ground, { roughness: 0.95 }));
    asph.rotation.x = -Math.PI / 2; asph.position.set(L / 2, -0.01, D / 2 + 3); asph.receiveShadow = true; root.add(asph);
    const mLine = new THREE.MeshBasicMaterial({ color: C.line });
    const x0 = 0.15;
    g.carRows.forEach(r => {
      for (let k = 0; k <= i.nSpaces; k++) box(0.08, 0.004, r.x1 - r.x0 - 0.2, mLine, x0 + k * i.spaceW, 0.002, (r.x0 + r.x1) / 2 + (r.dir > 0 ? 0.1 : -0.1));
    });
    // kolonat dhe pllakat e bazës
    g.cols.forEach(xc => g.ys.forEach(y => {
      const top = g.zAt(xc);
      box(cb, top, ch, mSteel, y, top / 2, xc);
      box(cb + 0.16, 0.02, ch + 0.16, mSteel, y, 0.01, xc);
    }));
    // trarët kryesorë (njëri pas tjetrit sipas faqeve të çatisë)
    g.ys.forEach(y => g.planes.forEach(p => {
      const za = g.zAt(p.x0), zb = g.zAt(p.x1);
      slant(bb, bh, mSteel, y, p.x0, za + bh / 2, p.x1, zb + bh / 2);
    }));
    // trarët e çatisë
    const top = x => g.zAt(x) + bh;
    g.planes.forEach(p => {
      const n = Math.max(2, Math.round(res.purlin.n * p.ext / g.planes.reduce((a, q) => a + q.ext, 0)));
      for (let k = 0; k < n; k++) {
        const x = p.x0 + 0.12 + (p.ext - 0.24) * k / (n - 1);
        box(L, ph, pb, mSteel, L / 2, top(x) + ph / 2, x);
      }
    });
    const cov = x => top(x) + ph;
    // mbulesa
    if (i.cover === 'pv' && res.pv) {
      const S = res.pv.spec, geom = new THREE.BoxGeometry(S.W, 0.035, S.L);
      const mPv = mat(C.pv, { roughness: 0.25, metalness: 0.5 });
      const total = res.pv.planes.reduce((a, q) => a + q.n, 0);
      const inst = new THREE.InstancedMesh(geom, mPv, Math.max(1, total)); inst.castShadow = true; inst.receiveShadow = true;
      const frame = new THREE.InstancedMesh(new THREE.BoxGeometry(S.W + 0.01, 0.03, S.L + 0.01), mat(C.pvFrame, { metalness: 0.6, roughness: 0.4 }), Math.max(1, total));
      const o = new THREE.Object3D(); let n = 0;
      g.planes.forEach((p, pi) => {
        const lay = res.pv.planes[pi]; if (!lay || !lay.n) return;
        const usedL = lay.along * (S.W + S.gap), startX = (L - usedL) / 2 + S.W / 2;
        const dirUp = p.low === p.x0 ? 1 : -1;              // drejtimi nga ana e ulët në të lartën
        const ang = Math.atan2(p.rise, p.ext);
        const usedS = lay.across * (S.L + S.gap), s0 = (p.slope - usedS) / 2 + S.L / 2;
        for (let a = 0; a < lay.across; a++) {
          const sd = s0 + a * (S.L + S.gap), dx = sd * Math.cos(ang);
          const z = p.low + dirUp * dx;
          for (let b = 0; b < lay.along; b++) {
            o.position.set(startX + b * (S.W + S.gap), cov(z) + 0.03, z);
            o.rotation.set(dirUp * -ang, 0, 0); o.updateMatrix();
            inst.setMatrixAt(n, o.matrix);
            o.position.y -= 0.004; o.updateMatrix(); frame.setMatrixAt(n, o.matrix); n++;
          }
        }
      });
      inst.count = n; frame.count = n; root.add(frame); root.add(inst);
    } else {
      const m = i.cover === 'poly' ? mat(C.poly, { transparent: true, opacity: 0.45, roughness: 0.2, metalness: 0, depthWrite: false })
        : i.cover === 'sandwich' ? mat(C.sandwich, { roughness: 0.55 }) : mat(C.sheet, { metalness: 0.5, roughness: 0.4 });
      const th = i.cover === 'sandwich' ? 0.04 : 0.012;
      g.planes.forEach(p => {
        const sh = slant(L + 0.1, th, m, L / 2, p.x0 - 0.05 * (p.x0 === 0 ? 1 : 0), cov(p.x0) + th / 2, p.x1 + 0.05 * (p.x1 === D ? 1 : 0), cov(p.x1) + th / 2);
        if (i.cover === 'poly') sh.castShadow = false;
        if (i.cover === 'sheet') {   // brinjët e llamarinës
          const nr = Math.floor(L / 0.25);
          const rib = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, p.slope), m, nr); const o = new THREE.Object3D();
          for (let k = 0; k < nr; k++) { o.position.set(0.12 + k * 0.25, (cov(p.x0) + cov(p.x1)) / 2 + 0.025, (p.x0 + p.x1) / 2); o.rotation.set(-Math.atan2(cov(p.x1) - cov(p.x0), p.ext), 0, 0); o.updateMatrix(); rib.setMatrixAt(k, o.matrix); }
          root.add(rib);
        }
      });
    }
    // ulluqet dhe ulluqet zbritëse
    if (res.opts.gutter) {
      const mg = mat(C.gutter, { metalness: 0.5 });
      const lows = [...new Set(g.planes.map(p => p.low))];
      lows.forEach(x => {
        box(L, 0.12, 0.16, mg, L / 2, g.zAt(x) + bh - 0.04, x);
        const atCol = g.cols.some(c => Math.abs(c - x) < 0.6);
        const ys = atCol ? g.ys : [g.ys[0], g.ys[g.ys.length - 1]];
        ys.forEach(y => { const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, g.zAt(x) + bh), mg); cyl.position.set(y + (atCol ? cb / 2 + 0.07 : 0), (g.zAt(x) + bh) / 2, atCol ? g.cols.find(c => Math.abs(c - x) < 0.6) + ch / 2 + 0.06 : x); root.add(cyl); });
      });
    }
    // mbyllja anësore
    if (res.opts.closure) {
      const m = res.opts.closure.mat === 'poly' ? mat(C.poly, { transparent: true, opacity: 0.4, depthWrite: false }) : mat(res.opts.closure.mat === 'sandwich' ? C.sandwich : C.close, { metalness: 0.4, transparent: true, opacity: 0.85 });
      const hb = g.zAt(0.01);
      box(L, hb - 0.3, 0.04, m, L / 2, 0.3 + (hb - 0.3) / 2, -0.03);
      if (i.closure === 'back_ends') {
        [0, L].forEach(y => g.planes.forEach(p => {
          const shp = new THREE.Shape(); shp.moveTo(p.x0, 0.3); shp.lineTo(p.x1, 0.3); shp.lineTo(p.x1, g.zAt(p.x1)); shp.lineTo(p.x0, g.zAt(p.x0)); shp.lineTo(p.x0, 0.3);
          const mm = new THREE.Mesh(new THREE.ShapeGeometry(shp), m); mm.material.side = THREE.DoubleSide; mm.rotation.y = -Math.PI / 2; mm.position.x = y + (y === 0 ? -0.03 : 0.03); root.add(mm);
        }));
      }
    }
    // ndriçimi LED nën strehë
    if (res.opts.led) {
      const ml = new THREE.MeshBasicMaterial({ color: C.led });
      g.carRows.forEach(r => { for (let k = 0; k < Math.ceil(i.nSpaces / 2); k++) { const y = x0 + (2 * k + 1) * i.spaceW; const z = (r.x0 + r.x1) / 2; box(0.5, 0.03, 0.12, ml, Math.min(y, L - 0.3), g.zAt(z) + bh - 0.03, z); } });
    }
    // karikuesit
    if (res.opts.ev) {
      const me = mat(0xe8eaf0, { roughness: 0.4 }), mg = new THREE.MeshBasicMaterial({ color: C.ev });
      const spots = [];
      g.carRows.forEach(r => g.ys.forEach(y => { const xc = g.cols.find(c => c >= r.x0 - 0.6 && c <= r.x1 + 0.6); spots.push({ y, z: xc != null ? xc + (r.dir > 0 ? ch / 2 + 0.1 : -ch / 2 - 0.1) : r.x0 + 0.3 }); }));
      spots.slice(0, res.opts.ev.n).forEach(s => { box(0.32, 0.5, 0.16, me, s.y, 1.25, s.z); box(0.2, 0.03, 0.17, mg, s.y, 1.42, s.z); });
    }
    // makinat (profil i thjeshtë me xhama dhe rrota, instancë për çdo vend të zënë)
    if (cars) {
      const W = 1.74, prof = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => sh.lineTo(q[0], q[1])); sh.closePath(); return sh; };
      const ext = (sh, w) => { const g = new THREE.ExtrudeGeometry(sh, { depth: w - 0.12, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 4 }); g.rotateY(-Math.PI / 2); g.translate((w - 0.12) / 2, 0, 0); return g; };
      const bodyG = ext(prof([[-2.12, 0.32], [-2.15, 0.62], [-2.05, 0.9], [-1.4, 0.97], [1.05, 0.98], [1.95, 0.84], [2.15, 0.62], [2.12, 0.32], [1.75, 0.3], [1.68, 0.5], [1.0, 0.5], [0.93, 0.3], [-0.93, 0.3], [-1.0, 0.5], [-1.68, 0.5], [-1.75, 0.3]]), W);
      const glassG = ext(prof([[-1.45, 0.96], [-1.05, 1.4], [0.25, 1.44], [1.02, 0.97]]), W - 0.14);
      const wheelG = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20); wheelG.rotateZ(Math.PI / 2);
      const n = g.spaces;
      const mb = new THREE.InstancedMesh(bodyG, mat(0xffffff, { roughness: 0.3, metalness: 0.55 }), n);
      const mg = new THREE.InstancedMesh(glassG, mat(0x1b2633, { roughness: 0.08, metalness: 0.6 }), n);
      const mw = new THREE.InstancedMesh(wheelG, mat(0x16181b, { roughness: 0.8 }), n * 4);
      mb.castShadow = mg.castShadow = mw.castShadow = true; mb.receiveShadow = true;
      const o = new THREE.Object3D(), w = new THREE.Object3D(), col = new THREE.Color(); let k = 0, s = 7;
      g.carRows.forEach(r => { for (let j = 0; j < i.nSpaces; j++) {
        s = (s * 9301 + 49297) % 233280; if (s / 233280 < 0.22) continue;
        const y = x0 + (j + 0.5) * i.spaceW, z = (r.x0 + r.x1) / 2 + (r.dir > 0 ? -0.1 : 0.1);
        const rot = r.dir > 0 ? Math.PI : 0;
        o.position.set(y, 0, z); o.rotation.set(0, rot, 0); o.updateMatrix();
        mb.setMatrixAt(k, o.matrix); mg.setMatrixAt(k, o.matrix);
        mb.setColorAt(k, col.setHex(CAR[(s >> 3) % CAR.length]));
        [[-0.76, -1.35], [0.76, -1.35], [-0.76, 1.33], [0.76, 1.33]].forEach((q, m) => {
          const c = Math.cos(rot), sn = Math.sin(rot);
          w.position.set(y + q[0] * c + q[1] * sn, 0.32, z - q[0] * sn + q[1] * c); w.rotation.set(0, rot, 0); w.updateMatrix(); mw.setMatrixAt(k * 4 + m, w.matrix);
        });
        k++;
      } });
      mb.count = mg.count = k; mw.count = k * 4; if (mb.instanceColor) mb.instanceColor.needsUpdate = true;
      root.add(mb); root.add(mg); root.add(mw);
    }
    fit(res);
    dirty = true;
  }
  let view = 'iso';
  function fit(res) {
    const g = res.geo, cx = g.L / 2, cz = g.D / 2, R = Math.max(g.L, g.D, 8);
    const ty = g.hmax * 0.5;
    controls.target.set(cx, ty, cz);
    const d = R * 1.15 + 4;
    if (view === 'front') camera.position.set(cx, g.hmax * 0.8, g.D + d);
    else if (view === 'side') camera.position.set(g.L + d, g.hmax * 0.9, cz);
    else if (view === 'top') camera.position.set(cx + 0.01, d * 1.5, cz + 0.01);
    else camera.position.set(cx + d * 0.75, d * 0.55, g.D + d * 0.7);
    sun.position.set(cx + R * 0.6, R * 1.4 + 10, cz + R * 0.9); sun.target.position.set(cx, 0, cz);
    const sc = sun.shadow.camera; const e = R * 0.9 + 6; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 1; sc.far = R * 4 + 40; sc.updateProjectionMatrix();
    camera.near = 0.1; camera.far = R * 20 + 200; camera.updateProjectionMatrix();
    controls.update(); dirty = true;
  }
  function setView(v) { view = v; if (last) fit(last); }
  // pamje e lirë (për renderat e faqes): az/el në gradë, dist si shumëfish i distancës standarde, sfond dhe mjegull
  function look(o) {
    if (!ready) return;
    if (o.bg != null) { scene.background = new THREE.Color(o.bg); scene.fog = o.fog ? new THREE.Fog(o.bg, o.fog[0], o.fog[1]) : null; }
    if (last && o.az != null) {
      const g = last.geo, cx = g.L / 2, cz = g.D / 2, R = Math.max(g.L, g.D, 8);
      const d = (o.dist || 1) * (R * 1.15 + 4), el = (o.el || 25) * Math.PI / 180, az = o.az * Math.PI / 180;
      controls.target.set(cx + (o.dx || 0), o.ty != null ? o.ty : g.hmax * 0.45, cz + (o.dz || 0));
      camera.position.set(cx + (o.dx || 0) + d * Math.cos(el) * Math.sin(az), d * Math.sin(el), cz + (o.dz || 0) + d * Math.cos(el) * Math.cos(az));
      if (o.fov) { camera.fov = o.fov; camera.updateProjectionMatrix(); }
      if (o.fogRel && o.bg != null) scene.fog = new THREE.Fog(o.bg, d * o.fogRel[0], d * o.fogRel[1]);
      controls.update();
    }
    dirty = true;
  }
  function setCars(v) { cars = !!v; if (last) build(last); }
  function snapshot() { if (!ready) return null; renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }
  return { init, build, resize, setView, setCars, snapshot, look, get ready() { return ready; } };
})();

/* Planimetria (SVG) nga lart: vendet, kolonat, korsitë, streha */
window.ParkPlan = function (res, pal) {
  const i = res.inp, g = res.geo, P = pal || {};
  const ink = P.ink || '#e8eaf0', dim = P.dim || '#8392a6', acc = P.accent || '#f4a012', st = P.steel || '#7fb0d8', bg = P.bg || '#162030';
  const m = 1.6, W = g.L + 2 * m, H = g.D + 2 * m + 1.2, s = 1000 / W, f = v => (v * s).toFixed(1);
  const X = y => f(y + m), Y = x => f(x + m + 0.6);
  let h = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" font-family="Inter,Arial,sans-serif">`;
  h += `<rect width="100%" height="100%" fill="${bg}"/>`;
  g.aisles.forEach(a => { h += `<rect x="${X(0)}" y="${Y(a.x0)}" width="${f(g.L)}" height="${f(a.x1 - a.x0)}" fill="rgba(255,255,255,.04)"/><text x="${X(g.L / 2)}" y="${Y((a.x0 + a.x1) / 2)}" fill="${dim}" font-size="${f(0.45)}" text-anchor="middle" dominant-baseline="middle">korsi ${String(i.aisle).replace('.', ',')} m</text>`; });
  let nr = 0;
  g.carRows.forEach(r => { for (let j = 0; j < i.nSpaces; j++) { nr++; const y0 = 0.15 + j * i.spaceW; h += `<rect x="${X(y0)}" y="${Y(r.x0)}" width="${f(i.spaceW)}" height="${f(r.x1 - r.x0)}" fill="none" stroke="${dim}" stroke-width="${f(0.03)}"/><text x="${X(y0 + i.spaceW / 2)}" y="${Y((r.x0 + r.x1) / 2)}" fill="${dim}" font-size="${f(0.42)}" text-anchor="middle" dominant-baseline="middle">${nr}</text>`; } });
  h += `<rect x="${X(0)}" y="${Y(0)}" width="${f(g.L)}" height="${f(g.D)}" fill="none" stroke="${acc}" stroke-width="${f(0.06)}" stroke-dasharray="${f(0.35)} ${f(0.2)}"/>`;
  g.planes.forEach(p => { if (p.x0 > 0) h += `<line x1="${X(0)}" y1="${Y(p.x0)}" x2="${X(g.L)}" y2="${Y(p.x0)}" stroke="${acc}" stroke-width="${f(0.03)}" stroke-dasharray="${f(0.2)} ${f(0.2)}" opacity=".6"/>`; });
  const cw = Math.max(0.22, res.col.sec.b / 1000), cd = Math.max(0.22, res.col.sec.h / 1000);
  g.cols.forEach(xc => g.ys.forEach(y => { h += `<rect x="${X(y - cw / 2)}" y="${Y(xc - cd / 2)}" width="${f(cw)}" height="${f(cd)}" fill="${st}"/>`; }));
  const ty = m - 0.9;
  h += `<line x1="${X(0)}" y1="${f(ty + 0.6)}" x2="${X(g.L)}" y2="${f(ty + 0.6)}" stroke="${ink}" stroke-width="${f(0.03)}"/><text x="${X(g.L / 2)}" y="${f(ty + 0.4)}" fill="${ink}" font-size="${f(0.5)}" text-anchor="middle">${String(Math.round(g.L * 100) / 100).replace('.', ',')} m</text>`;
  h += `<text x="${f(m - 0.4)}" y="${Y(g.D / 2)}" fill="${ink}" font-size="${f(0.5)}" text-anchor="middle" transform="rotate(-90 ${f(m - 0.4)} ${Y(g.D / 2)})">${String(Math.round(g.D * 100) / 100).replace('.', ',')} m</text>`;
  h += `<text x="${X(g.L)}" y="${f(H - 0.25)}" fill="${dim}" font-size="${f(0.4)}" text-anchor="end">Para (hyrja e makinave) ↓</text>`;
  return h + '</svg>';
};
