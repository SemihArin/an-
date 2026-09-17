# İlaç · Tasarım Yol Haritası

Hedef dosya: `ilac.html` (tek dosya, 1937 satır · CSS 15–459)
Durum kodları: `[ ]` yapılmadı · `[~]` devam ediyor · `[x]` tamamlandı

> **Kural:** her adım bitince bu dosya güncellenir. Büyük değişiklikten önce
> altına kısa not düşülür. Çalışan özellikler bozulmaz. Her tasarım kararının
> yanında nedeni yazılır.

---

## Belirlenen görsel yön

Karar vermeden önce şunu sordum: bu ne? Tek bir kişinin her gün, günün belirli
saatlerinde açtığı bir ilaç + diyet takip uygulaması. Yani konusu **zaman** ve
**tekrar eden ritüel**.

Uygulamanın içindeki en güçlü fikir zaten orada: 24 saatlik kadran. Ama fikri
sonuna kadar kullanmıyor — gece saatlerini gösteren mor kuşak
(`rgba(120,96,180,.11)`) %11 opaklıkta, yani neredeyse görünmez. Konunun en
karakterli unsuru saklanmış durumda.

**Yön: günün saati, arayüzün kendisi.** Gece koyu, gündüz açık; renk paleti
saatten türesin. Fraunces zaten editoryal bir ses veriyor — bunu "eczane
defteri / günlük almanak" karakterine bağlayacağım. Bu yön iki işi birden
çözüyor: aşağıda 1.2'de yazdığım değer sorununa gerçek bir gerekçe veriyor ve
palet kararını keyfi bir renk seçimi olmaktan çıkarıyor.

Reddedilen yönler ve nedenleri:
- *Klinik / medikal beyaz:* konu ilaç ama kullanıcı hasta değil, bu bir bakım
  ritüeli. Klinik dil yanlış duygu.
- *Koyu tema:* sabah 09:00'da açılan bir uygulamanın sürekli koyu olması
  sahte. Saate bağlı olmalı, sabit değil.
- *Daha fazla pembe doygunluğu:* mevcut sorunu derinleştirir (1.2).

---

# Tasarım Analizi

## Mevcut güçlü yönler

Bunlar korunacak — bozulmamaları öncelikli.

- [x] 24 saatlik kadran: türünün alışıldık "bugünün listesi" çözümü değil,
      uygulamaya özel ve okunabilir. Ana fikir bu.
- [x] Font seçimi doğru: DM Sans + Fraunces. Inter/Arial/Roboto yok, iki aile
      belirgin biçimde farklı.
- [x] Hareket sistemi tek merkezde: 4 eğri + 6 süre token'ı (`--ease-*`,
      `--d1..d6`). Bileşenler kendi fiziğini uydurmuyor.
- [x] Erişilebilirlik temeli sağlam: kontrast oranları ölçülerek seçilmiş
      (`--soft` 5.26:1, `--rose-ink` 5.21:1), `:focus-visible` tanımlı,
      `--hit:44px`, `prefers-reduced-motion` destekli.
- [x] Dokunma hareketleri var: sekmeler arası yana kaydırma, panelleri aşağı
      sürükleyerek kapatma. 42px'lik sekme düğmesine nişan alma zorunluluğu yok.
- [x] Animasyonlar derleyici dostu: `transform` üzerinden, `height`/`width`
      değil. Ölü geçiş kalmamış (iskelet bir kez kurulup değer güncelleniyor).
- [x] WebGL kalp/hap gerçek 3B ışın izleme — hazır kütüphane görünümü yok.

## Zayıf yönler

- [x] **P0 · Değer yapısı yok.** ~~Ekranda düğmeden büyük hiçbir koyu alan
      yoktu.~~ **Gece bandı artık o kütle.** Ölçüm (390×844, ekran görüntüsünden
      piksel örnekleyerek): bandın parlaklığı 0.665 → **0.107**; banda karşı
      kâğıt kontrastı 1.14 → **5.16**; gece/gündüz yayı kontrastı 1.13 → **5.21**.
      Ekranın koyu piksel oranı %3.1 → %4.9. Sayfa hâlâ açık, ama artık tek bir
      odak noktası var.
