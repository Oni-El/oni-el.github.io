/* Oferta PDF për klientin (jsPDF). Nuk përmban kurrë çmime për kg ose kosto të brendshme. */
window.OfferPDF = (function () {
  'use strict';
  const C = { ink: [24, 33, 42], dim: [90, 104, 116], line: [200, 209, 216], acc: [232, 163, 23], band: [24, 33, 42], soft: [236, 240, 243], white: [255, 255, 255], steel: [51, 89, 122] };
  function build(o) {
    const { jsPDF } = window.jspdf;
    const d = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    // shkronjat standarde nuk kanë ² dhe ³
    const san = v => Array.isArray(v) ? v.map(san) : String(v).replace(/²/g, '2').replace(/³/g, '3').replace(/[→←]/g, '-');
    const _text = d.text.bind(d), _split = d.splitTextToSize.bind(d);
    d.text = (t, ...a) => _text(san(t), ...a);
    d.splitTextToSize = (t, ...a) => _split(san(t), ...a);
    const PW = 210, PH = 297, M = 15, CW = PW - 2 * M;
    let y = 0;
    const set = (sz, st, col) => { d.setFont('helvetica', st || 'normal'); d.setFontSize(sz); d.setTextColor(...(col || C.ink)); };
    const fill = c => d.setFillColor(...c), draw = c => d.setDrawColor(...c);
    const band = (first) => {
      fill(C.band); d.rect(0, 0, PW, first ? 30 : 14, 'F');
      fill(C.acc); d.rect(0, first ? 30 : 14, PW, 1.4, 'F');
      if (first) {
        set(19, 'bold', C.white); d.text(o.company.name || 'Oni-El', M, 14);
        set(8, 'normal', [200, 210, 218]);
        const contact = [o.company.addr, o.company.phone, o.company.email, o.company.nipt ? 'NIPT ' + o.company.nipt : ''].filter(Boolean).join('  ·  ');
        d.text(d.splitTextToSize(contact, 110), M, 21);
        set(10, 'bold', C.white); d.text('OFERTË TEKNIKE DHE EKONOMIKE', PW - M, 11, { align: 'right' });
        set(8.5, 'normal', [210, 218, 224]);
        d.text('Nr. ' + o.offer.no + '   ·   ' + o.offer.dateStr, PW - M, 17, { align: 'right' });
        d.text('E vlefshme deri më ' + o.offer.validStr, PW - M, 22.5, { align: 'right' });
        y = 40;
      } else {
        set(10, 'bold', C.white); d.text(o.company.name || 'Oni-El', M, 9);
        set(8, 'normal', [210, 218, 224]); d.text('Oferta nr. ' + o.offer.no + '  ·  ' + o.projectName, PW - M, 9, { align: 'right' });
        y = 24;
      }
    };
    const newPage = () => { d.addPage(); band(false); };
    const need = h => { if (y + h > PH - 18) newPage(); };
    const h2 = t => { need(14); set(11, 'bold', C.ink); d.text(t.toUpperCase(), M, y); fill(C.acc); d.rect(M, y + 1.6, 14, 0.8, 'F'); y += 7; };

    band(true);
    // klienti
    set(8, 'normal', C.dim); d.text('PËR', M, y); d.text('OBJEKTI', M + 95, y);
    y += 5;
    set(11, 'bold'); d.text(d.splitTextToSize(o.offer.client || '—', 88), M, y);
    d.text(d.splitTextToSize(o.title, 85), M + 95, y);
    y += 5.5;
    set(9, 'normal', C.dim);
    if (o.offer.site) d.text(d.splitTextToSize('Vendndodhja: ' + o.offer.site, 88), M, y);
    d.text(d.splitTextToSize(o.subtitle, 85), M + 95, y);
    y += 9;
    // imazhi 3D
    if (o.img3d) {
      let ww = CW, hh = CW / o.img3dRatio;
      if (hh > 86) { hh = 86; ww = hh * o.img3dRatio; }
      const ix = M + (CW - ww) / 2;
      draw(C.line); d.setLineWidth(0.2);
      d.addImage(o.img3d, 'JPEG', ix, y, ww, hh, undefined, 'FAST');
      d.rect(ix, y, ww, hh);
      y += hh + 5;
    }
    // shifrat kryesore
    const fw = (CW - 3 * 3) / 4;
    o.figs.forEach((f, i) => {
      const x = M + i * (fw + 3);
      fill(i === 3 ? C.band : C.soft); d.rect(x, y, fw, 17, 'F');
      set(7.2, 'normal', i === 3 ? [200, 210, 218] : C.dim); d.text(f[0].toUpperCase(), x + 3, y + 5.5);
      set(i === 3 ? 12.5 : 12, 'bold', i === 3 ? C.white : C.ink); d.text(f[1], x + 3, y + 12.8);
    });
    y += 24;
    // përshkrimi teknik
    h2('Përshkrimi teknik');
    const col1 = 46;
    o.desc.forEach(([k, v], i) => {
      set(8.3, 'normal', C.ink);
      const lines = d.splitTextToSize(v, CW - col1 - 4);
      const hh = Math.max(5.6, lines.length * 3.7 + 2.0);
      need(hh);
      if (i % 2 === 0) { fill([246, 248, 249]); d.rect(M, y - 3.8, CW, hh, 'F'); }
      set(8.3, 'bold', C.ink); d.text(k, M + 2, y);
      set(8.3, 'normal', C.ink); d.text(lines, M + col1, y);
      y += hh;
    });
    // vizatimet: dy të parat gjithmonë, fasada vetëm kur ka vend
    y += 3;
    const dw = 168;
    o.draws.forEach((dr, i) => {
      const h = dw * dr.h / dr.w;
      if (i >= 2 && y + h + 8 > PH - 18) return;
      if (i === 0) need(h + 12);
      else need(h + 4);
      if (i === 0) h2('Vizatime paraprake');
      d.addImage(dr.url, 'PNG', M + (CW - dw) / 2, y, dw, h, undefined, 'FAST');
      draw(C.line); d.setLineWidth(0.2); d.rect(M + (CW - dw) / 2, y, dw, h);
      y += h + 4;
    });
    // çmimi
    need(30 + 7 * (o.priceRows.length + o.totals.length));
    y += 2;
    h2('Oferta ekonomike');
    set(8, 'normal', C.dim); d.text('Përshkrimi', M + 2, y); d.text('Vlera (' + o.curLabel + ')', PW - M - 2, y, { align: 'right' });
    y += 2; draw(C.line); d.setLineWidth(0.3); d.line(M, y, PW - M, y); y += 5;
    o.priceRows.forEach(([n, v]) => {
      need(7);
      set(9.5, 'normal'); d.text(n, M + 2, y); d.text(v, PW - M - 2, y, { align: 'right' });
      y += 2.2; draw([228, 233, 237]); d.setLineWidth(0.15); d.line(M, y, PW - M, y); y += 4.6;
    });
    y += 1;
    o.totals.forEach(([n, v, strong]) => {
      need(9);
      if (strong) { fill(C.band); d.rect(M, y - 5, CW, 8.5, 'F'); set(11, 'bold', C.white); }
      else set(9.5, 'bold', C.ink);
      d.text(n, M + 2, y + (strong ? 0.6 : 0)); d.text(v, PW - M - 2, y + (strong ? 0.6 : 0), { align: 'right' });
      y += strong ? 10 : 6.2;
    });
    if (o.kgLine) { set(8.5, 'normal', C.dim); d.text(o.kgLine, M + 2, y); y += 5; }
    y += 3;
    // kushtet
    h2('Kushtet');
    const block = (title, text) => {
      if (!text) return;
      const lines = d.splitTextToSize(text, CW - col1 - 4);
      need(lines.length * 4.1 + 3);
      set(8.8, 'bold', C.ink); d.text(title, M + 2, y);
      set(8.8, 'normal', C.ink); d.text(lines, M + col1, y);
      y += lines.length * 4.1 + 2.6;
    };
    block('Afati i realizimit', o.offer.lead);
    block('Kushtet e pagesës', o.offer.pay);
    block('Përfshihen', o.offer.incl);
    block('Nuk përfshihen', o.offer.excl);
    block('Vlefshmëria', 'Oferta është e vlefshme ' + o.offer.validDays + ' ditë, deri më ' + o.offer.validStr + '. Çmimet e materialeve mund të rishikohen pas këtij afati.');
    y += 2;
    need(22);
    set(7.8, 'italic', C.dim);
    const note = d.splitTextToSize(o.note, CW);
    d.text(note, M, y); y += note.length * 3.6 + 8;
    need(22);
    set(9, 'normal', C.ink);
    d.text('Për ' + (o.company.name || 'Oni-El') + ':', M, y); d.text('Pranoi (klienti):', M + CW / 2 + 5, y);
    y += 12; draw(C.dim); d.setLineWidth(0.25); d.line(M, y, M + 70, y); d.line(M + CW / 2 + 5, y, PW - M, y);
    y += 4.5; set(8.5, 'normal', C.dim); if (o.company.signer) d.text(o.company.signer, M, y);
    // fundfaqet
    const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i);
      draw(C.line); d.setLineWidth(0.2); d.line(M, PH - 12, PW - M, PH - 12);
      set(7.5, 'normal', C.dim);
      d.text([(o.company.name || 'Oni-El'), o.company.phone, o.company.email].filter(Boolean).join('  ·  '), M, PH - 7.5);
      d.text('Faqe ' + i + ' / ' + n, PW - M, PH - 7.5, { align: 'right' });
    }
    return d.output('arraybuffer');
  }
  return { build };
})();
