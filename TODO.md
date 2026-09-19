# İlaç · Tasarım Planı — 2. tur

Hedef dosya: `ilac.html` · Önceki turun tam kaydı: [`TODO-arsiv.md`](TODO-arsiv.md)
Durum kodları: `[ ]` yapılmadı · `[~]` devam ediyor · `[x]` tamamlandı

> **Kural:** her adım bitince bu dosya güncellenir. Büyük değişiklikten önce kısa not
> düşülür. Çalışan özellikler bozulmaz. Her tasarım kararının yanında nedeni yazılır.
> Ölçülebilir olan ölçülür — "bakınca iyi görünüyor" ölçüm sayılmaz.

Bu plan `hallmark audit` ve `frontend-design` skill'leriyle yapılan yeni bir
denetimden çıktı. Birinci tur (yol haritası, P0–P2, tasarım eleştirisi) arşivde.

---

## Denetim sonucu

`hallmark audit ilac.html` · anti-pattern kataloğuna karşı, greple doğrulanmış.

**2 kritik · 2 mikro-etkileşim tell'i · 2 küçük · 10 temiz geçiş**

---

# Kritik

## 1. Damga yalan söylüyor

- [x] **K1** Dosyanın ilk satırındaki Hallmark damgası `macrostructure: Workbench`
      diyor. Workbench bir **pazarlama sayfası** iskeleti: ekran görüntüsü
      çerçeveleri, altyazılar, üçüncü görselden sonra yapışkan "Try it free →"
      çubuğu. `ilac.html` bir **uygulama** — ne ekran görüntüsü var, ne altyazı,
      ne CTA. Damga hiçbir zaman uymamış, bugün hiç uymuyor.
      `.hallmark/log.json`'daki bütün kayıtlar da aynı yanlışı taşıyor.
      *Düzeltme:* macrostructure iddiasını **kaldır**. Hallmark'ın 21 iskeletinin
      hepsi sayfa şekli; bu bir uygulama, hiçbiri uymuyor. Yerine başka bir isim
      yazmak ikinci bir yalan olur. Damga ne sevk edildiğini anlatsın:
      gece bandı, kadran, zaman çizelgesi, token sistemleri.
      *Neden kritik:* audit verb'ü bunu açıkça "stamp lies → critical structural
      finding" olarak tanımlıyor. Damga bir sonraki turun okuyacağı kayıt;
      yanlışsa zararlı.