- [x] **P0 · Kadran ile WebGL hap aynı alanı paylaşıyor.** ~~Dev soluk hap saat
      etiketlerinin arkasındaydı.~~ **Çözüldü.** Hap `u_scale` .78 → ~.31'e indi
      ve kadranın boş merkezine oturdu; saat etiketleri artık temiz.
- [x] **P0 · Desktop'ta düzen kırılıyor.** ~~1280×800'de `.foot` kadranın üstüne
      18px biniyordu, "Aldım" 1118px'e geriliyordu.~~ **Çözüldü.** Kök neden
      genişlik değil yükseklikmiş: kadran `top:45%`e çivilenmişti, foot ise
      `margin-top:auto` ile dibe yapışıyordu; kısa ekranda kaçınılmaz olarak
      çakışıyorlardı. Kadran artık akışın içinde ve artan alana göre küçülüyor.
      Sekiz boyutta doğrulandı, çakışma yok.
- [ ] **P1 · Ölçek yok, serbest sayı var.** 22 ayrı `font-size` px değeri;
      12–17px arasında 11 farklı boyut (12, 12.5, 13, 13.5, 14, 14.5, 15,
      15.5, 16, 16.5, 17). Yarım pikselli farklar hiyerarşi kurmuyor, sadece
      gürültü. Aynı durum boşlukta (1px'den 26px'e 21 ayrı değer), köşede (14
      ayrı yarıçap), gölgede (13 ayrı elevation).
- [ ] **P2 · Hover durumu hiç yok.** CSS'te `:hover` sayısı: **0**. Yalnızca
      `:active` var. Fare ile açıldığında arayüz hiçbir şeye tepki vermiyor.
- [ ] **P2 · Öğün kartları jenerik.** Beyaz yuvarlak kutu + başlık + boş
      dairelerden liste. Uygulamanın geri kalanının karakteri burada yok;
      "AI'ın ürettiği kart listesi" tam olarak bu.
