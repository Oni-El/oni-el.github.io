/* Oni-El · Parkingje: modeli 3D (three.js r128). Boshtet: X = gjatësia e parkingut, Y = lart, Z = thellësia (para = +Z). */
window.ParkView3D = (function () {
  'use strict';
  let el, renderer, scene, camera, controls, root, ready = false, cars = true, last = null, raf = 0, dirty = true, sun, hemi, night = false, dayBg = 0x0f1722;
  const TEX = {};
  // tekstura të vizatuara në canvas (ndriçimi i tokës, simboli i karikimit, etiketat)
  function canvasTex(key, w, h, draw) {
    if (TEX[key]) return TEX[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; TEX[key] = t; return t;
  }
  const glowTex = () => canvasTex('glow', 256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,236,190,0.95)'); g.addColorStop(0.35, 'rgba(255,220,160,0.45)'); g.addColorStop(1, 'rgba(255,210,150,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const boltTex = () => canvasTex('bolt', 256, 256, (x) => { x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.moveTo(150, 18); x.lineTo(62, 142); x.lineTo(120, 142); x.lineTo(98, 238); x.lineTo(196, 104); x.lineTo(136, 104); x.closePath(); x.fill(); });
  function labelSprite(text, sub) {
    const t = canvasTex('lbl:' + text + '|' + (sub || ''), 512, sub ? 168 : 112, (x, w, h) => {
      x.font = '700 46px Inter, Arial, sans-serif'; const tw = x.measureText(text).width; x.font = '500 34px Inter, Arial, sans-serif'; const sw = sub ? x.measureText(sub).width : 0;
      const bw = Math.min(w - 8, Math.max(tw, sw) + 56), bx = (w - bw) / 2;
      x.fillStyle = 'rgba(10,14,20,0.86)'; x.strokeStyle = '#f4a012'; x.lineWidth = 5;
      const r = 18; x.beginPath(); x.moveTo(bx + r, 4); x.arcTo(bx + bw - 4, 4, bx + bw - 4, h - 4, r); x.arcTo(bx + bw - 4, h - 4, bx + 4, h - 4, r); x.arcTo(bx + 4, h - 4, bx + 4, 4, r); x.arcTo(bx + 4, 4, bx + bw - 4, 4, r); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 46px Inter, Arial, sans-serif'; x.fillText(text, w / 2, sub ? 56 : h / 2);
      if (sub) { x.fillStyle = '#f4a012'; x.font = '500 34px Inter, Arial, sans-serif'; x.fillText(sub, w / 2, 118); }
    });
    // madhësi e njëjtë në ekran pavarësisht distancës (≈50 px e lartë)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
    const H = Math.max(240, el.clientHeight || 500), px = Math.min(56, Math.max(40, H * 0.085)) * (sub ? 1 : 0.7);
    const hgt = px / H * 2 * Math.tan(camera.fov * Math.PI / 360); sp.scale.set(hgt * 512 / (sub ? 168 : 112), hgt, 1); sp.renderOrder = 10; return sp;
  }
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
    hemi = new THREE.HemisphereLight(0xdfe8f5, 0x2a2f36, 0.75); scene.add(hemi);
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
    // ndriçimi LED nën strehë: ndriçues me xham; natën ndizen dhe ndriçojnë tokën
    if (res.opts.led) {
      const mh = mat(0x3a4048, { metalness: 0.5, roughness: 0.4 });
      const ml = night ? new THREE.MeshBasicMaterial({ color: 0xfff6dc }) : mat(0xf2f2ee, { roughness: 0.3, emissive: 0x333333 });
      const fx = [];
      g.carRows.forEach(r => { for (let k = 0; k < Math.ceil(i.nSpaces / 2); k++) { const y = Math.min(x0 + (2 * k + 1) * i.spaceW, L - 0.3), z = (r.x0 + r.x1) / 2, h = g.zAt(z) + bh - 0.03; box(0.62, 0.05, 0.16, mh, y, h, z); box(0.56, 0.012, 0.1, ml, y, h - 0.03, z); fx.push([y, h, z]); } });
      if (night) {
        const pool = new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        const cone = new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.055, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const step = Math.max(1, Math.ceil(fx.length / 8));
        fx.forEach((f, k) => {
          const rad = Math.min(3.4, f[1] * 1.05);
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(rad * 2, rad * 2), pool); pl.rotation.x = -Math.PI / 2; pl.position.set(f[0], 0.02, f[2]); root.add(pl);
          const cg = new THREE.CylinderGeometry(0.25, rad * 0.75, f[1] - 0.05, 24, 1, true), cm = new THREE.Mesh(cg, cone); cm.position.set(f[0], (f[1] - 0.05) / 2, f[2]); root.add(cm);
          if (k % step === 0) { const lt = new THREE.PointLight(0xffe2b0, 1.6, 9, 2); lt.position.set(f[0], f[1] - 0.25, f[2]); root.add(lt); }
        });
      }
    }
    // vendet me karikues: ngjyrë e gjelbër në tokë, simboli i karikimit, kolonë karikimi dhe kabllo te makina
    const evSpots = [];
    if (res.opts.ev) {
      const all = []; g.carRows.forEach((r, ri) => { for (let j = 0; j < i.nSpaces; j++) all.push({ r, ri, j }); });
      const n = Math.min(res.opts.ev.n, all.length);
      for (let k = 0; k < n; k++) evSpots.push(all[Math.floor((k + 0.5) * all.length / n)]);
      const paint = mat(0x1f8f4e, { transparent: true, opacity: 0.55, roughness: 0.9, depthWrite: false });
      const bolt = new THREE.MeshBasicMaterial({ map: boltTex(), transparent: true, depthWrite: false });
      const mPost = mat(0x2b3138, { metalness: 0.4 }), mBody = mat(0xeef1f4, { roughness: 0.35 }), mFace = mat(0x1a222c, { roughness: 0.2, metalness: 0.4 });
      const mRing = new THREE.MeshBasicMaterial({ color: 0x22e07a }), mCable = mat(0x111315, { roughness: 0.7 });
      evSpots.forEach((e, k) => {
        const r = e.r, yc = x0 + (e.j + 0.5) * i.spaceW, len = r.x1 - r.x0 - 0.3, zc = (r.x0 + r.x1) / 2;
        const pt = new THREE.Mesh(new THREE.PlaneGeometry(i.spaceW - 0.14, len), paint); pt.rotation.x = -Math.PI / 2; pt.position.set(yc, 0.004, zc); root.add(pt);
        const tail = r.dir > 0 ? r.x1 - 0.85 : r.x0 + 0.85;
        const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), bolt); bl.rotation.x = -Math.PI / 2; bl.position.set(yc, 0.006, tail); root.add(bl);
        const nose = r.dir > 0 ? r.x0 : r.x1, inz = r.dir > 0 ? 1 : -1;           // ana nga hyn hunda e makinës
        const py = yc + i.spaceW / 2 - 0.32, pz = nose + inz * 0.32;
        box(0.12, 1.05, 0.12, mPost, py, 0.525, pz);
        box(0.34, 0.48, 0.17, mBody, py, 1.27, pz);
        const face = box(0.26, 0.36, 0.01, mFace, py, 1.29, pz + inz * 0.09);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.085, 32), mRing); ring.position.set(py, 1.33, pz + inz * 0.097); if (inz < 0) ring.rotation.y = Math.PI; root.add(ring);
        box(0.36, 0.02, 0.19, mBody, py, 1.52, pz);
        e.port = [yc + 0.55, 0.72, nose + inz * 0.28]; e.from = [py - 0.17, 1.12, pz + inz * 0.04];
        if (k === Math.floor((evSpots.length - 1) / 2)) { const sp = labelSprite('Karikues ' + String(res.opts.ev.kw).replace('.', ',') + ' kW', res.opts.ev.n > 1 ? res.opts.ev.n + ' vende' : ''); sp.position.set(py, 2.15, pz); root.add(sp); }
      });
      // kabllot lidhen pas vendosjes së makinave
      evSpots.cable = (hasCar) => evSpots.forEach(e => {
        if (!hasCar(e)) { const tor = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 24), mCable); tor.position.set(e.from[0] - 0.03, 0.95, e.from[2]); tor.rotation.y = Math.PI / 2; root.add(tor); return; }
        const a = new THREE.Vector3(...e.from), b = new THREE.Vector3(...e.port);
        const cur = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x - 0.05, 0.25, a.z), new THREE.Vector3((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2), new THREE.Vector3(b.x, 0.35, b.z), b]);
        root.add(new THREE.Mesh(new THREE.TubeGeometry(cur, 40, 0.018, 8, false), mCable));
      });
    }
    // inverteri dhe bateritë: kabinë teknike në skajin e djathtë të strehës
    const eqInv = res.opts.inverter, eqBat = res.opts.battery;
    if (eqInv || eqBat) {
      const nb = eqBat ? Math.min(7, Math.ceil(eqBat.kwh / 15)) : 0;
      const ex = L + 0.9, z0 = i.model === 'konsol' || i.model === 'portal' ? 0.35 : Math.max(0.3, g.cols[0] - 1.6);
      const depth = 0.9 + nb * 0.68 + (eqInv ? 0.9 : 0);
      box(1.3, 0.12, depth, mat(0xb9bdc2, { roughness: 0.9 }), ex + 0.3, 0.06, z0 + depth / 2 - 0.2);
      const mCab = mat(0xe9ecef, { roughness: 0.4 }), mDark = mat(0x1d2733, { roughness: 0.25, metalness: 0.4 }), mLed = new THREE.MeshBasicMaterial({ color: 0x22e07a });
      let z = z0 + 0.25;
      if (eqInv) {
        const mFr = mat(0x5b6570, { metalness: 0.5 });
        box(0.06, 1.9, 0.06, mFr, ex + 0.3, 1.07, z - 0.28); box(0.06, 1.9, 0.06, mFr, ex + 0.3, 1.07, z + 0.28); box(0.06, 0.06, 0.62, mFr, ex + 0.3, 1.9, z);
        box(0.24, 0.72, 0.56, mCab, ex + 0.18, 1.4, z);
        box(0.01, 0.2, 0.3, mDark, ex + 0.055, 1.52, z); box(0.012, 0.03, 0.03, mLed, ex + 0.055, 1.33, z + 0.1);
        z += 0.95;
      }
      for (let k = 0; k < nb; k++) {
        box(0.6, 1.3, 0.6, mCab, ex + 0.3, 0.77, z + k * 0.68);
        box(0.01, 0.05, 0.4, mLed, ex - 0.005, 1.3, z + k * 0.68);
        box(0.01, 0.6, 0.45, mDark, ex - 0.005, 0.85, z + k * 0.68);
      }
      // një etiketë e vetme për kabinën teknike
      const nr = v => String(v).replace('.', ',');
      const sp = nb ? labelSprite('Bateri ' + nr(eqBat.kwh) + ' kWh', eqInv ? 'Inverter ' + nr(eqInv.kw) + ' kW' : '') : labelSprite('Inverter', nr(eqInv.kw) + ' kW');
      sp.position.set(ex + 0.3, 2.5, z0 + depth / 2 - 0.2); root.add(sp);
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
        s = (s * 9301 + 49297) % 233280; const isEv = evSpots.some(e => e.r === r && e.j === j); if (s / 233280 < 0.22 && !isEv) continue;
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
    if (evSpots.cable) evSpots.cable(() => cars);
    fit(res);
    dirty = true;
  }
  let view = 'iso';
  function fit(res) {
    // kabina e inverterit/baterive në skaj hyn në kuadër
    const g = res.geo, eq = res.opts && (res.opts.inverter || res.opts.battery) ? 2.2 : 0, cx = (g.L + eq) / 2, cz = g.D / 2, R = Math.max(g.L + eq, g.D, 8);
    const ty = g.hmax * 0.5;
    controls.target.set(cx, ty, cz);
    // në ekrane të ngushta (celular) kamera largohet që modeli të hyjë i tëri në gjerësi
    const asp = camera.aspect, k = asp < 1 ? 1.1 / Math.max(0.5, asp) : (view === 'iso' && asp > 1.2 ? 0.85 : 1);
    const d = (R * 1.15 + 4) * k;
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
    if (o.bg != null) { dayBg = o.bg; scene.background = new THREE.Color(o.bg); scene.fog = o.fog ? new THREE.Fog(o.bg, o.fog[0], o.fog[1]) : null; }
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
  // dita / nata: natën shihet ndriçimi LED dhe dritat e pajisjeve
  function setNight(v) {
    night = !!v; if (!ready) return;
    if (night) { scene.background = new THREE.Color(0x04070c); hemi.intensity = 0.14; hemi.color.setHex(0x6f86ad); sun.intensity = 0.12; sun.color.setHex(0x9fb3d6); }
    else { scene.background = new THREE.Color(dayBg); hemi.intensity = 0.75; hemi.color.setHex(0xdfe8f5); sun.intensity = 0.95; sun.color.setHex(0xffffff); }
    if (last) build(last); dirty = true;
  }
  function snapshot() { if (!ready) return null; renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }
  return { init, build, resize, setView, setCars, setNight, snapshot, look, get ready() { return ready; }, get night() { return night; } };
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
