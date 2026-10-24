/* Modeli 3D (three.js r128) */
window.View3D = (function () {
  'use strict';
  let renderer, scene, camera, controls, root, el, ground, grid, hemi, sun, ready = false;
  let groups = {}, mats = {}, geoCache = {}, bounds = { r: 30, cx: 0, cy: 3, cz: 0, W: 20, L: 40 };
  let cladMode = 1; // 0 struktura, 1 transparente, 2 e mbyllur
  let curView = 'iso', userMoved = false;
  const vis = { purl: true, mezz: true, axes: true };

  function css(name, fb) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  function init(container) {
    el = container;
    if (!window.THREE) { el.innerHTML = '<div class="v3d-err">Modeli 3D nuk u ngarkua (biblioteka three.js mungon). Llogaritjet funksionojnë normalisht.</div>'; return false; }
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.addEventListener('change', render);
    controls.addEventListener('start', () => { userMoved = true; });
    hemi = new THREE.HemisphereLight(0xffffff, 0x8a949c, 0.75);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun); scene.add(sun.target);
    const amb = new THREE.AmbientLight(0xffffff, 0.12); scene.add(amb);
    root = new THREE.Group(); scene.add(root);
    ['frame', 'purl', 'brace', 'mezz', 'stair', 'clad', 'axes', 'ground'].forEach(k => { groups[k] = new THREE.Group(); root.add(groups[k]); });
    mats.frame = new THREE.MeshStandardMaterial({ color: 0x3f6383, metalness: 0.35, roughness: 0.55 });
    mats.purl = new THREE.MeshStandardMaterial({ color: 0xa3adb5, metalness: 0.5, roughness: 0.45 });
    mats.post = new THREE.MeshStandardMaterial({ color: 0x5d7f9c, metalness: 0.35, roughness: 0.55 });
    mats.brace = new THREE.MeshStandardMaterial({ color: 0xd08f14, metalness: 0.3, roughness: 0.5 });
    mats.mezzB = new THREE.MeshStandardMaterial({ color: 0x2f7470, metalness: 0.3, roughness: 0.55 });
    mats.slab = new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: 0.9, metalness: 0 });
    mats.grate = new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.65 });
    mats.stair = new THREE.MeshStandardMaterial({ color: 0x4c5963, metalness: 0.4, roughness: 0.5 });
    mats.rail = new THREE.MeshStandardMaterial({ color: 0xc9ced2, metalness: 0.5, roughness: 0.4 });
    const stripes = (base, ln, frac) => {
      const c = document.createElement('canvas'); c.width = 4; c.height = 64;
      const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 4, 64); x.fillStyle = ln; x.fillRect(0, 0, 4, Math.max(2, Math.round(64 * frac)));
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t;
    };
    mats.roof = new THREE.MeshStandardMaterial({ map: stripes('#a7b1b9', '#7f8a93', 0.16), color: 0xffffff, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false });
    mats.wall = new THREE.MeshStandardMaterial({ map: stripes('#e2e6e9', '#b9c0c6', 0.04), color: 0xffffff, roughness: 0.65, metalness: 0.15, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false });
    mats.sockel = new THREE.MeshStandardMaterial({ color: 0xa9a59c, roughness: 0.95 });
    mats.door = new THREE.MeshStandardMaterial({ color: 0x5b6874, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
    mats.win = new THREE.MeshStandardMaterial({ color: 0x8fb3cc, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    mats.pv = new THREE.MeshStandardMaterial({ color: 0x1d2c4a, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide });
    mats.sky = new THREE.MeshStandardMaterial({ color: 0xcfe6f2, roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    mats.slabG = new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 1 });
    mats.slabG.color.copy(new THREE.Color(css('--view-slab', '#c5c9cc')).convertSRGBToLinear());
    new ResizeObserver(resize).observe(el);
    applyTheme();
    ready = true;
    resize();
    return true;
  }
  function applyTheme() {
    if (!scene) return;
    scene.background = new THREE.Color(css('--view-bg', '#dce3e8'));
    if (ground) ground.material.color.copy(lin(css('--view-ground', '#cdd5db')));
    if (grid) { grid.material.color.copy(lin(css('--view-grid', '#b5c0c9'))); }
    if (mats.slabG) mats.slabG.color.copy(lin(css('--view-slab', '#c5c9cc')));
    render();
  }
  function resize() {
    if (!renderer || !el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    render();
  }
  let raf = 0;
  function render() {
    if (!renderer) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      controls.update();
      renderer.render(scene, camera);
    });
  }
  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.traverse(o => { if (o.geometry && !o.geometry.userData.cached) o.geometry.dispose(); if (o.material && o.material.userData && o.material.userData.own) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    }
  }
  /* --- format seksionesh --- */
  function iShape(h, b, tw, tf) {
    const s = new THREE.Shape();
    const x = b / 2, y = h / 2, w = tw / 2;
    s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, -y + tf); s.lineTo(w, -y + tf); s.lineTo(w, y - tf); s.lineTo(x, y - tf);
    s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, y - tf); s.lineTo(-w, y - tf); s.lineTo(-w, -y + tf); s.lineTo(-x, -y + tf); s.lineTo(-x, -y);
    return s;
  }
  function boxShape(h, b, t) {
    const s = new THREE.Shape();
    s.moveTo(-b / 2, -h / 2); s.lineTo(b / 2, -h / 2); s.lineTo(b / 2, h / 2); s.lineTo(-b / 2, h / 2); s.lineTo(-b / 2, -h / 2);
    if (t) {
      const p = new THREE.Path(); const bi = b / 2 - t, hi = h / 2 - t;
      p.moveTo(-bi, -hi); p.lineTo(-bi, hi); p.lineTo(bi, hi); p.lineTo(bi, -hi); p.lineTo(-bi, -hi);
      s.holes.push(p);
    }
    return s;
  }
  function uShape(h, b, tw, tf) {
    const s = new THREE.Shape();
    s.moveTo(0, -h / 2); s.lineTo(b, -h / 2); s.lineTo(b, -h / 2 + tf); s.lineTo(tw, -h / 2 + tf); s.lineTo(tw, h / 2 - tf); s.lineTo(b, h / 2 - tf); s.lineTo(b, h / 2); s.lineTo(0, h / 2); s.lineTo(0, -h / 2);
    return s;
  }
  function secShape(sec) {
    const k = 0.001;
    if (!sec) return boxShape(0.1, 0.1, 0);
    if (sec.type === 'I') return iShape(sec.h * k, sec.b * k, Math.max(sec.tw, 5) * k, Math.max(sec.tf, 6) * k);
    if (sec.type === 'U') return uShape(sec.h * k, sec.b * k, sec.tw * k, sec.tf * k);
    if (sec.type === 'RHS') return boxShape(sec.h * k, sec.b * k, Math.max(sec.t, 3) * k);
    return boxShape(0.1, 0.1, 0);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // element prizmatik nga a te b; "up" = drejtimi i lartësisë së seksionit
  function member(group, sec, a, b, up, mat, shapeOverride) {
    const dir = b.clone().sub(a); const len = dir.length();
    if (len < 1e-3) return null;
    const key = (sec ? sec.name : 'x') + '|' + len.toFixed(3) + (shapeOverride ? '|o' + shapeOverride.k : '');
    let geo = geoCache[key];
    if (!geo) {
      geo = new THREE.ExtrudeGeometry(shapeOverride ? shapeOverride.s : secShape(sec), { depth: len, bevelEnabled: false, steps: 1, curveSegments: 4 });
      geo.userData.cached = true; geoCache[key] = geo;
    }
    const z = dir.normalize();
    let y = up.clone().sub(z.clone().multiplyScalar(up.dot(z)));
    if (y.lengthSq() < 1e-8) y = Math.abs(z.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    y.normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.quaternion.setFromRotationMatrix(m);
    mesh.position.copy(a);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function rod(group, a, b, r, mat) {
    const dir = b.clone().sub(a); const len = dir.length();
    const key = 'rod|' + r.toFixed(4) + '|' + len.toFixed(3);
    let geo = geoCache[key];
    if (!geo) { geo = new THREE.CylinderGeometry(r, r, len, 6, 1); geo.userData.cached = true; geoCache[key] = geo; }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    group.add(mesh);
  }
  function box(group, cx, cy, cz, sx, sy, sz, mat) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, mat); m.position.set(cx, cy, cz); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
  }
  function quad(group, pts, mat, uv) {
    const g = new THREE.BufferGeometry();
    const p = [], t = [];
    const tri = (a, b, c) => { p.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z, pts[c].x, pts[c].y, pts[c].z); if (uv) t.push(...uv[a], ...uv[b], ...uv[c]); };
    tri(0, 1, 2); tri(0, 2, 3);
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; group.add(m); return m;
  }
  function poly(group, pts2, z, mat, plane) {
    // poligon në planin XY në z; plane 'xy'
    const sh = new THREE.Shape(); pts2.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const g = new THREE.ShapeGeometry(sh);
    const m = new THREE.Mesh(g, mat); m.position.z = z; m.receiveShadow = true; group.add(m); return m;
  }
  function label(group, txt, pos, size) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.strokeStyle = '#33597a'; x.lineWidth = 8;
    x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#18212a'; x.font = '600 ' + (txt.length > 1 ? 50 : 62) + 'px Barlow Condensed, Arial Narrow, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(txt, 64, 68);
    const t = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: t, depthTest: true }); mat.userData.own = true;
    const s = new THREE.Sprite(mat); s.position.copy(pos); s.scale.set(size, size, size); group.add(s);
  }
  function dashed(group, a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const m = new THREE.LineDashedMaterial({ color: 0x5f7a92, dashSize: 0.6, gapSize: 0.3 }); m.userData.own = true;
    const l = new THREE.Line(g, m); l.computeLineDistances(); group.add(l);
  }

  /* --- ndërtimi i modelit --- */
  function build(res, inp) {
    if (!ready || !res) return;
    Object.values(groups).forEach(clearGroup);
    Object.keys(geoCache).forEach(k => { geoCache[k].dispose(); delete geoCache[k]; });
    const fr = res.frame.fr, col = res.frame.col, raf = res.frame.raf;
    const W = inp.W, L = inp.L, nb = res.nBays, s = res.bay;
    const ox = -W / 2, oz = -L / 2;
    const P = (x, y, z) => V(x + ox, y, z + oz);
    const yR = fr.yRoof, xs = fr.xs, H = inp.H;
    const k = 0.001;
    const rh = raf.h * k, ch = col.h * k, cb = col.b * k;
    const slopes = [];
    for (let i = 0; i < xs.length - 1; i++) {
      if (inp.roof === 'duo') { const xm = (xs[i] + xs[i + 1]) / 2; slopes.push([xs[i], xm, 1]); slopes.push([xm, xs[i + 1], -1]); }
    }
    if (inp.roof === 'mono') slopes.push([0, W, 1]);
    const zF = []; for (let i = 0; i <= nb; i++) zF.push(i * s);
    const gF = groups.frame;
    // portalet
    zF.forEach(z => {
      xs.forEach(x => member(gF, col, P(x, 0, z), P(x, yR(x), z), V(1, 0, 0), mats.frame));
      slopes.forEach(([xa, xb]) => {
        const a = P(xa, yR(xa), z), b = P(xb, yR(xb), z);
        const d = b.clone().sub(a); const up = V(-d.y, d.x, 0).normalize();
        member(gF, raf, a, b, up, mats.frame);
      });
      if (fr.Lh > 0) {
        // haunch si pykë nën trarin e çatisë
        xs.forEach((x, ci) => {
          [-1, 1].forEach(sd => {
            const xe = x + sd * fr.Lh;
            if (xe < -1e-6 || xe > W + 1e-6) return;
            const y0 = yR(x), y1 = yR(xe);
            const nrm = rh / 2;
            const sh = new THREE.Shape();
            const pts = [[x, y0 - nrm], [xe, y1 - nrm], [x, y0 - nrm - rh * 0.95]];
            pts.forEach((p, i) => i ? sh.lineTo(p[0] + ox, p[1]) : sh.moveTo(p[0] + ox, p[1]));
            const g = new THREE.ExtrudeGeometry(sh, { depth: raf.b * k * 0.9, bevelEnabled: false });
            const m = new THREE.Mesh(g, mats.frame); m.position.z = z + oz - raf.b * k * 0.45; m.castShadow = true; gF.add(m);
          });
        });
      }
      // pllakat e bazës
      xs.forEach(x => box(gF, x + ox, 0.015, z + oz, ch + 0.12, 0.03, cb + 0.12, mats.frame));
    });
    // rigla e çatisë
    const gP = groups.purl;
    const pur = res.purlin, ph = pur.sec.h * k;
    slopes.forEach(([xa, xb, dirS]) => {
      const a = V(xa, yR(xa), 0), b = V(xb, yR(xb), 0);
      const d = b.clone().sub(a); const len = d.length(); d.normalize();
      const nrm = V(-d.y, d.x, 0);
      const n = pur.nPerSlope;
      for (let q = 0; q < n; q++) {
        let t = q * len / (n - 1);
        if (dirS < 0) t = len - t; // simetri nga streha
        t = Math.min(len - 0.12, Math.max(0.12, t));
        const p = a.clone().add(d.clone().multiplyScalar(t)).add(nrm.clone().multiplyScalar(rh / 2 + ph / 2));
        member(gP, pur.sec, P(p.x, p.y, -0.05), P(p.x, p.y, L + 0.05), nrm, mats.purl);
      }
    });
    // rigla anësore
    const rl = res.rail, rb = rl.sec.b * k, rhh = rl.sec.h * k;
    const sock = Math.min(inp.sockel || 0, H - 1);
    const railY = []; for (let q = 0; q < rl.n; q++) railY.push(Math.min(H - 0.15, sock + 0.25 + q * (H - sock - 0.25) / Math.max(1, rl.n - 1)));
    const xL = -(ch / 2 + rhh / 2), xR = W + ch / 2 + rhh / 2;
    railY.forEach(y => {
      member(gP, rl.sec, P(xL, y, -0.05), P(xL, y, L + 0.05), V(1, 0, 0), mats.purl);
      member(gP, rl.sec, P(xR, y, -0.05), P(xR, y + (inp.roof === 'mono' ? 0 : 0), L + 0.05), V(1, 0, 0), mats.purl);
    });
    if (inp.roof === 'mono') {
      // muri i lartë: rigla shtesë
      const Hr = yR(W);
      for (let y = H + rl.sp; y < Hr - 0.2; y += rl.sp) member(gP, rl.sec, P(xR, y, -0.05), P(xR, y, L + 0.05), V(1, 0, 0), mats.purl);
    }
    // rigla ballore dhe kolonat e timpanit
    const zG = [-(cb / 2 + rhh / 2), L + cb / 2 + rhh / 2];
    const Hmax = Math.max(...xs.map(yR), ...(inp.roof === 'duo' ? xs.slice(0, -1).map((x, i) => yR((x + xs[i + 1]) / 2)) : [yR(W)]));
    for (let y = sock + 0.25; y < Hmax - 0.3; y += rl.sp) {
      zG.forEach(z => {
        if (y <= H - 0.05 || inp.roof === 'mono') {
          let xa = 0, xb = W;
          if (inp.roof === 'mono' && y > H) xa = (y - H) / (inp.slopePct / 100);
          if (xb - xa > 0.3) member(gP, rl.sec, P(xa, y, z), P(xb, y, z), V(0, 0, 1), mats.purl);
        } else {
          for (let i = 0; i < xs.length - 1; i++) {
            const dx = (y - H) / (inp.slopePct / 100);
            const xa = xs[i] + dx, xb = xs[i + 1] - dx;
            if (xb - xa > 0.3) member(gP, rl.sec, P(xa, y, z), P(xb, y, z), V(0, 0, 1), mats.purl);
          }
        }
      });
    }
    if (res.post) {
      res.posts.forEach(p => {
        [0, L].forEach(z => member(gF, res.post.sec, P(p.x, 0, z), P(p.x, yR(p.x) - rh / 2, z), V(0, 0, 1), mats.post));
      });
    }
    // kontraventimet
    const gB = groups.brace, br = res.brace;
    const bays = new Set([0, nb - 1]);
    if (br.nbb >= 3) bays.add(Math.floor((nb - 1) / 2));
    if (br.nbb >= 4) bays.add(Math.min(nb - 2, Math.floor((nb - 1) / 2) + 1));
    const rr = Math.max(0.008, br.roofRod.d * k / 2), wr = Math.max(0.008, br.wallRod.d * k / 2);
    bays.forEach(bi => {
      if (bi < 0 || bi >= nb) return;
      const z0 = zF[bi], z1 = zF[bi + 1];
      slopes.forEach(([xa, xb]) => {
        const np = Math.max(1, Math.round(Math.abs(xb - xa) / Math.max(2.5, br.bp)));
        for (let q = 0; q < np; q++) {
          const x0 = xa + (xb - xa) * q / np, x1 = xa + (xb - xa) * (q + 1) / np;
          const y0 = yR(x0) + rh / 2 + 0.01, y1 = yR(x1) + rh / 2 + 0.01;
          rod(gB, P(x0, y0, z0), P(x1, y1, z1), rr, mats.brace);
          rod(gB, P(x1, y1, z0), P(x0, y0, z1), rr, mats.brace);
        }
      });
      [0, W].forEach(x => {
        const ht = yR(x), tiers = br.tiers;
        for (let t = 0; t < tiers; t++) {
          const ya = ht * t / tiers + 0.2, yb = ht * (t + 1) / tiers - (t === tiers - 1 ? 0.2 : 0);
          rod(gB, P(x, ya, z0), P(x, yb, z1), wr, mats.brace);
          rod(gB, P(x, ya, z1), P(x, yb, z0), wr, mats.brace);
        }
      });
    });
    // shufrat e strehës dhe kulmit
    const ridgeXs = inp.roof === 'duo' ? xs.slice(0, -1).map((x, i) => (x + xs[i + 1]) / 2) : [];
    [...xs, ...ridgeXs].forEach(x => {
      const y = yR(x) - (ridgeXs.includes(x) ? rh * 0.7 : rh * 0.9);
      member(gB, br.strut.sec, P(x, y, 0), P(x, y, L), V(0, 1, 0), mats.purl);
    });
    // mezanina
    let mz = null;
    if (res.mezz) {
      const m = res.mezz, gM = groups.mezz;
      const inset = 0.35;
      const mWd = Math.min(m.W, W - 2 * inset), mLd = Math.min(m.L, L - 2 * inset);
      const x0 = inset, z0 = inset;
      const th = inp.mDeck === 'komp' ? inp.mSlab / 100 : inp.mDeck === 'lot' ? 0.008 : 0.03;
      const top = m.Hm + (inp.mDeck === 'komp' ? th : 0);
      const b1 = m.sec1.sec, b2 = m.sec2.sec;
      const yb = m.Hm - b1.h * k / 2;
      const gxs = [], gzs = [];
      for (let i = 0; i <= m.nx; i++) gxs.push(x0 + mWd * i / m.nx);
      for (let j = 0; j <= m.ny; j++) gzs.push(z0 + mLd * j / m.ny);
      gxs.forEach(x => gzs.forEach(z => member(gM, m.col.sec, P(x, 0, z), P(x, m.Hm - b1.h * k, z), V(1, 0, 0), mats.mezzB)));
      gzs.forEach(z => member(gM, b1, P(x0, yb, z), P(x0 + mWd, yb, z), V(0, 1, 0), mats.mezzB));
      const nsec = m.nx * m.nsec;
      for (let i = 0; i <= nsec; i++) {
        const x = x0 + mWd * i / nsec;
        member(gM, b2, P(x, m.Hm - b2.h * k / 2, z0), P(x, m.Hm - b2.h * k / 2, z0 + mLd), V(0, 1, 0), mats.mezzB);
      }
      const dm = inp.mDeck === 'komp' ? mats.slab : inp.mDeck === 'lot' ? mats.stair : mats.grate;
      box(gM, x0 + mWd / 2 + ox, m.Hm + th / 2, z0 + mLd / 2 + oz, mWd, th, mLd, dm);
      // parmaku në buzët e lira
      const edges = [];
      if (mWd < W - 2 * inset - 0.4) edges.push([[x0 + mWd, z0], [x0 + mWd, z0 + mLd]]);
      if (mLd < L - 2 * inset - 0.4) edges.push([[x0, z0 + mLd], [x0 + mWd, z0 + mLd]]);
      edges.forEach(([a, b]) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.round(len / 1.5));
        for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; box(gM, x + ox, top + 0.55, z + oz, 0.04, 1.1, 0.04, mats.rail); }
        [0.5, 1.08].forEach(h => member(gM, null, P(a[0], top + h, a[1]), P(b[0], top + h, b[1]), V(0, 1, 0), mats.rail, { s: boxShape(0.04, 0.04, 0), k: 'rail' }));
      });
      mz = { x0, z0, mWd, mLd, top };
    }
    // shkallët
    if (res.stairs) buildStairs(res, inp, P, mz);
    // mbulesa
    const gC = groups.clad;
    const roofOff = rh / 2 + ph + 0.02;
    slopes.forEach(([xa, xb]) => {
      const a = V(xa, yR(xa), 0), b = V(xb, yR(xb), 0);
      const d = b.clone().sub(a).normalize(); const nrm = V(-d.y, d.x, 0);
      const ext = 0.25;
      const A = a.clone().sub(d.clone().multiplyScalar(xa < 1e-6 || xa > W - 1e-6 ? ext : 0)).add(nrm.clone().multiplyScalar(roofOff));
      const B = b.clone().add(d.clone().multiplyScalar(xb > W - 1e-6 || xb < 1e-6 ? ext : 0)).add(nrm.clone().multiplyScalar(roofOff));
      const lenS = A.distanceTo(B), rib = 1 / 0.333;
      quad(gC, [P(A.x, A.y, -0.3), P(B.x, B.y, -0.3), P(B.x, B.y, L + 0.3), P(A.x, A.y, L + 0.3)], mats.roof, [[0, 0], [lenS, 0], [lenS, (L + 0.6) * rib], [0, (L + 0.6) * rib]]);
      if (inp.skyPct > 0) {
        const wS = lenS * inp.skyPct / 100, mid = A.clone().add(B).multiplyScalar(0.5), dd = B.clone().sub(A).normalize();
        const s0 = mid.clone().sub(dd.clone().multiplyScalar(wS / 2)).add(nrm.clone().multiplyScalar(0.01)), s1 = mid.clone().add(dd.clone().multiplyScalar(wS / 2)).add(nrm.clone().multiplyScalar(0.01));
        quad(gC, [P(s0.x, s0.y, 1), P(s1.x, s1.y, 1), P(s1.x, s1.y, L - 1), P(s0.x, s0.y, L - 1)], mats.sky);
      }
      if (inp.pv) {
        const dd = B.clone().sub(A).normalize();
        const s0 = A.clone().add(dd.clone().multiplyScalar(0.8)).add(nrm.clone().multiplyScalar(0.12));
        const s1 = B.clone().sub(dd.clone().multiplyScalar(0.8)).add(nrm.clone().multiplyScalar(0.12));
        const rows = Math.max(1, Math.floor((lenS - 1.6) / 1.15));
        for (let r = 0; r < rows; r++) {
          const p0 = s0.clone().add(dd.clone().multiplyScalar(r * 1.15)), p1 = s0.clone().add(dd.clone().multiplyScalar(r * 1.15 + 1.1));
          if (p1.distanceTo(s0) > s1.distanceTo(s0)) break;
          quad(gC, [P(p0.x, p0.y, 1.2), P(p1.x, p1.y, 1.2), P(p1.x, p1.y, L - 1.2), P(p0.x, p0.y, L - 1.2)], mats.pv);
        }
      }
    });
    const wOff = ch / 2 + rhh + 0.03;
    // muret anësore
    [[-wOff, 0], [W + wOff, W]].forEach(([x, xc]) => {
      const ht = yR(xc);
      quad(gC, [P(x, sock, -0.05), P(x, ht + 0.1, -0.05), P(x, ht + 0.1, L + 0.05), P(x, sock, L + 0.05)], mats.wall, [[0, sock], [0, ht + 0.1], [L, ht + 0.1], [L, sock]]);
    });
    // timpanet
    const gz = [-(cb / 2 + rhh + 0.03), L + cb / 2 + rhh + 0.03];
    gz.forEach(z => {
      const pts = [[-wOff, sock], [W + wOff, sock], [W + wOff, yR(W)]];
      const top = inp.roof === 'duo' ? [...xs.slice(0, -1).map((x, i) => [(x + xs[i + 1]) / 2, yR((x + xs[i + 1]) / 2)]).reverse()] : [];
      const tp = [];
      for (let i = xs.length - 1; i >= 0; i--) { tp.push([xs[i] + (i === xs.length - 1 ? wOff : i === 0 ? -wOff : 0), yR(xs[i])]); if (i > 0 && inp.roof === 'duo') { const xm = (xs[i] + xs[i - 1]) / 2; tp.push([xm, yR(xm)]); } }
      const all = [[-wOff, sock], [W + wOff, sock], ...tp].map(p => [p[0] + ox, p[1]]);
      poly(gC, all, z + oz, mats.wall);
    });
    if (sock > 0.05) {
      box(gC, ox - wOff + 0.1, sock / 2, L / 2 + oz, 0.2, sock, L + 0.4, mats.sockel);
      box(gC, W + ox + wOff - 0.1, sock / 2, L / 2 + oz, 0.2, sock, L + 0.4, mats.sockel);
      box(gC, W / 2 + ox, sock / 2, oz + gz[0], W + 2 * wOff, sock, 0.2, mats.sockel);
      box(gC, W / 2 + ox, sock / 2, oz + gz[1], W + 2 * wOff, sock, 0.2, mats.sockel);
    }
    // dyert
    const doorsFront = Math.min(inp.doorN, Math.max(1, Math.floor(W / (inp.doorW + 1.5))));
    const zFront = gz[0] - 0.03;
    for (let i = 0; i < doorsFront; i++) {
      const xc = W * (i + 1) / (doorsFront + 1);
      quad(gC, [P(xc - inp.doorW / 2, 0, zFront), P(xc + inp.doorW / 2, 0, zFront), P(xc + inp.doorW / 2, Math.min(inp.doorH, H - 0.2), zFront), P(xc - inp.doorW / 2, Math.min(inp.doorH, H - 0.2), zFront)], mats.door);
    }
    const rest = inp.doorN - doorsFront;
    for (let i = 0; i < rest; i++) {
      const zc = L * (i + 1) / (rest + 1), xw = W + wOff + 0.03;
      quad(gC, [P(xw, 0, zc - inp.doorW / 2), P(xw, 0, zc + inp.doorW / 2), P(xw, Math.min(inp.doorH, H - 0.2), zc + inp.doorW / 2), P(xw, Math.min(inp.doorH, H - 0.2), zc - inp.doorW / 2)], mats.door);
    }
    for (let i = 0; i < inp.pDoorN; i++) {
      const zc = Math.min(L - 1, 2 + i * 4), xw = -wOff - 0.03;
      quad(gC, [P(xw, 0, zc - 0.5), P(xw, 0, zc + 0.5), P(xw, 2.2, zc + 0.5), P(xw, 2.2, zc - 0.5)], mats.door);
    }
    if (inp.winA > 0) {
      const per = inp.winA / 2, n = Math.max(1, Math.round(per / (2.4 * 1.2)));
      const wl = Math.min(2.4, per / n / 1.2);
      [[-wOff - 0.03], [W + wOff + 0.03]].forEach(([xw]) => {
        for (let i = 0; i < n; i++) {
          const zc = L * (i + 0.5) / n;
          quad(gC, [P(xw, 2.6, zc - wl / 2), P(xw, 2.6, zc + wl / 2), P(xw, 3.8, zc + wl / 2), P(xw, 3.8, zc - wl / 2)], mats.win);
        }
      });
    }
    // akset dhe toka
    const gA = groups.axes;
    const letters = 'ABCDEFGHIJ';
    xs.forEach((x, i) => { dashed(gA, P(x, 0.02, -3), P(x, 0.02, L + 1.5)); label(gA, letters[i] || String(i), P(x, 0.9, -4), 1.6); });
    zF.forEach((z, i) => { dashed(gA, P(-3, 0.02, z), P(W + 1.5, 0.02, z)); label(gA, String(i + 1), P(-4, 0.9, z), 1.6); });
    const gG = groups.ground;
    const size = Math.max(W, L) * 4 + 60;
    ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: lin(css('--view-ground', '#cdd5db')), roughness: 1 }));
    ground.material.userData.own = true;
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; gG.add(ground);
    box(gG, W / 2 + ox, -0.005, L / 2 + oz, W + 3, 0.02, L + 3, mats.slabG).castShadow = false;
    grid = new THREE.GridHelper(size, Math.round(size / 5), css('--view-grid', '#b5c0c9'), css('--view-grid', '#b5c0c9'));
    grid.material.userData.own = true; grid.material.transparent = true; grid.material.opacity = 0.5;
    grid.position.y = 0; gG.add(grid);
    // drita dhe kamera
    const R = Math.hypot(W, L, Hmax) / 2;
    bounds = { r: R, cy: Hmax / 2, W, L, H: Hmax };
    sun.position.set(-R * 1.1, R * 2.2, -R * 1.0);
    const sc = sun.shadow.camera; sc.left = -R * 1.4; sc.right = R * 1.4; sc.top = R * 1.4; sc.bottom = -R * 1.4; sc.near = 1; sc.far = R * 6; sc.updateProjectionMatrix();
    camera.far = R * 30; camera.updateProjectionMatrix();
    controls.maxDistance = R * 8; controls.minDistance = 2;
    setClad(cladMode, true);
    applyVis();
    if (!build.done || Math.abs(R - (build.lastR || R)) / (build.lastR || R) > 0.12) { setView(curView); build.done = true; }
    build.lastR = R;
    render();
  }

  function buildStairs(res, inp, P, mz) {
    const st = res.stairs, g = groups.stair;
    const W = inp.W, L = inp.L;
    const w = st.w, gng = st.going, r = st.riser, gap = 0.15;
    const fl = st.flights, isU = fl.length > 1;
    const run1 = (fl[0] - 1) * gng, run2 = isU ? (fl[1] - 1) * gng : 0;
    const Lr = Math.max(run1, run2);
    const footU = isU ? Lr + w : run1;
    const totV = isU ? 2 * w + gap : w;
    let O, U, Vv, topPlat = false;
    if (st.ext) {
      O = { x: -1.0 - totV, z: mz ? Math.max(1, mz.z0 + 1) : 1.5 }; U = { x: 0, z: 1 }; Vv = { x: 1, z: 0 }; topPlat = true;
    } else if (mz && W - (mz.x0 + mz.mWd) >= footU + 0.8) {
      O = { x: mz.x0 + mz.mWd + 0.05, z: mz.z0 + mz.mLd / 2 - totV / 2 }; U = { x: 1, z: 0 }; Vv = { x: 0, z: 1 };
    } else if (mz && L - (mz.z0 + mz.mLd) >= footU + 0.8) {
      O = { x: mz.x0 + mz.mWd / 2 - totV / 2, z: mz.z0 + mz.mLd + 0.05 }; U = { x: 0, z: 1 }; Vv = { x: 1, z: 0 };
    } else if (mz) {
      O = { x: mz.x0 + mz.mWd + 0.05, z: mz.z0 + 0.3 }; U = { x: 0, z: 1 }; Vv = { x: 1, z: 0 };
    } else { O = { x: 1.5, z: 1.5 }; U = { x: 0, z: 1 }; Vv = { x: 1, z: 0 }; }
    const tread = inp.stairTread === 'grile' ? mats.grate : mats.stair;
    for (let c = 0; c < st.count; c++) {
      const off = c * (totV + 2.5);
      const W3 = (u, y, v) => P(O.x + U.x * u + Vv.x * (v + off), y, O.z + U.z * u + Vv.z * (v + off));
      const bx = (u0, u1, v0, v1, y0, y1, mat) => {
        const a = W3(Math.min(u0, u1), y0, Math.min(v0, v1)), b = W3(Math.max(u0, u1), y1, Math.max(v0, v1));
        box(g, (a.x + b.x) / 2, (y0 + y1) / 2, (a.z + b.z) / 2, Math.abs(b.x - a.x), Math.abs(y1 - y0), Math.abs(b.z - a.z), mat);
      };
      const flights = [];
      if (!isU) flights.push({ ub: run1, s: -1, n: fl[0], y0: 0, v0: 0 });
      else {
        flights.push({ ub: Lr - run1, s: 1, n: fl[0], y0: 0, v0: w + gap });
        flights.push({ ub: Lr, s: -1, n: fl[1], y0: fl[0] * r, v0: 0 });
        const hL = fl[0] * r;
        bx(Lr, Lr + w, 0, totV, hL - 0.06, hL, tread);
        [[Lr + 0.05, 0.05], [Lr + w - 0.05, 0.05], [Lr + 0.05, totV - 0.05], [Lr + w - 0.05, totV - 0.05]].forEach(([u, v]) => bx(u - 0.05, u + 0.05, v - 0.05, v + 0.05, 0, hL - 0.06, mats.stair));
      }
      if (topPlat) {
        bx(-1.2, 0, 0, totV + 0.9, st.rise - 0.06, st.rise, tread);
        [[-1.15, 0.05], [-0.05, 0.05]].forEach(([u, v]) => bx(u - 0.05, u + 0.05, v - 0.05, v + 0.05, 0, st.rise - 0.06, mats.stair));
      }
      flights.forEach(f => {
        const ut = f.ub + f.s * (f.n - 1) * gng;
        [f.v0 + 0.02, f.v0 + w - 0.02].forEach(v => {
          member(g, st.st.sec, W3(f.ub, f.y0 + r * 0.4, v), W3(ut, f.y0 + f.n * r - r * 0.4, v), V(0, 1, 0), mats.stair);
          member(g, null, W3(f.ub, f.y0 + r + 1.0, v), W3(ut, f.y0 + f.n * r + 1.0, v), V(0, 1, 0), mats.rail, { s: boxShape(0.04, 0.04, 0), k: 'rail' });
        });
        for (let i = 0; i < f.n - 1; i++) {
          const uc = f.ub + f.s * (i + 0.5) * gng, y = f.y0 + (i + 1) * r;
          bx(uc - gng / 2 + 0.01, uc + gng / 2 - 0.01, f.v0, f.v0 + w, y - 0.04, y, tread);
        }
      });
    }
  }
  function setClad(mode, silent) {
    cladMode = mode;
    if (!ready) return;
    groups.clad.visible = mode > 0;
    const op = mode === 2 ? 1 : 0.28;
    [mats.roof, mats.wall].forEach(m => { m.opacity = op; m.transparent = mode !== 2; m.depthWrite = mode === 2; m.needsUpdate = true; });
    if (!silent) render();
  }
  function applyVis() {
    if (!ready) return;
    groups.purl.visible = vis.purl;
    groups.mezz.visible = vis.mezz; groups.stair.visible = vis.mezz;
    groups.axes.visible = vis.axes;
    render();
  }
  function toggle(k, on) { vis[k] = on; applyVis(); }
  function setView(name) {
    if (!ready) return;
    curView = name || 'iso'; userMoved = false;
    const R = bounds.r, t = new THREE.Vector3(0, bounds.cy * 0.55, 0);
    let d;
    if (name === 'front') d = V(0.0001, 0.22, -1);
    else if (name === 'side') d = V(-1, 0.22, 0.0001);
    else if (name === 'top') d = V(0.0001, 1, -0.0002);
    else d = V(-0.95, 0.62, -1.15);
    d.normalize();
    const fov = camera.fov * Math.PI / 180;
    const aspect = Math.max(0.6, camera.aspect || 1.5);
    const dist = R / Math.sin(fov / 2) * (aspect < 1 ? 1.15 / aspect : 1.0) * (name === 'iso' ? 0.9 : 0.86);
    camera.position.copy(t.clone().add(d.multiplyScalar(dist)));
    controls.target.copy(t);
    controls.update();
    render();
  }
  function snapshot(w, h, light) {
    if (!ready) return null;
    const oldW = el.clientWidth, oldH = el.clientHeight;
    const bg = scene.background;
    if (light) { mats.slabG.color.copy(lin('#c5c9cc')); scene.background = new THREE.Color('#e9eef1'); if (ground) ground.material.color.copy(lin('#d9dfe3')); if (grid) grid.material.color.copy(lin('#c3ccd3')); }
    const vAx = groups.axes.visible; groups.axes.visible = false;
    const pos = camera.position.clone(), tgt = controls.target.clone(), moved = userMoved;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!moved) setView(curView);
    controls.update();
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.92);
    groups.axes.visible = vAx;
    camera.position.copy(pos); controls.target.copy(tgt); userMoved = moved;
    scene.background = bg;
    applyTheme();
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    if (oldW && oldH) {
      renderer.setSize(oldW, oldH);
      camera.aspect = oldW / oldH; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    return url;
  }
  return { init, build, setView, setClad, toggle, snapshot, applyTheme, resize, get ready() { return ready; }, get cladMode() { return cladMode; } };
})();