- [x] **K1b** Damganın `pass:` satırı ("contrast ramp, 44px targets, named primary
      action, 320px safety") çok tur öncesine ait ve bayat. Güncellensin ya da
      düşsün.

## 2. Saf beyaz yüzey

- [x] **K2** `background:#fff` **15 yerde**. Anti-pattern kataloğu bunu kritik
      sayıyor: *"`#ffffff` surface — reads flat and synthetic. Fix: tint toward
      your anchor hue."*
      Etkilenen yüzeyler: `.card` · `.meal .mb` · `.row` · `.st` · `.chip` ·
      `.shape` · `.days button` · `.gbtn` · `.tabs .ind` · `.wmin` · `.toast` ·
      `#a2hs` · `input` · `textarea` · `input[type=number]`.
      *Düzeltme:* pembe zemine göre hafifçe ısıtılmış bir beyaz token'ı
      (`--paper-card`) kur ve hepsini ona bağla. Panel zemini `#FFF6FA` zaten
      tonlanmış — kartlar ondan daha soğuk kalıyor, yani tutarsızlık da var.
      *Zorunlu:* değişiklikten sonra **bütün metin/zemin çiftlerinin kontrastı
      yeniden ölçülecek**. Beyazı kısmak kontrastı düşürür; AA altına düşen
      olmayacak.

---

# Mikro-etkileşim tell'leri

## 3. `transition-all`

- [x] **M1** Üç yerde özellik listesi olmayan geçiş var — `transition:var(--d2)`
      yazmak `transition-property:all` demek, yani odak halkası ve `visibility`
      dahil her şey animasyona giriyor:
      `.scrim` · `.pick` · `.days button`.
      *Düzeltme:* her birinde hangi özelliğin geçtiğini yaz.
      *Neden:* katalogdaki tell'in tarifi birebir bu. Ayrıca odak halkasının
      animasyonla gelmesi erişilebilirlik açısından da istenmeyen bir şey —
      şu an `:focus-visible` outline'ı bu üç seçicide gecikmeli geliyor olabilir,
      **ölçülecek**.

## 4. UI durumunda yaylanma (overshoot)

- [x] **M2 · uygulandı (önerilen orta yol).**
      `--ease-spring:cubic-bezier(.34,1.46,.64,1)` — katalogdaki tell'in
      neredeyse birebir aynısı (`cubic-bezier(0.34, 1.56, 0.64, 1) and friends
      on buttons, modals, tooltips`). **14 yerde** kullanılıyor ve büyük kısmı
      UI durumu: `.take:active` · `.lbl:active` · `.add:active` · `.row:active` ·
      `.gbtn:active` · `.tabs button:active` · `.wtap:active` · `.food .c` ·
      `.toast.on` · `.sheet.open` · `.page.on` · `.tabs .ind` · `.bead` · `tabPop`.
      Katalog diyor ki: *"Reserve overshoots for genuine physical interactions
      (drag-and-drop release). For UI state, use ease-out."*

      **Gerilim var, tek taraflı karar vermiyorum.** Kullanıcı bu projede
      açıkça "animasyonlar akışkan olsun" dedi ve yaylanma o istekle kondu.
      Skill'in kendi kuralı da şunu söylüyor: *brief'in kendi sözleri kazanır.*
      Ama katalog da haksız değil — bir düğmeye basınca ölçeğin geri sekmesi
      fiziksel bir olay değil.

      *Önerilen orta yol (onay bekliyor):* yaylanmayı **gerçekten fiziksel
      olanlarda** bırak — panel açılışı (parmakla sürüklenip bırakılıyor),
      sekme göstergesi (kaydırmayla sürülüyor), sayfa geçişi (kaydırma jesti).
      Basma (`:active`) ve durum geçişlerinde `--ease-out`a dön. Böylece
      akışkanlık kalır, klişe gider.
      **Sonuç:** 12 yer `--ease-out`a döndü, **3'ü korundu** — `.sheet.open`
      (parmakla sürüklenip bırakılıyor), `.tabs .ind` ve `.page.on` (kaydırma
      jestiyle sürülüyor). `tabPop` ayrıca dönmesini kaybetti: ölçek onayı
      kaldı, sallanma gitti (katalogdaki "icons that wobble").
      Açılış/regresyon yeniden ölçüldü, sapma yok.

---

# Küçük

- [x] **m1** `.card{padding:var(--s3) var(--s3)}` — aynı değer iki kez; `var(--s3)`
      yeterli.
- [x] **m2** `.hallmark/log.json` kayıtlarındaki `macrostructure: Workbench`
      alanları K1 ile birlikte düzeltilsin; yoksa bir sonraki tur yanlış kaydı
      okur.

---

# Temiz geçen kontroller

Bunlar denetimde ölçüldü ve sorun çıkmadı. Değiştirme.

- [x] **Tabular rakamlar** — sayı gösteren her öğede `font-variant-numeric:
      tabular-nums` var (`.clock`, `.st b`, `.dstats b`, `.gnum b`, `.rg-n`,
      `.sub b`, `.dnext b`, `.row small`, `.chip`). Boşluk yok.
- [x] **İtalik başlık yok** — başlıklar roman; italik yalnız `.note`ta, yani
      gövde metninde. Katalogdaki en güvenilir AI tell'lerinden biri burada yok.
- [x] **`100vw` yok · `z-index` en fazla 20** — şişmiş yığın yok.
- [x] **Bölüm dolguları tek tip değil** — `.st` (s3 s2) · `.card` (s3) ·
      `.row` (s3) · `.empty` (s6 0 s4) · `.mt` (s5 s4 0 0). "Her bölüm aynı
      dolgu" tell'i geçerli değil.
- [x] **Cam yüzey kuralı yazılı** — glassmorphism keyfi değil: cam = canvas
      üstündeki krom, dolu = içerik yüzeyi. CSS'te belgeli.
- [x] **Hover'a bağımlı işlev yok** — her şey dokunmayla çalışıyor; hover
      yalnız `@media (hover:hover) and (pointer:fine)` içinde ve sadece renk.
- [x] **Onay kutusu yerine geri alma** — tersine çevrilebilir eylemler için
      dialog yok, 5 saniyelik geri alma penceresi var (ve sayacı artık doğru).
- [x] **Odak halkası animasyonla gelmiyor** — `:focus-visible` anında.
      *(M1 çözülürken bu üç seçicide yeniden doğrulanacak.)*
- [x] **Bildirim düzeni kaydırmıyor** — `position:fixed`, içerik yerinden oynamıyor.
- [x] **UI metninde düz tırnak / üç nokta / çift tire yok** — tek `...` bir kod
      yorumunda, arayüzde değil.

---

# Erişilebilirlik taraması (yeni)

Kontrast hatasını kaçırmış olmam örneklemenin yetmediğini gösterdi; aynı
sistematik taramayı klavye ve ekran okuyucu tarafına da uyguladım. **10 kontrol,
başlangıçta 4'ü başarısız — dördü de düzeltildi.**

- [x] **E1 · Üç kontrolün adı yoktu.** `fTime` (doz saati), `fAddTime` (saati
      ekle), `mTime` (öğün saati) — ekran okuyucu bunlarda hiçbir şey
      duyurmuyordu. `aria-label` eklendi.
- [x] **E2 · Escape paneli kapatmıyordu.** Perdeye dokunma ve aşağı sürükleme
      vardı, klavye yolu yoktu. Eklendi.
- [x] **E3 · Odak panelden dışarı kaçıyordu.** Panel açıkken Tab'lamak
      perdenin **altındaki** düğmelere düşürüyordu (`btnSkip`, `btnAdd`,
      `btnList`) — yani klavye kullanıcısı görünmeyen kontrollerle etkileşime
      giriyordu. Panel içinde döngü kuran bir tuzak eklendi; Tab sonuncudan
      başa, Shift+Tab ilkinden sonuncuya sarıyor.
- [x] **E4 · Panel kapanınca odak kayboluyordu.** `a2hsX`e (ekran dışındaki
      ipucu kapatma düğmesi) düşüyordu. Artık paneli açan düğmeye dönüyor.
- [x] **E5 · Paneller gerçek diyalog semantiği kazandı:** `role="dialog"`,
      `aria-modal="true"`, her birine `aria-label`.
      *Karar notu:* odak ilk input'a değil **panelin kendisine** veriliyor.
      Metin alanına programatik odaklanmak mobilde klavyeyi açıp paneli
      kapatabiliyor; panele odaklanınca Tab yine ilk kontrole geçiyor.
      Ölçüldü: üç panelde de kaydırma sıçraması yok, ad alanından Tab hâlâ
      panel içinde ilerliyor.

**Temiz geçenler:** odak halkası 3px ve görünür · Tab gövdede dolaşıyor ·
bildirim canlı bölge (`role=status` + `aria-live=polite`) · sekmeler
`aria-pressed` bildiriyor · sayfa dili `tr` · öğün durumu yalnız renge
dayanmıyor, metinle de var.

*Test yöntemi notu:* ilk turda tuzak testi "başarısız" göründü; aslında Escape
düzelince panelin yeniden açılma adımı atlanıyordu — test hatası, uygulama
hatası değil. Düzeltildi.

---

# Denetim dışı, açık kalan işler

Birinci turdan devreden ve kodla kapatılamayan / karar bekleyen maddeler.

- [x] **A1 · Gerçek telefonda test** — *kapsam dışı bırakıldı (kullanıcı kararı).*
      Düşük donanım bir endişe değil; genel telefon testi gerekmiyor.
- [x] **A2 · Kadran çevresindeki boşluk** — *sakinlik korunacak (kullanıcı kararı).*
      Üstte ~97px, altta ~81px kalıyor; doldurulmayacak.
- [x] **A3 · İki özet kartında sayı konumu farklı.** İki varyant render edilip
      karşılaştırıldı; **sayı ikisinde de işaretin altına** alındı, yani ortak
      iskelet `[işaret] / [sayı] / [etiket]`. Halka saf gösterge oldu (78→62px),
      bardak da küçüldü (44×60 → 40×54). Yan kazanç: kartlar kısaldı, öğün
      listesine yer açıldı. Kontrast yeniden ölçüldü, değişmedi.
- [~] **A4 · Hapın kadran merkezindeki yeri.** Üç varyant render edildi
      (şimdiki · hapsız · %62 küçük) ve kullanıcıya sunuldu. **Karar bekliyor.**
      Öneri: küçük varyant — el işçiliği kalıyor, kadran nefes alıyor, gece bandı
      tek ağır kütle olmayı sürdürüyor.
- [x] **A5 · Arka plan bildirimleri — tek dosyada mümkün değil, ölçüldü.**
      Gerçek bir origin üzerinde denendi: `blob:` ve `data:` URL'den service
      worker kaydı tarayıcı tarafından reddediliyor (`TypeError: The URL protocol
      of the script is not supported`). SW'siz alternatif olan zamanlanmış
      bildirim API'si de yok (`Notification.prototype.showTrigger` ve
      `TimestampTrigger` tanımsız — Chrome'dan kaldırıldı). `periodicSync` var
      ama o da bir SW gerektiriyor.
      **Sonuç:** ikinci bir `sw.js` dosyası olmadan çözüm yok. Uygulama onsuz
      da çalışır; dosya varsa arka plan hatırlatıcısı kazanır. Kullanıcıya
      sunuldu, karar bekliyor.
- [x] **A6 · Test takımı repoya alındı.** `test/` altında beş takım, ortak
      yardımcılar (`lib.mjs`) ve tek koşturucu (`npm test`): **94 kontrol,
      hepsi geçiyor.** `node_modules` yoksayılıyor, uygulama hâlâ tek dosya —
      test klasörü bağımsız.

      *Takımı yazarken dört kendi hatamı yakaladım, dördü de ölçüm tuzağı:*
      (1) `settle()` "şu an animasyon yok" dediği için açılış sekansı başlamadan
      dönüyordu — testler perde altına tıklıyordu; artık `booted`ı bekliyor.
      (2) `booted` betiğin tepesinde `let` ile tanımlı, yani `window.booted`
      daima `undefined` — global sözcüksel ortamdan okumak gerekti.
      (3) Sabit `waitForTimeout` yerine durum beklemek gerekti.
      (4) Kontrast testi birincil düğmeyi panel açıkken ölçüyordu, düğme yerine
      panelin yüzeyini okuyordu.
- [x] **A7 · Yan bulgu: su hedefte sınırlanıyor** (`Math.min(goal, cur+1)`).
      10 bardak içilse 8'de duruyor. Kasıtlı görünüyor (hedef kutlaması buna
      bağlı) ve dokunmadım, ama teste açık bir kontrol olarak yazıldı ki
      ileride kazara değişirse fark edilsin.

