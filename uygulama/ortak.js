// EduNurse AI · Ortak oturum ve giriş bileşeni
// Gerekenler: ayarlar.js ve Supabase JS kütüphanesi bu dosyadan önce yüklenmelidir.
(function () {
  const A = window.EDUNURSE_AYARLAR || {};
  // Sitenin kök adresi (bu dosya kök/uygulama/ortak.js konumundadır)
  const src = document.currentScript && document.currentScript.src;
  const KOK = src ? src.replace(/uygulama\/ortak\.js.*$/, '') : location.href.replace(/[^/]*$/, '');
  const hazir = !!(A.SUPABASE_URL && A.SUPABASE_ANON_KEY && window.supabase);
  const sb = hazir ? window.supabase.createClient(A.SUPABASE_URL, A.SUPABASE_ANON_KEY) : null;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function hataMetni(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e || '');
    if (/okul e-posta|Database error saving new user/i.test(m)) return 'Bu e-posta adresiyle giriş yapılamıyor. Öğrenciyseniz okul e-posta adresinizi kullanın; öğretmenseniz yöneticinin sizi sisteme eklemesi gerekir.';
    if (/rate limit|too many/i.test(m)) return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
    if (/expired|invalid/i.test(m) && /token|otp/i.test(m)) return 'Kod geçersiz veya süresi dolmuş. Yeni bir kod isteyin.';
    return m || 'Beklenmeyen bir hata oluştu.';
  }

  async function oturum() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  }

  async function personelRolu() {
    const s = await oturum();
    if (!s) return null;
    const { data, error } = await sb.from('personel').select('rol, ad_soyad').eq('eposta', (s.user.email || '').toLowerCase()).maybeSingle();
    if (error) return null;
    return data;
  }

  // ---- Giriş penceresi ----
  const CSS = `
  .en-modal-bg{position:fixed;inset:0;background:rgba(19,35,58,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
  .en-modal{background:#FDFCF9;color:#17262A;border-radius:18px;max-width:440px;width:100%;padding:26px;box-shadow:0 30px 60px -20px rgba(19,35,58,.5);font-family:'Instrument Sans',system-ui,sans-serif}
  .en-modal h2{font-family:'Newsreader',Georgia,serif;font-weight:500;font-size:26px;color:#13233A;margin:0 0 6px}
  .en-modal p{margin:0 0 14px;color:#4B5D61;font-size:14px;line-height:1.5}
  .en-modal label{display:block;font-size:12.5px;font-weight:600;color:#4B5D61;margin-bottom:4px}
  .en-modal input{width:100%;font:inherit;font-size:15px;border:1px solid #D8D2C4;border-radius:10px;padding:10px 12px;background:#fff;color:#17262A}
  .en-modal input:focus{outline:none;border-color:#33D1BE;box-shadow:0 0 0 3px rgba(51,209,190,.2)}
  .en-row{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
  .en-btn{font:inherit;font-weight:600;font-size:14px;border-radius:999px;padding:10px 18px;cursor:pointer;border:1px solid #13233A;background:#13233A;color:#FDFCF9}
  .en-btn:hover{background:#0F7C74;border-color:#0F7C74}
  .en-btn.ghost{background:transparent;color:#13233A}
  .en-btn.ghost:hover{background:#D6F2EE}
  .en-btn[disabled]{opacity:.6;cursor:wait}
  .en-msg{font-size:13.5px;margin-top:12px;min-height:1em}
  .en-msg.err{color:#B4483A}.en-msg.ok{color:#0F7C74}
  .en-small{font-size:12.5px;color:#4B5D61;margin-top:12px}`;
  function cssEkle() {
    if (document.getElementById('en-css')) return;
    const st = document.createElement('style'); st.id = 'en-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  function modal(html) {
    cssEkle();
    const bg = document.createElement('div');
    bg.className = 'en-modal-bg';
    bg.innerHTML = '<div class="en-modal" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bg);
    return { el: bg, kapat: () => bg.remove() };
  }

  // Giriş: e-posta → kod (veya e-postadaki bağlantı). Başarılıysa oturumu döndürür, vazgeçilirse null.
  function girisYap(opts) {
    opts = opts || {};
    return new Promise(async resolve => {
      if (!sb) { alert('Giriş sistemi henüz yapılandırılmadı (uygulama/ayarlar.js).'); return resolve(null); }
      const mevcut = await oturum();
      if (mevcut) return resolve(mevcut);
      let alanlar = [];
      try { const { data } = await sb.rpc('ogrenci_alan_adlari'); alanlar = String(data || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); } catch (e) {}
      const ipucu = alanlar.length ? 'Öğrenciler yalnızca <b>@' + alanlar.map(esc).join('</b> veya <b>@') + '</b> uzantılı okul e-postasıyla giriş yapabilir.' : '';
      const m = modal(
        '<h2>' + esc(opts.baslik || 'Giriş yap') + '</h2>' +
        '<p>' + esc(opts.aciklama || 'E-posta adresinize bir giriş kodu ve bağlantısı göndereceğiz. Şifre gerekmez.') + '</p>' +
        '<div data-adim="1"><label for="en-eposta">E-posta adresi</label><input type="email" id="en-eposta" autocomplete="email" placeholder="ad.soyad@…">' +
        (ipucu ? '<div class="en-small">' + ipucu + '</div>' : '') +
        '<div class="en-row"><button class="en-btn" data-gonder>Kod gönder</button><button class="en-btn ghost" data-vazgec>Vazgeç</button></div></div>' +
        '<div data-adim="2" hidden><label for="en-kod">E-postanıza gelen kod</label><input type="text" id="en-kod" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="6 haneli kod">' +
        '<div class="en-small">E-postadaki bağlantıya tıklarsanız giriş yeni bir sekmede tamamlanır; bu sekmeye dönüp <b>Giriş yaptım</b> diyebilirsiniz.</div>' +
        '<div class="en-row"><button class="en-btn" data-dogrula>Giriş yap</button><button class="en-btn ghost" data-kontrol>Giriş yaptım</button><button class="en-btn ghost" data-vazgec>Vazgeç</button></div></div>' +
        '<div class="en-msg" aria-live="polite"></div>'
      );
      const $ = s => m.el.querySelector(s);
      const msg = (t, ok) => { const x = $('.en-msg'); x.textContent = t || ''; x.className = 'en-msg ' + (ok ? 'ok' : 'err'); };
      let eposta = '';
      const bitir = s => { m.kapat(); resolve(s); };
      m.el.addEventListener('click', e => { if (e.target.closest('[data-vazgec]')) bitir(null); });
      $('#en-eposta').focus();
      $('[data-gonder]').addEventListener('click', async ev => {
        eposta = $('#en-eposta').value.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) return msg('Geçerli bir e-posta adresi girin.');
        ev.target.disabled = true; msg('Gönderiliyor…', true);
        const yonlendir = KOK + 'giris.html';
        const { error } = await sb.auth.signInWithOtp({ email: eposta, options: { emailRedirectTo: yonlendir } });
        ev.target.disabled = false;
        if (error) return msg(hataMetni(error));
        $('[data-adim="1"]').hidden = true; $('[data-adim="2"]').hidden = false; $('#en-kod').focus();
        msg('Kod ' + eposta + ' adresine gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.', true);
      });
      $('[data-dogrula]').addEventListener('click', async ev => {
        const kod = $('#en-kod').value.replace(/\s/g, '');
        if (!kod) return msg('Kodu girin.');
        ev.target.disabled = true;
        const { data, error } = await sb.auth.verifyOtp({ email: eposta, token: kod, type: 'email' });
        ev.target.disabled = false;
        if (error) return msg(hataMetni(error));
        bitir(data.session);
      });
      $('[data-kontrol]').addEventListener('click', async () => {
        const s = await oturum();
        if (s) bitir(s); else msg('Henüz giriş görünmüyor. Bağlantıya tıkladıysanız birkaç saniye bekleyip tekrar deneyin.');
      });
    });
  }

  async function cikisYap() { if (sb) await sb.auth.signOut(); }

  // Üst çubukta oturum durumu
  async function oturumCubugu(hedef, opts) {
    if (!hedef) return;
    opts = opts || {};
    const ciz = async () => {
      const s = await oturum();
      if (!sb) { hedef.innerHTML = ''; return; }
      hedef.innerHTML = s
        ? '<span>Giriş: <b>' + esc(s.user.email) + '</b></span> <button type="button" data-cikis>Çıkış</button>'
        : (opts.girisDugmesi ? '<button type="button" data-giris>Giriş yap</button>' : '');
    };
    hedef.addEventListener('click', async e => {
      if (e.target.closest('[data-cikis]')) { await cikisYap(); opts.cikista ? opts.cikista() : ciz(); }
      if (e.target.closest('[data-giris]')) { const s = await girisYap(); if (s) { opts.giriste ? opts.giriste(s) : ciz(); } }
    });
    if (sb) sb.auth.onAuthStateChange(() => ciz());
    await ciz();
  }

  const tarih = t => t ? new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  window.EduNurse = { sb, hazir, KOK, esc, hataMetni, oturum, personelRolu, girisYap, cikisYap, oturumCubugu, modal, tarih };
})();
