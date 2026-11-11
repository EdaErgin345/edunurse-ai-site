// Hemşireliğin DNA'sı · ortak çizim ve yardımcılar
window.DNA = (function () {
  const FAKTORLER = ['Din ve inanç', 'Savaşlar ve salgınlar', 'Kadının toplumsal rolü', 'Eğitim', 'Yasalar ve örgütlenme', 'Bilim, teknoloji ve liderler'];
  const RENKLER = ['#b03060', '#c2185b', '#8e5ba6', '#6a4c93', '#9c2c77', '#5b4a8b'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function kilcik(svg, katkilar) {
    const omurga = 280, tabanlar = [420, 700, 980];
    let s = '<path d="M100 280 H1010" stroke="#13233A" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M100 280 L30 210 L30 350 Z" fill="#13233A"/>' +
      '<path d="M1000 195 H1110 L1185 280 L1110 365 H1000 Z" fill="#0F7C74"/>' +
      '<text x="1088" y="267" fill="white" font-size="20" font-weight="bold" text-anchor="middle">Profesyonel</text>' +
      '<text x="1088" y="296" fill="white" font-size="20" font-weight="bold" text-anchor="middle">hemşirelik</text>';
    FAKTORLER.forEach((f, i) => {
      const ust = i < 3, b = tabanlar[i % 3], ex = b - 170, ey = ust ? 60 : 500, c = RENKLER[i];
      const liste = katkilar.filter(e => e.factor === i && e.review === 'approved');
      s += `<line x1="${b}" y1="${omurga}" x2="${ex}" y2="${ey}" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
      liste.slice(-3).forEach((e, k) => {
        const fr = .3 + k * .23, x = ex + (b - ex) * fr, y = ey + (omurga - ey) * fr;
        s += `<line x1="${x - 100}" y1="${y}" x2="${x}" y2="${y}" stroke="${c}" stroke-width="2"/>` +
          `<text x="${x - 102}" y="${y - 5}" font-size="12" fill="#17262A">${esc(String(e.event).slice(0, 24))}</text>` +
          `<text x="${x - 102}" y="${y + 13}" font-size="11" fill="#4B5D61">Grup ${e.group_id}</text>`;
      });
      const ly = ust ? ey - 46 : ey + 5;
      s += `<rect x="${ex - 118}" y="${ly}" width="238" height="44" rx="9" fill="${c}"/>` +
        `<text x="${ex + 1}" y="${ly + 27}" text-anchor="middle" fill="white" font-size="15" font-weight="bold">${esc(f)} (${liste.length})</text>`;
    });
    svg.innerHTML = s;
  }

  const rozet = p => [p >= 10 ? '🌱 Tarih Kaşifi' : '', p >= 30 ? '🔎 Kanıt Avcısı' : '', p >= 60 ? '🏆 Tarih Ustası' : ''].filter(Boolean).join(' ');
  const puanTablosu = satirlar => '<div class="tbl-wrap"><table><thead><tr><th>Sıra</th><th>Grup</th><th>Puan</th><th>Rozet</th></tr></thead><tbody>' +
    satirlar.map((r, i) => `<tr><td>${i + 1}</td><td>Grup ${r.group_id}</td><td>${r.score}</td><td>${rozet(r.score)}</td></tr>`).join('') + '</tbody></table></div>';

  // Sunucu hatalarını sade metne çevir
  const hata = e => {
    const m = (e && (e.message || e.details)) || String(e || '');
    if (/Could not find the function/i.test(m)) return 'Etkinlik henüz kurulmadı. Öğretim elemanınıza haber verin.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.';
    return m || 'İşlem başarısız.';
  };

  async function cagir(ad, args) {
    const { data, error } = await window.EduNurse.sb.rpc(ad, args || {});
    if (error) throw new Error(hata(error));
    return data;
  }

  return { FAKTORLER, RENKLER, esc, kilcik, rozet, puanTablosu, cagir, hata };
})();