---

---

# Denetim sırasında çıkan yeni bulgu

- [x] **YENİ · Birincil düğmenin etiketi AA'yı geçmiyordu.** `--grad`ın açık
      ucunda beyaz metnin kontrastı **2.58:1**, etiketin oturduğu ortada
      **~3.5:1**. 16px kalın metin WCAG'de "büyük metin" saymıyor (eşik
      18.66px kalın), yani gereken 4.5:1. **Bu bir erişilebilirlik hatasıydı ve
      daha önceki kontrast turlarım kaçırmıştı — yalnız düz renkleri ölçmüş,
      gradyanın kendisini hiç ölçmemiştim.**

      *Ve bu, geçen turdaki kararımı çürütüyor.* Gradyanı "gece bandına tabi
      kalıyor" diye bırakmıştım (ortalama parlaklık 0.270 vs bandın 0.107).
      Ama açık ucu AA'ya çekmek için L ≤ 0.183 gerekiyor — o da gradyanı zaten
      reddettiğim dolu rengin (0.159) koyuluğuna getiriyor. Yani gradyanın tek
      gerekçesi ölçümle birlikte ortadan kalktı.
      *Karar:* dolu `--act` (`--rose-ink`). Ölçüldü: beyaz etiketle **5.77:1**.

## Sıra önerisi

