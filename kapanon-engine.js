/* Kapanon – motori strukturor dhe sasitë (Oni-El)
   Paradimensionim sipas EN 1990 / EN 1991-1-1,-3,-4 / EN 1993-1-1 / EN 1998-1 (thjeshtuar).
   Njësitë: gjeometria në m, forcat në kN, momentet në kNm; tabelat e profileve në cm. */
(function (root) {
  'use strict';
  const Es = 210000, Gs = 81000;          // MPa
  const EK = 2.1e8;                        // kN/m²
  const KG2KN = 9.81e-3;                   // kg/m → kN/m
  const PI2 = Math.PI * Math.PI;

  /* ---------------- Profilet ---------------- */
  // emri, h, b, tw, tf, r, kg/m, A, Iy, Wely, Wply, Iz, Wplz, It, Iw(×10³cm⁶)
  const IPE_T = [
    ['IPE 120', 120, 64, 4.4, 6.3, 7, 10.4, 13.2, 318, 53.0, 60.7, 27.7, 13.6, 1.74, 0.89],
    ['IPE 140', 140, 73, 4.7, 6.9, 7, 12.9, 16.4, 541, 77.3, 88.3, 44.9, 19.2, 2.45, 1.98],
    ['IPE 160', 160, 82, 5.0, 7.4, 9, 15.8, 20.1, 869, 109, 124, 68.3, 26.1, 3.60, 3.96],
    ['IPE 180', 180, 91, 5.3, 8.0, 9, 18.8, 23.9, 1317, 146, 166, 101, 34.6, 4.79, 7.43],
    ['IPE 200', 200, 100, 5.6, 8.5, 12, 22.4, 28.5, 1943, 194, 221, 142, 44.6, 6.98, 12.99],
    ['IPE 220', 220, 110, 5.9, 9.2, 12, 26.2, 33.4, 2772, 252, 285, 205, 58.1, 9.07, 22.67],
    ['IPE 240', 240, 120, 6.2, 9.8, 15, 30.7, 39.1, 3892, 324, 367, 284, 73.9, 12.88, 37.39],
    ['IPE 270', 270, 135, 6.6, 10.2, 15, 36.1, 45.9, 5790, 429, 484, 420, 97.0, 15.94, 70.58],
    ['IPE 300', 300, 150, 7.1, 10.7, 15, 42.2, 53.8, 8356, 557, 628, 604, 125, 20.12, 125.9],
    ['IPE 330', 330, 160, 7.5, 11.5, 18, 49.1, 62.6, 11770, 713, 804, 788, 154, 28.15, 199.1],
    ['IPE 360', 360, 170, 8.0, 12.7, 18, 57.1, 72.7, 16270, 904, 1019, 1043, 191, 37.32, 313.6],
    ['IPE 400', 400, 180, 8.6, 13.5, 21, 66.3, 84.5, 23130, 1156, 1307, 1318, 229, 51.08, 490.0],
    ['IPE 450', 450, 190, 9.4, 14.6, 21, 77.6, 98.8, 33740, 1500, 1702, 1676, 276, 66.87, 791.0],
    ['IPE 500', 500, 200, 10.2, 16.0, 21, 90.7, 116, 48200, 1928, 2194, 2142, 336, 89.29, 1249],
    ['IPE 550', 550, 210, 11.1, 17.2, 24, 106, 134, 67120, 2441, 2787, 2668, 401, 123.2, 1884],
    ['IPE 600', 600, 220, 12.0, 19.0, 24, 122, 156, 92080, 3069, 3512, 3387, 486, 165.4, 2846]
  ];
  const HEA_T = [
    ['HEA 120', 114, 120, 5.0, 8.0, 12, 19.9, 25.3, 606, 106, 119, 231, 58.9, 5.99, 6.47],
    ['HEA 140', 133, 140, 5.5, 8.5, 12, 24.7, 31.4, 1033, 155, 173, 389, 84.8, 8.13, 15.06],
    ['HEA 160', 152, 160, 6.0, 9.0, 15, 30.4, 38.8, 1673, 220, 245, 616, 118, 12.19, 31.41],
    ['HEA 180', 171, 180, 6.0, 9.5, 15, 35.5, 45.3, 2510, 294, 325, 925, 156, 14.80, 60.21],
    ['HEA 200', 190, 200, 6.5, 10.0, 18, 42.3, 53.8, 3692, 389, 430, 1336, 204, 20.98, 108.0],
    ['HEA 220', 210, 220, 7.0, 11.0, 18, 50.5, 64.3, 5410, 515, 568, 1955, 271, 28.46, 193.3],
    ['HEA 240', 230, 240, 7.5, 12.0, 21, 60.3, 76.8, 7763, 675, 745, 2769, 352, 41.55, 328.5],
    ['HEA 260', 250, 260, 7.5, 12.5, 24, 68.2, 86.8, 10450, 836, 920, 3668, 430, 52.37, 516.4],
    ['HEA 280', 270, 280, 8.0, 13.0, 24, 76.4, 97.3, 13670, 1013, 1112, 4763, 518, 62.10, 785.4],
    ['HEA 300', 290, 300, 8.5, 14.0, 27, 88.3, 112.5, 18260, 1260, 1383, 6310, 641, 85.17, 1200],
    ['HEA 320', 310, 300, 9.0, 15.5, 27, 97.6, 124.4, 22930, 1479, 1628, 6985, 710, 108.0, 1512],
    ['HEA 340', 330, 300, 9.5, 16.5, 27, 105, 133.5, 27690, 1678, 1850, 7436, 756, 127.2, 1824],
    ['HEA 360', 350, 300, 10.0, 17.5, 27, 112, 142.8, 33090, 1891, 2088, 7887, 802, 148.8, 2177],
    ['HEA 400', 390, 300, 11.0, 19.0, 27, 125, 159.0, 45070, 2311, 2562, 8564, 873, 189.0, 2942],
    ['HEA 450', 440, 300, 11.5, 21.0, 27, 140, 178.0, 63720, 2896, 3216, 9465, 966, 243.8, 4148],
    ['HEA 500', 490, 300, 12.0, 23.0, 27, 155, 197.5, 86970, 3550, 3949, 10370, 1059, 309.3, 5643]
  ];
  // UPN: emri, h, b, tw, tf, kg/m, A, Iy, Wely, Wply, Iz
  const UPN_T = [
    ['UPN 100', 100, 50, 6.0, 8.5, 10.6, 13.5, 206, 41.2, 49.0, 29.3],
    ['UPN 120', 120, 55, 7.0, 9.0, 13.4, 17.0, 364, 60.7, 72.6, 43.2],
    ['UPN 140', 140, 60, 7.0, 10.0, 16.0, 20.4, 605, 86.4, 103, 62.7],
    ['UPN 160', 160, 65, 7.5, 10.5, 18.8, 24.0, 925, 116, 138, 85.3],
    ['UPN 180', 180, 70, 8.0, 11.0, 22.0, 28.0, 1350, 150, 179, 114],
    ['UPN 200', 200, 75, 8.5, 11.5, 25.3, 32.2, 1910, 191, 228, 148],
    ['UPN 220', 220, 80, 9.0, 12.5, 29.4, 37.4, 2690, 245, 292, 197],
    ['UPN 240', 240, 85, 9.5, 13.0, 33.2, 42.3, 3600, 300, 358, 248]
  ];
  // Shufra kontraventimi (me filetë): emri, d, As (mm²)
  const ROD_T = [['Ø12', 12, 84.3], ['Ø16', 16, 157], ['Ø20', 20, 245], ['Ø24', 24, 353], ['Ø27', 27, 459], ['Ø30', 30, 561], ['Ø36', 36, 817]];

  function mkI(r, fam) {
    const s = { name: r[0], fam, type: 'I', h: r[1], b: r[2], tw: r[3], tf: r[4], r: r[5], kg: r[6], A: r[7], Iy: r[8], Wely: r[9], Wply: r[10], Iz: r[11], Wplz: r[12], It: r[13], Iw: r[14] };
    s.iy = Math.sqrt(s.Iy / s.A); s.iz = Math.sqrt(s.Iz / s.A); s.Welz = s.Iz / (s.b / 20);
    return s;
  }
  function mkU(r) {
    return { name: r[0], fam: 'UPN', type: 'U', h: r[1], b: r[2], tw: r[3], tf: r[4], kg: r[5], A: r[6], Iy: r[7], Wely: r[8], Wply: r[9], Iz: r[10] };
  }
  // Tub drejtkëndor i formuar në të ftohtë (EN 10219), vlera të përafruara
  function mkRHS(H, B, t) {
    const ro = 2 * t, ri = t;
    const corr = (4 - Math.PI) * (ro * ro - ri * ri);
    const A = (B * H - (B - 2 * t) * (H - 2 * t) - corr);                // mm²
    const Iy = 0.96 * (B * H ** 3 - (B - 2 * t) * (H - 2 * t) ** 3) / 12;    // mm⁴
    const Iz = 0.96 * (H * B ** 3 - (H - 2 * t) * (B - 2 * t) ** 3) / 12;
    const Wply = 0.97 * (B * H * H - (B - 2 * t) * (H - 2 * t) ** 2) / 4;
    const Wplz = 0.97 * (H * B * B - (H - 2 * t) * (B - 2 * t) ** 2) / 4;
    const nm = (H === B ? 'SHS ' : 'RHS ') + H + '×' + B + '×' + t;
    return { name: nm, fam: H === B ? 'SHS' : 'RHS', type: 'RHS', h: H, b: B, t, kg: +(A * 0.00785).toFixed(2), A: A / 100, Iy: Iy / 1e4, Iz: Iz / 1e4, Wely: Iy / (H / 2) / 1e3, Welz: Iz / (B / 2) / 1e3, Wply: Wply / 1e3, Wplz: Wplz / 1e3, iy: Math.sqrt(Iy / A) / 10, iz: Math.sqrt(Iz / A) / 10 };
  }
  const RHS_DIM = [[80, 40, 3], [100, 50, 3], [100, 60, 3], [120, 60, 3], [120, 60, 4], [120, 80, 4], [140, 80, 4], [150, 100, 4], [160, 80, 4], [160, 80, 5], [180, 100, 5], [200, 100, 5], [200, 100, 6], [250, 150, 6], [300, 200, 8]];
  const SHS_DIM = [[60, 60, 3], [80, 80, 3], [80, 80, 4], [100, 100, 3], [100, 100, 4], [120, 120, 4], [120, 120, 5], [140, 140, 5], [150, 150, 5], [160, 160, 6], [180, 180, 6], [200, 200, 6], [200, 200, 8], [250, 250, 8], [300, 300, 10]];

  const SEC = {
    IPE: IPE_T.map(r => mkI(r, 'IPE')),
    HEA: HEA_T.map(r => mkI(r, 'HEA')),
    UPN: UPN_T.map(mkU),
    RHS: RHS_DIM.map(d => mkRHS(...d)),
    SHS: SHS_DIM.map(d => mkRHS(...d))
  };
  const ALL = {};
  Object.values(SEC).forEach(l => l.forEach(s => { ALL[s.name] = s; }));
  function famList(fams) {
    let l = [];
    fams.forEach(f => { if (SEC[f]) l = l.concat(SEC[f]); });
    return l.sort((a, b) => a.kg - b.kg);
  }

  /* ---------------- Rezistencat (EN 1993-1-1) ---------------- */
  function fyOf(grade, t) {
    const base = grade === 'S355' ? 355 : grade === 'S235' ? 235 : 275;
    return t > 16 ? base - 10 : base;
  }
  function chiF(l, a) {
    if (l <= 0.2) return 1;
    const ph = 0.5 * (1 + a * (l - 0.2) + l * l);
    return Math.min(1, 1 / (ph + Math.sqrt(Math.max(0, ph * ph - l * l))));
  }
  function chiLTf(l, a) {
    if (l <= 0.4) return 1;
    const ph = 0.5 * (1 + a * (l - 0.4) + 0.75 * l * l);
    return Math.min(1, 1 / (l * l), 1 / (ph + Math.sqrt(Math.max(0, ph * ph - 0.75 * l * l))));
  }
  function classI(s, fy, Nc) {
    const eps = Math.sqrt(235 / fy);
    const cf = (s.b - s.tw - 2 * s.r) / 2, fr = cf / s.tf;
    const clF = fr <= 9 * eps ? 1 : fr <= 10 * eps ? 2 : fr <= 14 * eps ? 3 : 4;
    const cw = s.h - 2 * s.tf - 2 * s.r, wr = cw / s.tw;
    const N = Math.max(0, Nc);
    const al = Math.min(1, 0.5 + N / (2 * cw * s.tw * fy));
    const l1 = al > 0.5 ? 396 * eps / (13 * al - 1) : 36 * eps / al;
    const l2 = al > 0.5 ? 456 * eps / (13 * al - 1) : 41.5 * eps / al;
    const psi = Math.max(-1, Math.min(1, 2 * N / (s.A * 100 * fy) - 1));
    const l3 = 42 * eps / (0.67 + 0.33 * psi);
    const clW = wr <= l1 ? 1 : wr <= l2 ? 2 : wr <= l3 ? 3 : 4;
    return Math.max(clF, clW);
  }
  // N (kN, + shtypje), M (kNm), V (kN); gjatësitë në m
  function checkI(s, fy0, o) {
    const fy = fyOf(fy0, s.tf);
    const N = (o.N || 0) * 1e3, M = Math.abs(o.M || 0) * 1e6, V = Math.abs(o.V || 0) * 1e3;
    const kA = o.haunch ? 1.4 : 1, kW = o.haunch ? 1.9 : 1;
    const A = s.A * 100;
    const cls = classI(s, fy, N);
    if (cls === 4) return { u: 9, cls, gov: 'Seksion i klasës 4' };
    const Wy = (cls <= 2 ? s.Wply : s.Wely) * 1e3 * kW;
    const Npl = A * kA * fy;
    const Av = Math.max(A - 2 * s.b * s.tf + (s.tw + 2 * s.r) * s.tf, (s.h - 2 * s.tf) * s.tw) * (o.haunch ? 1.6 : 1);
    const Vpl = Av * fy / Math.sqrt(3);
    const uV = V / Vpl;
    let Mrd = Wy * fy;
    if (uV > 0.5) {
      const rho = Math.pow(2 * uV - 1, 2), Aw = (s.h - 2 * s.tf) * s.tw;
      Mrd = Math.max(1, (Wy - rho * Aw * Aw / (4 * s.tw)) * fy);
    }
    let ucs;
    if (cls <= 2) {
      const n = Math.abs(N) / Npl;
      const a = Math.min((A - 2 * s.b * s.tf) / A, 0.5);
      const hw = s.h - 2 * s.tf;
      let MN = Mrd;
      if (!(n <= 0.25 && Math.abs(N) <= 0.5 * hw * s.tw * fy)) MN = Math.min(Mrd, Mrd * (1 - n) / (1 - 0.5 * a));
      ucs = Math.max(n, MN > 0 ? M / MN : 9);
    } else ucs = Math.abs(N) / Npl + M / Mrd;
    const res = { u: Math.max(ucs, uV), ucs, uV, cls, gov: ucs >= uV ? 'Rezistenca e seksionit (N+M)' : 'Prerja (V)' };
    if (o.haunch) return res;
    const Iz = s.Iz * 1e4, It = s.It * 1e4, Iw = s.Iw * 1e9, Iy = s.Iy * 1e4;
    const L = Math.max(0.2, o.Llt) * 1e3;
    const Mcr = (o.C1 || 1) * PI2 * Es * Iz / (L * L) * Math.sqrt(Iw / Iz + L * L * Gs * It / (PI2 * Es * Iz));
    const lLT = Math.sqrt(Wy * fy / Mcr);
    const chiLT = chiLTf(lLT, s.h / s.b <= 2 ? 0.34 : 0.49);
    const MbRd = chiLT * Wy * fy;
    let ust;
    if (N > 0) {
      const ay = s.h / s.b > 1.2 ? 0.21 : 0.34, az = s.h / s.b > 1.2 ? 0.34 : 0.49;
      const ly = Math.sqrt(A * fy / (PI2 * Es * Iy / Math.pow(o.Lcy * 1e3, 2)));
      const lz = Math.sqrt(A * fy / (PI2 * Es * Iz / Math.pow(o.Lcz * 1e3, 2)));
      const chiy = chiF(ly, ay), chiz = chiF(lz, az);
      const ny = N / (chiy * A * fy), nz = N / (chiz * A * fy);
      const Cmy = 0.9, CmLT = 0.9;
      const kyy = Math.min(Cmy * (1 + (ly - 0.2) * ny), Cmy * (1 + 0.8 * ny));
      const kzy = lz < 0.4 ? Math.min(0.6 + lz, 1 - 0.1 * lz * nz / (CmLT - 0.25))
        : Math.max(1 - 0.1 * lz * nz / (CmLT - 0.25), 1 - 0.1 * nz / (CmLT - 0.25));
      ust = Math.max(ny + kyy * M / MbRd, nz + kzy * M / MbRd);
      res.chiy = chiy; res.chiz = chiz;
    } else ust = M / MbRd;
    res.chiLT = chiLT; res.ust = ust;
    if (ust > res.u) { res.u = ust; res.gov = N > 0 ? 'Qëndrueshmëria (N + M)' : 'Përkulje–përdredhje (LTB)'; }
    return res;
  }
  function checkRHS(s, fy0, o) {
    const fy = fyOf(fy0, s.t);
    const eps = Math.sqrt(235 / fy);
    const N = (o.N || 0) * 1e3, M = Math.abs(o.M || 0) * 1e6, V = Math.abs(o.V || 0) * 1e3;
    const A = s.A * 100;
    const cf = (s.b - 3 * s.t) / s.t, cw = (s.h - 3 * s.t) / s.t;
    const clF = cf <= 33 * eps ? 1 : cf <= 38 * eps ? 2 : cf <= 42 * eps ? 3 : 4;
    const clW = cw <= 72 * eps ? 1 : cw <= 83 * eps ? 2 : cw <= 124 * eps ? 3 : 4;
    const cls = Math.max(clF, N > 0.1 * A * fy ? Math.max(clW, cw <= 33 * eps ? 1 : cw <= 38 * eps ? 2 : cw <= 42 * eps ? 3 : 4) : clW);
    if (cls === 4) return { u: 9, cls, gov: 'Seksion i klasës 4' };
    const Wy = (cls <= 2 ? s.Wply : s.Wely) * 1e3;
    const Npl = A * fy, Mrd = Wy * fy;
    const Vpl = A * s.h / (s.h + s.b) * fy / Math.sqrt(3);
    const uV = V / Vpl;
    const ucs = Math.abs(N) / Npl + M / Mrd;
    const res = { u: Math.max(ucs, uV), ucs, uV, cls, gov: 'Rezistenca e seksionit' };
    if (N > 0) {
      const ly = Math.sqrt(A * fy / (PI2 * Es * s.Iy * 1e4 / Math.pow(o.Lcy * 1e3, 2)));
      const lz = Math.sqrt(A * fy / (PI2 * Es * s.Iz * 1e4 / Math.pow((o.Lcz || o.Lcy) * 1e3, 2)));
      const chiy = chiF(ly, 0.49), chiz = chiF(lz, 0.49);
      const ny = N / (chiy * Npl), nz = N / (chiz * Npl);
      const kyy = Math.min(0.95 * (1 + (ly - 0.2) * ny), 0.95 * (1 + 0.8 * ny));
      const ust = Math.max(ny + kyy * M / Mrd, nz + 0.6 * kyy * M / Mrd);
      res.ust = ust;
      if (ust > res.u) { res.u = ust; res.gov = M > 0 ? 'Qëndrueshmëria (N + M)' : 'Epja (shtypje)'; }
    }
    return res;
  }
  function checkSec(s, grade, o) { return s.type === 'I' ? checkI(s, grade, o) : s.type === 'RHS' ? checkRHS(s, grade, o) : checkU(s, grade, o); }
  function checkU(s, grade, o) {
    const fy = fyOf(grade, s.tf);
    const M = Math.abs(o.M || 0) * 1e6, V = Math.abs(o.V || 0) * 1e3;
    const Mrd = s.Wely * 1e3 * fy, Vpl = s.h * s.tw * fy / Math.sqrt(3);
    const u = Math.max(M / Mrd, V / Vpl);
    return { u, gov: 'Rezistenca e seksionit', cls: 3 };
  }

  /* ---------------- Ngarkesat klimatike ---------------- */
  const TERR = { '0': [0.003, 1], 'I': [0.01, 1], 'II': [0.05, 2], 'III': [0.3, 5], 'IV': [1.0, 10] };
  function qpeak(vb, cat, z) {
    const [z0, zmin] = TERR[cat] || TERR.III;
    const ze = Math.max(z, zmin);
    const kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
    const cr = kr * Math.log(ze / z0);
    const vm = cr * vb;
    const Iv = 1 / Math.log(ze / z0);
    return (1 + 7 * Iv) * 0.5 * 1.25 * vm * vm / 1000; // kN/m²
  }
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (let i = 0; i < xs.length - 1; i++) if (x <= xs[i + 1]) return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[ys.length - 1];
  }
  // EN 1991-1-4 Tabela 7.4a/7.3a (cpe,10), pjerrësitë 5°, 15°, 30°
  const ANG = [5, 15, 30];
  const DUO0 = { neg: { G: [-1.2, -0.8, -0.5], H: [-0.6, -0.3, -0.2], I: [-0.6, -0.4, -0.4], J: [-0.6, -1.0, -0.5] },
    pos: { G: [0.0, 0.2, 0.7], H: [0.0, 0.2, 0.4], I: [0.2, 0.0, 0.0], J: [0.2, 0.0, 0.0] } };
  const DUO90H = [-0.7, -0.6, -0.8];
  const MONO0 = { neg: { G: [-1.2, -0.8, -1.5], H: [-0.6, -0.3, -0.2] }, pos: { G: [0.0, 0.2, 0.7], H: [0.0, 0.2, 0.4] } };
  const MONO180 = { G: [-2.5, -1.3, -0.8], H: [-1.1, -0.9, -0.8] };
  const MONO90H = [-0.6, -0.8, -0.8];

  function climate(inp) {
    const deg = Math.atan(inp.slope) * 180 / Math.PI;
    const hr = inp.H + roofRise(inp);
    const qp = qpeak(inp.vb, inp.terrain, hr);
    const mu = 0.8;
    let muAvg = mu;
    if (inp.nSpans > 1 && inp.roof === 'duo') muAvg = (mu + Math.min(1.6, 0.8 + 0.8 * deg / 30)) / 2;
    const s = muAvg * inp.sk;
    const sSym = s;
    const soilS = { A: 1.0, B: 1.2, C: 1.15, D: 1.35, E: 1.4 }[inp.soil] || 1.15;
    const Sd = Math.max(0.2 * inp.ag, inp.ag * soilS * 2.5 / (inp.q || 1.5));
    return { deg, hr, qp, s: sSym, mu: muAvg, Sd, soilS };
  }
  function roofRise(inp) {
    const B = inp.W / inp.nSpans;
    return inp.roof === 'duo' ? inp.slope * B / 2 : inp.slope * inp.W;
  }

  /* ---------------- Analiza e kornizës 2D (metoda e ngurtësisë) ---------------- */
  function buildFrame(inp, colS, rafS) {
    const n = inp.nSpans, B = inp.W / n, H = inp.H, t = inp.slope;
    const nodes = [], key = {};
    const node = (x, y) => {
      const k = x.toFixed(4) + ',' + y.toFixed(4);
      if (key[k] !== undefined) return key[k];
      nodes.push({ x, y }); return (key[k] = nodes.length - 1);
    };
    const xs = []; for (let k = 0; k <= n; k++) xs.push(k * B);
    const yRoof = x => {
      if (inp.roof === 'mono') return H + t * x;
      const k = Math.min(n - 1, Math.floor(x / B + 1e-9)), xl = x - k * B;
      return H + t * Math.min(xl, B - xl);
    };
    const elems = [], supports = [], colTops = [], colBases = [];
    const pushE = (i, j, o) => elems.push(Object.assign({ i, j }, o));
    xs.forEach((x, k) => {
      const yt = yRoof(x);
      const b = node(x, 0), m = node(x, yt / 2), tp = node(x, yt);
      const kind = k === 0 ? 'L' : k === n ? 'R' : 'I';
      const yOut = kind === 'L' ? 1 : kind === 'R' ? -1 : 0;
      const mem = 'C' + k;
      pushE(b, m, { g: 'col', mem, kind, yOut, Lsys: yt });
      pushE(m, tp, { g: 'col', mem, kind, yOut, Lsys: yt });
      supports.push({ n: b, fix: inp.base === 'pinned' ? [1, 1, 0] : [1, 1, 1], col: k });
      colTops.push(tp); colBases.push(b);
    });
    const Lh = inp.haunch ? Math.min(0.12 * B, Math.max(0.08 * B, 1.0)) : 0;
    const segs = [];
    for (let k = 0; k < n; k++) {
      const x0 = xs[k], x1 = xs[k + 1];
      if (inp.roof === 'duo') { const xm = (x0 + x1) / 2; segs.push([x0, xm, 'R' + k + 'a', true, false]); segs.push([xm, x1, 'R' + k + 'b', false, true]); }
      else segs.push([x0, x1, 'R' + k, true, true]);
    }
    const ridge = [];
    segs.forEach(([xa, xb, mem, hA, hB]) => {
      const pts = [xa];
      if (hA && Lh) pts.push(xa + Lh);
      const ia = hA && Lh ? xa + Lh : xa, ib = hB && Lh ? xb - Lh : xb;
      const nd = inp.roof === 'duo' ? 3 : 4;
      for (let q = 1; q < nd; q++) pts.push(ia + (ib - ia) * q / nd);
      if (hB && Lh) pts.push(xb - Lh);
      pts.push(xb);
      const Lsys = Math.hypot(xb - xa, yRoof(xb) - yRoof(xa));
      for (let q = 0; q < pts.length - 1; q++) {
        const isH = (hA && Lh && q === 0) || (hB && Lh && q === pts.length - 2);
        pushE(node(pts[q], yRoof(pts[q])), node(pts[q + 1], yRoof(pts[q + 1])), { g: 'raf', mem, kind: 'raf', yOut: 1, haunch: !!isH, Lsys });
      }
      if (inp.roof === 'duo' && !hB) ridge.push(node(xb, yRoof(xb)));
    });
    if (inp.roof === 'mono') {
      // pika e mesit e çdo hapësire për zhvendosjen vertikale
      for (let k = 0; k < n; k++) {
        let best = -1, bd = 1e9; const xm = (xs[k] + xs[k + 1]) / 2;
        nodes.forEach((p, idx) => { const d = Math.abs(p.x - xm) + Math.abs(p.y - yRoof(xm)); if (d < bd) { bd = d; best = idx; } });
        ridge.push(best);
      }
    }
    elems.forEach(e => {
      const a = nodes[e.i], b = nodes[e.j];
      e.L = Math.hypot(b.x - a.x, b.y - a.y); e.c = (b.x - a.x) / e.L; e.s = (b.y - a.y) / e.L;
      const S = e.g === 'col' ? colS : rafS;
      e.sec = S;
      let I = S.Iy * 1e-8, A = S.A * 1e-4;
      if (e.haunch) { I *= 2.4; A *= 1.4; }
      e.EA = EK * A; e.EI = EK * I;
      e.wSelf = S.kg * KG2KN * (e.haunch ? 1.6 : 1);
    });
    return { nodes, elems, supports, colTops, colBases, ridge, xs, B, yRoof, Lh };
  }

  function kLocal(e) {
    const L = e.L, a = e.EA / L, b = 12 * e.EI / L ** 3, c = 6 * e.EI / L ** 2, d = 4 * e.EI / L, f = 2 * e.EI / L;
    return [[a, 0, 0, -a, 0, 0], [0, b, c, 0, -b, c], [0, c, d, 0, -c, f], [-a, 0, 0, a, 0, 0], [0, -b, -c, 0, b, -c], [0, c, f, 0, -c, d]];
  }
  const toLoc = (e, v) => [e.c * v[0] + e.s * v[1], -e.s * v[0] + e.c * v[1], v[2], e.c * v[3] + e.s * v[4], -e.s * v[3] + e.c * v[4], v[5]];
  const toGlob = (e, v) => [e.c * v[0] - e.s * v[1], e.s * v[0] + e.c * v[1], v[2], e.c * v[3] - e.s * v[4], e.s * v[3] + e.c * v[4], v[5]];

  function assemble(fr) {
    const N = fr.nodes.length * 3;
    const K = Array.from({ length: N }, () => new Float64Array(N));
    fr.elems.forEach(e => {
      const k = kLocal(e); e.k = k;
      const c = e.c, sn = e.s;
      const T = [[c, sn, 0, 0, 0, 0], [-sn, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, c, sn, 0], [0, 0, 0, -sn, c, 0], [0, 0, 0, 0, 0, 1]];
      const kT = [0, 1, 2, 3, 4, 5].map(r => [0, 1, 2, 3, 4, 5].map(q => { let a = 0; for (let m = 0; m < 6; m++) a += k[r][m] * T[m][q]; return a; }));
      const dofs = [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2];
      for (let r = 0; r < 6; r++) for (let q = 0; q < 6; q++) {
        let a = 0; for (let m = 0; m < 6; m++) a += T[m][r] * kT[m][q];
        K[dofs[r]][dofs[q]] += a;
      }
    });
    const fixed = new Uint8Array(N);
    fr.supports.forEach(s => s.fix.forEach((f, q) => { if (f) fixed[3 * s.n + q] = 1; }));
    const free = []; for (let q = 0; q < N; q++) if (!fixed[q]) free.push(q);
    const m = free.length;
    const A = Array.from({ length: m }, (_, r) => Float64Array.from(free.map(c => K[free[r]][c])));
    // LU me pivotim
    const piv = new Int32Array(m);
    for (let i = 0; i < m; i++) piv[i] = i;
    for (let c = 0; c < m; c++) {
      let p = c, mx = Math.abs(A[c][c]);
      for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > mx) { mx = Math.abs(A[r][c]); p = r; }
      if (mx < 1e-12) { fr.singular = true; break; }
      if (p !== c) { const t = A[p]; A[p] = A[c]; A[c] = t; const tp = piv[p]; piv[p] = piv[c]; piv[c] = tp; }
      for (let r = c + 1; r < m; r++) {
        const f = A[r][c] / A[c][c]; A[r][c] = f;
        if (f !== 0) for (let q = c + 1; q < m; q++) A[r][q] -= f * A[c][q];
      }
    }
    fr.LU = A; fr.piv = piv; fr.free = free; fr.N = N;
  }
  function solve(fr, F) {
    const m = fr.free.length, A = fr.LU;
    const b = new Float64Array(m);
    for (let i = 0; i < m; i++) b[i] = F[fr.free[fr.piv[i]]];
    for (let i = 0; i < m; i++) for (let q = 0; q < i; q++) b[i] -= A[i][q] * b[q];
    for (let i = m - 1; i >= 0; i--) { for (let q = i + 1; q < m; q++) b[i] -= A[i][q] * b[q]; b[i] /= A[i][i]; }
    const d = new Float64Array(fr.N);
    fr.free.forEach((g, i) => { d[g] = b[i]; });
    return d;
  }
  // case: {el: {idx: [wx, wy]} global për njësi gjatësie të elementit, nod: [{n,fx,fy}]}
  function runCase(fr, cs) {
    const F = new Float64Array(fr.N);
    const q = fr.elems.map(() => [0, 0]);
    let V = 0;
    Object.keys(cs.el || {}).forEach(k => {
      const e = fr.elems[k], w = cs.el[k];
      const qx = e.c * w[0] + e.s * w[1], qy = -e.s * w[0] + e.c * w[1];
      q[k] = [qx, qy];
      const L = e.L, fe = [qx * L / 2, qy * L / 2, qy * L * L / 12, qx * L / 2, qy * L / 2, -qy * L * L / 12];
      const g = toGlob(e, fe);
      [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2].forEach((d, r) => { F[d] += g[r]; });
      V -= w[1] * L;
    });
    (cs.nod || []).forEach(p => { F[3 * p.n] += p.fx || 0; F[3 * p.n + 1] += p.fy || 0; V -= p.fy || 0; });
    const d = solve(fr, F);
    const fe = fr.elems.map((e, k) => {
      const dl = toLoc(e, [d[3 * e.i], d[3 * e.i + 1], d[3 * e.i + 2], d[3 * e.j], d[3 * e.j + 1], d[3 * e.j + 2]]);
      const L = e.L, [qx, qy] = q[k];
      const feq = [qx * L / 2, qy * L / 2, qy * L * L / 12, qx * L / 2, qy * L / 2, -qy * L * L / 12];
      return e.k.map((row, r) => row.reduce((s, x, c) => s + x * dl[c], 0) - feq[r]);
    });
    return { d, fe, q, V };
  }
  function combine(results, facs) {
    const out = { d: null, fe: null, q: null, V: 0 };
    facs.forEach(([r, f]) => {
      if (!r || !f) return;
      if (!out.d) { out.d = new Float64Array(r.d.length); out.fe = r.fe.map(() => [0, 0, 0, 0, 0, 0]); out.q = r.q.map(() => [0, 0]); }
      for (let i = 0; i < r.d.length; i++) out.d[i] += f * r.d[i];
      r.fe.forEach((v, k) => { for (let c = 0; c < 6; c++) out.fe[k][c] += f * v[c]; out.q[k][0] += f * r.q[k][0]; out.q[k][1] += f * r.q[k][1]; });
      out.V += f * r.V;
    });
    return out;
  }
  function forcesAt(e, f, q, x) {
    return { N: -(f[0] + q[0] * x), V: f[1] + q[1] * x, M: -f[2] + f[1] * x + q[1] * x * x / 2 };
  }

  /* ---------------- Rastet e ngarkimit për kornizën ---------------- */
  function frameCases(inp, fr, cl, gRoof, gWall, s) {
    const E = fr.elems;
    const cases = {};
    const G = { el: {} };
    E.forEach((e, k) => {
      let wy = -e.wSelf;
      if (e.g === 'raf') wy -= gRoof * s;
      if (e.g === 'col' && e.kind !== 'I') wy -= gWall * s;
      G.el[k] = [0, wy];
    });
    cases.G = G;
    const snow = (fl, fr2) => {
      const c = { el: {} };
      E.forEach((e, k) => {
        if (e.g !== 'raf') return;
        const xm = (fr.nodes[e.i].x + fr.nodes[e.j].x) / 2;
        const kk = Math.min(inp.nSpans - 1, Math.floor(xm / fr.B));
        const left = (xm - kk * fr.B) < fr.B / 2;
        const f = inp.roof === 'duo' ? (left ? fl : fr2) : 1;
        c.el[k] = [0, -cl.sRoof * s * Math.abs(e.c) * f];
      });
      return c;
    };
    cases.S = snow(1, 1);
    if (inp.roof === 'duo') cases.SA = snow(1, 0.5);
    // Era
    const hd = cl.hr / inp.W;
    const cD = interp([0.25, 1], [0.7, 0.8], hd), cE = interp([0.25, 1], [-0.3, -0.5], hd);
    const deg = cl.deg;
    const e0 = Math.min(inp.L, 2 * cl.hr);
    const roofSlopeCpe = (zoneA, zoneB, wA, total, tab) => {
      const a = interp(ANG, tab[zoneA], deg), b = interp(ANG, tab[zoneB], deg);
      const w = Math.min(wA, total);
      return (a * w + b * (total - w)) / total;
    };
    const wind = (dir, sign, cpi) => {
      const c = { el: {} };
      const qps = cl.qp * s;
      const tab = sign > 0 ? DUO0.pos : DUO0.neg;
      E.forEach((e, k) => {
        let cpe = null, inward = null;
        if (e.g === 'col') {
          if (e.kind === 'I') return;
          const windward = (e.kind === 'L' && dir > 0) || (e.kind === 'R' && dir < 0);
          cpe = windward ? cD : cE;
          inward = e.kind === 'L' ? [1, 0] : [-1, 0];
        } else {
          const a = fr.nodes[e.i], b = fr.nodes[e.j];
          const xm = (a.x + b.x) / 2;
          if (inp.roof === 'duo') {
            const kk = Math.min(inp.nSpans - 1, Math.floor(xm / fr.B));
            const leftHalf = (xm - kk * fr.B) < fr.B / 2;
            const spanFromWind = dir > 0 ? kk : inp.nSpans - 1 - kk;
            const facing = (leftHalf && dir > 0) || (!leftHalf && dir < 0);
            if (spanFromWind === 0 && facing) cpe = roofSlopeCpe('G', 'H', e0 / 10, fr.B / 2, tab);
            else if (spanFromWind === 0) cpe = roofSlopeCpe('J', 'I', e0 / 10, fr.B / 2, tab);
            else cpe = interp(ANG, tab.I, deg);
          } else {
            const T = dir > 0 ? (sign > 0 ? MONO0.pos : MONO0.neg) : MONO180;
            cpe = (interp(ANG, T.G, deg) * Math.min(e0 / 10, inp.W) + interp(ANG, T.H, deg) * Math.max(0, inp.W - e0 / 10)) / inp.W;
          }
          inward = [e.s, -e.c]; // −(lokal y)
        }
        const p = qps * (cpe - cpi);
        c.el[k] = [p * inward[0], p * inward[1]];
      });
      return c;
    };
    cases.WP = wind(1, 1, -0.3); cases.WPn = wind(-1, 1, -0.3);
    cases.WN = wind(1, -1, 0.2); cases.WNn = wind(-1, -1, 0.2);
    // θ = 90°
    const W90 = { el: {} };
    const cH = interp(ANG, inp.roof === 'duo' ? DUO90H : MONO90H, deg);
    E.forEach((e, k) => {
      let cpe, inward;
      if (e.g === 'col') { if (e.kind === 'I') return; cpe = -0.8; inward = e.kind === 'L' ? [1, 0] : [-1, 0]; }
      else { cpe = cH; inward = [e.s, -e.c]; }
      const p = cl.qp * s * (cpe - 0.2);
      W90.el[k] = [p * inward[0], p * inward[1]];
    });
    cases.W90 = W90;
    cases.U = { nod: fr.colTops.map(n => ({ n, fx: 1 })) };
    cases.Q = { el: {} };
    E.forEach((e, k) => { if (e.g === 'raf') cases.Q.el[k] = [0, -0.4 * s * Math.abs(e.c)]; });
    return { cases, cD, cE };
  }

  function analyseFrame(inp, colS, rafS, ctx, fast) {
    const fr = buildFrame(inp, colS, rafS);
    assemble(fr);
    if (fr.singular) return { ok: false, reason: 'singular' };
    const { cases } = frameCases(inp, fr, ctx.cl, ctx.gRoof, ctx.gWall, ctx.s);
    const R = {};
    Object.keys(cases).forEach(k => { R[k] = runCase(fr, cases[k]); });
    const nc = fr.colTops.length;
    const dU = fr.colTops.reduce((a, n) => a + R.U.d[3 * n], 0) / nc;
    const Kx = nc / dU;
    const Havg = fr.colTops.reduce((a, n) => a + fr.nodes[n].y, 0) / nc;
    const ah = Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(Havg)));
    const am = Math.sqrt(0.5 * (1 + 1 / nc));
    const phi = ah * am / 200;
    const sLead = Math.max(1, 0.4 / Math.max(1e-6, ctx.cl.sRoof));
    // masa sizmike për portal
    const Wseis = R.G.V;
    const combos = [];
    const add = (name, facs, ehfDir, ampOn, type) => combos.push({ name, facs, ehfDir, ampOn, type: type || 'ULS' });
    add('1.35G + 1.5S', [['G', 1.35], ['S', 1.5 * sLead]], 1);
    if (R.SA) add('1.35G + 1.5S (asimetrike)', [['G', 1.35], ['SA', 1.5]], 1);
    [[1, 'WP', 'WN', '→'], [-1, 'WPn', 'WNn', '←']].forEach(([d, wp, wn, ar]) => {
      add('1.35G + 1.5S + 0.9W' + ar, [['G', 1.35], ['S', 1.5], [wp, 0.9]], d, true);
      add('1.35G + 1.5W' + ar + ' + 0.75S', [['G', 1.35], [wp, 1.5], ['S', 0.75]], d, true);
      add('1.0G + 1.5W' + ar + ' (thithje)', [['G', 1.0], [wn, 1.5]], d, true);
    });
    add('1.0G + 1.5W (gjatësore)', [['G', 1.0], ['W90', 1.5]], 0, true);
    [[1, '→'], [-1, '←']].forEach(([d, ar]) => add('G + E' + ar, [['G', 1.0], ['U', d * ctx.cl.Sd * Wseis / nc]], 0, true, 'SEI'));
    const out = { fr, R, Kx, phi, combos: [], maxU: 0, gov: null, alphaMin: 99, members: {} };
    const memAgg = out.members;
    // Gjendja kufitare e shërbimit
    const D1 = combine(R, [[R.G, 1], [R.S, 1]]);
    let dv = 0;
    fr.ridge.forEach(n => { dv = Math.max(dv, -D1.d[3 * n + 1]); });
    const eavesV = fr.colTops.reduce((a, n) => Math.min(a, -D1.d[3 * n + 1]), 0);
    dv = dv - Math.max(0, eavesV);
    let dh = 0;
    [R.WP, R.WPn].forEach(r => fr.colTops.forEach(n => { dh = Math.max(dh, Math.abs(r.d[3 * n])); }));
    out.dv = dv; out.dh = dh;
    out.dvLim = fr.B / ctx.limV; out.dhLim = Havg / ctx.limH;
    out.uDv = dv / out.dvLim; out.uDh = dh / out.dhLim;
    if (fast && (out.uDv > 1 || out.uDh > 1)) { out.ok = false; out.util = Math.max(out.uDv, out.uDh); return out; }
    for (const cb of combos) {
      if (fast && (out.maxU > 1 || out.alphaFail)) break;
      let facs = cb.facs.map(([k, f]) => [R[k], f]);
      const base = combine(R, facs);
      const V = Math.max(1e-6, base.V);
      const alpha = Kx * Havg / V;
      let amp = 1;
      if (cb.type !== 'SLS' && V > 1) {
        out.alphaMin = Math.min(out.alphaMin, alpha);
        if (alpha < 3) { out.alphaFail = true; }
        if (alpha < 10) amp = 1 / (1 - 1 / Math.max(alpha, 3.01));
      }
      facs = cb.facs.map(([k, f]) => [R[k], (k === 'G' || k === 'S' || k === 'SA' || k === 'Q') ? f : f * amp]);
      if (cb.ehfDir !== 0) facs.push([R.U, cb.ehfDir * phi * V / nc * amp]);
      const res = combine(R, facs);
      cb.alpha = alpha; cb.amp = amp;
      // kontrollet
      fr.elems.forEach((e, k) => {
        const f = res.fe[k], q = res.q[k];
        let Nmax = 0; const pts = [];
        for (let p = 0; p <= 4; p++) { const x = e.L * p / 4; const r = forcesAt(e, f, q, x); pts.push(r); Nmax = Math.max(Nmax, -r.N); }
        for (const r of pts) {
          let Llt, Lcz;
          const compOnPlusY = r.M > 0;
          const outerComp = e.yOut === 0 ? false : (compOnPlusY ? e.yOut > 0 : e.yOut < 0);
          if (e.g === 'raf') { Llt = outerComp ? ctx.purlinSp : ctx.flyRaf; Lcz = ctx.flyRaf; }
          else if (e.kind === 'I') { Llt = e.Lsys; Lcz = e.Lsys; }
          else { Llt = outerComp ? ctx.railSp : ctx.flyCol; Lcz = ctx.flyCol; }
          const chk = checkI(e.sec, ctx.grade, { N: Nmax > 0 ? Nmax : -r.N, M: r.M, V: r.V, Lcy: e.Lsys, Lcz, Llt, haunch: e.haunch });
          const mk = e.g === 'raf' ? 'raf' : 'col';
          if (!memAgg[mk] || chk.u > memAgg[mk].u) memAgg[mk] = { u: chk.u, gov: chk.gov, combo: cb.name, N: Nmax, M: r.M, V: r.V, cls: chk.cls };
          if (chk.u > out.maxU) { out.maxU = chk.u; out.gov = { mk, combo: cb.name, gov: chk.gov }; }
        }
      });
      out.combos.push({ name: cb.name, alpha, amp, res });
    }
    out.Havg = Havg;
    out.ok = out.maxU <= 1.0 && out.uDv <= 1 && out.uDh <= 1 && !out.alphaFail;
    out.util = Math.max(out.maxU, out.uDv, out.uDh);
    return out;
  }

  function reactions(an) {
    const fr = an.fr, R = an.R;
    const caseNames = { G: 'G', S: 'S', WP: 'W→ (presion)', WN: 'W→ (thithje)', W90: 'W gjatësore', U: null };
    const rows = [];
    fr.supports.forEach((sp, idx) => {
      const ei = fr.elems.findIndex(e => e.i === sp.n);
      const e = fr.elems[ei];
      const per = {};
      ['G', 'S', 'WP', 'WN', 'W90'].forEach(k => {
        const g = toGlob(e, R[k].fe[ei]);
        per[k] = { H: g[0], V: g[1], M: g[2] };
      });
      const env = { Nc: 0, Nt: 0, H: 0, M: 0 };
      an.combos.forEach(c => {
        const g = toGlob(e, c.res.fe[ei]);
        env.Nc = Math.max(env.Nc, g[1]); env.Nt = Math.min(env.Nt, g[1]);
        env.H = Math.max(env.H, Math.abs(g[0])); env.M = Math.max(env.M, Math.abs(g[2]));
      });
      rows.push({ col: idx, x: fr.nodes[sp.n].x, per, env });
    });
    return rows;
  }

  /* ---------------- Elementet dytësore ---------------- */
  function designBeam(list, grade, o) {
    // o: L, wD (ULS poshtë, kN/m pa peshën vetjake), wU (ULS lart), wS (SLS), lim, LltD, LltU, gSelf (faktor), pts (pikë ULS), ptsS
    let best = null;
    for (const s of list) {
      const sw = s.kg * KG2KN;
      const L = o.L;
      const mC = o.cont ? 1 / 8 : 1 / 8, vC = o.cont ? 0.625 : 0.5, dC = o.cont ? 1 / 185 : 5 / 384;
      const evalM = (w, pts) => {
        let Mx = w * L * L * mC, Vx = w * L * vC;
        if (pts && pts.length) {
          let Mpk = 0, Rl = 0; pts.forEach(p => { Rl += p.P * (L - p.a) / L; });
          Vx = Rl + w * L / 2;
          for (let i = 0; i <= 40; i++) {
            const x = L * i / 40; let m = (Rl + w * L / 2) * x - w * x * x / 2;
            pts.forEach(p => { if (x > p.a) m -= p.P * (x - p.a); });
            Mpk = Math.max(Mpk, m);
          }
          Mx = Mpk;
        }
        return { M: Mx, V: Vx };
      };
      const d = evalM(o.wD + 1.35 * sw, o.pts);
      let c1 = checkSec(s, grade, { M: d.M, V: d.V, Llt: o.LltD || 0.3, N: o.N || 0, Lcy: L, Lcz: L });
      let u = c1.u, gov = c1.gov;
      if (o.wU) {
        const du = evalM(Math.max(0, o.wU - sw), null);
        const c2 = checkSec(s, grade, { M: du.M, V: du.V, Llt: o.LltU || L, Lcy: L, Lcz: L });
        if (c2.u > u) { u = c2.u; gov = c2.gov + ' (thithje)'; }
      }
      const EI = EK * s.Iy * 1e-8;
      let df = dC * (o.wS + sw) * L ** 4 / EI;
      if (o.ptsS) o.ptsS.forEach(p => { const a = Math.min(p.a, L - p.a); df += p.P * a * (3 * L * L - 4 * a * a) / (48 * EI); });
      const uD = df / (L / o.lim);
      const ut = Math.max(u, uD);
      const rec = { sec: s, u: ut, uS: u, uD, gov: uD > u ? 'Zhvendosja (L/' + o.lim + ')' : gov, defl: df };
      if (ut <= 1 && !best) best = rec;
      if (best) break;
    }
    return best || { sec: list[list.length - 1], u: 9, gov: 'Asnjë profil nuk mjafton' };
  }
  function designColumn(list, grade, N, L, M) {
    for (const s of list) {
      const c = checkSec(s, grade, { N: N + 1.35 * s.kg * KG2KN * L, M: M || 0, V: 0, Lcy: L, Lcz: L, Llt: L });
      if (c.u <= 1) return { sec: s, u: c.u, gov: c.gov };
    }
    return { sec: list[list.length - 1], u: 9, gov: 'Asnjë profil nuk mjafton' };
  }
  function rodFor(N) {
    for (const r of ROD_T) { const Nrd = 0.9 * 430 * r[2] / 1.25 / 1e3; if (Nrd >= N) return { name: r[0], d: r[1], kg: Math.PI * r[1] * r[1] / 4 * 0.00785, u: N / Nrd }; }
    const r = ROD_T[ROD_T.length - 1];
    return { name: r[0], d: r[1], kg: Math.PI * r[1] * r[1] / 4 * 0.00785, u: N / (0.9 * 430 * r[2] / 1.25 / 1e3), fail: true };
  }

  /* ---------------- Të dhënat e mbulesës ---------------- */
  const PANEL_KG = { 30: 9.5, 40: 10.0, 50: 10.5, 60: 11.0, 80: 12.0, 100: 13.0, 120: 14.0, 150: 15.5 };
  const PURLIN_SPAN = { 0: 1.4, 30: 1.6, 40: 1.8, 50: 2.0, 60: 2.2, 80: 2.5, 100: 2.8, 120: 3.0, 150: 3.2 };
  const RAIL_SPAN = { 0: 1.6, 40: 2.2, 50: 2.5, 60: 2.8, 80: 3.0, 100: 3.3, 120: 3.5, 150: 3.8 };
  function cladKg(type, t, core) {
    if (type === 'sheet') return 5.0;
    let k = PANEL_KG[t] || 11;
    if (core === 'MW') k += (110 - 40) * t / 1000;
    return k;
  }

  /* ---------------- Projektimi i plotë ---------------- */
  function design(inp) {
    const t0 = Date.now();
    const out = { inp, warn: [] };
    const nb = Math.max(1, Math.ceil(inp.L / inp.bayMax - 1e-9));
    const s = inp.L / nb;
    out.nBays = nb; out.bay = s; out.nFrames = nb + 1;
    const B = inp.W / inp.nSpans;
    out.B = B;
    const cl = climate(inp);
    cl.sRoof = cl.s;
    out.cl = cl;
    // mbulesa
    const rKg = cladKg(inp.roofType, inp.roofT, inp.roofCore), wKg = cladKg(inp.wallType, inp.wallT, inp.wallCore);
    const slopeLen = inp.roof === 'duo' ? Math.hypot(B / 2, inp.slope * B / 2) : Math.hypot(inp.W, inp.slope * inp.W);
    const cosA = 1 / Math.sqrt(1 + inp.slope * inp.slope);
    // rigla çatie
    const pTab = inp.roofType === 'sheet' ? PURLIN_SPAN[0] : (PURLIN_SPAN[inp.roofT] || 2.0);
    let aP = inp.purlinAuto ? pTab * (cl.s > 1.5 ? 0.85 : 1) : inp.purlinSp;
    const nPper = Math.ceil(slopeLen / aP - 1e-9) + 1;
    aP = slopeLen / (nPper - 1);
    const nSlopes = inp.roof === 'duo' ? 2 * inp.nSpans : 1;
    const gClad = rKg * KG2KN, gExtra = inp.gExtra + (inp.pv ? 0.15 : 0);
    const qpG = cl.qp;
    const deg = cl.deg;
    const cpeUp = inp.roof === 'duo' ? (interp(ANG, DUO0.neg.G, deg) + interp(ANG, DUO0.neg.H, deg)) / 2 : (interp(ANG, MONO180.G, deg) + interp(ANG, MONO180.H, deg)) / 2;
    const wUp = Math.max(0, 1.5 * qpG * (-cpeUp + 0.2) - 1.0 * (gClad + gExtra) * cosA) * aP;
    const wDn = (1.35 * (gClad + gExtra) + 1.5 * Math.max(cl.s * cosA, 0.4)) * aP * cosA;
    const wSl = ((gClad + gExtra) + cl.s * cosA) * aP * cosA;
    const purlinList = inp.purlinFam === 'IPE' ? famList(['IPE']) : famList(['RHS']);
    const pc = inp.purlinCont !== false && nb > 1;
    let purlin = inp.purlinSec && ALL[inp.purlinSec] ? manualBeam(ALL[inp.purlinSec]) : designBeam(purlinList, inp.grade, { L: s, wD: wDn, wU: wUp, wS: wSl, lim: 200, LltD: 0.5, LltU: s / 2, cont: pc });
    function manualBeam(sec) { return designBeam([sec], inp.grade, { L: s, wD: wDn, wU: wUp, wS: wSl, lim: 200, LltD: 0.5, LltU: s / 2, cont: pc }); }
    out.purlin = Object.assign(purlin, { sp: aP, nPerSlope: nPper, lines: nPper * nSlopes, wDn, wUp, cont: pc });
    // rigla anësore
    const sockel = Math.min(inp.sockel || 0, inp.H - 1);
    const rTab = inp.wallType === 'sheet' ? RAIL_SPAN[0] : (RAIL_SPAN[inp.wallT] || 2.5);
    let aR = inp.railAuto ? rTab : inp.railSp;
    const hWall = inp.H - sockel;
    const nR = Math.max(2, Math.ceil(hWall / aR - 1e-9) + 1);
    aR = hWall / (nR - 1);
    const wW = 1.5 * cl.qp * 1.1 * aR;
    const railList = inp.railFam === 'IPE' ? famList(['IPE']) : famList(['RHS']);
    const rOpt = { L: s, wD: wW, wS: cl.qp * 1.1 * aR, lim: 150, LltD: s / 2, cont: pc };
    const railRes = designBeam(inp.railSec && ALL[inp.railSec] ? [ALL[inp.railSec]] : railList, inp.grade, rOpt);
    out.rail = Object.assign(railRes, { sp: aR, n: nR });
    // korniza
    const gRoof = gClad + gExtra + out.purlin.sec.kg * KG2KN / aP;
    const gWall = wKg * KG2KN + out.rail.sec.kg * KG2KN / aR;
    const ctx = { cl, gRoof, gWall, s, grade: inp.grade, purlinSp: aP, railSp: aR, flyRaf: Math.min(2 * aP, slopeLen), flyCol: Math.min(inp.H, 2 * aR), limV: inp.limV || 200, limH: inp.limH || 150 };
    out.ctx = ctx;
    const colFams = inp.colFam === 'both' ? ['IPE', 'HEA'] : [inp.colFam || 'HEA'];
    const rafFams = inp.rafFam === 'both' ? ['IPE', 'HEA'] : [inp.rafFam || 'IPE'];
    let cols = famList(colFams), rafs = famList(rafFams);
    if (inp.colSec && ALL[inp.colSec]) cols = [ALL[inp.colSec]];
    if (inp.rafSec && ALL[inp.rafSec]) rafs = [ALL[inp.rafSec]];
    const rafLen = inp.roof === 'duo' ? 2 * inp.nSpans * slopeLen : slopeLen;
    const nCol = inp.nSpans + 1;
    const pairs = [];
    cols.forEach(c => rafs.forEach(r => pairs.push({ c, r, w: c.kg * inp.H * nCol + r.kg * rafLen })));
    pairs.sort((a, b) => a.w - b.w);
    let best = null, evals = 0, lastAn = null;
    for (const p of pairs) {
      // shkurtim i shpejtë: tra çatie shumë i dobët
      evals++;
      const an = analyseFrame(inp, p.c, p.r, ctx, true);
      lastAn = an;
      if (an.ok) { best = an; break; }
      if (evals > 1500) break;
    }
    if (!best) {
      // zgjidh atë me shfrytëzimin më të vogël nga profilet më të rënda
      const p = pairs[pairs.length - 1];
      best = analyseFrame(inp, p.c, p.r, ctx);
      if (inp.colSec && inp.rafSec) out.warn.push('Profilet e zgjedhura me dorë (kolona ' + p.c.name + ', trau ' + p.r.name + ') nuk i plotësojnë kontrollet e kornizës. Zgjidh profile më të rënda ose kthe zgjedhjen në automatike.');
      else out.warn.push('Asnjë kombinim profilesh nuk i plotëson kontrollet e kornizës. Shto hapësira (kolona të ndërmjetme), ul interaksin ose lejo edhe profilet HEA.');
    }
    best.col = best.fr.elems.find(e => e.g === 'col').sec;
    best.raf = best.fr.elems.find(e => e.g === 'raf').sec;
    out.frame = best; out.evals = evals;
    out.reactions = reactions(best);
    // kolonat e fasadës ballore
    const postMax = inp.postSp || 6;
    const posts = [];
    for (let k = 0; k < inp.nSpans; k++) {
      const np = Math.max(0, Math.ceil(B / postMax - 1e-9) - 1);
      for (let q = 1; q <= np; q++) { const x = k * B + B * q / (np + 1); posts.push({ x, h: best.fr.yRoof(x) }); }
    }
    out.posts = posts;
    const hpMax = posts.reduce((a, p) => Math.max(a, p.h), 0);
    const pSp = posts.length ? inp.W / (posts.length / 1 + inp.nSpans) : B;
    if (posts.length) {
      const postList = inp.postFam === 'RHS' ? famList(['RHS']) : inp.postFam === 'HEA' ? famList(['HEA']) : famList(['IPE']);
      const wP = 1.5 * cl.qp * 1.1 * pSp;
      const pr = inp.postSec && ALL[inp.postSec] ? designBeam([ALL[inp.postSec]], inp.grade, { L: hpMax, wD: wP, wS: cl.qp * 1.1 * pSp, lim: 150, LltD: Math.min(hpMax, 2 * aR), N: 0 })
        : designBeam(postList, inp.grade, { L: hpMax, wD: wP, wS: cl.qp * 1.1 * pSp, lim: 150, LltD: Math.min(hpMax, 2 * aR) });
      out.post = Object.assign(pr, { sp: pSp, hMax: hpMax });
    }
    // kontraventimet
    const hr = cl.hr;
    const gableArea = inp.W * inp.H + (inp.roof === 'duo' ? inp.nSpans * B * (inp.slope * B / 2) / 2 : inp.W * inp.slope * inp.W / 2);
    out.gableArea = gableArea;
    const fric = 0.02 * cl.qp * Math.max(0, inp.L - Math.min(2 * inp.W, 4 * hr)) * (inp.W + 2 * inp.H);
    const Fwind = 1.5 * (cl.qp * (cD_of(cl, inp) + 0.3) * gableArea * 0.5);
    const FwindLong = 1.5 * (cl.qp * 1.1 * gableArea + fric);
    const nbb = inp.L > 100 ? 4 : inp.L > 60 ? 3 : 2;
    const roofW = (gRoof + 0.05) * inp.L * inp.W / cosA + (best.col.kg * inp.H * nCol + best.raf.kg * rafLen) * out.nFrames * KG2KN + gWall * 2 * inp.L * inp.H / 2;
    const Fseis = cl.Sd * roofW;
    const Fside = Math.max(FwindLong, Fseis) / 2;
    const Fbay = Fside / nbb;
    const bp = posts.length ? pSp : B;
    const Rg = Math.max(Fwind / 2, Fseis / (2 * nbb));
    const Ld1 = Math.hypot(bp, s);
    const roofRod = rodFor(Rg * Ld1 / s);
    const tiers = Math.max(1, Math.ceil(inp.H / (1.3 * s)));
    const Ld2 = Math.hypot(s, inp.H / tiers);
    const wallRod = rodFor(Fbay * Ld2 / s);
    const strut = designColumn(famList(['SHS']), inp.grade, Math.max(Rg, Fbay), s, 0);
    const nRoofPanels = Math.ceil(inp.W / bp);
    const roofBrLen = nbb * nRoofPanels * 2 * Ld1 / cosA;
    const wallBrLen = nbb * 2 * tiers * 2 * Ld2;
    const strutLines = 2 + (inp.roof === 'duo' ? inp.nSpans : 0) + (inp.nSpans - 1);
    out.brace = { nbb, roofRod, wallRod, strut, tiers, roofBrLen, wallBrLen, strutLen: strutLines * inp.L, Fwind, FwindLong, Fseis, Fbay, Rg, bp };
    // mezanina
    out.mezz = inp.mezz ? designMezz(inp, cl) : null;
    if (out.mezz && out.mezz.warn) out.warn.push(out.mezz.warn);
    out.stairs = inp.stairs !== 'none' && (inp.mezz || inp.stairRise) ? designStairs(inp, out) : null;
    if (out.purlin.u > 1) out.warn.push('Riglat e çatisë nuk kalojnë me ' + out.purlin.sec.name + '. Zvogëlo interaksin e riglave ose zgjidh profil më të madh.');
    if (out.rail.u > 1) out.warn.push('Riglat e fasadës nuk kalojnë me ' + out.rail.sec.name + '.');
    if (out.post && out.post.u > 1) out.warn.push('Kolonat e fasadës ballore nuk kalojnë me ' + out.post.sec.name + '. Zvogëlo interaksin e tyre.');
    if (out.brace.roofRod.fail || out.brace.wallRod.fail) out.warn.push('Kontraventimet kërkojnë më shumë se ' + out.brace.nbb + ' interakse të lidhura ose profile në vend të shufrave.');
    if (inp.mezz && inp.H - inp.mH < 2.2) out.warn.push('Mbi mezaninë mbeten vetëm ' + (inp.H - inp.mH).toFixed(2).replace('.', ',') + ' m lartësi e lirë.');
    out.qty = quantities(inp, out, { slopeLen, cosA, rafLen, nCol, sockel });
    out.ms = Date.now() - t0;
    return out;
  }
  function cD_of(cl, inp) { return interp([0.25, 1], [0.7, 0.8], cl.hr / inp.W); }

  const USES = {
    A: { name: 'Banim (A)', q: 2.0, psi2: 0.3, g2: 1.0 },
    B: { name: 'Zyra (B)', q: 3.0, psi2: 0.3, g2: 1.0 },
    D: { name: 'Tregtare (D1)', q: 4.0, psi2: 0.6, g2: 0.5 },
    I: { name: 'Industri e lehtë', q: 5.0, psi2: 0.6, g2: 0.3 },
    E: { name: 'Depo / magazinim (E1)', q: 7.5, psi2: 0.8, g2: 0.3 },
    X: { name: 'Vlerë e zgjedhur', q: 5.0, psi2: 0.6, g2: 0.5 }
  };
  const DECKS = {
    komp: { name: 'Llamarinë grekë + beton', spMax: 2.5 },
    lot: { name: 'Llamarinë me lot 6 mm', spMax: 1.0, kgm2: 47.1 + 8, g: 0.55 },
    grile: { name: 'Grilë e zinkuar 30×3', spMax: 1.1, g: 0.32 }
  };
  function designMezz(inp, cl) {
    const W = Math.min(inp.mW, inp.W), L = Math.min(inp.mL, inp.L);
    const use = USES[inp.mUse] || USES.B;
    const Q = inp.mUse === 'X' ? inp.mQ : use.q;
    const deck = DECKS[inp.mDeck] || DECKS.komp;
    const g1 = inp.mDeck === 'komp' ? 25 * (inp.mSlab / 100 - 0.025) + 0.12 : deck.g;
    const g2 = inp.mG2 != null ? inp.mG2 : use.g2;
    const gx = W / Math.max(1, Math.ceil(W / inp.mGrid - 1e-9)), gy = L / Math.max(1, Math.ceil(L / inp.mGrid - 1e-9));
    const nx = Math.round(W / gx), ny = Math.round(L / gy);
    // trarët dytësorë (sipas gjatësisë), hapësira gy, interaksi d
    const nsec = Math.max(1, Math.ceil(gx / deck.spMax - 1e-9));
    const d = gx / nsec;
    const fam = [inp.mBeamFam || 'IPE'];
    const lst = famList(fam);
    const sec2 = designBeam(lst, inp.grade, { L: gy, wD: (1.35 * (g1 + g2) + 1.5 * Q) * d, wS: (g1 + g2 + Q) * d, lim: 250, LltD: 0.3 });
    // trarët kryesorë (sipas gjerësisë), hapësira gx, ngarkesa pikë nga dytësorët
    const Psec = ((1.35 * (g1 + g2) + 1.5 * Q) * d + 1.35 * sec2.sec.kg * KG2KN) * gy;
    const PsecS = ((g1 + g2 + Q) * d + sec2.sec.kg * KG2KN) * gy;
    const pts = [], ptsS = [];
    for (let q = 1; q < nsec; q++) { pts.push({ a: d * q, P: Psec }); ptsS.push({ a: d * q, P: PsecS }); }
    const sec1 = designBeam(lst, inp.grade, { L: gx, wD: 0, wS: 0, pts, ptsS, lim: 250, LltD: d });
    // kolonat
    const Hm = inp.mH;
    const Ncol = ((1.35 * (g1 + g2) + 1.5 * Q) * gx * gy) + 1.35 * (sec2.sec.kg * gy * gx / d + sec1.sec.kg * gx) * KG2KN;
    const colList = famList([inp.mColFam || 'SHS']);
    const col = designColumn(colList, inp.grade, Ncol, Hm, 0);
    // kontraventimet sizmike
    const area = W * L;
    const Wm = (g1 + g2 + use.psi2 * Q) * area + (sec2.sec.kg * (nx * nsec + 1) * L + sec1.sec.kg * (ny + 1) * W) * KG2KN;
    const F = cl.Sd * Wm;
    let nbb = 2, rod, Ld = Math.hypot(Math.min(gx, gy), Hm);
    for (nbb = 2; nbb <= 8; nbb++) { rod = rodFor(F / nbb * Ld / Math.min(gx, gy)); if (!rod.fail && rod.d <= 30) break; }
    const nCols = (nx + 1) * (ny + 1);
    let warn = null;
    if (sec1.u > 1 || sec2.u > 1 || col.u > 1) warn = 'Mezanina: disa elemente nuk kalojnë. Zvogëlo interaksin e kolonave.';
    return { W, L, Q, use, deck, g1, g2, gx, gy, nx, ny, nsec, d, sec1, sec2, col, Ncol, nCols, F, nbb, rod, Ld, area, warn, Hm, psec: Psec };
  }
  function designStairs(inp, out) {
    const rise = inp.mezz ? inp.mH + (inp.mDeck === 'komp' ? inp.mSlab / 100 : 0.1) : inp.stairRise;
    const n = Math.ceil(rise / 0.18 - 1e-9);
    const riser = rise / n, going = 0.28;
    let shape = inp.stairShape;
    if (shape === 'auto') shape = rise > 3.2 ? 'U' : 'drejt';
    const flights = shape === 'U' || shape === 'L' ? [Math.ceil(n / 2), n - Math.ceil(n / 2)] : [n];
    const w = inp.stairW;
    const Q = Math.max(3.0, Math.min(5.0, out.mezz ? out.mezz.Q : 3.0));
    const gStep = inp.stairTread === 'lot' ? 0.6 : 0.35;
    const runMax = Math.max(...flights.map(f => (f - 1) * going));
    const qL = (1.35 * gStep + 1.5 * Q) * w / 2;
    const st = designBeam(SEC.UPN, inp.grade, { L: Math.max(1, runMax), wD: qL, wS: (gStep + Q) * w / 2, lim: 250, LltD: 0.5 });
    const incl = flights.map(f => Math.hypot((f - 1) * going, f * riser));
    const strKg = incl.reduce((a, l) => a + 2 * l * st.sec.kg, 0);
    const nTreads = flights.reduce((a, f) => a + f - 1, 0);
    const treadArea = nTreads * w * (going + 0.03);
    const treadKg = inp.stairTread === 'lot' ? treadArea * 55 : 0;
    let landKg = 0, landArea = 0;
    if (flights.length > 1) {
      const lw = shape === 'U' ? 2 * w + 0.15 : w, ld = w;
      landArea = lw * ld;
      const hL = flights[0] * riser;
      landKg = 2 * (lw + ld) * SEC.UPN[3].kg + 2 * hL * SEC.SHS[4].kg + (inp.stairTread === 'lot' ? landArea * 55 : 0);
    }
    const rail = incl.reduce((a, l) => a + 2 * l, 0) + (flights.length > 1 ? (shape === 'U' ? 2 * w + 0.15 + 2 * w : 2 * w) : 0);
    const kg = (strKg + treadKg + landKg) * (inp.stairCount || 1);
    return { rise, n, riser, going, shape, flights, w, st, kg, treadArea: (treadArea + landArea) * (inp.stairCount || 1), rail: rail * (inp.stairCount || 1), ext: inp.stairs === 'ext', count: inp.stairCount || 1, incl, runMax, landArea };
  }

  /* ---------------- Sasitë ---------------- */
  function quantities(inp, out, g) {
    const fr = out.frame.fr, nF = out.nFrames;
    const q = { steel: {}, area: {}, len: {}, count: {} };
    const colKg = fr.elems.filter(e => e.g === 'col').reduce((a, e) => a + e.L * e.sec.kg, 0);
    const rafKg = fr.elems.filter(e => e.g === 'raf').reduce((a, e) => a + e.L * e.sec.kg * (e.haunch ? 1.6 : 1), 0);
    q.steel.portal = (colKg + rafKg) * nF;
    q.steel.purlin = out.purlin.lines * inp.L * out.purlin.sec.kg * 1.03;
    const gableRail = 2 * out.gableArea / out.rail.sp;
    const sideRail = 2 * out.rail.n * inp.L;
    q.steel.rail = (sideRail + gableRail) * out.rail.sec.kg * 1.03;
    q.steel.post = out.post ? 2 * out.posts.reduce((a, p) => a + p.h, 0) * out.post.sec.kg : 0;
    const b = out.brace;
    q.steel.brace = b.roofBrLen * b.roofRod.kg + b.wallBrLen * b.wallRod.kg + b.strutLen * b.strut.sec.kg;
    const doorFrame = inp.doorN * (2 * inp.doorH + inp.doorW) * 18.7 + inp.pDoorN * (2 * 2.2 + 1.0) * 8.0;
    q.steel.doors = doorFrame;
    if (out.mezz) {
      const m = out.mezz;
      const k2 = (m.nx * m.nsec + 1) * m.L * m.sec2.sec.kg;
      const k1 = (m.ny + 1) * m.W * m.sec1.sec.kg;
      const kc = m.nCols * m.Hm * m.col.sec.kg;
      const kb = m.nbb * 2 * 2 * m.Ld * m.rod.kg;
      const kd = inp.mDeck === 'lot' ? m.area * m.deck.kgm2 : 0;
      q.steel.mezz = k1 + k2 + kc + kb + kd;
      q.mezzParts = { k1, k2, kc, kb, kd };
      q.area.mezz = m.area;
      q.area.mezzDeck = m.area;
      q.vol = inp.mDeck === 'komp' ? m.area * (inp.mSlab / 100 - 0.025) : 0;
      q.len.mezzRail = (m.W < inp.W - 0.5 ? m.L : 0) + (m.L < inp.L - 0.5 ? m.W : 0);
    } else { q.steel.mezz = 0; q.area.mezz = 0; q.vol = 0; q.len.mezzRail = 0; }
    if (out.stairs) { q.steel.stairs = out.stairs.kg; q.area.stairGrating = inp.stairTread === 'grile' ? out.stairs.treadArea : 0; q.len.stairRail = out.stairs.rail; }
    else { q.steel.stairs = 0; q.area.stairGrating = 0; q.len.stairRail = 0; }
    const base = Object.values(q.steel).reduce((a, x) => a + x, 0);
    q.steel.conn = base * (inp.connPct / 100);
    q.steelTotal = base + q.steel.conn;
    q.steelExt = out.stairs && out.stairs.ext ? out.stairs.kg : 0;
    // sipërfaqet
    const doorA = inp.doorN * inp.doorW * inp.doorH + inp.pDoorN * 1.0 * 2.2 + (inp.winA || 0);
    q.area.roof = inp.L * (inp.roof === 'duo' ? 2 * inp.nSpans * g.slopeLen : g.slopeLen);
    q.area.sky = q.area.roof * (inp.skyPct || 0) / 100;
    const sideH = inp.roof === 'duo' ? 2 * inp.H : (inp.H + inp.H + inp.slope * inp.W);
    q.area.wallGross = inp.L * sideH + 2 * out.gableArea;
    q.area.wall = Math.max(0, inp.L * (sideH - 2 * g.sockel) + 2 * (out.gableArea - inp.W * g.sockel) - doorA);
    q.area.doorInd = inp.doorN * inp.doorW * inp.doorH;
    q.area.win = inp.winA || 0;
    q.area.part = inp.partA || 0;
    q.area.ground = inp.L * inp.W;
    q.area.total = q.area.ground + q.area.mezz;
    // ulluqe dhe llamarina
    const nG = inp.roof === 'duo' ? 2 + (inp.nSpans - 1) : 1 + (inp.nSpans > 1 ? 0 : 0);
    q.len.gutter = nG * inp.L;
    q.count.down = nG * Math.max(2, Math.ceil(inp.L / 15) + 1);
    q.len.down = q.count.down * inp.H;
    const ridges = inp.roof === 'duo' ? inp.nSpans : 1;
    q.len.flash = ridges * inp.L + 2 * 2 * (inp.roof === 'duo' ? inp.nSpans * g.slopeLen : g.slopeLen) + 4 * inp.H + 2 * (inp.L + inp.W) + inp.doorN * (2 * inp.doorH + inp.doorW) + inp.pDoorN * 5.4;
    q.count.doorInd = inp.doorN; q.count.pDoor = inp.pDoorN;
    q.count.cols = (out.nFrames) * g.nCol + 2 * out.posts.length + (out.mezz ? out.mezz.nCols : 0);
    return q;
  }


  // çmimet dhe kostot nuk përfshihen në versionin për klientët
  root.KapEngine = { SEC, ALL, famList, design, checkI, checkRHS, qpeak, climate, USES, DECKS, buildFrame, analyseFrame, interp, mkRHS, forcesAt, cladKg, assemble, runCase, kLocal };
})(typeof window !== 'undefined' ? window : globalThis);