- [ ] **P2 · Haftalık çubuklar okunmuyor.** 11px genişlik, 40px yükseklik, 6px
      yarıçap — çubuk değil, küçük kapsül gibi duruyorlar. Öğün/su ayrımı
      yalnızca renkten anlaşılıyor, etiket yok (sağ üstteki "sol: öğün · sağ:
      su" ipucuna bağlı).
- [ ] **P2 · Gün kısaltmaları karışıyor.** `Pa`/`Pt` (Pazar/Pazartesi) ve
      `Cu`/`Ct` (Cuma/Cumartesi) iki harfte ayırt edilemiyor.
- [ ] **P3 · Yükleme durumu yok.** Google Fonts `display=swap` ile geliyor,
      yani ilk açılışta Fraunces başlığı Georgia olarak parlayıp yerine
      oturuyor (FOUT). Açılış perdesi bunu gizlemiyor.
- [ ] **P3 · Alt kenarda dikiş.** Canvas arka plan gradyanı `.app` padding'inin
      altından görünüyor; içerikle ilgisi olmayan bir açık pembe bant
      oluşturuyor.

## Tutarsız alanlar

- [ ] **P1 · İki ayrı yüzey dili, kuralı yok.** Cam (`--card` + `backdrop-filter`)
      ve dolu beyaz (`#fff`) yan yana kullanılıyor, hangisinin nerede olacağını
      belirleyen bir kural yok. Somut çelişki: `.bell` (üst şerit, yuvarlak
      düğme) **cam**, `.gbtn` (ayarlar, yuvarlak düğme) **dolu beyaz**. Aynı
      rolde iki farklı malzeme. `.tabs` saydam ama içindeki `.tabs .ind`
      dolu beyaz.
- [ ] **P1 · Aynı gradyan iki farklı açıda.** `linear-gradient(120deg, rose,
      rose-ink)` iki yerde, `135deg` bir yerde (`.btn.key`). Aynı malzemenin
      açısı tutmuyor.
- [ ] **P1 · Dört ayrı kenarlık rengi.** `--cardline` (beyaz .9), `--hair`
      (.08), `--faint` (.12) ve satır içi `rgba(90,44,70,.05)`. Aralarındaki
      fark görünmüyor ama dört ayrı karar olarak yaşıyorlar.
- [ ] **P1 · Kenarlık kalınlığı dört değer:** 1px, 1.5px, 2px, 2.5px
      (+ SVG'de 2.4px).
- [ ] **P2 · Tek panelde dört yarıçap.** `sheetAdd` içinde: input 16px,
      `.days button` 13px, `.shape` 15px, `.pick` %50, `.mini` 16px.
- [ ] **P2 · Birincil eylem iki tabda aynı görünüyor.** İlaç tabında "Aldım"
      (uygulamanın ana eylemi) ile diyet tabında "Öğün ekle" (ikincil, ayarlama
      işi) aynı gradyan pili. Hiyerarşi yanlış sinyal veriyor.
- [ ] **P2 · İki özet kartı birbirine benzemiyor.** Solda halka grafiği, sağda
      skeuomorfik su bardağı çizimi. Aynı boyutta iki kart ama iki ayrı görsel
      dil. Bardağın `−` düğmesi kart kenarına biniyor.

---

# Görsel Kimlik

## Renk sistemi

> **Karar notu (yön değişikliği).** Yol haritasını yazarken "tüm paleti saate
> göre kaydır" demiştim. Uygulamaya geçerken bundan vazgeçtim. Nedeni: bütün
> sayfayı saate göre boyamak hem sahibinin sevdiği pembe kimliği riske atıyor
> hem de cesareti ekrana yayıyor. Bunun yerine zamanı **tek bir yere** koydum —
> kadranın gece bandına. Aynı işi görüyor (eksik koyu kütle geldi), konudan
> türüyor (gece ilaç alınmaz) ve sayfanın geri kalanı sessiz kalıyor.
> Tüm sayfanın saate göre değişmesi hâlâ denenebilir; ama önce bu yeterli mi
> görülmeli.

- [x] **P0** Ekranda düğmeden büyük koyu yüzey var artık: gece bandı
      (21:00→06:00), `--night:rgba(74,52,104,.82)`, kalınlık 18.
- [x] **P1** `--night` %11'den çıkarıldı ve token'landı. Bandın üstündeki saat
      çentikleri koyu mürekkeple kayboluyordu; gece saatlerinde açık renge
      çevrildi (`--night-ink` ailesi). Ay simgesinin opaklığı .40 → .62.
- [ ] **P1** Sabah/akşam için ara ton gerekli mi karar ver. *Neden:* şu an ikili
      (gece/gündüz); üçüncü bir ton hiyerarşiyi güçlendirebilir ya da
      gürültü yapabilir — ölçülerek denenecek.
- [ ] **P1** Dört kenarlık rengini iki role indir: `--line` (yapısal) ve
      `--line-soft` (dekoratif).
- [ ] **P2** `--mint`in rolünü tanımla: şu an hem "tamamlandı" hem "gün bitti"
      hem tik rengi; tek anlama bağla.
- [ ] Kontrast: paleti değiştirdikten sonra tüm metin/zemin çiftlerini **yeniden
      ölç** (tahmin etme), AA altına düşen yok.

## Typography

- [ ] **P1** 22 px değerini ~7 adımlı ölçeğe indir. Öneri (1.25 oranı, tabular
      rakamlarla uyumlu): 11 · 13 · 15 · 17 · 21 · 27 · 34 + `clamp()` başlık.
      *Neden:* 0.5px farklar hiyerarşi kurmuyor, sadece bakımı zorlaştırıyor.
- [ ] **P1** Ölçeği `--fs-*` token'ları olarak tanımla; serbest px bırakma.
- [ ] **P2** Fraunces'i şu an yalnızca `.name`, `.dttl`, `.btitle` kullanıyor —
      sayı göstergelerinde (`gnum b`, `st b`, `dstats b`) de kullanılıp
      kullanılmayacağına karar ver. *Neden:* almanak karakteri sayılarda
      güçlenir; ama tabular hizalama bozulmamalı, denenip ölçülecek.
- [ ] **P2** Fraunces'in `opsz` eksenini boyuta göre bağla (şu an sabit).
      *Neden:* değişken font zaten yüklü, bedava kazanç.
- [ ] **P3** FOUT'u ölç ve gerekiyorsa açılış perdesini font yüklemesine bağla.

## Spacing sistemi

- [ ] **P1** 21 serbest px değerini 4px tabanlı ölçeğe indir:
      `--s1:4 · --s2:8 · --s3:12 · --s4:16 · --s5:24 · --s6:32 · --s7:48`.
- [ ] **P1** `--pad`ı bu ölçeğe bağla (şu an 26px / 18px — ölçek dışı iki değer).
- [ ] **P2** Dikey ritmi tek yerden yönet: `.bar` 20px, `.bar2` 10px, `.sub`
      11px, `.note` 8px gibi noktasal marjinler ölçeğe oturtulacak.

## Border radius sistemi

- [ ] **P1** 14 yarıçapı 4 adıma indir: `--r-sm:10` (küçük kontrol) ·
      `--r-md:16` (input, düğme) · `--r-lg:22` (kart) · `--r-xl:32` (panel),
      artı anlamsal `999px` (pil) ve `50%` (daire). *Neden:* 11px ile 13px
      arasındaki fark görünmüyor ama iki ayrı karar olarak bakım yükü.
- [ ] **P2** Tek panel içindeki dört yarıçapı tek role bağla (form kontrolleri
      hep `--r-md`).

## Shadow sistemi

- [ ] **P1** 13 elevation'ı 3 basamağa indir: `--e1` (yüzey/kart) ·
      `--e2` (kalkık: toast, panel) · `--e3` (birincil eylem, renkli gölge).
      *Neden:* `0 5px 16px .05` ile `0 6px 18px .05` arasındaki fark ölçülebilir
      ama görülemez.
- [ ] **P2** Gölge rengini tek yerden türet (şu an `rgba(90,44,70,…)` ve
      `rgba(176,58,99,…)` elle yazılıyor).

---

# Layout

## Mobil görünüm

Ölçüm (390×844): `.app` 390 · kadran 335px · `.take` 228px · kadran–foot
boşluğu 17px. Sağlıklı.

- [x] **P0** Çakışma çözüldü. Shader'a `u_off` eklendi: yalnız nesne kayıyor,
      zemin yerinde kalıyor. Hap her karede kadranın ölçülen merkezine
      hizalanıyor ve çapının sabit oranı kadar büyüyor (`PILL_K`), yani kadran
      küçüldüğünde hap da küçülüyor. Sekiz boyutta sapma 0px.
      *Yan bulgu:* hap küçülünce ışının kat ettiği yol kısaldı ve renk beyaza
      kaçtı — soğurma katsayısı ölçeğe göre normalize edildi, mürekkep geri geldi.
- [ ] **P2** Kadran saat etiketlerinin okunurluğunu ölç (şu an `rgba(...,.72)`
      ve hapın üstüne biniyor).
- [ ] **P3** 320px'de yeniden doğrula (`--pad` 18px'e düşüyor).

## Desktop görünüm

~~Ölçüm (1280×800): foot kadranın üstüne 18px biniyor, `.take` 1118px.~~
**Düzeltildi.** Yeni ölçüm (1280×800): kabuk 460px, kadran çapı 291px,
`.take` 298px, kadran–foot boşluğu 61px. Sekiz boyutta çakışma yok.

- [x] **P0** `.app`e `max-width:var(--shell)` (460px) + `margin-inline:auto`.
      Panel, toast ve `#a2hs` de aynı kabuğa uyuyor.
- [x] **P0** Düğme genişlikleri kabuk üzerinden sınırlandı: `.take` 1118px →
      **298px**. Ayrı bir `max-width` gerekmedi.
- [ ] **P1** Geniş ekranda kadran + foot dikey yığın yerine yan yana
      yerleşecek mi karar ver. *Neden:* 800px yükseklikte dikey yığın
      sığmıyor; asimetrik iki kolon konuya daha uygun olabilir.
- [ ] **P2** Fare girdisi: kaydırma hareketleri `touchstart` üzerine kurulu,
      desktop'ta çalışmıyor. Sekme düğmeleri zaten var — eksik bir şey yok,
      ama hover ile telafi edilmeli (bkz. Micro Interactions).

## Responsive kırılımlar

Mevcut: yalnızca `@media (max-width:360px)` + `prefers-reduced-motion`.
Desktop kırılımı **yok**.

- [~] **P0** Sabit kırılım yerine akışkan çözüm uygulandı: kadran, foot'tan
      artan alana göre küçülüyor (`flex:1` + viewBox ortalama). 320×568'de
      çap 196px, 1440×900'de 291px; hiçbir boyutta çakışma yok. Tipografi ve
      `--pad` için kırılım hâlâ gerekebilir — ölçek işiyle birlikte karar verilecek.
- [ ] **P1** Her kırılımda kadran boyutu, `--pad` ve tipografi ölçeğini bağla.
- [ ] **P2** Yatay (landscape) telefonu kontrol et — şu an hiç ele alınmamış,
      `overflow-y:hidden` ile içerik kesilebilir.

## Boşluk dengesi

- [x] **P1** 768px'deki ölü boşluk dengelendi: kadran artık foot'tan artan
      alanı kaplıyor (üst 187px · alt 173px).
- [ ] **P2** Üst şerit sıkışık: saat + tarih + 94px sekme grubu + iki 44px daire
      = 390px'de nefes yok. Yeniden dağıt.
- [ ] **P2** Öğün kartlarının dikey yoğunluğu düşük: 4 maddelik kart 240px
      yer kaplıyor, ekranda iki kart sığıyor. Sıkılaştır.
- [ ] **P3** Alt kenardaki canvas gradyan dikişini kapat.

---

# UI İyileştirmeleri

## Header

- [ ] **P2** Dört ayrı kontrol biçimini (metin yığını · sekme pili · iki cam
      daire) iki gruba indir. *Neden:* şu an üst şeritte dört farklı görsel
      dil var.
- [ ] **P2** Bildirim ve ayarlar düğmelerini tek gruba al.
- [ ] **P3** Saat/tarih yığınına almanak karakteri ver (Fraunces + tabular
      rakam denemesi). *Neden:* belirlenen yöne bağlanır.

## Navigation

- [ ] **P2** Sekme göstergesi (`.ind`) sabit 42px — iki sekme için çalışıyor,
      ama ikon-only sekmelere metin etiketi eklenmeli mi karar ver.
      *Neden:* ilaç/çatal ikonları bağlamsız; ilk kullanımda belirsiz.
- [ ] **P3** Kaydırma ile sekme geçişinde parmağı takip eden geri bildirim yok
      (şu an yalnızca bırakınca geçiyor). Sürüklerken sayfa hareket etmeli.

## Kartlar

- [ ] **P1** Yüzey kuralını uygula (cam mı, dolu mu — rol bazlı).
- [ ] **P2** Öğün kartını yeniden tasarla: jenerik beyaz kutudan çıkar,
      saat/ritüel bağlamını göster. *Neden:* en jenerik bileşen bu.
- [ ] **P2** İki özet kartını (halka + bardak) aynı dile getir.
- [ ] **P2** Bardağın `−` düğmesinin kart kenarına binmesini düzelt.
- [ ] **P2** Haftalık çubukları okunur hale getir: genişlik, etiket, öğün/su
      ayrımı.
- [ ] **P2** Gün kısaltmalarını ayırt edilebilir yap (`Pa`/`Pt`, `Cu`/`Ct`).

## Butonlar

- [ ] **P1** Hiyerarşiyi üç seviyeye indir: birincil (gradyan) · ikincil
      (yüzey) · sessiz (metin). Şu an `.take`, `.lbl`, `.lbl.skip`, `.btn`,
      `.btn.key`, `.mini`, `.save`, `.del`, `.ghost`, `.lnk`, `.gbtn` = 11
      ayrı düğme sınıfı.
- [ ] **P1** Gradyan açısını tek değere sabitle (120° vs 135°).
- [ ] **P2** "Aldım" ile "Öğün ekle" ayrımını kur. *Neden:* ana eylem ile
      ayarlama eylemi aynı görünmemeli.
- [ ] **P2** Gradyanın kendisini sorgula: `linear-gradient(120deg, açık pembe,
      koyu pembe)` dolu düğme, tam olarak kaçınmak istediğimiz klişe. Alternatif
      dene (dolu tek renk + renkli gölge, ya da malzeme farkı).

## Form elemanları

- [ ] **P1** Panel içi yarıçapları tek role bağla.
- [ ] **P2** `input:focus` yalnızca kenarlık rengini değiştiriyor
      (`--rose2`, açık pembe). Görünürlüğünü ölç; yetersizse güçlendir.
- [ ] **P2** Renk/şekil seçicileri (`.pick`, `.shape`) seçili durumu
      `border-color: --plum` ile veriyor — seçim durumu yeterince belirgin mi
      ölç.
- [ ] **P3** `.days` düğmelerinde iki harfli gün kısaltması sorunu burada da
      var.

## Modallar

Panel sistemi şu an tutarlı: dört panel de `32px 32px 0 0`, `#FFF6FA`,
`88vh`, aşağı sürükleyerek kapanıyor. Korunacak.

- [ ] **P2** `.grab` tutamağı dekoratif görünüyor ama sürükleme gerçekten
      çalışıyor — bunu görsel olarak ima et (etkileşimli olduğu belli olsun).
- [ ] **P2** Panel açılırken arkadaki sayfa hareketsiz; scrim `blur(7px)` var
      ama derinlik hissi zayıf. *Neden:* açılış/kapanış aşamalı olmalı.
- [x] **P3** Paneller kabuğa uydu: 1280px'de 460px genişlik, ortalanmış.

## Animasyonlar

Hareket sistemi zaten tek merkezde ve ölü geçiş yok. Korunacak.

- [ ] **P2** Yeni bileşenler (kart, düğme, hover) mevcut 4 eğri / 6 süre
      dışına çıkmasın. *Neden:* daha önce 15 ayrı eğri vardı ve uyumsuzdu;
      aynı hataya dönülmeyecek.
- [ ] **P2** Açılış sekansı ile ana ekran girişinin uyumunu palet
      değişiminden sonra yeniden ölç (`getAnimations`, sayfa içi rAF).
- [ ] **P3** `.nudge` (2.6s sonsuz döngü) ve `.late` (`ping` 1.8s sonsuz) —
      sürekli dönen animasyonların pil ve dikkat maliyetini gözden geçir.

---

# Micro Interactions

## Hover efektleri

- [ ] **P1** Hover katmanını sıfırdan kur — şu an CSS'te `:hover` sayısı **0**.
      Kapsam: `.take`, `.lbl`, `.btn`, `.save`, `.row`, `.meal`, `.food`,
      `.tabs button`, `.wk`, `.dw`, `.bell`, `.gbtn`, `.lnk`, `.chip button`.
- [ ] **P1** Hover'ı `@media (hover:hover)` içine al. *Neden:* dokunmatikte
      hover "yapışıyor", mobil birincil hedef.
- [ ] **P2** Hover ile `:active`i tek sistemde tut (aynı eğri/süre token'ları).

## Loading durumları

- [ ] **P2** Font yükleme (FOUT) davranışını ölç ve gerekiyorsa açılış
      perdesini `document.fonts.ready`e bağla.
- [ ] **P3** WebGL ilk kare gecikmesini ölç; perde kaldırılmadan önce hazır mı?
- [ ] Not: Firebase yazımları bilinçli olarak görünmez — **buraya gösterge
      eklenmeyecek** (kullanıcı isteği).
- [ ] Not: veri `localStorage`dan geliyor, yani liste yüklemesi anlık. İskelet
      ekran gerekmiyor; boş durum metinleri (`.empty`) zaten var.

## Sayfa geçişleri

Mevcut geçiş iyi: giden sayfa geri çekilip soluyor, gelen sayfa yaylanarak
oturuyor (`--ease-spring`). Korunacak.

- [ ] **P3** Kaydırma sırasında parmağı takip eden ara durum ekle
      (bkz. Navigation).

## Tıklama geri bildirimleri

`:active` ölçek geri bildirimi neredeyse her etkileşimli öğede var
(`.86`–`.985` arası). Korunacak.

- [ ] **P2** Ölçek değerlerini standartlaştır: şu an .86, .88, .9, .92, .93,
      .94, .97, .985 = 8 ayrı değer. İki-üç role indir (küçük kontrol /
      düğme / büyük yüzey).
- [ ] **P3** Tik çizilme animasyonu (`cpop` + `tickdraw`) yalnızca öğün
      maddelerinde var; kadran beadlerinde ve geçmiş düzenlemede de olmalı mı
      karar ver. *Neden:* aynı eylemin geri bildirimi her yerde aynı olmalı.

---

# Tasarım Kontrolü

Bu bölüm tasarım bitince doldurulacak; şimdilik mevcut durumun tespiti.

## Generic AI görünümü var mı?

- [ ] **Kısmen var.** Lehine: WebGL 3B kalp/hap, 24 saatlik kadran, Fraunces
      başlıklar — bunlar şablon değil. Aleyhine: (a) gradyan dolu pil düğme,
      (b) beyaz yuvarlak kart listesi, (c) tek doygunlukta pastel pembe
      monokrom. Üçü de "AI frontend" imzası. Gradyan ve kart bu yol
      haritasında ele alınıyor.
- [ ] Tasarım bitince yeniden değerlendir.

## Tüm bileşenler aynı dili konuşuyor mu?

- [ ] **Hayır.** Ölçülen çatışmalar: iki yüzey dili (cam vs dolu beyaz, kuralsız),
      aynı gradyanın iki açısı, dört kenarlık rengi, dört kenarlık kalınlığı,
      14 yarıçap, 13 gölge, 22 font boyutu, 11 düğme sınıfı, 8 farklı `:active`
      ölçeği.
- [ ] Tasarım bitince yeniden değerlendir.

## Mobil deneyim iyi mi?

- [ ] **Büyük ölçüde iyi.** 390px'de düzen sağlıklı, 44px hedefler tutuyor,
      kaydırma hareketleri var, `env(safe-area-inset-*)` kullanılıyor.
      Eksikler: kadran/hap çakışması, üst şerit sıkışıklığı, öğün kartı
      yoğunluğu.
- [ ] **Doğrulanmamış:** gerçek telefonda hiç test edilmedi. iOS Safari'de
      `env()` davranışı, PWA standalone modu ve düşük donanımda animasyon
      akıcılığı bu kum havuzundan ölçülemiyor.
- [ ] Tasarım bitince yeniden değerlendir.

## Görsel hiyerarşi doğru mu?

- [ ] **Hayır — en büyük sorun bu.** Ekranı kaplayan yüzeyler 0.58–0.90
      parlaklık bandında; düğmeden büyük koyu alan yok. Kadran ile hap aynı
      yeri paylaşıp birbirini siliyor. İki tabın birincil eylemi aynı görünüyor.
- [ ] Tasarım bitince yeniden değerlendir.

---

## Son tasarım eleştirisi

- [ ] Tüm işler bitince yazılacak: ne çalıştı, ne çalışmadı, ne yarım kaldı,
      hangi kararı geri almak gerekir. Ölçümle, tahminle değil.