1. **K1 + K1b + m2** — damgayı ve kaydı dürüst hale getir. Kodun görünüşünü
   değiştirmez ama bir sonraki turun okuyacağı kaydı düzeltir. Ucuz, riski yok.
2. **K2** — beyaz yüzeyleri tonla. Görsel etkisi en yüksek madde; kontrast
   yeniden ölçülecek.
3. **M1** — üç `transition-all`. Ucuz, ölçülebilir.
4. **M2** — yaylanma kararı. **Önce onay** — brief ile katalog çelişiyor.
5. **m1** — tek satırlık temizlik.
6. **A2/A3/A4** — telefon sonrası.

---

# Panel ve cihaz kimliği (yeni)

- [x] **P1 · `panel.html`** — Firebase'e bağlanıp olayları okuyan ve analiz eden
      ayrı sayfa. Uygulamanın yumuşak pembesini bilerek taşımıyor: başka bir iş,
      başka bir oda. Newsreader + IBM Plex Sans, nötr kâğıt, renk yalnız veride.
      İçerik: 6 istatistik döşemesi · günlük doz (yığılı: alındı/atlandı) ·
      dozun alındığı saat · gecikme dağılımı · açılış saati · su · üç tablo
      görünümü (olay türleri, ham olaylar, oturumlar).
      Kategorik palet `dataviz` doğrulayıcısından geçirildi: `#1F8F63 · #A8690F ·
      #B03A63` — altı kontrolün hepsi PASS (CVD ΔE 8.7, normal görüş 15.9,
      kontrast ≥3:1). ΔE 8'in hemen üstünde olduğu için ikincil kodlama var:
      efsane, doğrudan etiket ve dilimler arasında 2px yüzey boşluğu.
      *Yakalanan hata:* eksen tam sayı veride 0.5 adımlarla gidiyordu — yarım
      doz diye bir şey yok; veri tam sayıysa adım da tam sayı.
- [x] **P2 · Okuma izni gerçek kimliğe bağlandı.** `firebase-rules.json` artık
      `auth.uid === 'PANEL_UID'` istiyor; panelde e-posta/parola girişi var.
      *Not:* "sayfaya gömülü kod" bir güvenlik önlemi değil — sayfayı açan
      herkes kodu görür. Gerçek koruma tek hesaplık Firebase Auth.
- [x] **P3 · Cihaz kimliği kalıcı oldu.** Üç önlem: `?did=` ile bir kez çakma
      (parametre sonra URL'den siliniyor, kullanıcı hiçbir şey görmüyor),
      localStorage **ve** çerezde birlikte saklama, hangisinde varsa ikisine de
      geri yazma. Altı senaryo test edildi.
- [x] **P4 · Test takımı büyüdü:** `panel` takımı eklendi, toplam **112 kontrol**.
